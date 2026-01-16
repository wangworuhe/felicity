/**
 * 数据库相关服务
 */
import { callFunction } from '../utils/cloud.js';
import { FUNCTION_TYPES, CLOUD_FUNCTIONS } from '../utils/constants.js';

/**
 * 创建集合
 * @param {string} collectionName - 集合名称
 * @returns {Promise<object>} { success: boolean }
 */
export const createCollection = (collectionName) => {
  // 使用新的模块化云函数
  return callFunction('sales', {
    type: FUNCTION_TYPES.CREATE_COLLECTION,
    collectionName,
  });
};

/**
 * 查询销售记录
 * @returns {Promise<array>} 销售记录列表
 */
export const selectSalesRecord = () => {
  return callFunction('sales', {
    type: FUNCTION_TYPES.SELECT_RECORD,
  });
};

/**
 * 更新销售记录
 * @param {array} records - 待更新的记录列表
 * @returns {Promise<object>} { success: boolean, data: array }
 */
export const updateSalesRecord = (records) => {
  return callFunction('sales', {
    type: FUNCTION_TYPES.UPDATE_RECORD,
    data: records,
  });
};

/**
 * 新增销售记录
 * @param {object} record - 销售记录 { region, city, sales }
 * @returns {Promise<object>} { success: boolean, data: object }
 */
export const insertSalesRecord = (record) => {
  return callFunction('sales', {
    type: FUNCTION_TYPES.INSERT_RECORD,
    data: record,
  });
};

/**
 * 删除销售记录
 * @param {string} id - 记录ID
 * @returns {Promise<object>} { success: boolean }
 */
export const deleteSalesRecord = (id) => {
  return callFunction('sales', {
    type: FUNCTION_TYPES.DELETE_RECORD,
    data: { _id: id },
  });
};
