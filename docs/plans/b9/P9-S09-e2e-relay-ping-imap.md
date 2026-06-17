# P9-S09: E2E — relay-ping-style IMAP (and SMTP optional)

## Action

Full wire E2E using the same harness as existing mail tests (not go-imap library — raw TCP like relay-ping documents):

### In-process (`chatmail-integration`)

New tests in `tests/turn_e2e.rs`:

| Test | Steps |
|------|--------|
| `turn_imap_e2e_capability_metadata` | CAPABILITY includes `METADATA` when TURN on |
| `turn_imap_e2e_getmetadata_deltachat` | `GETMETADATA "" /shared/vendor/deltachat/turn` → four-field line |
| `turn_imap_e2e_getmetadata_requires_auth` | PREAUTH/NOT AUTHENTICATED → no leak |
| `turn_imap_e2e_turn_disabled` | `turn_enable=no` → key absent |

Fix/remove stub [`imap_e2e_getmetadata_turn_relay`](../../../tests/imap_e2e.rs) (`/private/turn/relay`, `turn://`).

### SMTP (relay-ping parity)

Optional: after IMAP metadata fetch, `smtp_submit` from [`tests/support/mod.rs`](../../../tests/support/mod.rs) to prove mail stack still healthy — same session as Secure Join E2E (no TURN on SMTP, regression guard only).

### External relay-ping binary (Docker container)

Implemented as `make test-docker-turn-e2e` ([`scripts/docker-turn-e2e.sh`](../../../scripts/docker-turn-e2e.sh)):

1. `docker build` → `install --simple --ip 127.0.0.1`
2. Patch `relay_port_min` / `relay_port_max` (default test range `55000–55010`) and map UDP ports
3. `relay-ping -test connectivity` (SMTP/IMAP + `getmetadata-deltachat-turn`)
4. `cargo test -p chatmail-integration --test docker_turn_e2e docker_turn_live_allocate -- --ignored` — TURN allocate in range

Reference: [`context/relay-ping/internal/check/imapcheck/imapcheck.go`](../../../context/relay-ping/internal/check/imapcheck/imapcheck.go) — LOGIN, SELECT, IDLE, GETMETADATA `/shared/vendor/deltachat/turn`.

## Files touched

- `tests/turn_e2e.rs`
- `tests/imap_e2e.rs` — remove wrong key
- `Makefile` — `test-turn`, `test-docker-turn-e2e`
- `scripts/docker-turn-e2e.sh`, `tests/docker_turn_e2e.rs`
- `docs/TDD/03-imap-server.md` — cross-link b9

## TDD references

- [03-imap-server.md](../../TDD/03-imap-server.md) — relay-ping IDLE table
- [11-proxy-services.md](../../TDD/11-proxy-services.md)

## Madmail / context references

- `context/relay-ping/README.md`
- `tests/support/imap_client.rs` — "relay-ping style dialog"

## RFC references

- [RFC 5464](../../TDD/RFC/rfc5464.txt)
- [RFC 3501](../../TDD/RFC/rfc3501.txt) — LOGIN, authenticated state

## Verification

**P9-E2E01**

```bash
cargo test -p chatmail-integration turn_imap_e2e
make test-turn   # unit + smoke + in-process integration/e2e
make test-docker-turn-e2e   # Docker image + relay-ping + UDP allocate (manual)
```

## Linked tests

| Test ID | Step |
|---------|------|
| **P9-E2E01** | `P9-S09` |

## Next

[P9-S10-e2e-core-ice-servers.md](P9-S10-e2e-core-ice-servers.md)
