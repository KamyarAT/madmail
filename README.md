# Madmail CLI parity (test / documentation anchor)

This directory holds documentation hooks for **madmail / `maddy` CLI** parity with **`cmrelay`** management commands.

- Full upstream command and flag reference: [doc/madmail/cli-reference.md](../../doc/madmail/cli-reference.md)
- Implemented vs stub matrix: [doc/madmail/cmrelay-parity.md](../../doc/madmail/cmrelay-parity.md)
- Index: [doc/madmail/README.md](../../doc/madmail/README.md)

Automated tests for CLI parity are not required here; the authoritative parity source is `src/manager/internal/madmailctl/commands.go` plus individual `newLeafStub("…", "file.go")` references.
