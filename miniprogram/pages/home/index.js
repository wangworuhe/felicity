const app = getApp();
const { createHappinessRecord, getHappinessRecords, getRandomHappinessRecord } = require('../../services/happiness.js');
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
    isInputFocused: false,
    formMinHeightPx: 0,
    records: [],
    page: 1,
    limit: 10,
    hasMore: true,
    loadingRecords: false,
    randomRecord: null,
    randomLoading: false,
    showRandomModal: false
  },

  onLoad() {
    this.setCurrentDate();
    this.getLocation();
    this.setFormMinHeight();
    this.loadRecords();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true }, () => {
      this.loadRecords(() => {
        wx.stopPullDownRefresh();
      });
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingRecords) {
      this.loadMore();
    }
  },

  setFormMinHeight() {
    let windowHeight = 0;

    if (wx.getWindowInfo) {
      windowHeight = wx.getWindowInfo().windowHeight;
    } else {
      const systemInfo = wx.getSystemInfoSync();
      windowHeight = systemInfo.windowHeight;
    }

    this.setData({
      formMinHeightPx: Math.floor(windowHeight / 3)
    });
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

  async loadRecords(callback) {
    if (this.data.loadingRecords) return;

    this.setData({ loadingRecords: true });

    try {
      const { page, limit } = this.data;
      const result = await getHappinessRecords(page, limit);

      if (result.code === 0) {
        const records = result.data.map(record => ({
          ...record,
          created_at: this.formatDate(record.created_at)
        }));

        this.setData({
          records: page === 1 ? records : this.data.records.concat(records),
          hasMore: records.length >= limit
        });
      }
    } catch (error) {
      console.error('加载记录失败:', error);
      showToast('加载失败');
    } finally {
      this.setData({ loadingRecords: false });
      callback && callback();
    }
  },

  loadMore() {
    this.setData({
      page: this.data.page + 1
    }, () => {
      this.loadRecords();
    });
  },

  onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/record-detail/index?id=${id}`
    });
  },

  formatDate(isoString) {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];

    return `${month}月${day}日 ${weekDay} ${hour}:${minute}`;
  },

  openRandomModal() {
    this.setData({ showRandomModal: true }, () => {
      this.loadRandomRecord();
    });
  },

  closeRandomModal() {
    this.setData({ showRandomModal: false });
  },

  async loadRandomRecord() {
    this.setData({ randomLoading: true });

    try {
      const result = await getRandomHappinessRecord();

      if (result.code === 0 && result.data) {
        this.setData({
          randomRecord: {
            ...result.data,
            created_at: this.formatDate(result.data.created_at)
          }
        });
      } else {
        this.setData({ randomRecord: null });
      }
    } catch (error) {
      console.error('加载随机记录失败:', error);
      showToast('加载失败');
      this.setData({ randomRecord: null });
    } finally {
      this.setData({ randomLoading: false });
    }
  },

  onRefreshRandom() {
    this.loadRandomRecord();
  },

  onViewRandomDetail() {
    if (this.data.randomRecord) {
      wx.navigateTo({
        url: `/pages/record-detail/index?id=${this.data.randomRecord._id}`
      });
    }
  },

  onPreviewRandomImage() {
    const { randomRecord } = this.data;
    if (randomRecord && randomRecord.image_url) {
      wx.previewImage({
        urls: [randomRecord.image_url],
        current: randomRecord.image_url
      });
    }
  },

  noop() {},


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
        submitting: false,
        page: 1,
        hasMore: true
      }, () => {
        this.loadRecords();
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
