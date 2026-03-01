import { getUserProfile, upsertUserProfile, getMyDataSummary } from '../../services/user.js';
import { ensurePrivacyAuthorized } from '../../utils/privacy.js';
import { uploadImageToCloud, getTempFileURL } from '../../utils/cloud.js';
import { showLoading, hideLoading, showToast, showSuccess } from '../../utils/toast.js';

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
    isSavingProfile: false,
    defaultAvatar: '../../images/icons/usercenter-active.png'
  },

  onLoad() {
    this._initialLoaded = false;
    this.initPage().then(() => { this._initialLoaded = true; });
  },

  onShow() {
    if (!this._initialLoaded) return;
    this.loadSummary();
  },

  async initPage() {
    this.setData({ loading: true });
    try {
      await Promise.all([
        this.loadProfile(),
        this.loadSummary()
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
      await this._saveProfile();
    } catch (error) {
      console.error('上传头像失败:', error);
      showToast('头像上传失败');
    } finally {
      hideLoading();
    }
  },

  onEditNickName() {
    const { userProfile } = this.data;
    const currentName = userProfile.nickName === '未设置昵称' ? '' : userProfile.nickName;
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入昵称（最多20字）',
      content: currentName,
      success: (res) => {
        if (!res.confirm) return;
        const nickName = (res.content || '').trim().slice(0, 20);
        if (!nickName) {
          showToast('昵称不能为空');
          return;
        }
        this.setData({ 'userProfile.nickNameInput': nickName });
        this._saveProfile();
      }
    });
  },

  async _saveProfile() {
    const { userProfile, isSavingProfile } = this.data;
    if (isSavingProfile) return;

    const nickName = (userProfile.nickNameInput || '').trim().slice(0, 20);

    this.setData({ isSavingProfile: true });
    try {
      const result = await upsertUserProfile({
        nick_name: nickName,
        avatar_url: userProfile.avatarFileId || ''
      });

      if (result.code === 0) {
        showSuccess('已保存');
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

  onOpenPermissions() {
    wx.navigateTo({ url: '/pages/permissions/index' });
  },

  onOpenDataRights() {
    wx.navigateTo({ url: '/pages/data-rights/index' });
  },

  _resolveAvatarPreview(fileId) {
    return getTempFileURL(fileId);
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
