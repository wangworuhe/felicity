const { upsertHappinessRecord } = require('../../services/happiness.js');
const { upsertFortuneRecord } = require('../../services/fortune.js');
const { upsertDiaryRecord } = require('../../services/diary.js');
const { showLoading, hideLoading, showToast, showSuccess } = require('../../utils/toast.js');
const { TOAST_MESSAGES } = require('../../utils/constants.js');
const { ensurePrivacyAuthorized, guardScope } = require('../../utils/privacy.js');
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
    voiceDurations: [],
    voiceDurationTexts: [],
    saving: false,
    isRecording: false,
    recordingTime: 0,
    maxImages: 3,
    maxVoices: 3,
    playingVoiceKey: '',
    showMediaTools: true,
    showImageTools: true
  },

  observers: {
    'record': function(record) {
      if (!record) return;
      this.setData({
        editContent: record.content || '',
        imageUrls: record.image_urls || (record.image_url ? [record.image_url] : []),
        voiceUrls: record.voice_urls || (record.voice_url ? [record.voice_url] : []),
        voiceDurations: record.voice_durations || [],
        voiceDurationTexts: (record.voice_durations || []).map(d => this._formatVoiceDuration(d))
      });
    },
    'visible': function(visible) {
      if (visible) {
        const recordType = this.properties.recordType;
        // fortune: 纯文字，无媒体工具
        // diary: 文字 + 语音，无图片
        // happiness: 文字 + 图片 + 语音
        const showMediaTools = recordType !== 'fortune';
        const showImageTools = recordType === 'happiness';
        this.setData({ showMediaTools, showImageTools });
        if (showMediaTools) {
          this.initRecorderManager();
        }
      }
    }
  },

  methods: {
    onEditInput(e) {
      // 直接修改 data，不 setData value，避免 textarea 重渲染导致中文输入法光标跳动
      this.data.editContent = e.detail.value;
    },

    onEditBlur() {
      // 失焦时将输入内容同步到 data 层
      this.setData({ editContent: this.data.editContent });
    },

    async onChooseImage() {
      const { imageUrls, maxImages } = this.data;
      const remaining = maxImages - imageUrls.length;
      if (remaining <= 0) {
        showToast('最多上传3张图片');
        return;
      }

      const privacyOk = await ensurePrivacyAuthorized('editModal.chooseMedia');
      if (!privacyOk) return;

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
        },
        fail: (err) => {
          const errMsg = (err && err.errMsg) || '';
          if (errMsg.includes('auth') || errMsg.includes('deny') || errMsg.includes('permission')) {
            guardScope('scope.camera', '请允许使用相机以拍照上传图片');
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
          const duration = res.duration || 0;
          this.setData({
            voiceUrls: this.data.voiceUrls.concat(fileId),
            voiceDurations: this.data.voiceDurations.concat(duration),
            voiceDurationTexts: this.data.voiceDurationTexts.concat(this._formatVoiceDuration(duration))
          });
        } catch (error) {
          console.error('上传录音失败:', error);
          showToast('录音上传失败');
        } finally {
          hideLoading();
        }
      });
    },

    async onVoiceToggle() {
      const { voiceUrls, maxVoices, isRecording } = this.data;

      if (isRecording) {
        if (this.recorderManager) this.recorderManager.stop();
        return;
      }

      if (voiceUrls.length >= maxVoices) {
        showToast('最多录制3段语音');
        return;
      }

      const privacyOk = await ensurePrivacyAuthorized('editModal.record');
      if (!privacyOk) return;

      const scopeOk = await guardScope('scope.record', '请允许使用麦克风以启用录音功能');
      if (!scopeOk) return;

      this.setData({ isRecording: true, recordingTime: 0 });
      this._recordingTimer = setInterval(() => {
        this.setData({ recordingTime: this.data.recordingTime + 1 });
      }, 1000);
      this.recorderManager.start({ duration: 60000, format: 'mp3' });
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
      wx.showModal({
        title: '提示',
        content: '确定删除这段语音吗？',
        success: (res) => {
          if (!res.confirm) return;
          const voiceUrls = this.data.voiceUrls.filter((_, i) => i !== idx);
          const voiceDurations = this.data.voiceDurations.filter((_, i) => i !== idx);
          const voiceDurationTexts = this.data.voiceDurationTexts.filter((_, i) => i !== idx);
          this.setData({ voiceUrls, voiceDurations, voiceDurationTexts });
        }
      });
    },

    async onSave() {
      const { editContent, imageUrls, voiceUrls, voiceDurations } = this.data;
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
        } else if (recordType === 'diary') {
          result = await upsertDiaryRecord({
            _id: record._id,
            content: editContent,
            tag: record.tag,
            voice_urls: voiceUrls,
            voice_durations: voiceDurations,
            date_key: record.date_key
          });
        } else {
          const payload = {
            _id: record._id,
            content: editContent,
            image_urls: imageUrls,
            voice_urls: voiceUrls,
            voice_durations: voiceDurations,
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

    _formatVoiceDuration(ms) {
      const totalSec = Math.round((ms || 0) / 1000);
      const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const sec = String(totalSec % 60).padStart(2, '0');
      return `${min}:${sec}`;
    },

    noop() {}
  }
});
