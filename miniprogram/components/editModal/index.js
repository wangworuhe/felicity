const { upsertHappinessRecord } = require('../../services/happiness.js');
const { upsertFortuneRecord } = require('../../services/fortune.js');
const { showLoading, hideLoading, showToast, showSuccess } = require('../../utils/toast.js');
const { TOAST_MESSAGES } = require('../../utils/constants.js');
const { uploadImageToCloud, uploadVoiceToCloud } = require('../../utils/cloud.js');

Component({
  properties: {
    visible: { type: Boolean, value: false },
    record: { type: Object, value: null },
    recordType: { type: String, value: 'happiness' }
  },

  data: {
    editContent: '',
    imageUrls: [],
    voiceUrls: [],
    saving: false,
    isRecording: false,
    recordingTime: 0,
    maxImages: 3,
    maxVoices: 3,
    playingVoiceKey: '',
    showMediaTools: true
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
        const showMediaTools = this.properties.recordType !== 'fortune';
        this.setData({ showMediaTools });
        if (showMediaTools) {
          this.initRecorderManager();
        }
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

      wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          showLoading(TOAST_MESSAGES.IMAGE_UPLOADING);
          try {
            const uploads = await Promise.all(
              res.tempFiles.map(file => uploadImageToCloud(file.tempFilePath))
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
          const fileId = await uploadVoiceToCloud(res.tempFilePath);
          this.setData({ voiceUrls: this.data.voiceUrls.concat(fileId) });
        } catch (error) {
          console.error('上传录音失败:', error);
          showToast('录音上传失败');
        } finally {
          hideLoading();
        }
      });
    },

    onVoiceToggle() {
      const { voiceUrls, maxVoices, isRecording } = this.data;

      if (isRecording) {
        if (this.recorderManager) this.recorderManager.stop();
        return;
      }

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

    initAudioContext() {
      if (this._innerAudioContext) return;
      this._innerAudioContext = wx.createInnerAudioContext();
      this._innerAudioContext.obeyMuteSwitch = false;
      this._innerAudioContext.onEnded(() => {
        this.setData({ playingVoiceKey: '' });
      });
      this._innerAudioContext.onError((err) => {
        console.error('音频播放错误:', err);
        this.setData({ playingVoiceKey: '' });
        showToast('播放失败');
      });
    },

    onPlayVoice(e) {
      const voiceIndex = Number(e.currentTarget.dataset.index);
      const key = `edit-${voiceIndex}`;
      const fileId = this.data.voiceUrls[voiceIndex];

      this.initAudioContext();

      if (this.data.playingVoiceKey === key) {
        this._innerAudioContext.stop();
        this.setData({ playingVoiceKey: '' });
        return;
      }

      if (!fileId) return;

      this._innerAudioContext.stop();
      this._innerAudioContext.src = fileId;
      this._innerAudioContext.play();
      this.setData({ playingVoiceKey: key });
    },

    onRemoveVoice(e) {
      const idx = Number(e.currentTarget.dataset.index);
      const voiceUrls = this.data.voiceUrls.filter((_, i) => i !== idx);
      this.setData({ voiceUrls });
    },

    async onSave() {
      const { editContent, imageUrls, voiceUrls } = this.data;
      const record = this.properties.record;
      const recordType = this.properties.recordType;

      const hasContent = recordType === 'fortune'
        ? editContent.trim()
        : (editContent.trim() || imageUrls.length || voiceUrls.length);
      if (!hasContent) {
        showToast('内容不能为空');
        return;
      }

      this.setData({ saving: true });
      showLoading('保存中...');
      try {
        let result;
        if (recordType === 'fortune') {
          result = await upsertFortuneRecord({
            _id: record._id,
            content: editContent
          });
        } else {
          const payload = {
            _id: record._id,
            content: editContent,
            image_urls: imageUrls,
            voice_urls: voiceUrls,
            location: record.location,
            date_key: record.date_key,
            order: record.order
          };
          result = await upsertHappinessRecord(payload);
        }
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
      if (this.data.isRecording && this.recorderManager) {
        this.recorderManager.stop();
        clearInterval(this._recordingTimer);
        this.setData({ isRecording: false, recordingTime: 0 });
      }
      if (this._innerAudioContext) {
        this._innerAudioContext.destroy();
        this._innerAudioContext = null;
      }
      this.setData({ playingVoiceKey: '' });
      this.triggerEvent('close');
    },

    noop() {}
  }
});
