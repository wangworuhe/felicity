const {
  upsertHappinessRecord,
  getHappinessRecordsByDateKey,
  getHappinessRecords,
  getRandomHappinessRecord,
  deleteHappinessRecord
} = require('../../services/happiness.js');
const { showLoading, hideLoading, showToast, showSuccess } = require('../../utils/toast.js');
const { TOAST_MESSAGES } = require('../../utils/constants.js');
const { formatDate } = require('../../utils/date.js');
const { uploadImageToCloud, uploadVoiceToCloud } = require('../../utils/cloud.js');

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
    playingVoiceKey: '',
    formMinHeightPx: 0,
    records: [],
    page: 1,
    limit: 10,
    hasMore: true,
    loadingRecords: false,
    randomRecord: null,
    randomLoading: false,
    showRandomModal: false,
    actionPopup: { visible: false, y: 0, right: 0, index: -1 },
    editModalVisible: false,
    editModalRecord: null
  },

  onLoad() {
    this.setCurrentDate();
    this.getLocation();
    this.setFormMinHeight();
    this.initRecorderManager();
    this.initCards();
    this.loadRecords();
  },

  onShow() {
    if (this._hasLoaded) {
      this.setData({ page: 1, hasMore: true }, () => this.loadRecords());
    }
    this._hasLoaded = true;
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
        const fileId = await uploadVoiceToCloud(res.tempFilePath);
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

  onVoiceToggle(e) {
    const index = Number(e.currentTarget.dataset.index);
    const { cards, maxVoices, isRecording, recordingCardIndex } = this.data;

    if (isRecording) {
      if (recordingCardIndex === index && this.recorderManager) {
        this.recorderManager.stop();
      }
      return;
    }

    const target = cards[index];
    if (!target) return;

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

  initAudioContext() {
    if (this.innerAudioContext) return;
    this.innerAudioContext = wx.createInnerAudioContext();
    this.innerAudioContext.obeyMuteSwitch = false;
    this.innerAudioContext.onEnded(() => {
      this.setData({ playingVoiceKey: '' });
    });
    this.innerAudioContext.onError((err) => {
      console.error('音频播放错误:', err);
      this.setData({ playingVoiceKey: '' });
      showToast('播放失败');
    });
  },

  onPlayVoice(e) {
    const cardIndex = Number(e.currentTarget.dataset.index);
    const voiceIndex = Number(e.currentTarget.dataset.voiceIndex);
    const key = `card-${cardIndex}-${voiceIndex}`;
    this._playVoice(key, this.data.cards[cardIndex].voiceUrls[voiceIndex]);
  },

  onPlayRecordVoice(e) {
    const recordIndex = Number(e.currentTarget.dataset.recordIndex);
    const voiceIndex = Number(e.currentTarget.dataset.voiceIndex);
    const key = `record-${recordIndex}-${voiceIndex}`;
    const record = this.data.records[recordIndex];
    if (!record) return;
    const voiceUrls = record.voice_urls || [];
    this._playVoice(key, voiceUrls[voiceIndex]);
  },

  _playVoice(key, fileId) {
    this.initAudioContext();

    if (this.data.playingVoiceKey === key) {
      this.innerAudioContext.stop();
      this.setData({ playingVoiceKey: '' });
      return;
    }

    if (!fileId) return;

    this.innerAudioContext.stop();
    this.innerAudioContext.src = fileId;
    this.innerAudioContext.play();
    this.setData({ playingVoiceKey: key });
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
          image_urls: Array.isArray(record.image_urls) ? record.image_urls : (record.image_url ? [record.image_url] : []),
          voice_urls: Array.isArray(record.voice_urls) ? record.voice_urls : [],
          created_at: formatDate(record.created_at, { includeYear: true }),
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
      console.error('加载记录失败:', error);
      showToast('加载失败');
      if (this.data.page === 1) {
        this.setData({ records: [] });
      }
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
    if (record) this.copyRecord(record);
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

  copyRecord(record) {
    wx.setClipboardData({
      data: record.content || ''
    });
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
          const result = await deleteHappinessRecord(record._id);
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

  toggleExpand(e) {
    const index = e.currentTarget.dataset.index;
    const key = `records[${index}]._expanded`;
    this.setData({ [key]: !this.data.records[index]._expanded });
  },

  onCardTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/record-detail/index?id=${id}`
    });
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
        const r = result.data;
        this.setData({
          randomRecord: {
            ...r,
            image_urls: Array.isArray(r.image_urls) ? r.image_urls : (r.image_url ? [r.image_url] : []),
            created_at: formatDate(r.created_at)
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

  onPreviewRandomImage(e) {
    const { randomRecord } = this.data;
    if (!randomRecord || !randomRecord.image_urls || !randomRecord.image_urls.length) return;
    const current = (e && e.currentTarget && e.currentTarget.dataset.url) || randomRecord.image_urls[0];
    wx.previewImage({
      urls: randomRecord.image_urls,
      current
    });
  },

  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          location: {
            latitude: res.latitude,
            longitude: res.longitude
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
    if (this.innerAudioContext) {
      this.innerAudioContext.destroy();
      this.innerAudioContext = null;
    }
    if (this.draftTimer) {
      clearTimeout(this.draftTimer);
    }
  }
});
