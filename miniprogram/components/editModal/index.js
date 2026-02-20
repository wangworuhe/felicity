const { upsertHappinessRecord } = require('../../services/happiness.js');
const { showLoading, hideLoading, showToast, showSuccess } = require('../../utils/toast.js');
const { TOAST_MESSAGES } = require('../../utils/constants.js');

Component({
  properties: {
    visible: { type: Boolean, value: false },
    record: { type: Object, value: null }
  },

  data: {
    editContent: '',
    imageUrls: [],
    voiceUrls: [],
    saving: false,
    isRecording: false,
    recordingTime: 0,
    maxImages: 3,
    maxVoices: 3
  },

  observers: {
    'record': function(record) {
      if (!record) return;
      this.setData({
        editContent: record.content || '',
        imageUrls: record.image_urls || (record.image_url ? [record.image_url] : []),
        voiceUrls: record.voice_urls || (record.voice_url ? [record.voice_url] : [])
      });
    },
    'visible': function(visible) {
      if (visible) {
        this.initRecorderManager();
      }
    }
  },

  methods: {
    onEditInput(e) {
      this.setData({ editContent: e.detail.value });
    },

    onChooseImage() {
      const { imageUrls, maxImages } = this.data;
      const remaining = maxImages - imageUrls.length;
      if (remaining <= 0) {
        showToast('最多上传3张图片');
        return;
      }

      wx.chooseImage({
        count: remaining,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          showLoading(TOAST_MESSAGES.IMAGE_UPLOADING);
          try {
            const uploads = await Promise.all(
              res.tempFilePaths.map(filePath => this.uploadImageToCloud(filePath))
            );
            this.setData({ imageUrls: this.data.imageUrls.concat(uploads) });
          } catch (error) {
            console.error('上传图片失败:', error);
            showToast(TOAST_MESSAGES.IMAGE_UPLOAD_FAILED);
          } finally {
            hideLoading();
          }
        }
      });
    },

    onRemoveImage(e) {
      const idx = Number(e.currentTarget.dataset.index);
      const imageUrls = this.data.imageUrls.filter((_, i) => i !== idx);
      this.setData({ imageUrls });
    },

    onPreviewImage(e) {
      const url = e.currentTarget.dataset.url;
      wx.previewImage({
        current: url,
        urls: this.data.imageUrls
      });
    },

    initRecorderManager() {
      if (this.recorderManager) return;
      this.recorderManager = wx.getRecorderManager();
      this.recorderManager.onStop(async (res) => {
        clearInterval(this._recordingTimer);
        this.setData({ isRecording: false, recordingTime: 0 });

        if (!res.tempFilePath) return;
        showLoading('上传中...');
        try {
          const fileId = await this.uploadVoiceToCloud(res.tempFilePath);
          this.setData({ voiceUrls: this.data.voiceUrls.concat(fileId) });
        } catch (error) {
          console.error('上传录音失败:', error);
          showToast('录音上传失败');
        } finally {
          hideLoading();
        }
      });
    },

    onVoiceStart() {
      const { voiceUrls, maxVoices, isRecording } = this.data;
      if (isRecording) return;
      if (voiceUrls.length >= maxVoices) {
        showToast('最多录制3段语音');
        return;
      }

      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.record'] === false) {
            wx.showModal({
              title: '需要麦克风权限',
              content: '请允许使用麦克风以启用录音功能',
              showCancel: false,
              confirmText: '去设置',
              success: (modalRes) => {
                if (modalRes.confirm) wx.openSetting();
              }
            });
          } else {
            this.setData({ isRecording: true, recordingTime: 0 });
            this._recordingTimer = setInterval(() => {
              this.setData({ recordingTime: this.data.recordingTime + 1 });
            }, 1000);
            this.recorderManager.start({ duration: 60000, format: 'mp3' });
          }
        }
      });
    },

    onVoiceEnd() {
      if (this.recorderManager) this.recorderManager.stop();
    },

    onVoiceCancel() {
      if (this.recorderManager) this.recorderManager.stop();
      clearInterval(this._recordingTimer);
      this.setData({ isRecording: false, recordingTime: 0 });
    },

    onRemoveVoice(e) {
      const idx = Number(e.currentTarget.dataset.index);
      const voiceUrls = this.data.voiceUrls.filter((_, i) => i !== idx);
      this.setData({ voiceUrls });
    },

    async onSave() {
      const { editContent, imageUrls, voiceUrls } = this.data;
      const record = this.properties.record;

      const hasContent = editContent.trim() || imageUrls.length || voiceUrls.length;
      if (!hasContent) {
        showToast('内容不能为空');
        return;
      }

      this.setData({ saving: true });
      showLoading('保存中...');
      try {
        const payload = {
          _id: record._id,
          content: editContent,
          image_urls: imageUrls,
          voice_urls: voiceUrls,
          location: record.location,
          date_key: record.date_key,
          order: record.order
        };
        const result = await upsertHappinessRecord(payload);
        if (result.code === 0) {
          showSuccess(TOAST_MESSAGES.RECORD_CREATE_SUCCESS);
          this.triggerEvent('save', { record: result.data });
        } else {
          showToast('保存失败');
        }
      } catch (error) {
        console.error('保存失败:', error);
        showToast('保存失败');
      } finally {
        hideLoading();
        this.setData({ saving: false });
      }
    },

    onClose() {
      if (this.data.isRecording) {
        this.onVoiceCancel();
      }
      this.triggerEvent('close');
    },

    noop() {},

    async uploadImageToCloud(filePath) {
      const cloudPath = `happiness/${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`;
      const result = await wx.cloud.uploadFile({ cloudPath, filePath });
      return result.fileID;
    },

    async uploadVoiceToCloud(filePath) {
      const cloudPath = `voice/${Date.now()}-${Math.random().toString(16).slice(2)}.mp3`;
      const result = await wx.cloud.uploadFile({ cloudPath, filePath });
      return result.fileID;
    }
  }
});
