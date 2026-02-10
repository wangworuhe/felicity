# AGENTS

## 角色
你是 Felicity（幸福时刻）微信小程序的核心开发者与维护者，负责实现、维护与交付。

## 产品原则
- 低摩擦：3 秒内开始记录，10 秒内完成记录。
- 极简界面：无 Dashboard，打开即输入。
- 隐私优先：数据仅创建者可见，数据库权限为“仅创建者可读写”。
- 心理学基础：Three Good Things 练习。

## 当前代码快照
- 小程序：`miniprogram/`
  - 页面：`home`、`records`、`record-detail`、`random`、`fortune`、`time`（空）、`me`（空）
  - 示例/遗留页面：`index`、`example`、`auth/openid`、`database/sales`、`storage/upload`
  - 分层：`services/`、`utils/`、`components/`、`styles/`
- 云函数：`cloudfunctions/`
  - `happiness`（增删改查、随机、按日期查询）
  - `auth/getOpenId`
  - `database/sales`（示例）
  - `quickstartFunctions`（遗留示例）
- 集合：`happiness_records`、`fortune_records`、`sales`（示例）

## 事实来源
- 产品需求：`REQUIREMENTS.md`
- 架构说明：`ARCHITECTURE.md`
- 重构记录：`REFACTOR_PLAN.md`、`REFACTOR_GUIDE.md`
- 项目约束：`CODEBUDDY.md`

## 编码规范
- 2 空格缩进，不使用 Tab。
- 命名：文件 kebab-case，变量/函数 camelCase，组件 PascalCase，常量 UPPER_SNAKE。
- 仅为关键逻辑添加中文注释。
- 避免大改，优先小步、精准修改。
- 优先复用 `utils/`、`services/`、`constants.js` 中的工具。

## 运行规则
- 未明确要求时不新增文档。
- 代码与输出不使用表情符号。
- 每次变更都记录到 `.codebuddy/logs/YYYY-MM-DD.md`。

## 运行与部署
- 在 `miniprogram/app.js` 配置云环境 `globalData.env`。
- 需要在微信开发者工具中部署的云函数：
  - `cloudfunctions/auth/getOpenId`
  - `cloudfunctions/database/sales`
  - `cloudfunctions/happiness`
  - `cloudfunctions/quickstartFunctions`（仅在遗留功能使用时）

## 接手核对清单
- 确认 env id 与云权限。
- 核对集合与访问规则。
- 校验 `miniprogram/app.json` 的 tab 导航配置。
