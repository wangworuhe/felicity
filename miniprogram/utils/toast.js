/**
 * 提示工具封装
 */
import { TOAST_MESSAGES } from './constants.js';

/**
 * 显示加载提示
 * @param {string} title - 提示文字
 */
export const showLoading = (title = TOAST_MESSAGES.LOADING) => {
  wx.showLoading({ title, mask: true });
};

/**
 * 隐藏加载提示
 */
export const hideLoading = () => {
  wx.hideLoading();
};

/**
 * 显示成功提示
 * @param {string} title - 提示文字
 */
export const showSuccess = (title = TOAST_MESSAGES.SUCCESS) => {
  wx.showToast({ title, icon: 'success', duration: 2000 });
};

/**
 * 显示失败提示
 * @param {string} title - 提示文字
 */
export const showError = (title = TOAST_MESSAGES.FAILED) => {
  wx.showToast({ title, icon: 'none', duration: 2000 });
};

/**
 * 显示普通提示
 * @param {string} title - 提示文字
 */
export const showToast = (title, icon = 'none') => {
  wx.showToast({ title, icon, duration: 2000 });
};

/**
 * 显示模态对话框
 * @param {object} options - 配置选项
 */
export const showModal = (options) => {
  return new Promise((resolve, reject) => {
    wx.showModal({
      ...options,
      success: (res) => {
        if (res.confirm) {
          resolve(res);
        } else {
          reject(res);
        }
      },
      fail: reject,
    });
  });
};
