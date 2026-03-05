const {
  createDiaryRecord,
  getDiaryRecordsByDateKey,
  deleteDiaryRecord
} = require('../../services/diary.js');
const { showLoading, hideLoading, showToast, showSuccess } = require('../../utils/toast.js');
const { TOAST_MESSAGES, DIARY_PRESET_TAGS } = require('../../utils/constants.js');
const { ensurePrivacyAuthorized, guardScope } = require('../../utils/privacy.js');
const { uploadVoiceToCloud } = require('../../utils/cloud.js');

Page({
  data: {
    // 导航栏
    statusBarHeight: 0,
    navBarHeight: 0,
    calendarOpen: false,
    calendarHeight: 0,
    selectedDate: '',

    // 输入
    inputValue: '',
    selectedTag: '日常',
    allTags: [],
    saving: false,

    // 标签编辑
    editingTags: false,
    draggingIndex: -1,
    dragOffsetX: 0,

    // 语音
    isRecording: false,
    recordingTime: 0,

    // 条目列表
    records: [],
    loading: false,
    displayDateTitle: '',

    // 操作弹窗
    actionPopup: { visible: false, y: 0, right: 0, index: -1 },
    editModalVisible: false,
    editModalRecord: null,

    // 语音播放
    playingVoiceKey: ''
  },

  onLoad() {
    // 获取状态栏高度，适配自定义导航栏
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const statusBarHeight = windowInfo.statusBarHeight || 20;
    const navBarHeight = statusBarHeight + 44;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    this._todayKey = this._formatDateStr(year, month, day);
    this._currentDateKey = this._todayKey;

    this.setData({
      statusBarHeight,
      navBarHeight,
      selectedDate: this._todayKey,
      displayDateTitle: this._getDateTitle(this._todayKey)
    });

    this._loadTags();
    this.loadRecords(this._todayKey);
  },

  onShow() {
    if (this._needRefresh) {
      this._needRefresh = false;
      this.loadRecords(this._currentDateKey);
    }
  },

  // === 日历 ===

  toggleCalendar() {
    if (this.data.calendarOpen) {
      // 收起：先把 spacer 高度归零（触发平滑动画），再隐藏面板
      this.setData({ calendarHeight: 0 });
      setTimeout(() => {
        this.setData({ calendarOpen: false });
      }, 300);
    } else {
      // 展开：先显示面板，再测量高度设置精确占位
      this.setData({ calendarOpen: true }, () => {
        wx.nextTick(() => {
          this.createSelectorQuery()
            .select('.calendar-panel')
            .boundingClientRect(rect => {
              if (rect) {
                this.setData({ calendarHeight: rect.height });
              }
            })
            .exec();
        });
      });
    }
  },

  onCalendarHeightChange() {
    if (!this.data.calendarOpen) return;
    wx.nextTick(() => {
      this.createSelectorQuery()
        .select('.calendar-panel')
        .boundingClientRect(rect => {
          if (rect) {
            this.setData({ calendarHeight: rect.height });
          }
        })
        .exec();
    });
  },

  onDateSelect(e) {
    const date = e.detail.date;
    if (!date) return;
    this._currentDateKey = date;
    this.setData({
      selectedDate: date,
      displayDateTitle: this._getDateTitle(date)
    });
    this.loadRecords(date);
  },

  // === 标签 ===

  onTagSelect(e) {
    if (this.data.editingTags) return;
    const tag = e.currentTarget.dataset.tag;
    this.setData({ selectedTag: tag });
  },

  onAddTag() {
    wx.showModal({
      title: '添加标签',
      editable: true,
      placeholderText: '输入标签名',
      success: (res) => {
        if (!res.confirm || !res.content) return;
        const tag = res.content.trim();
        if (!tag) return;

        const { allTags } = this.data;
        if (allTags.includes(tag)) {
          showToast('标签已存在');
          return;
        }

        const newTags = [...allTags, tag];
        this.setData({ allTags: newTags, selectedTag: tag });
        this._saveTags();
      }
    });
  },

  // === 标签编辑模式 ===

  onEnterTagEdit() {
    this.setData({ editingTags: true });
    wx.vibrateShort({ type: 'heavy' });
  },

  onFinishTagEdit() {
    this.setData({ editingTags: false, draggingIndex: -1, dragOffsetX: 0 });
  },

  onTagDelete(e) {
    const index = Number(e.currentTarget.dataset.index);
    const { allTags, selectedTag } = this.data;

    if (allTags.length <= 1) {
      showToast('至少保留一个标签');
      return;
    }

    const tag = allTags[index];
    const newTags = allTags.filter((_, i) => i !== index);
    const update = { allTags: newTags };

    if (selectedTag === tag) {
      update.selectedTag = newTags[0];
    }

    this.setData(update);
    this._saveTags();
  },

  // === 标签拖拽排序 ===

  onDragStart(e) {
    const index = Number(e.currentTarget.dataset.index);
    this._dragStartX = e.touches[0].clientX;
    this._dragIndex = index;
    this._lastSwapTime = 0;

    const query = this.createSelectorQuery();
    query.selectAll('.tag-edit-item').boundingClientRect();
    query.exec(res => {
      this._tagRects = res[0] || [];
    });

    this.setData({ draggingIndex: index });
    wx.vibrateShort({ type: 'light' });
  },

  onDragMove(e) {
    if (this._dragIndex < 0 || !this._tagRects) return;

    const currentX = e.touches[0].clientX;
    const dx = currentX - this._dragStartX;
    this.setData({ dragOffsetX: dx });

    // 节流交换检测
    const now = Date.now();
    if (now - this._lastSwapTime < 150) return;

    const rects = this._tagRects;
    const dragRect = rects[this._dragIndex];
    if (!dragRect) return;

    const dragCenterX = dragRect.left + dragRect.width / 2 + dx;
    let targetIndex = -1;

    // 检测与相邻标签的交换
    if (this._dragIndex > 0) {
      const prev = rects[this._dragIndex - 1];
      if (prev && dragCenterX < prev.left + prev.width / 2) {
        targetIndex = this._dragIndex - 1;
      }
    }
    if (targetIndex < 0 && this._dragIndex < rects.length - 1) {
      const next = rects[this._dragIndex + 1];
      if (next && dragCenterX > next.left + next.width / 2) {
        targetIndex = this._dragIndex + 1;
      }
    }

    if (targetIndex >= 0) {
      this._lastSwapTime = now;
      const tags = [...this.data.allTags];
      const [removed] = tags.splice(this._dragIndex, 1);
      tags.splice(targetIndex, 0, removed);

      this._dragIndex = targetIndex;
      this._dragStartX = currentX;

      this.setData({ allTags: tags, draggingIndex: targetIndex, dragOffsetX: 0 });
      wx.vibrateShort({ type: 'light' });

      // 重新获取位置
      wx.nextTick(() => {
        const query = this.createSelectorQuery();
        query.selectAll('.tag-edit-item').boundingClientRect();
        query.exec(res => {
          this._tagRects = res[0] || [];
        });
      });
    }
  },

  onDragEnd() {
    if (this._dragIndex < 0) return;
    this._dragIndex = -1;
    this.setData({ draggingIndex: -1, dragOffsetX: 0 });
    this._saveTags();
  },

  // === 输入与保存 ===

  onInputChange(e) {
    // 直接修改 data，不 setData value，避免 textarea 重渲染导致中文输入法光标跳动
    this.data.inputValue = e.detail.value;
  },

  onInputBlur() {
    // 失焦时将输入内容同步到 data 层
    this.setData({ inputValue: this.data.inputValue });
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
      // 新记录始终使用当前系统日期，不受日历选中日期影响
      const now = new Date();
      const todayKey = this._formatDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());

      const data = {
        content,
        tag: this.data.selectedTag,
        voice_urls: this._pendingVoiceUrls || [],
        date_key: todayKey
      };

      const result = await createDiaryRecord(data);
      if (result.code === 0) {
        showSuccess(TOAST_MESSAGES.DIARY_SAVE_SUCCESS);
        this.setData({
          inputValue: '',
          selectedDate: todayKey,
          displayDateTitle: this._getDateTitle(todayKey)
        });
        this._pendingVoiceUrls = [];
        this._currentDateKey = todayKey;
        await this.loadRecords(todayKey);
        this._refreshCalendarMarks();
      } else {
        showToast(result.message || TOAST_MESSAGES.DIARY_SAVE_FAILED);
      }
    } catch (error) {
      console.error('保存手账失败:', error);
      showToast(TOAST_MESSAGES.DIARY_SAVE_FAILED);
    } finally {
      this.setData({ saving: false });
    }
  },

  // === 语音（原生录音，语音转文字后续迭代） ===

  async onVoiceToggle() {
    if (this.data.isRecording) {
      this._stopRecording();
    } else {
      await this._startRecording();
    }
  },

  async _startRecording() {
    const privacyOk = await ensurePrivacyAuthorized('time.record');
    if (!privacyOk) return;

    const scopeOk = await guardScope('scope.record', '请允许使用麦克风以启用录音功能');
    if (!scopeOk) return;

    this._initRecorderManager();
    this.setData({ isRecording: true, recordingTime: 0 });
    this._recordingTimer = setInterval(() => {
      this.setData({ recordingTime: this.data.recordingTime + 1 });
    }, 1000);
    this._recorderManager.start({ duration: 60000, format: 'mp3' });
  },

  _stopRecording() {
    if (this._recorderManager) {
      this._recorderManager.stop();
    }
    clearInterval(this._recordingTimer);
  },

  _initRecorderManager() {
    if (this._recorderManager) return;
    this._recorderManager = wx.getRecorderManager();

    this._recorderManager.onStop(async (res) => {
      clearInterval(this._recordingTimer);
      this.setData({ isRecording: false, recordingTime: 0 });

      if (!res.tempFilePath) return;
      showLoading('上传语音中...');
      try {
        const fileId = await uploadVoiceToCloud(res.tempFilePath);
        if (!this._pendingVoiceUrls) this._pendingVoiceUrls = [];
        this._pendingVoiceUrls.push(fileId);
        showSuccess('语音已添加');
      } catch (error) {
        console.error('上传录音失败:', error);
        showToast('录音上传失败');
      } finally {
        hideLoading();
      }
    });

    this._recorderManager.onError((err) => {
      clearInterval(this._recordingTimer);
      this.setData({ isRecording: false, recordingTime: 0 });
      console.error('录音失败:', err);
      showToast('录音失败');
    });
  },

  // === 语音播放 ===

  onPlayVoice(e) {
    const index = Number(e.currentTarget.dataset.index);
    const record = this.data.records[index];
    if (!record || !record.voice_urls || !record.voice_urls.length) return;

    const key = `record-${index}`;
    if (!this._innerAudioContext) {
      this._innerAudioContext = wx.createInnerAudioContext();
      this._innerAudioContext.obeyMuteSwitch = false;
      this._innerAudioContext.onEnded(() => {
        this.setData({ playingVoiceKey: '' });
      });
      this._innerAudioContext.onError(() => {
        this.setData({ playingVoiceKey: '' });
        showToast('播放失败');
      });
    }

    if (this.data.playingVoiceKey === key) {
      this._innerAudioContext.stop();
      this.setData({ playingVoiceKey: '' });
      return;
    }

    this._innerAudioContext.stop();
    this._innerAudioContext.src = record.voice_urls[0];
    this._innerAudioContext.play();
    this.setData({ playingVoiceKey: key });
  },

  // === 数据加载 ===

  async loadRecords(dateKey) {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const result = await getDiaryRecordsByDateKey(dateKey);
      if (result.code === 0) {
        const records = (result.data || []).map(record => ({
          ...record,
          _displayTime: this._extractTime(record.created_at)
        }));
        this.setData({ records });
      }
    } catch (error) {
      console.error('加载手账记录失败:', error);
    } finally {
      this.setData({ loading: false });
    }
  },

  // === 操作弹窗 ===

  onRecordAction(e) {
    const index = Number(e.currentTarget.dataset.index);
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
    if (record) {
      this.setData({ editModalVisible: true, editModalRecord: record });
    }
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
    if (!record) return;

    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条记录吗？',
      confirmText: '删除',
      confirmColor: '#FF6B6B',
      success: async (res) => {
        if (!res.confirm) return;
        showLoading('删除中...');
        try {
          const result = await deleteDiaryRecord(record._id);
          if (result.code === 0) {
            showSuccess(TOAST_MESSAGES.DIARY_DELETE_SUCCESS);
            this.loadRecords(this._currentDateKey);
            this._refreshCalendarMarks();
          } else {
            showToast(result.message || TOAST_MESSAGES.DIARY_DELETE_FAILED);
          }
        } catch (error) {
          console.error('删除记录失败:', error);
          showToast(TOAST_MESSAGES.DIARY_DELETE_FAILED);
        } finally {
          hideLoading();
        }
      }
    });
  },

  noop() {},

  // === 编辑弹窗 ===

  onEditSave() {
    this.setData({ editModalVisible: false });
    this.loadRecords(this._currentDateKey);
    this._refreshCalendarMarks();
  },

  onEditClose() {
    this.setData({ editModalVisible: false });
  },

  // === 工具函数 ===

  _formatDateStr(year, month, day) {
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  },

  _getDateTitle(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return `${Number(parts[1])}月${Number(parts[2])}日`;
  },

  _extractTime(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  },

  _loadTags() {
    let tags;
    try {
      tags = wx.getStorageSync('diary_tags');
    } catch (e) {
      tags = null;
    }
    if (!tags || !tags.length) {
      // 首次使用：合并预设标签和旧的自定义标签
      const oldCustom = wx.getStorageSync('diary_custom_tags') || [];
      tags = [...DIARY_PRESET_TAGS, ...oldCustom];
      wx.setStorageSync('diary_tags', tags);
    }
    this.setData({ allTags: tags, selectedTag: tags[0] || '日常' });
  },

  _saveTags() {
    wx.setStorageSync('diary_tags', this.data.allTags);
  },

  _refreshCalendarMarks() {
    const calendar = this.selectComponent('#calendar');
    if (calendar) calendar.refreshMarkedDates();
  },

  onUnload() {
    clearInterval(this._recordingTimer);
    if (this._recorderManager) {
      this._recorderManager.stop();
    }
    if (this._innerAudioContext) {
      this._innerAudioContext.destroy();
      this._innerAudioContext = null;
    }
  }
});
