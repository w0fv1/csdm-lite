# CS Demo Manager Lite

SQLite-first fork of [CS Demo Manager](https://github.com/akiver/cs-demo-manager) for local, zero-setup demo management.

[简体中文 README](./README.zh-CN.md)

![Preview](./preview.png)

## Project Status

`csdm-lite` keeps the core CS Demo Manager desktop workflow, but intentionally removes the PostgreSQL runtime requirement and treats SQLite as the only supported embedded database.

This fork is maintained in:

- Repository: `https://github.com/w0fv1/csdm-lite`
- Upstream project: `https://github.com/akiver/cs-demo-manager`

## What Is Different From Upstream

- SQLite is the only supported runtime database.
- The application opens the local database automatically.
- PostgreSQL runtime dependencies and setup flows are not part of this fork.
- Features that strongly depend on PostgreSQL may be simplified, rewritten, or dropped.
- Windows releases include a single-file portable build in addition to the installer and unpacked directory build.

## Releases

Planned release location:

- Releases: `https://github.com/w0fv1/csdm-lite/releases`

Windows builds are expected to include:

- installer: `CS Demo Manager Setup *-lite.exe`
- portable single-file build: `CS Demo Manager Portable *-lite.exe`
- unpacked directory build containing `csdm-lite.exe`

## Documentation

- [Application guides](./docs/application-guides.md)
- [Fork overview](./docs/fork-overview.md)
- [PostgreSQL to SQLite migration rationale](./docs/postgresql-to-sqlite-migration.md)
- [Upstream merge workflow](./docs/upstream-merge-workflow.md)
- [Upstream sync state](./docs/upstream-sync-state.md)

## Development

Useful commands:

- `npm run compile`
- `npm test`
- `npm run package:dir`
- `npm run package:portable`

For database or packaging changes, the default smoke test demo is:

- `9207927388930273548_0.dem`

## License

[MIT](./LICENSE)
