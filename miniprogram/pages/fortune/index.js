const { createFortuneRecord, getFortuneRecords, deleteFortuneRecord } = require('../../services/fortune.js');
const { showLoading, hideLoading, showToast, showSuccess } = require('../../utils/toast.js');
const { TOAST_MESSAGES } = require('../../utils/constants.js');
const { formatDate } = require('../../utils/date.js');

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
    showBackTop: false,
    actionPopup: { visible: false, y: 0, right: 0, index: -1 },
    editModalVisible: false,
    editModalRecord: null
  },

  onLoad() {
    this.loadRecords();
  },

  onShow() {
    if (this._needRefresh) {
      this._needRefresh = false;
      this.setData({ page: 1, hasMore: true }, () => this.loadRecords());
    }
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
          created_at: formatDate(record.created_at, { dateSeparator: 'dot' }),
          _needCollapse: false,
          _expanded: false
        }));

        this.setData({
          records: page === 1 ? records : this.data.records.concat(records),
          hasMore: records.length >= limit
        }, () => {
          this.checkContentOverflow();
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

  checkContentOverflow() {
    const COLLAPSE_HEIGHT = 96;
    wx.nextTick(() => {
      const query = this.createSelectorQuery();
      query.selectAll('.record-card .content-text').boundingClientRect();
      query.exec((res) => {
        if (!res || !res[0]) return;
        const rects = res[0];
        const { records } = this.data;
        const updates = {};
        rects.forEach((rect, i) => {
          if (i < records.length && rect.height > COLLAPSE_HEIGHT && !records[i]._needCollapse) {
            updates[`records[${i}]._needCollapse`] = true;
          }
        });
        if (Object.keys(updates).length > 0) {
          this.setData(updates);
        }
      });
    });
  },

  toggleExpand(e) {
    const index = e.currentTarget.dataset.index;
    const key = `records[${index}]._expanded`;
    this.setData({ [key]: !this.data.records[index]._expanded });
  },

  onRecordAction(e) {
    const index = e.currentTarget.dataset.index;
    const record = this.data.records[index];
    if (!record) return;

    const query = this.createSelectorQuery();
    query.selectAll('.more-btn').boundingClientRect();
    query.selectViewport().scrollOffset();
    query.exec((res) => {
      const buttons = res[0];
      const btn = buttons[index];
      if (!btn) return;

      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const screenWidth = windowInfo.windowWidth;
      const right = screenWidth - btn.right + btn.width;
      const y = btn.bottom + 4;

      this.setData({
        actionPopup: { visible: true, y, right, index }
      });
    });
  },

  closeActionPopup() {
    this.setData({ 'actionPopup.visible': false });
  },

  onPopupEdit() {
    const record = this.data.records[this.data.actionPopup.index];
    this.closeActionPopup();
    if (record) this.editRecord(record);
  },

  onPopupCopy() {
    const record = this.data.records[this.data.actionPopup.index];
    this.closeActionPopup();
    if (record) {
      wx.setClipboardData({ data: record.content || '' });
    }
  },

  onPopupDelete() {
    const record = this.data.records[this.data.actionPopup.index];
    this.closeActionPopup();
    if (record) this.deleteRecord(record);
  },

  noop() {},

  editRecord(record) {
    this.setData({
      editModalVisible: true,
      editModalRecord: record
    });
  },

  onEditSave() {
    this.setData({ editModalVisible: false });
    this.setData({ page: 1, hasMore: true }, () => this.loadRecords());
  },

  onEditClose() {
    this.setData({ editModalVisible: false });
  },

  deleteRecord(record) {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条记录吗？',
      confirmText: '删除',
      confirmColor: '#FF6B6B',
      success: async (res) => {
        if (!res.confirm) return;
        showLoading('删除中...');
        try {
          const result = await deleteFortuneRecord(record._id);
          if (result.code === 0) {
            showSuccess(TOAST_MESSAGES.RECORD_DELETE_SUCCESS);
            this.setData({ page: 1, hasMore: true }, () => this.loadRecords());
          } else {
            showToast(result.message || TOAST_MESSAGES.RECORD_DELETE_FAILED);
          }
        } catch (error) {
          console.error('删除记录失败:', error);
          showToast(TOAST_MESSAGES.RECORD_DELETE_FAILED);
        } finally {
          hideLoading();
        }
      }
    });
  },

  onBackTop() {
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 200
    });
  },
});
