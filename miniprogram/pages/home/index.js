const app = getApp();
const { createHappinessRecord } = require('../../services/happiness.js');
const { showLoading, hideLoading, showToast, showSuccess, showError } = require('../../utils/toast.js');
const { TOAST_MESSAGES } = require('../../utils/constants.js');

Page({
  data: {
    currentDate: '',
    content: '',
    imageUrl: '',
    location: null,
    submitting: false
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

  async onSubmit() {
    const { content, imageUrl, location } = this.data;
    
    if (!content) {
      showToast(TOAST_MESSAGES.CONTENT_REQUIRED);
      return;
    }

    this.setData({ submitting: true });
    showLoading('记录中...');

    try {
      await createHappinessRecord({
        content,
        image_url: imageUrl,
        location
      });
      
      this.setData({
        content: '',
        imageUrl: '',
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
  }
});
