const { getHappinessRecordDetail, deleteHappinessRecord, upsertHappinessRecord } = require('../../services/happiness.js');
const { showLoading, hideLoading, showToast, showSuccess, showError } = require('../../utils/toast.js');
const { TOAST_MESSAGES } = require('../../utils/constants.js');

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
        this.setData({
          record: {
            ...result.data,
            created_at: this.formatDate(result.data.created_at)
          },
          editContent: result.data.content || '',
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

  onPreviewImage() {
    const { image_url } = this.data.record;
    if (image_url) {
      wx.previewImage({
        urls: [image_url],
        current: image_url
      });
    }
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
        hideLoading();
        showSuccess(TOAST_MESSAGES.RECORD_DELETE_SUCCESS);
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        hideLoading();
        showToast(result.message || TOAST_MESSAGES.RECORD_DELETE_FAILED);
      }
    } catch (error) {
      console.error('删除记录失败:', error);
      hideLoading();
      showToast(TOAST_MESSAGES.RECORD_DELETE_FAILED);
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
