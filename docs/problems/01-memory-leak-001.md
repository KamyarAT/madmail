# Problem 001 — Slow memory growth on long-lived madmail instances

**Status:** Investigated, partially confirmed by automated probes  
**Reported:** RSS climbs over ~1 week until the process uses all system memory  
**Date:** 2026-06-11

## Summary

Several in-process caches and background tasks **grow monotonically** — they add entries when users/mailboxes are touched but **never evict** them. On a relay serving many accounts over days, resident memory increases steadily even when load is stable.

This is not a classic “forgot to free a buffer” bug in one code path; it is **unbounded retention** in multiple `DashMap` / `RwLock` structures that are intentional caches but lack TTL or size caps.

## Confirmed by tests

Automated probes live in [`tests/memory_leak_probe.rs`](../../tests/memory_leak_probe.rs).

Run:

```bash
# debug (allocator overhead inflates RSS; good for map-size assertions)
cargo test -p chatmail-integration --test memory_leak_probe -- --nocapture

# release (closer to production RSS)
cargo test -p chatmail-integration --test memory_leak_probe --release -- --nocapture
```

### 1. Maildir listing cache — **CONFIRMED (primary suspect)**

| | |
|---|---|
| **Source** | [`crates/chatmail-storage/src/maildir_cache.rs`](../../crates/chatmail-storage/src/maildir_cache.rs) |
| **Wiring** | [`crates/chatmail-storage/src/maildir.rs`](../../crates/chatmail-storage/src/maildir.rs) (`MailboxStoreInner.list_cache`) |
| **Trigger** | [`crates/chatmail-storage/src/maildir_message.rs`](../../crates/chatmail-storage/src/maildir_message.rs) — `list_mailbox_messages()` |

`MaildirListCache` stores a `DashMap<(user, mailbox), CachedListing>` where each `CachedListing` holds a full `Vec<StoredMessage>` (all message metadata for that mailbox).

- **Inserted** on every mailbox list (`store()` at lines 91–107).
- **Removed** only via explicit `invalidate()` (writes/expunges) — not when mailboxes go idle.
- **Stale entries** on mtime mismatch return `None` from `get_if_fresh()` but the old entry **stays in the map** until overwritten (lines 73–88).

**Probe:** `probe_maildir_list_cache_rss_grows_per_mailbox`  
**Result (debug build):** 200 users × 50 messages → **+18.5 MiB RSS** (~92 KiB/user).

**Extrapolation:** 10 000 active users with listed INBOXes ≈ **~900 MiB** metadata alone (debug; release lower but same growth curve).

---

### 2. JIT flight mutex map — **CONFIRMED**

| | |
|---|---|
| **Source** | [`crates/chatmail-state/src/lib.rs`](../../crates/chatmail-state/src/lib.rs) lines 66, 114–124 |
| **Used by** | [`crates/chatmail-auth/src/jit.rs`](../../crates/chatmail-auth/src/jit.rs) — `jit_flight()` during `authenticate()` |

`jit_flights: DashMap<String, Arc<Mutex<()>>>` coalesces concurrent JIT account creation. Each unique username that hits the JIT path gets a permanent map entry; **nothing removes it after login succeeds**.

**Probe:** `probe_jit_flights_map_grows_without_cleanup`  
**Result:** 100 unique JIT logins → **`jit_flights.len() == 100`** (expected 0 if cleaned up).

---

### 3. EventBus INBOX version map — **CONFIRMED**

| | |
|---|---|
| **Source** | [`crates/chatmail-state/src/events.rs`](../../crates/chatmail-state/src/events.rs) lines 35–42, 84–90, 113–122 |
| **Persisted by** | [`crates/chatmail-state/src/flusher.rs`](../../crates/chatmail-state/src/flusher.rs) — `flush_modseq()` |

`inbox_versions: DashMap<String, AtomicU64>` gets one entry per user on every delivery/mutation (`bump_inbox_version`). Entries are flushed to DB but **never removed from RAM**.

**Probe:** `probe_eventbus_inbox_versions_grow_per_user`  
**Result:** 500 `notify_new_message` calls → **`inbox_version_snapshot().len() == 500`**.

**Live server probe:** `probe_live_server_rss_under_repeated_delivery` — 80 users, 5 delivery rounds → `inbox_versions=80`.

---

### 4. DeliveryBatcher permanent workers — **CONFIRMED (conditional on config)**

| | |
|---|---|
| **Source** | [`crates/chatmail-storage/src/delivery_batch.rs`](../../crates/chatmail-storage/src/delivery_batch.rs) lines 50–82, 88+ |
| **Global singleton** | [`crates/chatmail-storage/src/blob.rs`](../../crates/chatmail-storage/src/blob.rs) lines 35–39, 360–372 |
| **Policy** | [`crates/chatmail-storage/src/storage_policy.rs`](../../crates/chatmail-storage/src/storage_policy.rs) |

On the **first** CAS write per distinct blob when `mail_fsync = never`, `commit_mailbox_blob` calls `never_batcher().submit_for_never()`. That creates a `DashMap` coordinator per `(user, mailbox)` and spawns a **`tokio::spawn` infinite-loop worker** that is never torn down.

**Trigger conditions (all required):**

1. `mail_fsync = never` in config (`storage.imapsql` / `AppConfig.mail_fsync`)
2. `blob_dedup` enabled (default: **on**)
3. First-seen content hash per delivery (distinct payloads)

Relay deployments often use `mail_fsync = never` for throughput (see `data/context.txt`, Dovecot parity docs).

**Probes:**

- `probe_delivery_batcher_spawns_per_mailbox_workers` — 150 unique mailboxes via direct `DeliveryBatcher`
- `probe_never_cas_blob_path_uses_global_batcher` — 120 users through real `write_blob()` Never+CAS path

---

## Suspected but not directly measured

### 5. EventBus broadcast channels (`users` map)

| | |
|---|---|
| **Source** | [`crates/chatmail-state/src/events.rs`](../../crates/chatmail-state/src/events.rs) lines 36, 113–122 |

`user_sender()` creates a `broadcast::Sender` per user on first subscribe **or** first `notify_new_message`. No pruning when all IDLE clients disconnect. Same growth pattern as `inbox_versions`; smaller per entry but same lifetime.

### 6. UidList per-mailbox locks

| | |
|---|---|
| **Source** | [`crates/chatmail-storage/src/uidlist.rs`](../../crates/chatmail-storage/src/uidlist.rs) lines 101–111 |

`locks: DashMap<(user, mailbox), Arc<Mutex<()>>>` — one mutex per mailbox ever synced; never removed.

### 7. Auth password verification cache

| | |
|---|---|
| **Source** | [`crates/chatmail-state/src/auth.rs`](../../crates/chatmail-state/src/auth.rs) lines 31–35, 52–67 |

`verified` map has a 1-hour TTL on **read** but expired entries are **never deleted**. Grows with distinct users that logged in during the process lifetime.

### 8. Federation tracker (low scale)

| | |
|---|---|
| **Source** | [`crates/chatmail-state/src/tracker.rs`](../../crates/chatmail-state/src/tracker.rs) |

One `ServerStat` per federation domain contacted. Bounded by peer count, not user count.

---

## Not the main cause

| Component | Why |
|-----------|-----|
| `QuotaCache` | One entry per user — expected; size is small |
| `PushNotifier` | Short-lived `tokio::spawn` per notification; tasks complete |
| Prometheus metrics | Fixed label cardinality in [`crates/chatmail-metrics/src/metrics.rs`](../../crates/chatmail-metrics/src/metrics.rs) |
| Outbound queue | Entries removed on success/failure ([`crates/chatmail-delivery/src/queue/worker.rs`](../../crates/chatmail-delivery/src/queue/worker.rs)) |

---

## Test results log (2026-06-11)

```
# debug
cargo test -p chatmail-integration --test memory_leak_probe -- --nocapture

# release (production-like)
cargo test -p chatmail-integration --test memory_leak_probe --release -- --nocapture
```

### Debug build

| Probe | Result | Verdict |
|-------|--------|---------|
| `probe_maildir_list_cache_rss_grows_per_mailbox` | +18 100 KiB / 200 users (**90.5 KiB/user**) | **Confirmed** — RSS scales with listed mailboxes |
| `probe_jit_flights_map_grows_without_cleanup` | `jit_flights.len() == 100` after 100 JIT logins | **Confirmed** — no cleanup |
| `probe_eventbus_inbox_versions_grow_per_user` | `inbox_versions == 500` after 500 notifications | **Confirmed** — 1 entry/user forever |
| `probe_delivery_batcher_spawns_per_mailbox_workers` | 150 mailboxes, workers spawned per source | **Confirmed** — structural leak |
| `probe_never_cas_blob_path_uses_global_batcher` | 120 Never+CAS first-writes, RSS **+16 848 KiB** | **Confirmed** — production path hits batcher |
| `probe_live_server_rss_under_repeated_delivery` | 5×80 deliveries, RSS +904 KiB, `inbox_versions=80` | **Confirmed** — live mini-server retains version map |

All 6 probes **passed**.

### Release build

| Probe | Result |
|-------|--------|
| `probe_maildir_list_cache_rss_grows_per_mailbox` | +12 032 KiB / 200 users (**60.2 KiB/user**) |
| `probe_jit_flights_map_grows_without_cleanup` | `jit_flights.len() == 100` |
| `probe_eventbus_inbox_versions_grow_per_user` | `inbox_versions == 500` |
| `probe_never_cas_blob_path_uses_global_batcher` | RSS **+10 548 KiB** / 120 users |
| `probe_live_server_rss_under_repeated_delivery` | RSS +1 648 KiB, `inbox_versions=80` |

Release RSS per user is lower than debug but the **unbounded map growth** is identical.

### Capacity estimate (release, listing cache only)

| Users listed (INBOX, ~50 msgs) | Estimated cache RSS |
|-------------------------------|---------------------|
| 1 000 | ~60 MiB |
| 10 000 | ~600 MiB |
| 50 000 | ~3 GiB |

Add `jit_flights`, `inbox_versions`, `DeliveryBatcher` workers (if `mail_fsync=never`), and `UidListStore.locks` on top.

---

## Production scenario analysis (3000 users / 300 active / 3000 msgs·day⁻¹)

**Reported:** ~400 MiB baseline growing toward **1 GiB RSS** over ~1 week.  
**Interpretation:** ~400–600 MiB **growth** on top of an already-large baseline, or total RSS climbing from ~400 MiB → ~1 GiB.

### Workload model

| Parameter | Value used in simulation |
|-----------|--------------------------|
| Accounts in DB | 3000 (`auth` + `quota` hydrated at boot) |
| Active maildirs (receive mail) | 300 |
| Throughput | 3000 recipient deliveries/day (10/user/day to actives) |
| Duration | 7 simulated days |
| IMAP polling | 50 full INBOX listings/user/day (cache-hit clones) |

Week simulation: [`tests/memory_week_simulation.rs`](../../tests/memory_week_simulation.rs)

```bash
cargo test -p chatmail-integration --test memory_week_simulation --release -- --nocapture
```

### Measured results (release, 2026-06-11)

| Simulation | Matches your profile? | Week RSS Δ | Notes |
|------------|----------------------|------------|-------|
| `simulate_week_3000_users_300_active_3000_msgs_per_day` | **Yes** (best fit) | **+9.1 MiB** | 21k deliveries, 105k list polls; `inbox_versions=300` |
| `simulate_week_group_fanout_60_recipients` | Group fan-out variant | **+9.3 MiB** | 50×60 = 3000 deliveries/day |
| `simulate_week_never_cas_300_active_users` | Relay `mail_fsync=never` | **+6.3 MiB** | 300 `DeliveryBatcher` workers created once |
| `simulate_week_messages_touch_all_3000_users` | Notify all 3000 | **+54 MiB** (day 1) | `inbox_versions=3000`, no maildir listing |
| `simulate_week_all_3000_users_receive_and_list_daily` | All 3000 receive + daily list | **+58 MiB** | 7 msgs/mailbox; cache still small |
| `simulate_large_mailbox_cache_300_users_1000_msgs` | **No purge / old mail** | **+50.5 MiB** | 300×1000 msgs, one listing each |

### Conclusion: why 3000 msgs/day for 1 week is NOT enough alone

With **only 300 active mailboxes** and **~70 new messages/mailbox** after 7 days, the server retains roughly:

- **300** `MaildirListCache` entries × ~70 msgs ≈ **a few MiB** of metadata
- **300** `inbox_versions` entries
- **3000** `quota` + **3000** `auth` entries at boot (fixed, ~13 MiB RSS in test)

That matches the **+9 MiB/week** we measured — **far below** 400 MiB growth.

So the production leak is **not** caused by the daily 3000-message throughput alone. Something else inflates retained memory.

### What actually explains ~400 MiB → 1 GiB

The dominant term is **`MaildirListCache` size ∝ (listed mailboxes) × (messages per mailbox)** — it stores the **full message index**, not just the week's mail.

Estimated metadata per cached message: **~100–150 bytes** (release).  
Estimated per 1000-message mailbox in cache: **~105 KiB**.

| Scenario | Calculation | Cache RSS |
|----------|-------------|-----------|
| 300 actives × 70 msgs (1 week) | 300 × 7 KiB | **~2 MiB** |
| 300 actives × 1000 msgs (no purge) | 300 × 105 KiB | **~50 MiB** (measured) |
| **3000 mailboxes × 1000 msgs** | 3000 × 105 KiB | **~300–500 MiB** |
| + 3000 `inbox_versions` | fixed after all users seen | **~54 MiB** (measured) |
| + 300 IMAP IDLE sessions | duplicate listing in session state | **+ tens of MiB** each |

**Most likely production story:**

1. **Historical mail not purged** — mailboxes hold hundreds/thousands of messages (auto-purge seen disabled, long retention, or many users with old mail). One IMAP `SELECT`/`FETCH` cycle loads **all of them** into `MaildirListCache`.
2. **More than 300 mailboxes get listed** — “only 300 online” ≠ “only 300 mailboxes cached”. Any user who opens IMAP adds a permanent cache entry. Over time many of the **3000 accounts** may be listed even if only 300 are online at once.
3. **Fixed per-user maps never shrink** — once a user receives mail or logs in via JIT, `inbox_versions`, `EventBus.users`, `jit_flights`, and `UidListStore.locks` keep entries forever (+**~54 MiB** for 3000 users in `inbox_versions` alone).
4. **Clone on every cache hit** — [`maildir_cache.rs` line 85](../../crates/chatmail-storage/src/maildir_cache.rs) clones the full `Vec<StoredMessage>` on each listing. Heavy IMAP polling causes allocator churn; RSS may not return to the OS even when freed.

### How to verify on the live server

```bash
# RSS over time
ps -o rss,cmd -p $(pidof madmail)

# Approximate maildir message counts (all users)
find /var/lib/maddy/mail -path '*/new/*' -o -path '*/cur/*' | wc -l

# Per-user message counts (spot check)
for d in /var/lib/maddy/mail/*/Maildir; do
  n=$(find "$d/new" "$d/cur" -type f 2>/dev/null | wc -l)
  echo "$n $d"
done | sort -n | tail -20

# Check auto-purge settings (admin API / DB settings)
# settings: auto_purge_seen, retention intervals — see chatmail-tasks maintenance
```

If top mailboxes have **500–2000+ files** and many hundreds of users have been seen over the week, **~400 MiB cache growth is expected** without any “classical” leak — it is **unbounded cache retention** of full mailbox indexes.

### Action priority for this deployment

1. Confirm **message counts per mailbox** on disk (likely root cause if ≫ 70).
2. Confirm **how many distinct users** have had IMAP activity (cache entries).
3. Check **auto-purge / retention** settings ([`crates/chatmail-tasks/`](../../crates/chatmail-tasks/)).
4. Then fix caches: cap/TTL `MaildirListCache`, prune `inbox_versions`/`jit_flights`, stop `DeliveryBatcher` immortal workers.

---

## Recommended fix directions (not implemented)

1. **`MaildirListCache`:** LRU/TTL cap; remove stale entry on mtime miss; consider `Arc<[StoredMessage]>` to avoid clone on hit.
2. **`DeliveryBatcher`:** Remove per-mailbox permanent workers; serialize via existing `UidListStore` locks or a single shared drainer.
3. **`jit_flights`:** `remove(user)` after JIT flight mutex is released.
4. **`EventBus`:** Periodic `prune_idle_channels()`; optional cap on `inbox_versions` with DB as source of truth.
5. **`AuthCache.verified`:** `retain()` expired entries on insert or periodic sweep.

---

## Related files

- Point probes: [`tests/memory_leak_probe.rs`](../../tests/memory_leak_probe.rs)
- Week-scale simulations: [`tests/memory_week_simulation.rs`](../../tests/memory_week_simulation.rs)
- Test registration: [`tests/Cargo.toml`](../../tests/Cargo.toml)
- Boot / shared state: [`crates/chatmail/src/boot.rs`](../../crates/chatmail/src/boot.rs)
- State hydration: [`crates/chatmail-state/src/lib.rs`](../../crates/chatmail-state/src/lib.rs) — `AppState::hydrate()`