# 微信云开发 QuickStart - 重构版

这是微信云开发的快速启动指引的重构版本，采用中型项目架构标准。

## 项目特点

- ✅ **模块化架构**: 按功能模块组织代码
- ✅ **分层设计**: Utils工具层 + Services服务层 + Pages页面层
- ✅ **云函数模块化**: 每个云函数独立部署，职责单一
- ✅ **代码复用**: 统一的工具封装，减少重复代码
- ✅ **易于维护**: 清晰的目录结构和命名规范

## 目录结构

```
felicity/
├── miniprogram/              # 小程序前端
│   ├── pages/               # 页面（按功能分组）
│   │   ├── auth/           # 认证相关
│   │   ├── database/       # 数据库操作
│   │   └── storage/        # 文件存储
│   ├── utils/              # 工具层
│   ├── services/           # 服务层
│   ├── components/         # 组件
│   ├── images/             # 静态资源
│   └── styles/             # 全局样式
│
├── cloudfunctions/         # 云函数（模块化）
│   ├── auth/              # 认证云函数
│   └── database/          # 数据库云函数
│
└── docs/                   # 文档
```

## 快速开始

### 1. 配置环境ID

在 `miniprogram/app.js` 中配置云开发环境ID：

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

### 2. 部署云函数

在微信开发者工具中：

1. 右键 `cloudfunctions/auth/getOpenId`，选择「上传并部署-云端安装依赖」
2. 右键 `cloudfunctions/database/sales`，选择「上传并部署-云端安装依赖」

### 3. 编译运行

点击工具栏的「编译」按钮即可运行项目。

## 功能模块

### 认证功能
- 获取用户 OpenId
- 生成小程序码

### 数据库功能
- 创建集合
- 增删改查数据
- 销售数据管理示例

### 存储功能
- 上传文件到云存储
- 预览图片

## 技术栈

- **框架**: 微信小程序原生
- **语言**: JavaScript (ES6+)
- **云服务**: 微信云开发
- **架构**: 模块化分层架构

## 核心能力

- **数据库**: JSON 文档型数据库，前端和云函数均可操作
- **文件存储**: 云端文件存储，内置 CDN 加速
- **云函数**: 云端运行的代码，免鉴权，只需关注业务逻辑

## 开发指南

### 使用服务层

```javascript
import { getOpenId } from '../../services/auth.js';

Page({
  async getOpenId() {
    const result = await getOpenId();
    console.log(result.openid);
  }
});
```

### 使用工具层

```javascript
import { showLoading, showSuccess } from '../../utils/toast.js';

Page({
  async doSomething() {
    showLoading();
    try {
      await someOperation();
      showSuccess('成功');
    } finally {
      hideLoading();
    }
  }
});
```

详细开发指南请查看 [REFACTOR_GUIDE.md](./REFACTOR_GUIDE.md)

## 重构说明

本项目从单一文件结构重构为模块化架构，详细说明请查看：

- [REFACTOR_PLAN.md](./REFACTOR_PLAN.md) - 重构计划
- [REFACTOR_GUIDE.md](./REFACTOR_GUIDE.md) - 重构指南

## 参考文档

- [微信云开发文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
- [小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)

## License

MIT
