const app = getApp();
const { createHappinessRecord } = require('../../services/happiness.js');
const { showLoading, hideLoading, showToast, showSuccess, showError } = require('../../utils/toast.js');
const { TOAST_MESSAGES } = require('../../utils/constants.js');

Page({
  data: {
    currentDate: '',
    content: '',
    imageUrl: '',
    voiceUrl: '',
    location: null,
    submitting: false,
    isRecording: false,
    recordingTime: 0,
    recordingTimer: null,
    isInputFocused: false
  },

  onLoad() {
    this.setCurrentDate();
    this.getLocation();
  },

  setCurrentDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];

    this.setData({
      currentDate: `${year}年${month}月${day}日 ${weekDay}`
    });
  },

  onRemoveImage() {
    this.setData({
      imageUrl: ''
    });
  },

  onVoiceStart() {
    const recorderManager = wx.getRecorderManager();

    wx.getSetting({
      success: (res) => {
        const authSetting = res.authSetting;
        if (authSetting['scope.record'] === false) {
          wx.showModal({
            title: '需要麦克风权限',
            content: '请允许使用麦克风以启用录音功能',
            showCancel: false,
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            }
          });
        } else {
          this.setData({ isRecording: true, recordingTime: 0 });

          const timer = setInterval(() => {
            this.setData({
              recordingTime: this.data.recordingTime + 1
            });
          }, 1000);
          this.setData({ recordingTimer: timer });

          recorderManager.start({
            duration: 60000,
            format: 'mp3'
          });
        }
      }
    });
  },

  onVoiceEnd() {
    const recorderManager = wx.getRecorderManager();
    recorderManager.stop();

    recorderManager.onStop((res) => {
      clearInterval(this.data.recordingTimer);
      this.setData({ isRecording: false, recordingTime: 0, recordingTimer: null });
      this.uploadVoice(res.tempFilePath);
    });
  },

  onVoiceCancel() {
    const recorderManager = wx.getRecorderManager();
    recorderManager.stop();
    clearInterval(this.data.recordingTimer);
    this.setData({ isRecording: false, recordingTime: 0, recordingTimer: null });
  },

  async uploadVoice(filePath) {
    showLoading(TOAST_MESSAGES.IMAGE_UPLOADING);

    try {
      const cloudPath = `voice/${Date.now()}.mp3`;
      const result = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      });

      this.setData({
        voiceUrl: result.fileID
      });

      showToast('录音上传成功');
    } catch (error) {
      console.error('上传录音失败:', error);
      showToast('录音上传失败');
    } finally {
      hideLoading();
    }
  },

  onRemoveVoice() {
    this.setData({
      voiceUrl: ''
    });
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res;
        wx.getLocation({
          type: 'wgs84',
          success: () => {
            this.setData({
              location: {
                latitude,
                longitude
              }
            });
          }
        });
      },
      fail: (err) => {
        console.log('获取位置失败:', err);
      }
    });
  },

  onContentInput(e) {
    this.setData({
      content: e.detail.value
    });
  },

  onInputFocus() {
    this.setData({ isInputFocused: true });
  },

  onInputBlur() {
    this.setData({ isInputFocused: false });
  },

  onChooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.uploadImage(tempFilePath);
      }
    });
  },

  async uploadImage(filePath) {
    showLoading(TOAST_MESSAGES.IMAGE_UPLOADING);
    
    try {
      const cloudPath = `happiness/${Date.now()}.jpg`;
      const result = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      });
      
      this.setData({
        imageUrl: result.fileID
      });
      
      showToast(TOAST_MESSAGES.IMAGE_UPLOAD_SUCCESS);
    } catch (error) {
      console.error('上传图片失败:', error);
      showToast(TOAST_MESSAGES.IMAGE_UPLOAD_FAILED);
    } finally {
      hideLoading();
    }
  },

  onRemoveImage() {
    this.setData({
      imageUrl: ''
    });
  },

  onVoiceStart() {
    const { voiceManager } = this.data;
    if (!voiceManager) {
      wx.showToast({
        title: '语音功能初始化中',
        icon: 'none'
      });
      return;
    }

    wx.getSetting({
      success: (res) => {
        const authSetting = res.authSetting;
        if (authSetting['scope.record'] === false) {
          wx.showModal({
            title: '需要麦克风权限',
            content: '请允许使用麦克风以启用语音输入功能',
            showCancel: false,
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            }
          });
        } else {
          voiceManager.start({
            lang: 'zh_CN'
          });
        }
      }
    });
  },

  onVoiceEnd() {
    const { voiceManager } = this.data;
    if (voiceManager) {
      voiceManager.stop();
    }
  },

  onVoiceCancel() {
    const { voiceManager } = this.data;
    if (voiceManager) {
      voiceManager.stop();
    }
    this.setData({ isRecording: false });
  },

  async onSubmit() {
    const { content, imageUrl, voiceUrl, location } = this.data;

    if (!content && !voiceUrl) {
      showToast(TOAST_MESSAGES.CONTENT_REQUIRED);
      return;
    }

    this.setData({ submitting: true });
    showLoading('记录中...');

    try {
      await createHappinessRecord({
        content,
        image_url: imageUrl,
        voice_url: voiceUrl,
        location
      });

      this.setData({
        content: '',
        imageUrl: '',
        voiceUrl: '',
        submitting: false
      });

      hideLoading();
      showSuccess(TOAST_MESSAGES.RECORD_CREATE_SUCCESS);
      this.getLocation();
    } catch (error) {
      console.error('记录失败:', error);
      hideLoading();
      showToast(TOAST_MESSAGES.RECORD_CREATE_FAILED);
      this.setData({ submitting: false });
    }
  },

  goToRecords() {
    wx.navigateTo({
      url: '/pages/records/index'
    });
  },

  goToRandom() {
    wx.navigateTo({
      url: '/pages/random/index'
    });
  },

  onUnload() {
    clearInterval(this.data.recordingTimer);
    const recorderManager = wx.getRecorderManager();
    recorderManager.stop();
  }
});
