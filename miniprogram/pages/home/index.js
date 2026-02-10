const {
  upsertHappinessRecord,
  getHappinessRecordsByDateKey,
  getHappinessRecords,
  getRandomHappinessRecord,
  deleteHappinessRecord
} = require('../../services/happiness.js');
const { showLoading, hideLoading, showToast, showSuccess } = require('../../utils/toast.js');
const { TOAST_MESSAGES } = require('../../utils/constants.js');

Page({
  data: {
    currentDate: '',
    dateKey: '',
    cards: [],
    focusedCardIndex: -1,
    maxImages: 3,
    maxVoices: 3,
    location: null,
    submitting: false,
    isRecording: false,
    recordingCardIndex: -1,
    recordingTime: 0,
    recordingTimer: null,
    formMinHeightPx: 0,
    records: [],
    page: 1,
    limit: 10,
    hasMore: true,
    loadingRecords: false,
    randomRecord: null,
    randomLoading: false,
    showRandomModal: false
  },

  onLoad() {
    this.setCurrentDate();
    this.getLocation();
    this.setFormMinHeight();
    this.initRecorderManager();
    this.initCards();
    this.loadRecords();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true }, async () => {
      await this.initCards();
      await this.loadRecords(() => {
        wx.stopPullDownRefresh();
      });
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingRecords) {
      this.loadMore();
    }
  },

  setFormMinHeight() {
    let windowHeight = 0;

    if (wx.getWindowInfo) {
      windowHeight = wx.getWindowInfo().windowHeight;
    } else {
      const systemInfo = wx.getSystemInfoSync();
      windowHeight = systemInfo.windowHeight;
    }

    this.setData({
      formMinHeightPx: Math.floor(windowHeight / 3)
    });
  },

  setCurrentDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];
    const dateKey = `${year}-${month}-${day}`;

    this.setData({
      currentDate: `${year}年${month}月${day}日 ${weekDay}`,
      dateKey
    });
  },

  getDraftStorageKey(dateKey) {
    return `happiness_draft_${dateKey}`;
  },

  loadDraftCards(dateKey) {
    try {
      const draft = wx.getStorageSync(this.getDraftStorageKey(dateKey));
      return draft && Array.isArray(draft.cards) ? draft.cards : [];
    } catch (error) {
      console.error('读取草稿失败:', error);
      return [];
    }
  },

  saveDraftCards(cards) {
    const { dateKey } = this.data;
    try {
      wx.setStorageSync(this.getDraftStorageKey(dateKey), {
        dateKey,
        cards
      });
    } catch (error) {
      console.error('保存草稿失败:', error);
    }
  },

  scheduleDraftSave(cards) {
    if (this.draftTimer) {
      clearTimeout(this.draftTimer);
    }
    this.draftTimer = setTimeout(() => {
      this.saveDraftCards(cards);
    }, 400);
  },

  createEmptyCard(order) {
    return {
      localId: `local-${Date.now()}-${order}`,
      order,
      content: '',
      imageUrls: [],
      voiceUrls: [],
      cloudId: '',
      dirty: false
    };
  },

  ensureMinCards(cards, minCount = 3) {
    if (cards.length >= minCount) return cards;
    const maxOrder = cards.reduce((max, card) => Math.max(max, card.order || 0), 0);
    const result = [...cards];
    for (let i = cards.length; i < minCount; i += 1) {
      result.push(this.createEmptyCard(maxOrder + (i - cards.length + 1)));
    }
    return result;
  },

  mergeCards(draftCards, cloudRecords) {
    const cloudCards = cloudRecords.map(record => {
      const imageUrls = Array.isArray(record.image_urls)
        ? record.image_urls
        : (record.image_url ? [record.image_url] : []);
      const voiceUrls = Array.isArray(record.voice_urls)
        ? record.voice_urls
        : (record.voice_url ? [record.voice_url] : []);

      return {
        localId: `cloud-${record._id}`,
        order: record.order || 1,
        content: record.content || '',
        imageUrls,
        voiceUrls,
        cloudId: record._id,
        dirty: false
      };
    });

    const draftMap = new Map(draftCards.map(card => [card.order, card]));
    const cloudMap = new Map(cloudCards.map(card => [card.order, card]));
    const orders = Array.from(new Set([...draftMap.keys(), ...cloudMap.keys()])).sort((a, b) => a - b);

    const merged = orders.map(order => {
      const draft = draftMap.get(order);
      const cloud = cloudMap.get(order);

      if (draft && cloud) {
        return {
          ...cloud,
          ...draft,
          cloudId: cloud.cloudId || draft.cloudId,
          dirty: !!draft.dirty
        };
      }

      if (draft) {
        return {
          ...this.createEmptyCard(order),
          ...draft
        };
      }

      return cloud;
    });

    return this.ensureMinCards(merged, 3);
  },

  async initCards() {
    const { dateKey } = this.data;
    const draftCards = this.loadDraftCards(dateKey);

    try {
      const result = await getHappinessRecordsByDateKey(dateKey);
      const cloudRecords = result.code === 0 ? result.data : [];
      const cards = this.mergeCards(draftCards, cloudRecords);
      this.setData({ cards });
    } catch (error) {
      console.error('加载今日记录失败:', error);
      const cards = this.ensureMinCards(draftCards, 3);
      this.setData({ cards });
    }
  },

  onAddCard() {
    const { cards } = this.data;
    const maxOrder = cards.reduce((max, card) => Math.max(max, card.order || 0), 0);
    const nextCard = this.createEmptyCard(maxOrder + 1);
    const nextCards = [...cards, nextCard];
    this.setData({ cards: nextCards }, () => this.saveDraftCards(nextCards));
  },

  async onDeleteCard(e) {
    const index = Number(e.currentTarget.dataset.index);
    const { cards } = this.data;
    const target = cards[index];
    if (!target) return;

    const removeCard = async () => {
      const nextCards = cards.filter((_, idx) => idx !== index);
      const ensured = this.ensureMinCards(nextCards, 1);
      this.setData({ cards: ensured }, () => this.saveDraftCards(ensured));
    };

    if (target.cloudId) {
      wx.showModal({
        title: '确认删除',
        content: '该卡片已保存到云端，删除后不可恢复，确定删除吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await deleteHappinessRecord(target.cloudId);
              await removeCard();
              showSuccess(TOAST_MESSAGES.RECORD_DELETE_SUCCESS);
              this.setData({ page: 1, hasMore: true }, () => this.loadRecords());
            } catch (error) {
              console.error('删除失败:', error);
              showToast(TOAST_MESSAGES.RECORD_DELETE_FAILED);
            }
          }
        }
      });
      return;
    }

    await removeCard();
  },

  updateCard(index, patch, markDirty = true) {
    const { cards } = this.data;
    if (!cards[index]) return;
    const nextCards = cards.map((card, idx) => {
      if (idx !== index) return card;
      return {
        ...card,
        ...patch,
        dirty: markDirty ? true : card.dirty
      };
    });
    this.setData({ cards: nextCards }, () => this.scheduleDraftSave(nextCards));
  },

  onCardContentInput(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.updateCard(index, { content: e.detail.value });
  },

  onInputFocus(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ focusedCardIndex: index });
  },

  onInputBlur() {
    this.setData({ focusedCardIndex: -1 });
  },

  async onChooseImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    const { cards, maxImages } = this.data;
    const target = cards[index];
    if (!target) return;

    const remaining = maxImages - target.imageUrls.length;
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
          const imageUrls = target.imageUrls.concat(uploads);
          this.updateCard(index, { imageUrls });
        } catch (error) {
          console.error('上传图片失败:', error);
          showToast(TOAST_MESSAGES.IMAGE_UPLOAD_FAILED);
        } finally {
          hideLoading();
        }
      }
    });
  },

  async uploadImageToCloud(filePath) {
    const cloudPath = `happiness/${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`;
    const result = await wx.cloud.uploadFile({
      cloudPath,
      filePath
    });
    return result.fileID;
  },

  onRemoveImage(e) {
    const index = Number(e.currentTarget.dataset.index);
    const imageIndex = Number(e.currentTarget.dataset.imageIndex);
    const { cards } = this.data;
    const target = cards[index];
    if (!target) return;

    const imageUrls = target.imageUrls.filter((_, idx) => idx !== imageIndex);
    this.updateCard(index, { imageUrls });
  },

  initRecorderManager() {
    if (this.recorderManager) return;
    this.recorderManager = wx.getRecorderManager();
    this.recorderManager.onStop(async (res) => {
      clearInterval(this.data.recordingTimer);
      const index = this.data.recordingCardIndex;
      this.setData({ isRecording: false, recordingTime: 0, recordingTimer: null });

      if (index < 0 || !res.tempFilePath) return;
      showLoading('上传中...');
      try {
        const fileId = await this.uploadVoiceToCloud(res.tempFilePath);
        const target = this.data.cards[index];
        const voiceUrls = target.voiceUrls.concat(fileId);
        this.updateCard(index, { voiceUrls });
      } catch (error) {
        console.error('上传录音失败:', error);
        showToast('录音上传失败');
      } finally {
        hideLoading();
      }
    });
  },

  onVoiceStart(e) {
    const index = Number(e.currentTarget.dataset.index);
    const { cards, maxVoices, isRecording } = this.data;
    const target = cards[index];
    if (!target || isRecording) return;

    if (target.voiceUrls.length >= maxVoices) {
      showToast('最多录制3段语音');
      return;
    }

    wx.getSetting({
      success: (res) => {
        const authSetting = res.authSetting;
        if (authSetting['scope.record'] === false) {
          wx.showModal({
            title: '需要麦克风权限',
            content: '请允许使用麦克风以启用录音功能',
            showCancel: false,
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            }
          });
        } else {
          this.setData({ isRecording: true, recordingTime: 0, recordingCardIndex: index });
          const timer = setInterval(() => {
            this.setData({ recordingTime: this.data.recordingTime + 1 });
          }, 1000);
          this.setData({ recordingTimer: timer });

          this.recorderManager.start({
            duration: 60000,
            format: 'mp3'
          });
        }
      }
    });
  },

  onVoiceEnd() {
    if (this.recorderManager) {
      this.recorderManager.stop();
    }
  },

  onVoiceCancel() {
    if (this.recorderManager) {
      this.recorderManager.stop();
    }
    clearInterval(this.data.recordingTimer);
    this.setData({ isRecording: false, recordingTime: 0, recordingTimer: null });
  },

  async uploadVoiceToCloud(filePath) {
    const cloudPath = `voice/${Date.now()}-${Math.random().toString(16).slice(2)}.mp3`;
    const result = await wx.cloud.uploadFile({
      cloudPath,
      filePath
    });
    return result.fileID;
  },

  onRemoveVoice(e) {
    const index = Number(e.currentTarget.dataset.index);
    const voiceIndex = Number(e.currentTarget.dataset.voiceIndex);
    const { cards } = this.data;
    const target = cards[index];
    if (!target) return;

    const voiceUrls = target.voiceUrls.filter((_, idx) => idx !== voiceIndex);
    this.updateCard(index, { voiceUrls });
  },

  async onSaveCard(e) {
    const index = Number(e.currentTarget.dataset.index);
    const { cards, location, dateKey } = this.data;
    const target = cards[index];
    if (!target) return;

    const hasContent = target.content || target.voiceUrls.length || target.imageUrls.length;
    if (!hasContent) {
      showToast(TOAST_MESSAGES.CONTENT_REQUIRED);
      return;
    }

    this.setData({ submitting: true });
    showLoading('保存中...');
    try {
      const payload = {
        _id: target.cloudId || undefined,
        content: target.content,
        image_urls: target.imageUrls,
        voice_urls: target.voiceUrls,
        location,
        date_key: dateKey,
        order: target.order
      };

      const result = await upsertHappinessRecord(payload);
      if (result.code === 0) {
        this.updateCard(index, { cloudId: result.data._id, dirty: false }, false);
        showSuccess(TOAST_MESSAGES.RECORD_CREATE_SUCCESS);
        this.setData({ page: 1, hasMore: true }, () => this.loadRecords());
      } else {
        showToast(TOAST_MESSAGES.RECORD_CREATE_FAILED);
      }
    } catch (error) {
      console.error('保存失败:', error);
      showToast(TOAST_MESSAGES.RECORD_CREATE_FAILED);
    } finally {
      hideLoading();
      this.setData({ submitting: false });
    }
  },

  async loadRecords(callback) {
    if (this.data.loadingRecords) return;

    this.setData({ loadingRecords: true });

    try {
      const { page, limit } = this.data;
      const result = await getHappinessRecords(page, limit);

      if (result.code === 0) {
        const records = result.data.map(record => ({
          ...record,
          image_url: record.image_url || (Array.isArray(record.image_urls) ? record.image_urls[0] : ''),
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
      this.setData({ loadingRecords: false });
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
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];

    return `${month}月${day}日 ${weekDay} ${hour}:${minute}`;
  },

  openRandomModal() {
    this.setData({ showRandomModal: true }, () => {
      this.loadRandomRecord();
    });
  },

  closeRandomModal() {
    this.setData({ showRandomModal: false });
  },

  async loadRandomRecord() {
    this.setData({ randomLoading: true });

    try {
      const result = await getRandomHappinessRecord();

      if (result.code === 0 && result.data) {
        this.setData({
          randomRecord: {
            ...result.data,
            created_at: this.formatDate(result.data.created_at)
          }
        });
      } else {
        this.setData({ randomRecord: null });
      }
    } catch (error) {
      console.error('加载随机记录失败:', error);
      showToast('加载失败');
      this.setData({ randomRecord: null });
    } finally {
      this.setData({ randomLoading: false });
    }
  },

  onRefreshRandom() {
    this.loadRandomRecord();
  },

  onViewRandomDetail() {
    if (this.data.randomRecord) {
      wx.navigateTo({
        url: `/pages/record-detail/index?id=${this.data.randomRecord._id}`
      });
    }
  },

  async onPreviewImage(e) {
    const { index, url } = e.currentTarget.dataset
    const card = this.data.cards[index]
    if (!card || !card.imageUrls.length) return
    try {
      const { fileList } = await wx.cloud.getTempFileURL({ fileList: card.imageUrls })
      const tempUrls = fileList.map(f => f.tempFileURL)
      const currentTemp = fileList.find(f => f.fileID === url)
      wx.previewImage({
        urls: tempUrls,
        current: currentTemp ? currentTemp.tempFileURL : tempUrls[0]
      })
    } catch (err) {
      wx.previewImage({ urls: card.imageUrls, current: url })
    }
  },

  onPreviewRandomImage() {
    const { randomRecord } = this.data;
    if (randomRecord && randomRecord.image_url) {
      wx.previewImage({
        urls: [randomRecord.image_url],
        current: randomRecord.image_url
      });
    }
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res;
        wx.getLocation({
          type: 'wgs84',
          success: () => {
            this.setData({
              location: {
                latitude,
                longitude
              }
            });
          }
        });
      },
      fail: (err) => {
        console.log('获取位置失败:', err);
      }
    });
  },

  goToRecords() {
    wx.navigateTo({
      url: '/pages/records/index'
    });
  },

  goToRandom() {
    wx.navigateTo({
      url: '/pages/random/index'
    });
  },

  onUnload() {
    clearInterval(this.data.recordingTimer);
    if (this.recorderManager) {
      this.recorderManager.stop();
    }
    if (this.draftTimer) {
      clearTimeout(this.draftTimer);
    }
  }
});
