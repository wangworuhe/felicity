Component({
  properties: {
    selectedDate: { type: String, value: '' },
    markedDates: { type: Array, value: [] }
  },

  data: {
    displayYear: 0,
    displayMonth: 0,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    days: [],
    isCurrentMonth: true,

    // 年月选择器
    showPicker: false,
    pickerYears: [],
    pickerMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    pickerValue: [0, 0],
    _pickerYear: 0,
    _pickerMonth: 0
  },

  lifetimes: {
    attached() {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      // 生成年份列表（前5年 ~ 后5年）
      const pickerYears = [];
      for (let y = year - 5; y <= year + 5; y++) {
        pickerYears.push(y);
      }
      this.setData({
        displayYear: year,
        displayMonth: month,
        pickerYears
      });
      this.generateDays();
    }
  },

  observers: {
    'selectedDate, markedDates'() {
      this.generateDays();
    },
    'displayYear, displayMonth'(year, month) {
      const now = new Date();
      this.setData({
        isCurrentMonth: year === now.getFullYear() && month === now.getMonth() + 1
      });
    }
  },

  methods: {
    generateDays() {
      const { displayYear, displayMonth } = this.data;
      if (!displayYear || !displayMonth) return;
      const selectedDate = this.properties.selectedDate;
      const markedSet = new Set(this.properties.markedDates);

      const today = new Date();
      const todayStr = this._formatDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());

      const firstDay = new Date(displayYear, displayMonth - 1, 1).getDay();
      const totalDays = new Date(displayYear, displayMonth, 0).getDate();
      const prevMonthDays = new Date(displayYear, displayMonth - 1, 0).getDate();

      const days = [];

      // 填充上月尾部
      for (let i = firstDay - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        const prevMonth = displayMonth === 1 ? 12 : displayMonth - 1;
        const prevYear = displayMonth === 1 ? displayYear - 1 : displayYear;
        const dateStr = this._formatDateStr(prevYear, prevMonth, day);
        days.push({
          day, date: dateStr, isCurrentMonth: false,
          isToday: dateStr === todayStr,
          isSelected: dateStr === selectedDate,
          hasRecord: markedSet.has(dateStr)
        });
      }

      // 当月日期
      for (let d = 1; d <= totalDays; d++) {
        const dateStr = this._formatDateStr(displayYear, displayMonth, d);
        days.push({
          day: d, date: dateStr, isCurrentMonth: true,
          isToday: dateStr === todayStr,
          isSelected: dateStr === selectedDate,
          hasRecord: markedSet.has(dateStr)
        });
      }

      // 填充下月头部（仅补满最后一行）
      const remaining = (7 - days.length % 7) % 7;
      for (let d = 1; d <= remaining; d++) {
        const nextMonth = displayMonth === 12 ? 1 : displayMonth + 1;
        const nextYear = displayMonth === 12 ? displayYear + 1 : displayYear;
        const dateStr = this._formatDateStr(nextYear, nextMonth, d);
        days.push({
          day: d, date: dateStr, isCurrentMonth: false,
          isToday: dateStr === todayStr,
          isSelected: dateStr === selectedDate,
          hasRecord: markedSet.has(dateStr)
        });
      }

      this.setData({ days });
    },

    _formatDateStr(year, month, day) {
      const m = String(month).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      return `${year}-${m}-${d}`;
    },

    // === 日期点击 ===

    onDayTap(e) {
      const { day } = e.currentTarget.dataset;
      if (!day || !day.isCurrentMonth) return;
      this.triggerEvent('dateSelect', { date: day.date });
    },

    // === 月份切换 ===

    onPrevMonth() {
      this._changeMonth(-1);
    },

    onNextMonth() {
      this._changeMonth(1);
    },

    _changeMonth(delta) {
      let { displayYear, displayMonth } = this.data;
      displayMonth += delta;
      if (displayMonth < 1) {
        displayYear--;
        displayMonth = 12;
      } else if (displayMonth > 12) {
        displayYear++;
        displayMonth = 1;
      }
      this.setData({ displayYear, displayMonth }, () => {
        this.generateDays();
        this.triggerEvent('monthChange', { year: displayYear, month: displayMonth });
      });
    },

    // === 回到今天 ===

    onGoToday() {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const todayStr = this._formatDateStr(year, month, day);

      this.setData({ displayYear: year, displayMonth: month }, () => {
        this.generateDays();
        this.triggerEvent('monthChange', { year, month });
        this.triggerEvent('dateSelect', { date: todayStr });
      });
    },

    // === 滑动切月 ===

    onTouchStart(e) {
      this._touchStartX = e.touches[0].clientX;
      this._touchStartY = e.touches[0].clientY;
    },

    onTouchEnd(e) {
      const dx = e.changedTouches[0].clientX - this._touchStartX;
      const dy = e.changedTouches[0].clientY - this._touchStartY;
      // 水平滑动距离 > 50px 且水平位移大于垂直位移（避免误触）
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          this._changeMonth(-1);
        } else {
          this._changeMonth(1);
        }
      }
    },

    // === 年月选择器 ===

    onMonthTitleTap() {
      const { displayYear, displayMonth, pickerYears } = this.data;
      const yearIndex = pickerYears.indexOf(displayYear);
      this.setData({
        showPicker: true,
        pickerValue: [yearIndex >= 0 ? yearIndex : 5, displayMonth - 1],
        _pickerYear: displayYear,
        _pickerMonth: displayMonth
      });
    },

    onPickerChange(e) {
      const val = e.detail.value;
      this.setData({
        _pickerYear: this.data.pickerYears[val[0]],
        _pickerMonth: val[1] + 1
      });
    },

    onPickerConfirm() {
      const year = this.data._pickerYear;
      const month = this.data._pickerMonth;
      this.setData({ displayYear: year, displayMonth: month, showPicker: false }, () => {
        this.generateDays();
        this.triggerEvent('monthChange', { year, month });
      });
    },

    onClosePicker() {
      this.setData({ showPicker: false });
    }
  }
});
