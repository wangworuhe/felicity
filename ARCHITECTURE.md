# 项目架构说明

## 重构完成总结

本次重构已按照中型项目标准完成，项目从单一文件结构成功转变为模块化、可维护的架构。

## 新架构概览

### 目录结构

```
felicity/
├── miniprogram/                    # 小程序前端
│   ├── app.js/json/wxss           # 全局配置
│   ├── sitemap.json               # 搜索配置
│   │
│   ├── pages/                     # 页面层（按功能模块分组）
│   │   ├── index/                 # 首页（导航）
│   │   ├── auth/                  # 认证模块
│   │   │   └── openid/            # 获取OpenId页面
│   │   ├── database/              # 数据库模块
│   │   │   └── sales/             # 销售数据管理页面
│   │   ├── storage/               # 存储模块
│   │   │   └── upload/            # 文件上传页面
│   │   └── example/               # 原有示例页面（兼容）
│   │
│   ├── components/                # 组件层
│   │   └── cloudTipModal/         # 提示弹窗组件
│   │
│   ├── utils/                     # 工具层（新增）
│   │   ├── constants.js            # 常量定义
│   │   ├── toast.js               # 提示工具封装
│   │   ├── cloud.js               # 云开发API封装
│   │   └── validator.js           # 表单验证工具
│   │
│   ├── services/                  # 服务层（新增）
│   │   ├── auth.js                # 认证服务
│   │   ├── database.js            # 数据库服务
│   │   ├── storage.js             # 存储服务
│   │   └── index.js               # 统一导出
│   │
│   ├── images/                    # 静态资源
│   │   ├── icons/                 # 图标
│   │   └── examples/              # 示例图片
│   │
│   └── styles/                    # 全局样式（新增）
│       └── variables.wxss         # 样式变量
│
├── cloudfunctions/                # 云函数层（模块化）
│   ├── auth/                      # 认证相关云函数
│   │   └── getOpenId/             # 获取OpenId云函数
│   │       ├── index.js
│   │       ├── package.json
│   │       └── config.json
│   ├── database/                  # 数据库相关云函数
│   │   └── sales/                 # 销售数据云函数
│   │       ├── index.js
│   │       ├── package.json
│   │       └── config.json
│   └── quickstartFunctions/       # 原有云函数（向后兼容）
│       ├── index.js
│       ├── package.json
│       └── config.json
│
├── docs/                          # 项目文档
│   ├── README.md                  # 项目说明
│   ├── REFACTOR_PLAN.md           # 重构计划
│   └── REFACTOR_GUIDE.md          # 重构使用指南
│
├── REFACTOR_PLAN.md               # 重构计划
├── REFACTOR_GUIDE.md              # 重构指南
└── README.md                      # 项目说明
```

## 架构分层

### 1. 页面层 (Pages)
**职责**: UI展示和用户交互

**特点**:
- 按功能模块分组（auth、database、storage）
- 每个页面独立完整（.js、.json、.wxml、.wxss）
- 调用服务层获取数据
- 使用工具层处理通用逻辑

**示例**:
```javascript
import { getOpenId } from '../../services/auth.js';
import { showLoading, hideLoading } from '../../utils/toast.js';

Page({
  async getOpenId() {
    showLoading();
    try {
      const result = await getOpenId();
      this.setData({ openId: result.openid });
    } finally {
      hideLoading();
    }
  }
});
```

### 2. 服务层 (Services)
**职责**: 封装API调用，处理业务逻辑

**特点**:
- 按业务域划分（auth、database、storage）
- 统一调用云函数
- 统一错误处理
- 数据转换和验证

**示例**:
```javascript
import { callFunction } from '../utils/cloud.js';

export const getOpenId = () => {
  return callFunction('getOpenId', {});
};

export const selectSalesRecord = () => {
  return callFunction('sales', { type: 'selectRecord' });
};
```

### 3. 工具层 (Utils)
**职责**: 提供通用工具函数

**包含**:
- `constants.js`: 常量、配置、提示信息
- `toast.js`: 提示工具（showLoading、showSuccess等）
- `cloud.js`: 云开发API封装（callFunction、uploadFile等）
- `validator.js`: 表单验证（isEmpty、validateRequired等）

**示例**:
```javascript
// toast.js
export const showLoading = (title = '加载中...') => {
  wx.showLoading({ title, mask: true });
};

// cloud.js
export const callFunction = (name, data) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({ name, data })
      .then(resp => resolve(resp.result))
      .catch(reject);
  });
};
```

### 4. 云函数层 (Cloud Functions)
**职责**: 后端业务逻辑处理

**特点**:
- 按业务域模块化（auth、database）
- 每个云函数独立部署
- 职责单一，便于维护

**示例**:
```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
  };
};
```

## 核心设计原则

### 1. 单一职责原则
每个模块、每个类只负责一个功能领域。

### 2. 分层架构
清晰的分层设计，上层依赖下层，不跨层调用。

### 3. 依赖倒置
高层模块不依赖低层模块，都依赖抽象（通过接口/约定）。

### 4. 开闭原则
对扩展开放，对修改关闭。通过添加新模块扩展功能。

### 5. DRY原则
Don't Repeat Yourself。代码复用，避免重复。

## 数据流向

```
用户操作
  ↓
Pages (页面层)
  ↓ 调用
Services (服务层)
  ↓ 调用
Cloud Functions (云函数层)
  ↓
云服务（数据库、存储等）
  ↓
返回数据
```

## 代码组织

### 命名规范

**文件命名**:
- 页面：小写+连字符，如 `get-open-id`
- 组件：大驼峰，如 `CloudTipModal`
- 工具/服务：小驼峰，如 `cloud.js`、`auth.js`

**变量命名**:
- 常量：大写下划线，如 `CLOUD_FUNCTIONS`
- 函数：小驼峰，如 `getOpenId`
- 组件：大驼峰，如 `Page`

### 导入导出规范

**服务层导出**:
```javascript
// services/auth.js
export const getOpenId = () => { ... };

// services/index.js
export * from './auth.js';
export * from './database.js';
export * from './storage.js';
```

**使用时导入**:
```javascript
import { getOpenId, selectSalesRecord } from '../../services/index.js';
// 或
import { getOpenId } from '../../services/auth.js';
```

## 部署说明

### 1. 云函数部署顺序
1. `cloudfunctions/auth/getOpenId`
2. `cloudfunctions/database/sales`

### 2. 环境配置
在 `miniprogram/app.js` 中配置：
```javascript
this.globalData = {
  env: 'your-env-id'
};
```

### 3. 向后兼容
保留了原有的 `quickstartFunctions` 云函数，确保原有功能继续工作。

## 扩展指南

### 添加新页面
1. 在 `pages/` 下创建功能目录
2. 创建 `.js`、`.json`、`.wxml`、`.wxss` 文件
3. 在 `app.json` 中注册页面路径
4. 在首页添加导航入口

### 添加新服务
1. 在 `services/` 下创建服务文件
2. 在 `services/index.js` 中导出
3. 在页面中导入使用

### 添加新云函数
1. 在 `cloudfunctions/` 下按业务域创建目录
2. 创建 `index.js`、`package.json`、`config.json`
3. 在对应的 `services/` 文件中封装调用

## 性能优化建议

1. **按需加载**: 使用分包加载，减少首屏时间
2. **图片优化**: 压缩图片，使用合适的格式
3. **云函数优化**: 合理设置超时时间，避免冷启动
4. **缓存策略**: 使用 `wx.setStorageSync` 缓存常用数据

## 测试建议

1. **单元测试**: 对 utils 和 services 层进行单元测试
2. **集成测试**: 测试页面和服务层的交互
3. **云函数测试**: 使用云开发控制台测试云函数

## 维护建议

1. **代码审查**: 重要改动需要代码审查
2. **文档更新**: 功能变更同步更新文档
3. **版本管理**: 使用语义化版本号
4. **日志记录**: 关键操作记录日志

## 重构收益

### 代码质量
- ✅ 结构清晰，易于理解
- ✅ 职责明确，便于维护
- ✅ 代码复用，减少重复

### 开发效率
- ✅ 模块化开发，并行工作
- ✅ 快速定位问题，减少调试时间
- ✅ 统一规范，降低学习成本

### 扩展性
- ✅ 添加新功能简单
- ✅ 支持多人协作
- ✅ 便于后期优化

---

**重构完成日期**: 2026-01-16
**重构版本**: v2.0.0
**维护状态**: ✅ 完成
