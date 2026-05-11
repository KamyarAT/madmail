# Command-line interface (CLI)

This document lists **all subcommands** registered by the mail server binary. The installed name may be `madmail`, `maddy`, or another build-time name; examples below use `madmail`.

For full flags and argument details on any command, run:

```bash
madmail help
madmail <command> help
madmail <command> <subcommand> help
```

## Global flags

These apply before the subcommand name:

| Flag | Environment | Purpose |
|------|-------------|---------|
| `--config PATH` | `MADDY_CONFIG` | Path to the main configuration file |
| `--state-dir PATH` | *(varies by command; many DB helpers also use `MADDY_STATE_DIR`)* | Override state directory where databases and runtime files live |
| `--debug` | — | Enable debug logging early |

Many storage/auth commands also accept:

| Flag | Environment | Default |
|------|-------------|---------|
| `--cfg-block NAME` | `MADDY_CFGBLOCK` | Depends on command (often `local_authdb` or `local_mailboxes`) |

## Server lifecycle

| Command | Purpose |
|---------|---------|
| `run` | Start the server (preferred entry point) |
| `version` | Print version and build metadata |

**Deprecated:** Invoking the binary with **no** subcommand still starts the server (same as `run`) but prints a deprecation warning.

## Status and reload

| Command | Subcommands / usage |
|---------|---------------------|
| `status` | `[--details\|-d]` — Server status (connections, users, uptime, etc.) |
| `reload` | `--state-dir`, `--url`, `--insecure` — Trigger admin API `POST /admin/reload` (merge DB overrides, process exit for supervisor restart) |

## Installation and removal

| Command | Notes |
|---------|--------|
| `install` | Interactive or `--non-interactive` installer; many flags (`--domain`, `--state-dir`, TLS, TURN, Shadowsocks, etc.); see `madmail install help` |
| `uninstall` | `--force`, `--keep-data`, `--keep-user`, `--keep-config`, `--keep-binary`, `--dry-run`, `--log-file` |
| `upgrade PATH_OR_URL` | Replace binary after signature check; manages systemd when present |
| `update URL` | Alias for `upgrade` when the argument is a URL |

## Binary and HTML tooling

| Command | Arguments / notes |
|---------|-------------------|
| `hash` | Reads password from stdin unless `--password\|-p`; `--hash`, `--bcrypt-cost`, Argon2 flags |
| `html-export DEST_DIR` | Export embedded chatmail web assets |
| `html-serve WWW_DIR` | Point `maddy.conf` chatmail block at external `www`; use `embedded` / `embed` / `internal` to revert |

## Admin API and dashboard (credentials DB)

| Command | Subcommands |
|---------|-------------|
| `admin-token` | `--state-dir`, `--raw` — Show or generate admin API bearer token |
| `admin-web` | `status`, `enable`, `disable`, `path [PATH]`, `path --reset` — Admin web SPA toggle and URL path (`--state-dir` on subcommands) |

## Ports and network access (DB overrides)

| Command | Structure |
|---------|-----------|
| `port` | `status` — all services; then per-service trees (see below) |
| `port <service>` | `status`, `set <port>`, `reset`, and where supported `local`, `public` |

**`<service>` names:** `smtp`, `submission`, `submission-tls` (alias `submission_tls`), `imap`, `imap-tls` (alias `imap_tls`), `turn`, `sasl`, `iroh`, `shadowsocks` (alias `ss`), `http`, `https`.

| Command | Subcommands |
|---------|-------------|
| `submission-access` | `status`, `local`, `public` — Submission ports 587/465 public vs localhost-only (`--state-dir`) |

## Language and Web features (credentials DB)

| Command | Subcommands / notes |
|---------|---------------------|
| `language` | No args → current language; `status`, `set <LANG>`, `reset` (`en`, `fa`, `ru`, `es`; `--state-dir`) |
| `webimap` | `status`, `enable`, `disable` — Toggle `__WEBIMAP_ENABLED__`; enable/disable signal running daemon (SIGUSR2 on Linux) |
| `websmtp` | `status`, `enable`, `disable` — Toggle `__WEBSMTP_ENABLED__`; same signaling as `webimap` |

## Accounts (direct DB; chatmail-oriented)

Uses `--cfg-block` (auth) and `--storage-cfg-block` (IMAP storage) unless defaults match your config.

| Subcommand | Arguments / notes |
|------------|-------------------|
| `accounts status` | Summary counts |
| `accounts info USERNAME` | Per-account detail |
| `accounts create USERNAME` | `--password`, `--hash`, `--bcrypt-cost`, `-y` |
| `accounts create-random` | `--json-only` |
| `accounts delete USERNAME` | `-y` |
| `accounts ban USERNAME [REASON]` | `-y` |
| `accounts unban USERNAME` | `-y`; signals daemon |
| `accounts ban-list` | Tab-separated blocklist |
| `accounts export` | `-o` / `--output` file (default stdout); auth `--cfg-block` only |
| `accounts import FILE` | JSON array of `{username, password?}` |
| `accounts delete-all` | `-y` — destructive |

**Shorthand:** `ban-list` — same as `accounts ban-list`.

## One-shot user creation (module framework)

| Command | Notes |
|---------|--------|
| `create-user` | Random user + JSON + dclogin URI; `--cfg-block`, `--json-only` |

## Legacy credentials and IMAP (module framework)

| Command | Subcommands |
|---------|-------------|
| `creds` | `list`, `create USERNAME`, `remove USERNAME`, `password USERNAME`, `registration {open\|close\|status}`, `jit {enable\|disable\|status}`, `turn {on\|off\|status}`, `logging {on\|off\|status}` |
| `imap-acct` | `list`, `create USERNAME`, `remove USERNAME`, `quota {get\|set\|reset\|list\|set-default}`, `purge-msgs USERNAME`, `purge-all`, `purge-read USERNAME`, `prune-unread USERNAME`, `stat USERNAME`, `appendlimit USERNAME`, `prune-unused RETENTION` |
| `imap-mboxes` | `list`, `create`, `remove`, `rename` — per-user mailbox ops |
| `imap-msgs` | `add`, `add-flags`, `rem-flags`, `set-flags`, `remove`, `copy`, `move`, `list`, `dump` |

## Full account delete (shortcut)

| Command | Notes |
|---------|--------|
| `delete USERNAME` | `--auth-block`, `--storage-block`, `-y`, `--reason` — creds + IMAP + blocklist |

## Blocklist (storage DB)

| Command | Subcommands |
|---------|-------------|
| `blocklist` | `list`, `add`, `remove` — `--cfg-block` |

## Queue

| Command | Subcommands |
|---------|-------------|
| `queue` | `purge USERNAME` — `--cfg-block` (default `remote_queue`), `--sender`, `--recipient` |

## Federation (credentials / policy DB)

| Command | Subcommands |
|---------|-------------|
| `federation` | `policy accept\|reject`, `block DOMAIN`, `allow DOMAIN`, `remove DOMAIN`, `flush`, `list`, `status` |

## Exchangers (relay poll DB)

| Command | Subcommands |
|---------|-------------|
| `exchanger` | `list`, `add NAME ENDPOINT [--interval SEC]`, `remove NAME`, `enable NAME`, `disable NAME` |

## Registration tokens (GORM on credentials DB)

Aliases: `reg-tokens`, `tokens`.

| Subcommand | Arguments / flags |
|------------|-------------------|
| `registration-tokens create` | `--token`, `--max-uses`, `--comment`, `--expires` |
| `registration-tokens list` | |
| `registration-tokens status <token>` | |
| `registration-tokens delete <token>` | |

## Contact sharing (GORM; requires config)

| Command | Subcommands |
|---------|-------------|
| `sharing` | `list`, `create SLUG URL [NAME]`, `reserve SLUG`, `remove SLUG` (alias `delete`), `edit SLUG NEW_URL [NEW_NAME]` |

## Endpoint override cache (GORM; requires config)

Aliases: `dns-cache`.

| Subcommand | Arguments |
|------------|-----------|
| `endpoint-cache list` | |
| `endpoint-cache set LOOKUP_KEY TARGET_HOST [COMMENT]` | |
| `endpoint-cache get LOOKUP_KEY` | |
| `endpoint-cache remove LOOKUP_KEY` | alias `delete` |

## Hidden / developer commands

Not shown in normal help:

| Command | Purpose |
|---------|---------|
| `generate-man` | Emit roff man page for the CLI |
| `generate-fish-completion` | Emit fish completion script |

---

## Quick index (top-level names only)

`run`, `version`, `status`, `reload`, `install`, `uninstall`, `upgrade`, `update`, `hash`, `html-export`, `html-serve`, `admin-token`, `admin-web`, `port`, `submission-access`, `language`, `webimap`, `websmtp`, `accounts`, `ban-list`, `create-user`, `creds`, `imap-acct`, `imap-mboxes`, `imap-msgs`, `delete`, `blocklist`, `queue`, `federation`, `exchanger`, `registration-tokens`, `sharing`, `endpoint-cache`, `generate-man`, `generate-fish-completion`.
