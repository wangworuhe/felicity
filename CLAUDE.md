# CLAUDE.md

微信小程序项目（原生框架 + 微信云开发），记录生活中的幸福瞬间。

## 常用命令

本项目无 npm 构建流程。所有预览、调试、云函数部署都在**微信开发者工具**中完成。

## 项目结构

- `miniprogram/pages/` — 页面层，每个页面含 .js/.json/.wxml/.wxss 四个文件
- `miniprogram/services/` — 业务逻辑层，封装云函数调用
- `miniprogram/utils/` — 工具层（cloud.js, toast.js, constants.js, validator.js）
- `cloudfunctions/` — 云函数，每个函数独立目录，需在开发者工具中手动部署
- 数据库集合：`happiness_records`、`fortune_records`，权限均为"仅创建者可读写"

## 关键约定

- 新增页面后必须在 `miniprogram/app.json` 的 pages 数组中注册
- 云函数调用统一走 `utils/cloud.js` 的 `callFunction()`，不要直接调用 `wx.cloud.callFunction`
- 文件上传统一走 `utils/cloud.js` 的 `uploadFile()`
- 常量（集合名、提示文案等）统一定义在 `utils/constants.js`
- 仅为关键逻辑添加中文注释，不加冗余注释

## 注意事项

- 本项目同时使用 Claude Code 和 OpenAI Codex 开发，Codex 配置见 `AGENTS.md`
- 代码变更后及时 commit，保持两个工具的上下文同步
- 每次变更记录到 `.codebuddy/logs/YYYY-MM-DD.md`
- 不要主动创建文档文件

## 参考文档

- 产品需求：`REQUIREMENTS.md`
- 架构说明：`ARCHITECTURE.md`
