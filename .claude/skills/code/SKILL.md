---
name: code
description: 按照项目规范编写高质量代码。在编写新功能、新页面、新服务、新云函数或修改现有代码时使用此 skill，确保代码风格、架构分层、错误处理、命名规范等均符合项目要求。
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# 编写代码规范 Skill

你正在为「幸福时刻」微信小程序项目编写代码。请严格遵循以下规范。

---

## 一、架构分层（必须遵守）

项目采用四层架构，**禁止跨层调用**：

```
Pages（页面层） → Services（业务层） → Utils（工具层） → Cloud Functions（云函数层）
```

| 层级 | 目录 | 职责 | 禁止事项 |
|------|------|------|---------|
| 页面层 | `miniprogram/pages/` | UI 交互、状态管理、调用 service | 禁止直接调用 `wx.cloud.callFunction` |
| 业务层 | `miniprogram/services/` | 封装业务逻辑、数据转换 | 禁止操作 UI（setData、toast） |
| 工具层 | `miniprogram/utils/` | 通用工具函数 | 禁止包含业务逻辑 |
| 云函数层 | `cloudfunctions/` | 数据库操作、服务端逻辑 | 禁止返回不一致的响应格式 |

---

## 二、命名规范

| 类型 | 风格 | 示例 |
|------|------|------|
| 变量 / 函数 | camelCase | `loadRecords`, `imageList` |
| 常量 | UPPER_SNAKE_CASE | `TOAST_MESSAGES`, `COLLECTIONS` |
| 页面目录 | kebab-case | `record-detail/`, `fortune/` |
| 组件 | PascalCase | `CloudTipModal` |
| 数据库集合 | snake_case | `happiness_records` |
| CSS 类名 | kebab-case | `.record-card`, `.btn-primary` |
| 云函数目录 | camelCase | `happiness/`, `quickstartFunctions/` |

---

## 三、页面层编写规范

### 3.1 文件结构

每个页面必须包含 4 个文件，缺一不可：
- `index.js` — 逻辑
- `index.json` — 配置
- `index.wxml` — 模板
- `index.wxss` — 样式

新页面必须在 `miniprogram/app.json` 的 `pages` 数组中注册。

### 3.2 JS 标准模板

```javascript
const { serviceFuncA, serviceFuncB } = require('../../services/index');
const { showLoading, hideLoading, showSuccess, showError } = require('../../utils/toast');
const { TOAST_MESSAGES } = require('../../utils/constants');

Page({
  data: {
    list: [],
    loading: false,
    hasMore: true,
    page: 1
  },

  onLoad(options) {
    this.loadData();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true });
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  // 业务方法
  async loadData() {
    showLoading();
    try {
      const result = await serviceFuncA();
      if (result.code === 0) {
        this.setData({ list: result.data });
      } else {
        showError(result.message);
      }
    } catch (error) {
      console.error('loadData failed:', error);
      showError(TOAST_MESSAGES.NETWORK_ERROR);
    } finally {
      hideLoading();
    }
  }
});
```

### 3.3 页面层要点

- 用 `require()` 导入（CommonJS），不使用 `import`
- 所有异步操作用 `async/await`，配合 `try/catch/finally`
- `finally` 中必须 `hideLoading()`，防止 loading 泄漏
- 用 `this.setData()` 更新视图，合并更新减少渲染次数
- 页面跳转：tab 页用 `wx.switchTab`，普通页用 `wx.navigateTo`

### 3.4 WXML 模板规范

```xml
<!-- 条件渲染 -->
<view wx:if="{{list.length > 0}}" class="list-container">
  <view wx:for="{{list}}" wx:key="_id" class="list-item">
    <text>{{item.content}}</text>
  </view>
</view>
<view wx:else class="empty-state">
  <text>暂无数据</text>
</view>

<!-- 图片始终指定 mode -->
<image src="{{item.image}}" mode="aspectFill" class="card-image" />

<!-- 事件绑定使用 data- 传参 -->
<view bindtap="onItemTap" data-id="{{item._id}}" class="tap-area">
</view>
```

- `wx:for` 必须指定 `wx:key`
- 图片必须指定 `mode`（通常 `aspectFill`）
- 事件传参用 `data-xxx` 属性，在 JS 中通过 `e.currentTarget.dataset.xxx` 获取
- 避免在模板中写复杂表达式，复杂逻辑放到 JS 的 computed 或 method 中

### 3.5 WXSS 样式规范

```css
/* 容器基础布局 */
.container {
  min-height: 100vh;
  padding: 20rpx;
  box-sizing: border-box;
}

/* 卡片样式 */
.card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

/* 按钮交互反馈 */
.btn-primary {
  border-radius: 44rpx;
  color: #FFFFFF;
  font-size: 28rpx;
  padding: 16rpx 40rpx;
  border: none;
}
.btn-primary:active {
  transform: scale(0.96);
  opacity: 0.9;
}
```

**配色原则：**
- 不限定固定色板，根据页面场景选择合适的配色
- 新页面的配色应与项目现有页面风格保持一致（参考已有页面的实际样式）
- 整体风格保持温暖治愈，色彩搭配和谐统一

**样式要点：**
- 使用 `rpx` 作为单位（微信自适应单位）
- 避免使用 `id` 选择器，全部用 `class`
- 不使用 `!important`，通过选择器特异性解决优先级
- 公共样式变量在 `miniprogram/styles/variables.wxss` 中定义

---

## 四、业务层（Services）编写规范

### 4.1 标准模板

```javascript
import { callFunction } from '../utils/cloud';
import { COLLECTIONS, FUNCTION_TYPES } from '../utils/constants';

// 创建记录
export const createRecord = (data) => {
  return callFunction('happiness', {
    type: FUNCTION_TYPES.HAPPINESS_CREATE,
    collection: COLLECTIONS.HAPPINESS_RECORDS,
    data
  });
};

// 获取列表（带分页）
export const listRecords = (page = 1, pageSize = 20) => {
  return callFunction('happiness', {
    type: FUNCTION_TYPES.HAPPINESS_LIST,
    collection: COLLECTIONS.HAPPINESS_RECORDS,
    page,
    pageSize
  });
};
```

### 4.2 业务层要点

- 使用 `import/export`（ES Module 语法）
- 所有云函数调用必须通过 `callFunction()`
- 新增常量（集合名、函数类型、提示文案）必须先定义到 `utils/constants.js`
- 新增 service 文件后，在 `services/index.js` 中 `export * from './xxx'`
- service 函数只做数据传递和转换，不做 UI 操作

---

## 五、工具层（Utils）编写规范

| 文件 | 用途 | 使用方式 |
|------|------|---------|
| `cloud.js` | 云函数调用 `callFunction()`、文件上传 `uploadFile()` | service 层调用 |
| `toast.js` | `showLoading / hideLoading / showSuccess / showError / showModal` | 页面层调用 |
| `constants.js` | 所有常量：集合名、函数类型、提示文案、配置值 | 全项目引用 |
| `validator.js` | 表单校验函数 | 页面层调用 |

**新增常量规则**（在 `constants.js` 中）：
```javascript
// 集合名
export const COLLECTIONS = {
  HAPPINESS_RECORDS: 'happiness_records',
  // 新增集合在此添加
};

// 云函数操作类型
export const FUNCTION_TYPES = {
  HAPPINESS_CREATE: 'createRecord',
  // 新增操作类型在此添加
};

// 提示文案
export const TOAST_MESSAGES = {
  LOADING: '加载中...',
  // 新增文案在此添加
};
```

---

## 六、云函数编写规范

### 6.1 标准模板

```javascript
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { type, collection, data, id, page, pageSize } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  switch (type) {
    case 'createRecord':
      return await createRecord(collection, openid, data);
    case 'listRecords':
      return await listRecords(collection, openid, page, pageSize);
    default:
      return { code: -1, message: '未知操作类型' };
  }
};
```

### 6.2 云函数要点

- 初始化用 `cloud.DYNAMIC_CURRENT_ENV`
- 所有查询必须带 `_openid` 过滤，确保数据隔离
- 返回格式统一：`{ code: 0, message: '成功', data: {...} }` 或 `{ code: -1, message: '失败', error: error.message }`
- 时间字段用 ISO 字符串：`new Date().toISOString()`
- 记录必须包含 `created_at` 和 `updated_at`
- 用 `switch/case` 分发操作类型

---

## 七、错误处理规范

### 7.1 页面层

```javascript
async someAction() {
  showLoading();
  try {
    const result = await serviceFunc();
    if (result.code === 0) {
      showSuccess(TOAST_MESSAGES.SUCCESS);
      // 更新数据
    } else {
      showError(result.message || TOAST_MESSAGES.OPERATION_FAIL);
    }
  } catch (error) {
    console.error('someAction failed:', error);
    showError(TOAST_MESSAGES.NETWORK_ERROR);
  } finally {
    hideLoading();
  }
}
```

### 7.2 云函数层

```javascript
async function operationName(params) {
  try {
    // 业务逻辑
    return { code: 0, message: '成功', data: result };
  } catch (error) {
    console.error('operationName error:', error);
    return { code: -1, message: '操作失败', error: error.message };
  }
}
```

### 7.3 错误处理要点

- 页面层：`try/catch/finally`，finally 中清理 loading 状态
- 云函数层：每个操作函数独立 try/catch，返回统一格式
- 使用 `console.error` 记录错误上下文
- 面向用户的错误信息使用中文，统一在 `constants.js` 中定义
- 不吞掉错误，至少 `console.error` 输出

---

## 八、代码质量检查清单

编写或修改代码后，逐项检查：

### 架构合规
- [ ] 页面层没有直接调用 `wx.cloud.callFunction`
- [ ] 业务层没有操作 UI（setData / toast / wx.showXxx）
- [ ] 新常量已添加到 `constants.js`
- [ ] 新页面已注册到 `app.json`
- [ ] 新 service 已在 `services/index.js` 导出

### 代码质量
- [ ] 异步操作使用 `async/await`，而非回调或 `.then` 链
- [ ] 所有 `showLoading` 都有对应的 `hideLoading`（在 `finally` 中）
- [ ] `wx:for` 指定了 `wx:key`
- [ ] 图片标签指定了 `mode`
- [ ] 没有硬编码的字符串提示（应使用 `TOAST_MESSAGES`）
- [ ] 没有硬编码的集合名（应使用 `COLLECTIONS`）

### 安全性
- [ ] 云函数中所有查询都带 `_openid` 过滤
- [ ] 没有在前端暴露敏感信息
- [ ] 用户输入有必要的校验（使用 `validator.js`）

### 风格一致
- [ ] 缩进 2 空格
- [ ] 仅关键逻辑添加中文注释，不加冗余注释
- [ ] 命名符合约定（变量 camelCase / 常量 UPPER_SNAKE / CSS kebab-case）
- [ ] 样式使用 `rpx` 单位
- [ ] 配色与项目现有页面风格保持一致

---

## 九、新增功能标准流程

当需要新增一个完整功能时，按以下顺序操作：

1. **定义常量** — 在 `utils/constants.js` 中添加集合名、操作类型、提示文案
2. **编写云函数** — 在 `cloudfunctions/` 中创建或扩展，遵循统一响应格式
3. **编写 service** — 在 `services/` 中封装云函数调用，并在 `index.js` 中导出
4. **编写页面** — 创建 4 个文件，在 `app.json` 中注册
5. **自检** — 按照第八节的检查清单逐项验证
6. **记录变更** — 更新 `.codebuddy/logs/YYYY-MM-DD.md`
