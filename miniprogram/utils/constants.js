/**
 * 常量定义
 */

// 云函数名称
export const CLOUD_FUNCTIONS = {
  AUTH: 'quickstartFunctions',
  DATABASE: 'quickstartFunctions',
  STORAGE: 'quickstartFunctions',
};

// 数据库集合名称
export const COLLECTIONS = {
  SALES: 'sales',
  HAPPINESS_RECORDS: 'happiness_records',
};

// 云函数操作类型
export const FUNCTION_TYPES = {
  // 认证相关
  GET_OPENID: 'getOpenId',
  GET_MINIPROGRAM_CODE: 'getMiniProgramCode',

  // 数据库相关
  CREATE_COLLECTION: 'createCollection',
  SELECT_RECORD: 'selectRecord',
  UPDATE_RECORD: 'updateRecord',
  INSERT_RECORD: 'insertRecord',
  DELETE_RECORD: 'deleteRecord',

  // 存储相关
  UPLOAD_FILE: 'uploadFile',

  // 幸福记录相关
  HAPPINESS_CREATE: 'createRecord',
  HAPPINESS_LIST: 'listRecords',
  HAPPINESS_DETAIL: 'getRecordDetail',
  HAPPINESS_DELETE: 'deleteRecord',
  HAPPINESS_RANDOM: 'getRandomRecord',
};

// 环境配置
export const ENV_CONFIG = {
  // 在 app.js 中配置实际的 env
  ENV_ID: '',
};

// 默认提示信息
export const TOAST_MESSAGES = {
  LOADING: '加载中...',
  SUCCESS: '操作成功',
  FAILED: '操作失败',
  UPLOAD_SUCCESS: '上传成功',
  DELETE_SUCCESS: '删除成功',
  INSERT_SUCCESS: '插入成功',
  UPDATE_SUCCESS: '更新成功',
  UPLOAD_FAILED: '上传失败',
  DELETE_FAILED: '删除失败',
  INSERT_FAILED: '插入失败',
  UPDATE_FAILED: '更新失败',
  COPY_SUCCESS: '复制成功',
  REQUIRED_FIELDS: '请填写完整信息',
  ENV_NOT_FOUND: '云开发环境未找到',
  FUNCTION_NOT_FOUND: '请上传云函数',

  // 幸福记录相关
  RECORD_CREATE_SUCCESS: '记录成功',
  RECORD_CREATE_FAILED: '记录失败',
  RECORD_DELETE_SUCCESS: '删除成功',
  RECORD_DELETE_FAILED: '删除失败',
  CONTENT_REQUIRED: '请输入内容',
  LOCATION_GETTING: '获取位置中...',
  LOCATION_GET_SUCCESS: '位置获取成功',
  LOCATION_GET_FAILED: '位置获取失败',
  IMAGE_UPLOADING: '上传图片中...',
  IMAGE_UPLOAD_SUCCESS: '图片上传成功',
  IMAGE_UPLOAD_FAILED: '图片上传失败',
};

// 错误消息
export const ERROR_MESSAGES = {
  ENV_NOT_FOUND: '如果已经开通云开发，请检查环境ID与 `miniprogram/app.js` 中的 `env` 参数是否一致。',
  FUNCTION_NOT_FOUND: '请上传对应的云函数：\n- auth/getOpenId\n- database/sales\n',
};
