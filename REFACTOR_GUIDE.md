# 项目重构指南

## 重构概述

本次重构将项目从单一文件结构转变为符合中型项目标准的模块化架构，提升了代码的可维护性和可扩展性。

## 新架构说明

### 目录结构

```
felicity/
├── miniprogram/
│   ├── app.js/json/wxss          # 全局配置
│   │
│   ├── pages/                    # 页面（按功能模块分组）
│   │   ├── index/                # 首页
│   │   ├── auth/                 # 认证相关
│   │   │   └── openid/           # 获取OpenId
│   │   ├── database/             # 数据库操作
│   │   │   └── sales/            # 销售数据CRUD
│   │   └── storage/              # 文件存储
│   │       └── upload/           # 文件上传
│   │
│   ├── components/               # 公共组件
│   │   └── cloudTipModal/
│   │
│   ├── utils/                    # 工具层（新增）
│   │   ├── constants.js          # 常量定义
│   │   ├── toast.js              # 提示工具
│   │   ├── cloud.js              # 云开发封装
│   │   └── validator.js          # 验证工具
│   │
│   ├── services/                 # API服务层（新增）
│   │   ├── auth.js               # 认证服务
│   │   ├── database.js           # 数据库服务
│   │   ├── storage.js            # 存储服务
│   │   └── index.js              # 统一导出
│   │
│   ├── images/                   # 静态资源
│   │   ├── icons/
│   │   └── examples/
│   │
│   └── styles/                   # 全局样式（新增）
│       └── variables.wxss       # 样式变量
│
├── cloudfunctions/               # 云函数（模块化）
│   ├── auth/                     # 认证相关
│   │   └── getOpenId/
│   ├── database/                 # 数据库相关
│   │   └── sales/
│   └── quickstartFunctions/      # 原有云函数（兼容）
│
└── docs/                         # 文档
    ├── REFACTOR_PLAN.md          # 重构计划
    └── REFACTOR_GUIDE.md         # 重构指南
```

### 核心改进

#### 1. Utils 工具层
**文件位置**: `miniprogram/utils/`

**作用**:
- `constants.js`: 统一管理常量、配置、提示信息
- `toast.js`: 封装提示工具（loading、success、error等）
- `cloud.js`: 封装云函数调用、文件上传等操作
- `validator.js`: 表单验证工具（必填、手机号、邮箱等）

**优势**:
- 代码复用，减少重复
- 统一错误处理
- 便于维护和测试

#### 2. Services API 层
**文件位置**: `miniprogram/services/`

**作用**:
- `auth.js`: 封装认证相关API（getOpenId、getMiniProgramCode）
- `database.js`: 封装数据库操作（CRUD）
- `storage.js`: 封装存储操作（文件上传）
- `index.js`: 统一导出

**优势**:
- 业务逻辑集中
- 接口统一管理
- 便于 Mock 测试

#### 3. Pages 按功能分组
**文件位置**: `miniprogram/pages/`

**结构**:
```
pages/
├── auth/openid/          # 认证 - 获取OpenId
├── database/sales/       # 数据库 - 销售数据管理
└── storage/upload/       # 存储 - 文件上传
```

**优势**:
- 相关功能集中
- 便于导航和查找
- 支持独立开发

#### 4. Cloud Functions 模块化
**文件位置**: `cloudfunctions/`

**结构**:
```
cloudfunctions/
├── auth/getOpenId/       # 认证云函数
└── database/sales/       # 数据库云函数
```

**优势**:
- 每个云函数独立部署
- 职责单一
- 便于扩展

## 使用指南

### 1. 使用云函数

```javascript
import { getOpenId } from '../../services/auth.js';

Page({
  async getOpenId() {
    try {
      const result = await getOpenId();
      console.log(result.openid);
    } catch (error) {
      console.error(error);
    }
  }
});
```

### 2. 使用数据库操作

```javascript
import { selectSalesRecord, insertSalesRecord } from '../../services/database.js';

Page({
  async loadData() {
    const result = await selectSalesRecord();
    this.setData({ records: result.data });
  },

  async addData(record) {
    await insertSalesRecord(record);
    this.loadData();
  }
});
```

### 3. 使用提示工具

```javascript
import { showLoading, hideLoading, showSuccess } from '../../utils/toast.js';

Page({
  async doSomething() {
    showLoading('处理中...');
    try {
      await someAsyncOperation();
      showSuccess('成功');
    } finally {
      hideLoading();
    }
  }
});
```

### 4. 使用验证工具

```javascript
import { validateSalesData } from '../../utils/validator.js';

Page({
  submitForm(data) {
    const validation = validateSalesData(data);
    if (!validation.valid) {
      showError(validation.errors[0]);
      return;
    }
    // 继续处理
  }
});
```

## 部署指南

### 1. 部署云函数

在微信开发者工具中：

1. **部署认证云函数**
   - 右键 `cloudfunctions/auth/getOpenId`
   - 选择「上传并部署-云端安装依赖」

2. **部署数据库云函数**
   - 右键 `cloudfunctions/database/sales`
   - 选择「上传并部署-云端安装依赖」

3. **保留原有云函数**（用于兼容）
   - `quickstartFunctions` 继续保留

### 2. 配置环境ID

在 `miniprogram/app.js` 中配置：

```javascript
App({
  onLaunch: function () {
    this.globalData = {
      env: 'your-env-id',  // 替换为实际的环境ID
    };
    // ...
  }
});
```

## 迁移说明

### 从旧页面迁移到新页面

旧页面 | 新页面 | 说明
-------|-------|------
pages/example/index?type=getOpenId | pages/auth/openid/index | 获取OpenId
pages/example/index?type=selectRecord | pages/database/sales/index | 销售数据管理
pages/example/index?type=uploadFile | pages/storage/upload/index | 文件上传

### 云函数调用变化

旧方式：
```javascript
wx.cloud.callFunction({
  name: 'quickstartFunctions',
  data: { type: 'getOpenId' }
})
```

新方式：
```javascript
import { getOpenId } from '../../services/auth.js';
await getOpenId();
```

## 注意事项

1. **兼容性**: 保留了原有的 `quickstartFunctions` 云函数，确保向后兼容
2. **渐进式迁移**: 可以逐步将旧代码迁移到新架构
3. **云函数部署**: 新的模块化云函数需要单独部署
4. **环境配置**: 确保 `app.js` 中配置了正确的 `env`

## 扩展建议

1. **添加新功能模块**
   - 在 `pages/` 下创建新的功能目录
   - 在 `services/` 下添加对应的服务文件
   - 在 `utils/` 下添加需要的工具函数

2. **添加新云函数**
   - 在 `cloudfunctions/` 下按业务域创建目录
   - 在对应的 `services/` 文件中封装调用逻辑

3. **使用全局样式变量**
   - 在 `styles/variables.wxss` 中定义
   - 在页面样式中引用 `var(--primary-color)`

## 重构收益

1. **可维护性**: 代码结构清晰，易于理解
2. **可扩展性**: 模块化设计，便于添加新功能
3. **可测试性**: 分层架构，便于单元测试
4. **团队协作**: 清晰的职责划分，便于多人开发
5. **代码复用**: 工具层和服务层提高复用率

## 问题反馈

如有问题，请查看：
- 微信云开发文档: https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html
- 项目 REFACTOR_PLAN.md: 了解重构计划
