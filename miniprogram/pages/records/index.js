const { getHappinessRecords } = require('../../services/happiness.js');
const { showLoading, hideLoading, showToast } = require('../../utils/toast.js');

Page({
  data: {
    records: [],
    page: 1,
    limit: 10,
    hasMore: true,
    loading: false
  },

  onLoad() {
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
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  async loadRecords(callback) {
    if (this.data.loading) return;

    this.setData({ loading: true });

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
      this.setData({ loading: false });
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
  }
});
