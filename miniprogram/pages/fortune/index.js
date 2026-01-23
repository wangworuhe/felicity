const { createFortuneRecord, getFortuneRecords, upsertFortuneRecord } = require('../../services/fortune.js');
const { showToast } = require('../../utils/toast.js');
const { TOAST_MESSAGES } = require('../../utils/constants.js');

Page({
  data: {
    inputValue: '',
    inputFocus: false,
    records: [],
    page: 1,
    limit: 10,
    hasMore: true,
    loading: false,
    saving: false,
    showBackTop: false
  },

  onLoad() {
    this.loadRecords();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  onPageScroll(e) {
    const showBackTop = e.scrollTop > 260;
    if (showBackTop !== this.data.showBackTop) {
      this.setData({ showBackTop });
    }
  },

  onInputChange(e) {
    this.setData({ inputValue: e.detail.value });
  },

  onInputFocus() {
    this.setData({ inputFocus: true });
  },

  onInputBlur() {
    this.setData({ inputFocus: false });
  },

  async onSave() {
    const content = (this.data.inputValue || '').trim();
    if (!content) {
      showToast(TOAST_MESSAGES.CONTENT_REQUIRED);
      return;
    }

    if (this.data.saving) return;
    this.setData({ saving: true });

    try {
      const result = await createFortuneRecord({ content });

      if (result.code === 0) {
        this.setData({
          inputValue: '',
          page: 1,
          hasMore: true
        });
        await this.loadRecords();
      } else {
        showToast(result.message || TOAST_MESSAGES.RECORD_CREATE_FAILED);
      }
    } catch (error) {
      console.error('保存反思失败:', error);
      showToast(TOAST_MESSAGES.RECORD_CREATE_FAILED);
    } finally {
      this.setData({ saving: false });
    }
  },

  async loadRecords(callback) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const { page, limit } = this.data;
      const result = await getFortuneRecords(page, limit);

      if (result.code === 0) {
        const records = result.data.map(record => ({
          ...record,
          created_at: this.formatDate(record.created_at),
          isEditing: false,
          editValue: record.content
        }));

        this.setData({
          records: page === 1 ? records : this.data.records.concat(records),
          hasMore: records.length >= limit
        });
      }
    } catch (error) {
      console.error('加载反思记录失败:', error);
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

  onEditTap(e) {
    const { index } = e.currentTarget.dataset;
    const records = this.data.records;
    records[index].isEditing = true;
    this.setData({ records });
  },

  onEditInput(e) {
    const { index } = e.currentTarget.dataset;
    const records = this.data.records;
    records[index].editValue = e.detail.value;
    this.setData({ records });
  },

  async onSaveEdit(e) {
    const { index, id } = e.currentTarget.dataset;
    const records = this.data.records;
    const content = (records[index].editValue || '').trim();

    if (!content) {
      showToast(TOAST_MESSAGES.CONTENT_REQUIRED);
      return;
    }

    if (this.data.saving) return;
    this.setData({ saving: true });

    try {
      const result = await upsertFortuneRecord({
        _id: id,
        content
      });

      if (result.code === 0) {
        records[index].content = content;
        records[index].isEditing = false;
        this.setData({ records });
      } else {
        showToast(result.message || '更新失败');
      }
    } catch (error) {
      console.error('更新反思失败:', error);
      showToast('更新失败');
    } finally {
      this.setData({ saving: false });
    }
  },

  onCancelEdit(e) {
    const { index } = e.currentTarget.dataset;
    const records = this.data.records;
    records[index].editValue = records[index].content;
    records[index].isEditing = false;
    this.setData({ records });
  },

  onBackTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 200
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

    return `${year}.${month}.${day} ${weekDay} ${hour}:${minute}`;
  }
});
