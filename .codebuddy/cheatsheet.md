# 常用命令和提示词

## 一、Agent 调用

请使用 Brief agent 进行需求审刻 


### 1. 代码审查

**场景**：完成功能开发后，需要审查代码质量

```
请使用 code-reviewer agent 审查 [文件路径] 的代码质量，重点关注代码安全性、性能和可维护性
```

**示例**：
```
请使用 code-reviewer agent 审查 miniprogram/pages/home/index.js 的代码质量
```

---

### 2. 产品设计

**场景**：需要设计新功能、规划产品需求、设计 UI/UX

```
请使用 product-designer agent 设计 [功能描述]，包括页面布局、交互流程和用户故事
```

**示例**：
```
请使用 product-designer agent 设计一个用户查看幸福历史记录的功能，包括页面布局、交互流程和用户故事
```

---

### 3. 代码执行

**场景**：需要运行测试、部署云函数、执行脚本

```
请使用 code-executor agent 执行 [命令/任务]
```

**示例**：
```
请使用 code-executor agent 部署 cloudfunctions/database/create 云函数
```

---

## 二、开发常用命令

### 1. 创建新页面

**场景**：需要创建新的小程序页面

```
请创建一个新的页面 [页面名称]，包含 .js, .json, .wxml, .wxss 文件，并在 app.json 中注册页面路径
```

**示例**：
```
请创建一个新的页面 record-detail，用于展示幸福记录详情，包含 .js, .json, .wxml, .wxss 文件
```

---

### 2. 创建云函数

**场景**：需要创建新的云函数

```
请创建云函数 [云函数名称]，用于 [功能描述]，包含 index.js, package.json, config.json 文件
```

**示例**：
```
请创建云函数 happiness/create，用于创建幸福记录，包含 index.js, package.json, config.json 文件
```

---

### 3. 创建组件

**场景**：需要创建可复用的 UI 组件

```
请创建一个组件 [组件名称]，用于 [功能描述]，包含 .js, .json, .wxml, .wxss 文件
```

**示例**：
```
请创建一个组件 record-card，用于展示幸福记录卡片
```

---

## 三、常用代码模式

### 1. 页面基础结构

```javascript
// miniprogram/pages/[page-name]/index.js
const app = getApp()

Page({
  data: {
    // 页面数据
  },

  onLoad(options) {
    // 页面加载时执行
  },

  onShow() {
    // 页面显示时执行
  },

  // ... 其他方法
})
```

---

### 2. 云函数调用

```javascript
// 调用云函数
wx.cloud.callFunction({
  name: '云函数名称',
  data: {
    // 参数
  }
}).then(res => {
  // 成功回调
}).catch(err => {
  // 失败回调
})
```

---

### 3. 图片上传

```javascript
// 选择图片
wx.chooseImage({
  count: 1,
  sizeType: ['compressed'],
  sourceType: ['album', 'camera'],
  success: (res) => {
    // 上传图片
    const filePath = res.tempFilePaths[0]
    const cloudPath = `happiness/${Date.now()}.jpg`
    
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (uploadRes) => {
        // 上传成功
      }
    })
  }
})
```

---

### 4. 获取地理位置

```javascript
// 获取当前位置
wx.getLocation({
  type: 'wgs84',
  success: (res) => {
    const { latitude, longitude } = res
    // 使用经纬度
  }
})
```

---

## 四、数据库操作

### 1. 添加记录

```javascript
// 调用云函数添加记录
wx.cloud.callFunction({
  name: 'database/add',
  data: {
    collection: 'happiness_records',
    data: {
      content: '内容',
      image_url: '图片地址',
      location: { latitude, longitude, name: '地点' },
      created_at: new Date().toISOString()
    }
  }
})
```

---

### 2. 查询记录

```javascript
// 查询用户的记录
wx.cloud.callFunction({
  name: 'database/query',
  data: {
    collection: 'happiness_records',
    query: {},
    orderBy: { created_at: 'desc' },
    limit: 20
  }
})
```

---

### 3. 删除记录

```javascript
// 删除记录
wx.cloud.callFunction({
  name: 'database/remove',
  data: {
    collection: 'happiness_records',
    _id: '记录ID'
  }
})
```

---

## 五、常用提示词

### 1. 功能开发

```
请帮我实现 [功能描述] 功能，要求：
1. 使用现有的 services 层和 utils 层
2. 遵循项目架构规范
3. 代码简洁，无多余注释
4. 包含错误处理和用户提示
```

**示例**：
```
请帮我实现幸福记录删除功能，要求：
1. 创建删除云函数
2. 在 services 层封装 API 调用
3. 添加删除确认对话框
4. 删除成功后刷新列表
```

---

### 2. 代码优化

```
请优化 [文件路径] 的代码，要求：
1. 提高代码可读性
2. 优化性能
3. 减少重复代码
4. 保持功能不变
```

---

### 3. Bug 修复

```
请帮我修复 [文件路径] 中的 bug，问题描述：
[问题描述]
请先分析问题原因，然后提供修复方案
```

---

### 4. UI 优化

```
请优化 [页面名称] 的 UI，要求：
1. 采用卡片式设计
2. 使用暖色调（#FFD93D、#FF6B6B、#F5E6D3）
3. 添加微交互动效
4. 确保响应式布局
```

---

## 六、项目特定命令

### 1. 部署云函数

```
请使用 code-executor agent 部署云函数：[云函数路径]
```

**示例**：
```
请使用 code-executor agent 部署云函数：cloudfunctions/happiness/create
```

---

### 2. 查看日志

```
请查看开发日志：.codebuddy/logs/[日期].md
```

**示例**：
```
请查看今天的开发日志
```

---

### 3. 创建数据库集合

```
请在云开发控制台创建集合 [集合名称]，权限设置为"仅创建者可读写"
```

---

### 4. 代码审查

```
请使用 code-reviewer agent 审查 [功能模块] 的所有代码
```

---

## 七、快捷操作

### 1. 快速记录日志

完成代码操作后，会自动记录到 `.codebuddy/logs/[日期].md`

### 2. 查看项目状态

```
请查看当前项目的开发进度和待办事项
```

### 3. 检查 linter 错误

```
请检查并修复项目中的 linter 错误
```

---

## 八、常用文件路径

### 页面文件
```
miniprogram/pages/home/           # 首页
miniprogram/pages/list/            # 列表页
miniprogram/pages/detail/          # 详情页
```

### 组件文件
```
miniprogram/components/            # 组件目录
```

### 工具文件
```
miniprogram/utils/constants.js     # 常量定义
miniprogram/utils/toast.js         # 提示工具
miniprogram/utils/cloud.js         # 云函数工具
miniprogram/utils/validator.js     # 验证工具
```

### 服务文件
```
miniprogram/services/auth.js       # 认证服务
miniprogram/services/database.js   # 数据库服务
miniprogram/services/storage.js    # 存储服务
```

### 云函数
```
cloudfunctions/auth/               # 认证相关
cloudfunctions/database/           # 数据库相关
cloudfunctions/happiness/          # 幸福记录相关
```

---

## 九、常用快捷短语

```
- 请检查代码质量
- 请优化这个功能
- 请修复这个 bug
- 请帮我创建一个新页面
- 请帮我创建一个组件
- 请帮我设计这个功能
- 请帮我部署这个云函数
- 请查看开发日志
- 请审查这段代码
- 请测试这个功能
```

---

## 十、使用建议

1. **复制提示词时**：替换 `[ ]` 中的占位符为实际内容
2. **复杂任务**：使用 todo_write 创建任务列表
3. **代码审查**：完成功能后主动调用 code-reviewer
4. **记录日志**：系统会自动记录，无需手动记录
5. **使用工具**：优先使用 services 和 utils 层的现有工具

---

**更新日期**：2026-01-18
**维护状态**：✅ 激活
