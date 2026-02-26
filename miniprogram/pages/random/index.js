const { getRandomHappinessRecord } = require('../../services/happiness.js');
const { showLoading, hideLoading, showToast } = require('../../utils/toast.js');
const { formatDate } = require('../../utils/date.js');

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
        const r = result.data;
        this.setData({
          record: {
            ...r,
            image_urls: Array.isArray(r.image_urls) ? r.image_urls : (r.image_url ? [r.image_url] : []),
            created_at: formatDate(r.created_at, { includeSeconds: true })
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

  onPreviewImage(e) {
    const record = this.data.record;
    if (!record || !record.image_urls || !record.image_urls.length) return;
    const current = (e && e.currentTarget && e.currentTarget.dataset.url) || record.image_urls[0];
    wx.previewImage({
      urls: record.image_urls,
      current
    });
  },

  goToHome() {
    wx.switchTab({
      url: '/pages/home/index'
    });
  },

});
