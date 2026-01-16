# 项目重构计划

## 重构目标
按照中型项目标准，将 quickstart 模板重构为模块化、可维护的架构。

## 当前问题
1. `pages/example/` 承载了过多功能（云函数、数据库、存储、AI等）
2. 缺少 `utils/` 工具层，代码重复
3. 缺少 `services/` API层，业务逻辑分散
4. 云函数只有一个大文件，不利于维护
5. 没有按功能模块组织代码

## 新架构设计

```
felicity/
├── miniprogram/
│   ├── app.js/json/wxss
│   ├── sitemap.json
│   ├── project.config.json
│   │
│   ├── pages/                    # 页面按功能分组
│   │   ├── index/                # 首页
│   │   ├── auth/                 # 认证相关
│   │   │   └── openid/           # 获取OpenId
│   │   ├── database/             # 数据库操作
│   │   │   ├── collection/       # 集合管理
│   │   │   └── sales/            # 销售数据CRUD
│   │   ├── storage/              # 文件存储
│   │   │   └── upload/           # 文件上传
│   │   └── ai/                   # AI功能
│   │       ├── guide/            # AI指引
│   │       └── assistant/        # AI助手
│   │
│   ├── components/               # 公共组件
│   │   ├── cloudTipModal/        # 提示弹窗
│   │   ├── codeBlock/            # 代码展示
│   │   └── emptyState/           # 空状态
│   │
│   ├── utils/                    # 工具层
│   │   ├── cloud.js              # 云开发封装
│   │   ├── constants.js          # 常量定义
│   │   ├── toast.js              # 提示工具
│   │   └── validator.js          # 验证工具
│   │
│   ├── services/                 # API服务层
│   │   ├── cloud.js              # 云函数调用
│   │   ├── database.js           # 数据库操作
│   │   ├── storage.js            # 存储操作
│   │   └── auth.js               # 认证服务
│   │
│   ├── images/                   # 静态资源
│   │   ├── icons/
│   │   └── examples/
│   │
│   └── styles/                   # 全局样式
│       └── variables.wxss        # 样式变量
│
├── cloudfunctions/               # 云函数模块化
│   ├── auth/                     # 认证相关
│   │   └── getOpenId/
│   │       ├── index.js
│   │       └── package.json
│   ├── database/                 # 数据库相关
│   │   ├── createCollection/
│   │   ├── selectRecord/
│   │   ├── updateRecord/
│   │   ├── insertRecord/
│   │   └── deleteRecord/
│   ├── storage/                  # 存储相关
│   │   └── uploadFile/
│   └── common/                   # 公共工具
│
└── README.md
```

## 重构步骤
1. ✅ 分析现有项目结构和代码依赖
2. ✅ 设计新的目录结构
3. 创建 utils/ 工具层
4. 创建 services/ API层
5. 重构 pages/ 按功能模块分组
6. 模块化云函数
7. 更新路由配置和依赖
8. 验证重构后的代码
