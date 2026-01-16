const { getRandomHappinessRecord } = require('../../services/happiness.js');
const { showLoading, hideLoading, showToast } = require('../../utils/toast.js');

Page({
  data: {
    record: null,
    loading: false
  },

  onLoad() {
    this.loadRandomRecord();
  },

  async loadRandomRecord() {
    this.setData({ loading: true });
    
    try {
      const result = await getRandomHappinessRecord();
      
      if (result.code === 0 && result.data) {
        this.setData({
          record: {
            ...result.data,
            created_at: this.formatDate(result.data.created_at)
          },
          loading: false
        });
      } else {
        this.setData({
          record: null,
          loading: false
        });
      }
    } catch (error) {
      console.error('加载随机记录失败:', error);
      showToast('加载失败');
      this.setData({
        record: null,
        loading: false
      });
    }
  },

  onRefresh() {
    this.loadRandomRecord();
  },

  onViewDetail() {
    if (this.data.record) {
      wx.navigateTo({
        url: `/pages/record-detail/index?id=${this.data.record._id}`
      });
    }
  },

  onPreviewImage() {
    const { image_url } = this.data.record;
    if (image_url) {
      wx.previewImage({
        urls: [image_url],
        current: image_url
      });
    }
  },

  goToHome() {
    wx.switchTab({
      url: '/pages/home/index'
    });
  },

  formatDate(isoString) {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];
    
    return `${year}年${month}月${day}日 ${weekDay} ${hour}:${minute}:${second}`;
  }
});
