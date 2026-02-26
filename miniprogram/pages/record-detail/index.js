const { getHappinessRecordDetail, deleteHappinessRecord, upsertHappinessRecord } = require('../../services/happiness.js');
const { showLoading, hideLoading, showToast, showSuccess, showError } = require('../../utils/toast.js');
const { TOAST_MESSAGES } = require('../../utils/constants.js');
const { formatDate } = require('../../utils/date.js');

Page({
  data: {
    record: null,
    id: '',
    loading: true,
    editing: false,
    editContent: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        id: options.id,
        editing: options.edit === 'true'
      });
      this.loadRecordDetail();
    } else {
      showToast('记录不存在');
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  async loadRecordDetail() {
    showLoading('加载中...');
    
    try {
      const result = await getHappinessRecordDetail(this.data.id);
      
      if (result.code === 0) {
        const r = result.data;
        this.setData({
          record: {
            ...r,
            image_urls: Array.isArray(r.image_urls) ? r.image_urls : (r.image_url ? [r.image_url] : []),
            voice_urls: Array.isArray(r.voice_urls) ? r.voice_urls : [],
            created_at: formatDate(r.created_at, { includeSeconds: true })
          },
          editContent: r.content || '',
          loading: false
        });
      } else {
        showToast(result.message || '记录不存在');
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('加载记录详情失败:', error);
      showToast('加载失败');
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } finally {
      hideLoading();
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

  onShare() {
    wx.showModal({
      title: '提示',
      content: '海报生成功能即将上线',
      showCancel: false
    });
  },

  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条记录吗？',
      confirmText: '删除',
      confirmColor: '#FF6B6B',
      success: async (res) => {
        if (res.confirm) {
          await this.deleteRecord();
        }
      }
    });
  },

  async deleteRecord() {
    showLoading('删除中...');
    try {
      const result = await deleteHappinessRecord(this.data.id);
      if (result.code === 0) {
        showSuccess(TOAST_MESSAGES.RECORD_DELETE_SUCCESS);
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        showToast(result.message || TOAST_MESSAGES.RECORD_DELETE_FAILED);
      }
    } catch (error) {
      console.error('删除记录失败:', error);
      showToast(TOAST_MESSAGES.RECORD_DELETE_FAILED);
    } finally {
      hideLoading();
    }
  },

  onEditInput(e) {
    this.setData({ editContent: e.detail.value });
  },

  onCancelEdit() {
    this.setData({
      editing: false,
      editContent: this.data.record.content || ''
    });
  },

  async onSaveEdit() {
    const { editContent, record } = this.data;
    if (!editContent.trim()) {
      showToast('内容不能为空');
      return;
    }

    showLoading('保存中...');
    try {
      const payload = {
        _id: record._id,
        content: editContent,
        image_urls: record.image_urls || (record.image_url ? [record.image_url] : []),
        voice_urls: record.voice_urls || [],
        location: record.location,
        date_key: record.date_key,
        order: record.order
      };

      const result = await upsertHappinessRecord(payload);
      if (result.code === 0) {
        this.setData({
          editing: false,
          record: { ...this.data.record, content: editContent }
        });
        showSuccess('保存成功');
      } else {
        showToast(result.message || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      showToast('保存失败');
    } finally {
      hideLoading();
    }
  },

});
