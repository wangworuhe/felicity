/**
 * 获取 OpenId 页面
 */
import { getOpenId } from '../../../services/auth.js';
import { showLoading, hideLoading, showSuccess, showError } from '../../../utils/toast.js';

Page({
  data: {
    haveGetOpenId: false,
    openId: '',
    appid: '',
    unionid: '',
  },

  /**
   * 获取 OpenId
   */
  async getOpenId() {
    showLoading();

    try {
      const result = await getOpenId();
      this.setData({
        haveGetOpenId: true,
        openId: result.openid,
        appid: result.appid,
        unionid: result.unionid,
      });
      showSuccess('获取成功');
    } catch (error) {
      showError('获取失败');
      console.error('Get OpenId error:', error);
    } finally {
      hideLoading();
    }
  },

  /**
   * 清除数据
   */
  clearData() {
    this.setData({
      haveGetOpenId: false,
      openId: '',
      appid: '',
      unionid: '',
    });
  },

  /**
   * 复制 OpenId
   */
  copyOpenId() {
    const { openId } = this.data;
    if (!openId) {
      showError('请先获取 OpenId');
      return;
    }

    wx.setClipboardData({
      data: openId,
      success: () => {
        showSuccess('复制成功');
      },
    });
  },
});
