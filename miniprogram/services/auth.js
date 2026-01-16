/**
 * 认证相关服务
 */
import { callFunction } from '../utils/cloud.js';
import { FUNCTION_TYPES } from '../utils/constants.js';

/**
 * 获取 OpenId
 * @returns {Promise<object>} { openid, appid, unionid }
 */
export const getOpenId = () => {
  // 使用新的模块化云函数
  return callFunction('getOpenId', {});
};

/**
 * 获取小程序码
 * @param {string} path - 小程序页面路径
 * @returns {Promise<string>} 小程序码的 fileID
 */
export const getMiniProgramCode = (path = 'pages/index/index') => {
  // 使用原有云函数
  return callFunction('quickstartFunctions', {
    type: FUNCTION_TYPES.GET_MINIPROGRAM_CODE,
    path,
  });
};
