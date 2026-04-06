# Fork Overview

## Repository

- Fork repository: `https://github.com/w0fv1/csdm-lite`
- Upstream repository: `https://github.com/akiver/cs-demo-manager`

## Purpose

This fork exists to keep the CS Demo Manager experience available as a SQLite-first desktop application.

The primary product decision is:

- local embedded SQLite only
- no PostgreSQL runtime dependency
- minimal setup for end users

## Scope

This fork aims to preserve the core workflows that matter most for local demo management:

- opening the application without configuring a database server
- importing and analyzing demos locally
- browsing matches, players, and related data from a local SQLite file
- packaging the application as an ordinary desktop app

## Known Fork Policy

- PostgreSQL runtime support is intentionally not part of this fork.
- SQLite compatibility is preferred over feature parity when the two conflict.
- Upstream changes are merged selectively.
- Packaging must continue to support:
  - installer builds
  - unpacked builds
  - Windows portable single-file builds

## Release Channels

Planned release channel:

- GitHub Releases: `https://github.com/w0fv1/csdm-lite/releases`

## Related Documents

- [Application guides](./application-guides.md)
- [PostgreSQL to SQLite migration rationale](./postgresql-to-sqlite-migration.md)
- [Upstream merge workflow](./upstream-merge-workflow.md)
- [Upstream sync state](./upstream-sync-state.md)
