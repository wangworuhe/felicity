const { getUserProfile, upsertUserProfile, getMyDataSummary, deleteMyData } = require('../../services/user.js');
const { ensurePrivacyAuthorized, getPermissionStatusList, requestScope } = require('../../utils/privacy.js');
const { uploadImageToCloud } = require('../../utils/cloud.js');
const { showLoading, hideLoading, showToast, showSuccess } = require('../../utils/toast.js');
const { LEGAL_CONFIG, AUDIT_MESSAGES } = require('../../utils/constants.js');

Page({
  data: {
    loading: false,
    userProfile: {
      maskedOpenId: '',
      nickName: '未设置昵称',
      nickNameInput: '',
      avatarFileId: '',
      avatarPreview: '',
      createdAt: '-',
      updatedAt: '-'
    },
    summary: {
      happinessCount: 0,
      fortuneCount: 0,
      diaryCount: 0,
      totalCount: 0,
      latestActiveAt: '-'
    },
    permissionList: [],
    legalConfig: LEGAL_CONFIG,
    appVersion: 'dev',
    isSavingProfile: false,
    deletingData: false,
    defaultAvatar: '../../images/icons/usercenter-active.png'
  },

  onLoad() {
    this._setAppVersion();
    this.initPage();
  },

  onShow() {
    this.refreshPermissionStatus();
    this.loadSummary();
  },

  async initPage() {
    this.setData({ loading: true });
    try {
      await Promise.all([
        this.loadProfile(),
        this.loadSummary(),
        this.refreshPermissionStatus()
      ]);
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadProfile() {
    try {
      const result = await getUserProfile();
      if (result.code !== 0) {
        showToast(result.message || '获取资料失败');
        return;
      }

      const profile = result.data || {};
      const avatarFileId = profile.avatar_url || '';
      const avatarPreview = await this._resolveAvatarPreview(avatarFileId);
      const nickName = profile.nick_name || '未设置昵称';

      this.setData({
        userProfile: {
          maskedOpenId: profile.masked_openid || '',
          nickName,
          nickNameInput: profile.nick_name || '',
          avatarFileId,
          avatarPreview,
          createdAt: this._formatDate(profile.created_at),
          updatedAt: this._formatDate(profile.updated_at)
        }
      });
    } catch (error) {
      console.error('加载用户资料失败:', error);
      showToast('加载资料失败');
    }
  },

  async loadSummary() {
    try {
      const result = await getMyDataSummary();
      if (result.code !== 0) return;

      const counts = (result.data && result.data.counts) || {};
      this.setData({
        summary: {
          happinessCount: counts.happiness_records || 0,
          fortuneCount: counts.fortune_records || 0,
          diaryCount: counts.diary_records || 0,
          totalCount: (result.data && result.data.total) || 0,
          latestActiveAt: this._formatDate(result.data && result.data.latest_active_at)
        }
      });
    } catch (error) {
      console.error('加载数据汇总失败:', error);
    }
  },

  async refreshPermissionStatus() {
    const permissionList = await getPermissionStatusList();
    this.setData({ permissionList });
  },

  async onChooseAvatar(e) {
    const tempAvatarPath = e.detail && e.detail.avatarUrl;
    if (!tempAvatarPath) return;

    const privacyOk = await ensurePrivacyAuthorized('me.chooseAvatar');
    if (!privacyOk) return;

    showLoading('上传头像中...');
    try {
      const fileId = await uploadImageToCloud(tempAvatarPath, 'avatar');
      const preview = await this._resolveAvatarPreview(fileId);
      this.setData({
        'userProfile.avatarFileId': fileId,
        'userProfile.avatarPreview': preview
      });
      showSuccess('头像已更新，请保存');
    } catch (error) {
      console.error('上传头像失败:', error);
      showToast('头像上传失败');
    } finally {
      hideLoading();
    }
  },

  onNickNameInput(e) {
    this.setData({
      'userProfile.nickNameInput': e.detail.value || ''
    });
  },

  async onSaveProfile() {
    const { userProfile, isSavingProfile } = this.data;
    if (isSavingProfile) return;

    const nickName = (userProfile.nickNameInput || '').trim().slice(0, 20);
    if (!nickName) {
      showToast('请输入昵称');
      return;
    }

    this.setData({ isSavingProfile: true });
    try {
      const result = await upsertUserProfile({
        nick_name: nickName,
        avatar_url: userProfile.avatarFileId || ''
      });

      if (result.code === 0) {
        showSuccess('资料已保存');
        await this.loadProfile();
      } else {
        showToast(result.message || '保存失败');
      }
    } catch (error) {
      console.error('保存用户资料失败:', error);
      showToast('保存失败');
    } finally {
      this.setData({ isSavingProfile: false });
    }
  },

  onOpenLegal(e) {
    const page = e.currentTarget.dataset.page;
    if (!page) return;
    wx.navigateTo({
      url: `/pages/legal/${page}/index`
    });
  },

  onOpenPrivacyContract() {
    if (typeof wx.openPrivacyContract === 'function') {
      wx.openPrivacyContract({
        fail: () => {
          wx.navigateTo({
            url: '/pages/legal/privacy-policy/index'
          });
        }
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/legal/privacy-policy/index'
    });
  },

  async onRequestPermission(e) {
    const scope = e.currentTarget.dataset.scope;
    if (!scope) return;

    const result = await requestScope(scope);
    if (result.ok) {
      showSuccess('授权成功');
      this.refreshPermissionStatus();
      return;
    }

    if (result.status === 'denied') {
      wx.showModal({
        title: '权限已被拒绝',
        content: '请前往设置页手动开启该权限',
        confirmText: '去设置',
        success: (res) => {
          if (!res.confirm) return;
          wx.openSetting({
            success: () => {
              this.refreshPermissionStatus();
            }
          });
        }
      });
    } else {
      showToast(AUDIT_MESSAGES.PERMISSION_DENIED);
    }
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
          this.initPage();
        } catch (error) {
          console.error('清理缓存失败:', error);
          showToast('清理失败');
        }
      }
    });
  },

  onDeleteMyData() {
    if (this.data.deletingData) return;

    wx.showModal({
      title: '删除全部数据',
      content: AUDIT_MESSAGES.DELETE_DATA_CONFIRM,
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
          }
        });
      }
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

      showSuccess('数据已删除');
      await this.initPage();

      const failed = result.data && result.data.files && result.data.files.failed;
      if (Array.isArray(failed) && failed.length > 0) {
        showToast('记录已删，部分文件稍后清理');
      }
    } catch (error) {
      console.error('删除全部数据失败:', error);
      showToast('删除失败，请重试');
    } finally {
      hideLoading();
      this.setData({ deletingData: false });
    }
  },

  _setAppVersion() {
    try {
      if (typeof wx.getAccountInfoSync !== 'function') return;
      const accountInfo = wx.getAccountInfoSync();
      const version = (accountInfo.miniProgram && accountInfo.miniProgram.version) || 'dev';
      this.setData({ appVersion: version || 'dev' });
    } catch (error) {
      this.setData({ appVersion: 'dev' });
    }
  },

  async _resolveAvatarPreview(fileId) {
    if (!fileId) return '';
    try {
      const result = await wx.cloud.getTempFileURL({ fileList: [fileId] });
      const first = result.fileList && result.fileList[0];
      return (first && first.tempFileURL) || fileId;
    } catch (error) {
      return fileId;
    }
  },

  _formatDate(isoStr) {
    if (!isoStr) return '-';
    const date = new Date(isoStr);
    if (Number.isNaN(date.getTime())) return '-';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
});
