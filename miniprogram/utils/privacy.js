import { PERMISSION_ITEMS, AUDIT_MESSAGES } from './constants.js';

const STATUS_TEXT_MAP = {
  authorized: '已授权',
  unauthorized: '未授权',
  denied: '已拒绝',
  system: '系统限制',
};

const getStatusByScopeValue = (scopeValue) => {
  if (scopeValue === true) return 'authorized';
  if (scopeValue === false) return 'denied';
  return 'unauthorized';
};

export const getStatusText = (status) => STATUS_TEXT_MAP[status] || STATUS_TEXT_MAP.system;

/**
 * 敏感能力调用前的隐私保护指引校验
 */
export const ensurePrivacyAuthorized = (scene = '') => {
  return new Promise((resolve) => {
    if (typeof wx.requirePrivacyAuthorize !== 'function') {
      resolve(true);
      return;
    }

    wx.requirePrivacyAuthorize({
      success: () => resolve(true),
      fail: (err) => {
        const errMsg = (err && err.errMsg) || '';
        if (errMsg.includes('cancel') || errMsg.includes('deny')) {
          wx.showToast({ title: AUDIT_MESSAGES.PRIVACY_AUTH_REQUIRED, icon: 'none' });
        } else {
          console.warn('隐私授权校验失败:', scene, err);
        }
        resolve(false);
      },
    });
  });
};

/**
 * 获取权限中心状态列表
 */
export const getPermissionStatusList = () => {
  return new Promise((resolve) => {
    wx.getSetting({
      success: (res) => {
        const authSetting = res.authSetting || {};
        const list = PERMISSION_ITEMS.map((item) => {
          const status = getStatusByScopeValue(authSetting[item.scope]);
          return {
            ...item,
            status,
            statusText: getStatusText(status),
          };
        });
        resolve(list);
      },
      fail: () => {
        const list = PERMISSION_ITEMS.map((item) => ({
          ...item,
          status: 'system',
          statusText: getStatusText('system'),
        }));
        resolve(list);
      },
    });
  });
};

/**
 * 按需申请单项权限
 */
export const requestScope = (scope) => {
  return new Promise((resolve) => {
    if (!scope) {
      resolve({ ok: false, status: 'system' });
      return;
    }

    wx.authorize({
      scope,
      success: () => resolve({ ok: true, status: 'authorized' }),
      fail: () => {
        wx.getSetting({
          success: (res) => {
            const status = getStatusByScopeValue((res.authSetting || {})[scope]);
            resolve({ ok: false, status });
          },
          fail: () => resolve({ ok: false, status: 'system' }),
        });
      },
    });
  });
};
