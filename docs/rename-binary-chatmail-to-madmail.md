# Renaming the main binary: `chatmail` → `madmail`

Today `cargo build` produces `target/debug/chatmail` and `target/release/chatmail`. Production deploy paths already expect **`madmail`** (`/usr/local/bin/madmail`, `build/madmail-linux-amd64`, systemd units, etc.). This document lists what to change so the Cargo artifact name matches.

The **Rust crate/package name can stay `chatmail`**. Only the `[[bin]]` name and references to the built file path need updating.

## 1. Cargo binary name (required)

**File:** `crates/chatmail/Cargo.toml`

```toml
[[bin]]
name = "chatmail"   # change to "madmail"
path = "src/main.rs"
```

After this change:

- `cargo build -p chatmail` still works (package name unchanged)
- Output becomes `target/debug/madmail` and `target/release/madmail`

Do **not** change `[package] name`, `[lib] name`, or workspace crate names unless you want a full crate rename (out of scope here).

## 2. Makefile (required)

**File:** `Makefile`

Update every hardcoded `target/.../chatmail` path:

| Variable / location | Current | Change to |
|---------------------|---------|-----------|
| `BINARY_DEBUG` | `target/debug/chatmail` | `target/debug/madmail` |
| `BINARY_RELEASE` | `target/release/chatmail` | `target/release/madmail` |
| Cross-compile `cp` targets | `.../release/chatmail` | `.../release/madmail` |
| Windows build | `.../release/chatmail.exe` | `.../release/madmail.exe` |
| `pkill` in `stop` | `target/debug/chatmail` | `target/debug/madmail` |

`cargo build -p chatmail` invocations stay as-is (they refer to the **package**, not the binary filename).

Release packaging (`cp ... build/madmail-linux-amd64`) is already correct — it only needs the source path updated.

## 3. Build and push scripts (required)

These scripts default to `target/release/chatmail` and must be updated:

| File | What to change |
|------|----------------|
| `scripts/deploy.sh` | `BIN="${BINARY_PUSH:-target/release/chatmail}"` → `.../madmail` |
| `scripts/sign.sh` | same `BINARY_PUSH` default |
| `scripts/to-ir.sh` | same `BINARY_PUSH` default |
| `scripts/build-release-static.sh` | `--bin chatmail` → `--bin madmail`; `bin=target/release/chatmail` → `.../madmail` |

### Already fine (no change)

| File | Why |
|------|-----|
| `scripts/publish.sh` | Uses `build/madmail-linux-amd64` etc. (packaged names) |
| `scripts/deploy.defaults.sh` | `REMOTE_BIN=/usr/local/bin/madmail` |

### Temporary workaround

Until all defaults are updated, you can push with:

```bash
BINARY_PUSH=target/release/madmail make push
```

That works for deploy/sign/to-ir, but `make build-release` still fails if the Makefile `cp` steps point at the old path.

## 4. CI (required if you use GitHub Actions)

**File:** `.github/workflows/ci.yml`

- `cargo build --release --locked --bin chatmail` → `--bin madmail`
- Artifact path `target/release/chatmail` → `target/release/madmail`

## 5. Tests (required)

| File | What to change |
|------|----------------|
| `tests/lib.rs` | `.join("chatmail")` → `.join("madmail")`; `--bin chatmail` → `--bin madmail` |
| `crates/chatmail/tests/boot_test.rs` | `cargo_bin("chatmail")` → `cargo_bin("madmail")` |

## 6. E2E / dev scripts (optional)

Only matters if you run these scripts directly:

| File | What to change |
|------|----------------|
| `scripts/core-e2e.sh` | default `CHATMAIL_BIN=.../target/debug/chatmail` |
| `scripts/core-e2e-turn.sh` | same |
| `scripts/turn-debug-env.sh` | comment/example path |

## 7. CLI display name (recommended)

**File:** `crates/chatmail-config/src/cli.rs`

```rust
#[command(
    name = "chatmail",   // change to "madmail"
    ...
)]
```

This affects `--help` and error messages, not the build output. Various `crates/chatmail/src/ctl/*.rs` strings still say `chatmail reload` etc.; update for consistency when convenient.

## 8. What you do **not** need to change

- Workspace crate names (`chatmail`, `chatmail-db`, …) and `crates/chatmail-*` directories
- `cargo build -p chatmail` / `cargo run -p chatmail`
- Library name `[lib] name = "chatmail"`
- Config/data filenames (`chatmail.toml`, `chatmail.db`) — separate from the binary name
- Release download names (`madmail-linux-amd64`, tarballs, FTP paths) — already `madmail`

## 9. Already expects `madmail` in production

No changes needed here; renaming the binary aligns dev with deploy:

- `crates/chatmail/src/ctl/install/mod.rs` — service name from `argv[0]`, default `"madmail"`
- `crates/chatmail/src/ctl/uninstall.rs` — `DEFAULT_BINARY_NAME = "madmail"`
- `scripts/deploy.defaults.sh` — `REMOTE_BIN=/usr/local/bin/madmail`

## Checklist

1. [ ] `crates/chatmail/Cargo.toml` — `[[bin]] name = "madmail"`
2. [ ] `Makefile` — `BINARY_DEBUG`, `BINARY_RELEASE`, cross-compile copies, `pkill`
3. [ ] `scripts/deploy.sh`, `sign.sh`, `to-ir.sh`, `build-release-static.sh`
4. [ ] `.github/workflows/ci.yml` (if used)
5. [ ] `tests/lib.rs`, `crates/chatmail/tests/boot_test.rs`
6. [ ] `crates/chatmail-config/src/cli.rs` — clap `name` (optional but recommended)
7. [ ] Verify: `cargo build -p chatmail --release && ls -l target/release/madmail`
8. [ ] Verify: `make build-release && ls -l build/madmail-linux-amd64`