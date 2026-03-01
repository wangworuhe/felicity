import { getPermissionStatusList, guardScope } from '../../utils/privacy.js';
import { showSuccess, showToast } from '../../utils/toast.js';

Page({
  data: {
    permissionList: [],
  },

  onShow() {
    this.refreshPermissionStatus();
  },

  async refreshPermissionStatus() {
    try {
      const permissionList = await getPermissionStatusList();
      this.setData({ permissionList });
    } catch (error) {
      console.error('刷新权限状态失败:', error);
    }
  },

  async onTogglePermission(e) {
    const { scope, status } = e.currentTarget.dataset;
    if (!scope) return;

    if (status === 'authorized') {
      // 已授权 → 引导去设置页关闭
      wx.showModal({
        title: '取消授权',
        content: '需要前往设置页手动关闭该权限，是否前往？',
        confirmText: '去设置',
        success: (res) => {
          if (!res.confirm) return;
          wx.openSetting({
            success: () => {
              this.refreshPermissionStatus();
            },
          });
        },
      });
    } else {
      // 未授权/已拒绝 → 尝试授权
      const SCOPE_MESSAGE = {
        'scope.userLocation': '请允许获取位置以记录幸福发生地点',
        'scope.record': '请允许使用麦克风以启用录音功能',
        'scope.camera': '请允许使用相机以拍照上传图片',
      };

      const ok = await guardScope(scope, SCOPE_MESSAGE[scope]);
      if (ok) {
        showSuccess('授权成功');
      } else {
        showToast('授权未通过');
      }
      this.refreshPermissionStatus();
    }
  },
});
