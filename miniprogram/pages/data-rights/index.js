import { deleteMyData } from '../../services/user.js';
import { showLoading, hideLoading, showToast, showSuccess } from '../../utils/toast.js';

Page({
  data: {
    deletingData: false,
  },

  onClearLocalCache() {
    wx.showModal({
      title: '清理本地缓存',
      content: '仅清理本地缓存，不影响云端记录，确定继续吗？',
      success: (res) => {
        if (!res.confirm) return;
        try {
          wx.clearStorageSync();
          showSuccess('缓存已清理');
        } catch (error) {
          console.error('清理缓存失败:', error);
          showToast('清理失败');
        }
      },
    });
  },

  onDeleteMyData() {
    if (this.data.deletingData) return;

    wx.showModal({
      title: '删除全部数据',
      content: '此操作会删除云端数据\n删除后无法恢复，请谨慎操作',
      confirmText: '继续删除',
      confirmColor: '#D94F4F',
      success: (firstRes) => {
        if (!firstRes.confirm) return;
        wx.showModal({
          title: '二次确认',
          content: '此操作将删除幸福、反思、手账与账号资料，且无法恢复。',
          confirmText: '确认删除',
          confirmColor: '#D94F4F',
          success: (secondRes) => {
            if (!secondRes.confirm) return;
            this._confirmDeleteMyData();
          },
        });
      },
    });
  },

  async _confirmDeleteMyData() {
    this.setData({ deletingData: true });
    showLoading('删除中...');
    try {
      const result = await deleteMyData();
      if (result.code !== 0) {
        showToast(result.message || '删除失败，请重试');
        return;
      }

      try {
        wx.clearStorageSync();
      } catch (error) {
        console.warn('清理本地缓存失败:', error);
      }

      const failed = result.data && result.data.files && result.data.files.failed;
      const hasPartialFailure = Array.isArray(failed) && failed.length > 0;
      showSuccess(hasPartialFailure ? '记录已删，部分文件稍后清理' : '数据已删除');
    } catch (error) {
      console.error('删除全部数据失败:', error);
      showToast('删除失败，请重试');
    } finally {
      hideLoading();
      this.setData({ deletingData: false });
    }
  },
});
