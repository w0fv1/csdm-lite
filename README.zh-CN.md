# CS Demo Manager Lite

`CS Demo Manager Lite` 是 [CS Demo Manager](https://github.com/akiver/cs-demo-manager) 的一个 SQLite 优先分叉版本，目标是提供本地零配置的 Counter-Strike demo 管理体验。

[English README](./README.md)

![Preview](./preview.png)

## 项目状态

`csdm-lite` 保留了原项目的大部分桌面工作流，但明确将 SQLite 作为唯一支持的运行时数据库，不再要求 PostgreSQL 服务。

当前分叉目标：

- 仓库地址：`https://github.com/w0fv1/csdm-lite`
- 上游仓库：`https://github.com/akiver/cs-demo-manager`

## 与上游的主要区别

- 运行时数据库仅支持 SQLite
- 应用启动时自动打开本地数据库
- 不再保留 PostgreSQL 的安装、连接、服务依赖和手工配置流程
- 强依赖 PostgreSQL 的功能会被改写、简化，或在必要时移除
- Windows 发布产物额外提供单文件便携版

## 发布产物

计划发布地址：

- Releases：`https://github.com/w0fv1/csdm-lite/releases`

Windows 产物包括：

- 安装版：`CS Demo Manager Setup *-lite.exe`
- 单文件便携版：`CS Demo Manager Portable *-lite.exe`
- 免安装目录版：其中主程序为 `csdm-lite.exe`

## 文档

- [应用使用与故障排查指南](./docs/application-guides.md)
- [分叉说明](./docs/fork-overview.md)
- [PostgreSQL 到 SQLite 的迁移说明](./docs/postgresql-to-sqlite-migration.md)
- [上游同步与合并流程规范](./docs/upstream-merge-workflow.md)
- [上游同步状态](./docs/upstream-sync-state.md)

## 开发命令

- `npm run compile`
- `npm test`
- `npm run package:dir`
- `npm run package:portable`

数据库或打包相关改动，默认使用以下 demo 做烟雾测试：

- `9207927388930273548_0.dem`

## 许可证

[MIT](./LICENSE)
