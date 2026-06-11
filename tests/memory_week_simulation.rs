//! Week-scale memory simulation for the reported production profile:
//!   - 3000 user accounts in DB (only ~300 actively receive mail)
//!   - 3000 messages/day for 7 days
//!   - Observed: ~400 MiB → ~1 GiB RSS over one week
//!
//! Run (release, closest to production):
//!   cargo test -p chatmail-integration --test memory_week_simulation --release -- --nocapture

mod support;

use std::sync::Arc;

use chatmail_config::AppConfig;
use chatmail_state::AppState;
use chatmail_storage::{list_mailbox_messages, write_blob, FsyncMode, MailboxStore, StoragePolicy};
use support::{create_user, deliver_message, spawn_mail_servers_opts, ImapClient, MailServersOpts};

const TOTAL_USERS: usize = 3000;
const ACTIVE_USERS: usize = 300;
const MSGS_PER_DAY: usize = 3000;
const DAYS: usize = 7;
/// IMAP clients poll listing roughly this many times per day (FETCH/IDLE cycles).
const LIST_POLLS_PER_USER_PER_DAY: usize = 50;

fn rss_kib() -> usize {
    let page_size = 4096usize;
    std::fs::read_to_string("/proc/self/statm")
        .ok()
        .and_then(|s| s.split_whitespace().nth(1)?.parse::<usize>().ok())
        .map(|pages| pages * page_size / 1024)
        .unwrap_or(0)
}

#[derive(Debug, Clone)]
struct Snapshot {
    label: String,
    rss_kib: usize,
    auth_users: usize,
    jit_flights: usize,
    inbox_versions: usize,
    idle_subscribers: usize,
}

impl Snapshot {
    fn take(ctx: &AppState, label: impl Into<String>) -> Self {
        Self {
            label: label.into(),
            rss_kib: rss_kib(),
            auth_users: ctx.auth.len(),
            jit_flights: ctx.jit_flights.len(),
            inbox_versions: ctx.events.inbox_version_snapshot().len(),
            idle_subscribers: ctx.events.total_subscribers(),
        }
    }

    fn print(&self, baseline: &Self) {
        let delta = self.rss_kib as isize - baseline.rss_kib as isize;
        eprintln!(
            "[{}] RSS={} KiB ({:+.0} MiB) auth={} jit_flights={} inbox_versions={} idle_subs={}",
            self.label,
            self.rss_kib,
            delta as f64 / 1024.0,
            self.auth_users,
            self.jit_flights,
            self.inbox_versions,
            self.idle_subscribers,
        );
    }
}

async fn seed_users(ctx: &AppState, pool: &chatmail_db::DbPool, total: usize, active: usize) {
    for i in 0..total {
        let user = format!("usr{i:04}@test");
        create_user(ctx, pool, &user, "secret-pass").await;
        if i < active {
            ctx.mailbox_store.init_user_dir(&user).await.expect("init");
        }
    }
}

/// Model A: 3000 accounts, 300 active maildirs, 3000 msgs/day split across actives (~10/user/day).
#[tokio::test]
async fn simulate_week_3000_users_300_active_3000_msgs_per_day() {
    let dir = tempfile::tempdir().expect("tempdir");
    let pool = chatmail_db::init_memory_db().await.expect("db");
    let ctx = Arc::new(AppState::new(dir.path(), pool.clone()));
    ctx.hydrate(&pool, &AppConfig::default())
        .await
        .expect("hydrate");

    seed_users(&ctx, &pool, TOTAL_USERS, ACTIVE_USERS).await;
    ctx.hydrate(&pool, &AppConfig::default())
        .await
        .expect("rehydrate");

    let baseline = Snapshot::take(&ctx, "day0-baseline");
    baseline.print(&baseline);

    let body = b"From: a@test\r\nTo: b@test\r\nSubject: wk\r\n\r\nbody\r\n";
    let mut total_delivered = 0usize;

    for day in 1..=DAYS {
        for m in 0..MSGS_PER_DAY {
            let active_idx = m % ACTIVE_USERS;
            let user = format!("usr{active_idx:04}@test");
            let msg_id = format!("d{day}-m{m}");
            deliver_message(&ctx, &user, &msg_id, body).await;
            total_delivered += 1;
        }

        // Simulate IMAP listing polls (cache hits clone full Vec each time — see maildir_cache.rs).
        for u in 0..ACTIVE_USERS {
            let user = format!("usr{u:04}@test");
            for _ in 0..LIST_POLLS_PER_USER_PER_DAY {
                let _ = list_mailbox_messages(&ctx.mailbox_store, &user, "INBOX")
                    .await
                    .expect("list");
            }
        }

        let snap = Snapshot::take(&ctx, format!("day{day}"));
        snap.print(&baseline);
    }

    eprintln!(
        "totals: delivered={total_delivered} msgs, {} list polls",
        ACTIVE_USERS * LIST_POLLS_PER_USER_PER_DAY * DAYS
    );

    let final_snap = Snapshot::take(&ctx, "final");
    let growth_mib = (final_snap.rss_kib - baseline.rss_kib) as f64 / 1024.0;
    eprintln!("=== week growth: {growth_mib:.1} MiB RSS (target observation: ~400-600 MiB) ===");
}

/// Model B: same traffic but messages round-robin across ALL 3000 users (worst-case map growth).
#[tokio::test]
async fn simulate_week_messages_touch_all_3000_users() {
    let dir = tempfile::tempdir().expect("tempdir");
    let pool = chatmail_db::init_memory_db().await.expect("db");
    let ctx = Arc::new(AppState::new(dir.path(), pool.clone()));

    seed_users(&ctx, &pool, TOTAL_USERS, ACTIVE_USERS).await;
    ctx.hydrate(&pool, &AppConfig::default())
        .await
        .expect("hydrate");

    let baseline = Snapshot::take(&ctx, "day0");
    baseline.print(&baseline);

    let body = b"From: a@test\r\nTo: b@test\r\n\r\nx\r\n";
    for day in 1..=DAYS {
        for m in 0..MSGS_PER_DAY {
            let idx = (day * MSGS_PER_DAY + m) % TOTAL_USERS;
            let user = format!("usr{idx:04}@test");
            if idx < ACTIVE_USERS {
                deliver_message(&ctx, &user, &format!("d{day}-m{m}"), body).await;
            } else {
                // Dormant account still gets notify path if we wrote — skip write, only notify
                // to measure inbox_versions growth without maildir.
                ctx.events
                    .notify_new_message(&user, &format!("d{day}-m{m}"));
            }
        }
        // List every user who has a maildir (300) + scan listing for first 3000? only active have dirs
        for u in 0..ACTIVE_USERS {
            let user = format!("usr{u:04}@test");
            let _ = list_mailbox_messages(&ctx.mailbox_store, &user, "INBOX")
                .await
                .expect("list");
        }
        Snapshot::take(&ctx, format!("day{day}")).print(&baseline);
    }
}

/// Model C: `mail_fsync=never` + CAS (relay config) — DeliveryBatcher worker leak per mailbox.
#[tokio::test]
async fn simulate_week_never_cas_300_active_users() {
    let dir = tempfile::tempdir().expect("tempdir");
    let cfg = AppConfig {
        mail_fsync: Some("never".into()),
        blob_dedup: Some("on".into()),
        ..Default::default()
    };
    let pool = chatmail_db::init_memory_db().await.expect("db");
    let ctx = Arc::new(AppState::with_quota_and_message_limit(
        dir.path(),
        chatmail_config::DEFAULT_QUOTA_BYTES,
        &cfg,
        pool.clone(),
    ));
    seed_users(&ctx, &pool, TOTAL_USERS, ACTIVE_USERS).await;

    let baseline = Snapshot::take(&ctx, "day0-never");
    baseline.print(&baseline);

    for day in 1..=DAYS {
        for m in 0..MSGS_PER_DAY {
            let idx = m % ACTIVE_USERS;
            let user = format!("usr{idx:04}@test");
            let payload = format!("unique-d{day}-m{m}-{}", "y".repeat(128));
            write_blob(
                &ctx.mailbox_store,
                &user,
                &format!("d{day}-m{m}"),
                payload.as_bytes(),
            )
            .await
            .expect("write");
            ctx.events
                .notify_new_message(&user, &format!("d{day}-m{m}"));
        }
        Snapshot::take(&ctx, format!("never-day{day}")).print(&baseline);
    }
}

/// Model D: 300 concurrent IMAP IDLE sessions polling (Delta Chat style) on live server.
#[tokio::test]
async fn simulate_week_300_imap_idle_connections() {
    let dir = tempfile::tempdir().expect("tempdir");
    let srv = spawn_mail_servers_opts(
        dir.path(),
        MailServersOpts {
            turn: false,
            push_enabled: false,
        },
    )
    .await;

    for i in 0..TOTAL_USERS {
        let user = format!("usr{i:04}@test");
        create_user(&srv.ctx, &srv.pool, &user, "secret-pass").await;
        if i < ACTIVE_USERS {
            srv.ctx
                .mailbox_store
                .init_user_dir(&user)
                .await
                .expect("init");
        }
    }

    let baseline = Snapshot::take(&srv.ctx, "imap-day0");
    baseline.print(&baseline);

    let body = b"From: a@test\r\nTo: b@test\r\n\r\nbody\r\n";

    // Keep 30 IDLE connections (full 300 is heavy in CI); scale ×10 in analysis.
    const IDLE_CONNECTIONS: usize = 30;
    let mut clients = Vec::new();
    for i in 0..IDLE_CONNECTIONS {
        let user = format!("usr{i:04}@test");
        let mut c = ImapClient::connect(srv.imap_addr).await;
        c.command(&format!("a{i:03} LOGIN {user} secret-pass"))
            .await;
        c.command(&format!("b{i:03} SELECT INBOX")).await;
        c.idle_start(&format!("c{i:03}")).await;
        clients.push(c);
    }

    for day in 1..=DAYS {
        for m in 0..MSGS_PER_DAY {
            let idx = m % ACTIVE_USERS;
            let user = format!("usr{idx:04}@test");
            deliver_message(&srv.ctx, &user, &format!("d{day}-m{m}"), body).await;
        }
        // FETCH cycle on connected clients
        for (i, c) in clients.iter_mut().enumerate() {
            c.command(&format!("d{i:03} DONE")).await;
            c.command(&format!("e{i:03} UID FETCH 1:* (FLAGS)")).await;
            c.idle_start(&format!("f{i:03}")).await;
        }
        Snapshot::take(&srv.ctx, format!("imap-day{day}")).print(&baseline);
    }

    eprintln!(
        "note: {IDLE_CONNECTIONS} real IDLE sessions; multiply RSS deltas by ~{} for 300 clients",
        ACTIVE_USERS / IDLE_CONNECTIONS
    );
}

/// Model E: group-chat fan-out — 50 SMTP messages/day × 60 local recipients = 3000 deliveries/day.
#[tokio::test]
async fn simulate_week_group_fanout_60_recipients() {
    use chatmail_storage::deliver_local_messages;

    let dir = tempfile::tempdir().expect("tempdir");
    let pool = chatmail_db::init_memory_db().await.expect("db");
    let ctx = Arc::new(AppState::new(dir.path(), pool.clone()));
    seed_users(&ctx, &pool, TOTAL_USERS, ACTIVE_USERS).await;

    let baseline = Snapshot::take(&ctx, "fanout-day0");
    baseline.print(&baseline);

    let body = vec![b'z'; 8 * 1024]; // 8 KiB group message
    const MSGS_PER_DAY: usize = 50;
    const FANOUT: usize = 60; // 50 × 60 = 3000 recipient deliveries/day

    for day in 1..=DAYS {
        for msg in 0..MSGS_PER_DAY {
            let deliveries: Vec<(String, String)> = (0..FANOUT)
                .map(|r| {
                    let idx = (msg * FANOUT + r) % ACTIVE_USERS;
                    (format!("usr{idx:04}@test"), format!("d{day}-g{msg}-r{r}"))
                })
                .collect();
            deliver_local_messages(&ctx.mailbox_store, &deliveries, &body)
                .await
                .expect("fanout");
            for (user, msg_id) in &deliveries {
                ctx.events.notify_new_message(user, msg_id);
            }
        }
        for u in 0..ACTIVE_USERS {
            let user = format!("usr{u:04}@test");
            for _ in 0..LIST_POLLS_PER_USER_PER_DAY {
                let _ = list_mailbox_messages(&ctx.mailbox_store, &user, "INBOX")
                    .await
                    .expect("list");
            }
        }
        Snapshot::take(&ctx, format!("fanout-day{day}")).print(&baseline);
    }

    let final_snap = Snapshot::take(&ctx, "fanout-final");
    eprintln!(
        "fanout week growth: {:.1} MiB ({} msgs/user after {} days)",
        (final_snap.rss_kib - baseline.rss_kib) as f64 / 1024.0,
        MSGS_PER_DAY * FANOUT * DAYS / ACTIVE_USERS,
        DAYS
    );
}

/// Model F: all 3000 users receive mail (1 msg/user/day) + daily INBOX list for every user.
#[tokio::test]
async fn simulate_week_all_3000_users_receive_and_list_daily() {
    let dir = tempfile::tempdir().expect("tempdir");
    let pool = chatmail_db::init_memory_db().await.expect("db");
    let ctx = Arc::new(AppState::new(dir.path(), pool.clone()));

    for i in 0..TOTAL_USERS {
        let user = format!("usr{i:04}@test");
        create_user(&ctx, &pool, &user, "secret-pass").await;
        ctx.mailbox_store.init_user_dir(&user).await.expect("init");
    }
    ctx.hydrate(&pool, &AppConfig::default())
        .await
        .expect("hydrate");

    let baseline = Snapshot::take(&ctx, "allrecv-day0");
    baseline.print(&baseline);

    let body = b"From: a@test\r\n\r\nx\r\n";
    for day in 1..=DAYS {
        for i in 0..TOTAL_USERS {
            let user = format!("usr{i:04}@test");
            deliver_message(&ctx, &user, &format!("d{day}-u{i}"), body).await;
        }
        for i in 0..TOTAL_USERS {
            let user = format!("usr{i:04}@test");
            let _ = list_mailbox_messages(&ctx.mailbox_store, &user, "INBOX")
                .await
                .expect("list");
        }
        Snapshot::take(&ctx, format!("allrecv-day{day}")).print(&baseline);
    }
}

/// Model G: 300 active users but NO purge — 1000 msgs/mailbox in cache (≈6 weeks at 10/day, or no auto-purge).
#[tokio::test]
async fn simulate_large_mailbox_cache_300_users_1000_msgs() {
    let dir = tempfile::tempdir().expect("tempdir");
    let store = MailboxStore::new(dir.path());
    const USERS: usize = 300;
    const MSGS: usize = 1000;
    let body = vec![b'm'; 2048];

    for u in 0..USERS {
        let user = format!("usr{u:04}@test");
        store.init_user_dir(&user).await.expect("init");
        for m in 0..MSGS {
            write_blob(&store, &user, &format!("{m:036x}"), &body)
                .await
                .expect("write");
        }
    }

    let baseline = rss_kib();
    for u in 0..USERS {
        let user = format!("usr{u:04}@test");
        let _ = list_mailbox_messages(&store, &user, "INBOX")
            .await
            .expect("list");
    }
    let after_list = rss_kib();

    // Hammer cache hits (IMAP week of polling)
    for _ in 0..(50 * 7) {
        for u in 0..USERS {
            let user = format!("usr{u:04}@test");
            let _ = list_mailbox_messages(&store, &user, "INBOX")
                .await
                .expect("list");
        }
    }
    let after_poll = rss_kib();

    eprintln!(
        "large_cache: {USERS} users × {MSGS} msgs — RSS list +{} MiB, after polls +{} MiB total +{} MiB",
        (after_list as isize - baseline as isize) as f64 / 1024.0,
        (after_poll as isize - after_list as isize) as f64 / 1024.0,
        (after_poll as isize - baseline as isize) as f64 / 1024.0,
    );
}

/// Isolate clone-on-cache-hit churn (no new deliveries after day 1).
#[tokio::test]
async fn simulate_allocator_churn_from_cache_clones() {
    let dir = tempfile::tempdir().expect("tempdir");
    let store = MailboxStore::with_policy(
        dir.path(),
        StoragePolicy {
            fsync_mode: FsyncMode::Always,
            cas_enabled: false,
            ..StoragePolicy::default()
        },
    );
    const USERS: usize = 300;
    const MSGS: usize = 70; // ~1 week at 10/day
    let body = vec![b'x'; 1024];

    for u in 0..USERS {
        let user = format!("usr{u:04}@test");
        store.init_user_dir(&user).await.expect("init");
        for m in 0..MSGS {
            write_blob(&store, &user, &format!("m{m}"), &body)
                .await
                .expect("write");
        }
    }

    let baseline = rss_kib();
    const POLLS: usize = 50 * 7; // 50/day × 7 days
    for _ in 0..POLLS {
        for u in 0..USERS {
            let user = format!("usr{u:04}@test");
            let _ = list_mailbox_messages(&store, &user, "INBOX")
                .await
                .expect("list");
        }
    }
    let after = rss_kib();
    eprintln!(
        "cache_clone_churn: {USERS} users × {MSGS} msgs × {POLLS} poll rounds → RSS +{} MiB",
        (after as isize - baseline as isize) as f64 / 1024.0
    );
}
