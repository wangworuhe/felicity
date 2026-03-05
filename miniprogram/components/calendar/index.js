const { getDiaryRecordDates } = require('../../services/diary.js');

Component({
  properties: {
    selectedDate: { type: String, value: '' }
  },

  data: {
    months: [],
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    displayLabel: '',
    scrollIntoView: '',
    scrollHeight: 220,

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
      this._todayYear = now.getFullYear();
      this._todayMonth = now.getMonth() + 1;
      this._todayStr = this._formatDateStr(this._todayYear, this._todayMonth, now.getDate());
      this._markedSet = new Set();
      this._lastScrollTime = 0;
      this._monthOffsets = [];
      this._loadingMore = false;

      // 年份列表（过去5年到今年）
      const pickerYears = [];
      for (let y = this._todayYear - 5; y <= this._todayYear; y++) {
        pickerYears.push(y);
      }

      // 先生成近3个月，快速渲染
      const months = this._generateMonthRange(-2, 0);
      this._oldestYear = months[0].year;
      this._oldestMonth = months[0].month;
      const todayWeekId = this._findWeekIdForDate(this._todayStr, months);

      this.setData({
        months,
        pickerYears,
        displayLabel: `${this._todayYear}年${this._todayMonth}月`,
        scrollIntoView: todayWeekId
      }, () => {
        this._calcMonthOffsets();
        this._loadAllMarkedDates();
      });
    }
  },

  observers: {
    'selectedDate'(date) {
      if (!date || !this.data.months.length) return;
      this._updateSelectedInMonths(date);
    }
  },

  methods: {
    // === 周行生成 ===

    _generateMonthWeeks(year, month) {
      const todayStr = this._todayStr;
      const selectedDate = this.properties.selectedDate;
      const markedSet = this._markedSet || new Set();
      const isThisMonth = (year === this._todayYear && month === this._todayMonth);

      const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
      const start = new Date(year, month - 1, 1 - firstDayOfWeek);
      const weeks = [];
      const current = new Date(start);

      while (true) {
        const days = [];
        let weekHasThisMonth = false;

        for (let i = 0; i < 7; i++) {
          const y = current.getFullYear();
          const m = current.getMonth() + 1;
          const d = current.getDate();
          const dateStr = this._formatDateStr(y, m, d);
          const belongsToMonth = (y === year && m === month);

          if (belongsToMonth) weekHasThisMonth = true;

          days.push({
            day: d,
            date: dateStr,
            isCurrentMonth: belongsToMonth,
            isToday: dateStr === todayStr,
            isSelected: dateStr === selectedDate,
            hasRecord: markedSet.has(dateStr),
            isFuture: dateStr > todayStr
          });
          current.setDate(current.getDate() + 1);
        }

        if (!weekHasThisMonth) break;

        weeks.push({ weekId: 'w-' + days[0].date, days });

        // 当月只生成到包含今天的那一周
        if (isThisMonth && days[6].date >= todayStr) break;
      }

      return {
        key: `m-${year}-${String(month).padStart(2, '0')}`,
        label: `${month}月`,
        year,
        month,
        weeks
      };
    },

    _generateMonthRange(fromOffset, toOffset) {
      const months = [];
      for (let offset = fromOffset; offset <= toOffset; offset++) {
        let y = this._todayYear;
        let m = this._todayMonth + offset;
        while (m < 1) { y--; m += 12; }
        while (m > 12) { y++; m -= 12; }
        months.push(this._generateMonthWeeks(y, m));
      }
      return this._dedupBoundaryWeeks(months);
    },

    // 去除相邻月份之间的重复边界周（前一个月的尾周 = 后一个月的首周）
    _dedupBoundaryWeeks(months) {
      for (let i = 1; i < months.length; i++) {
        if (!months[i].weeks.length || !months[i - 1].weeks.length) continue;
        const prevLast = months[i - 1].weeks[months[i - 1].weeks.length - 1];
        const currFirst = months[i].weeks[0];
        if (prevLast.weekId === currFirst.weekId) {
          months[i] = { ...months[i], weeks: months[i].weeks.slice(1) };
        }
      }
      return months;
    },

    _findWeekIdForDate(dateStr, months) {
      for (const month of months) {
        for (let i = 0; i < month.weeks.length; i++) {
          if (month.weeks[i].days.some(d => d.date === dateStr)) {
            // 第一个周行的 DOM id 是 monthBlock.key，其余是 weekId
            return i === 0 ? month.key : month.weeks[i].weekId;
          }
        }
      }
      return '';
    },

    _formatDateStr(year, month, day) {
      const m = String(month).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      return `${year}-${m}-${d}`;
    },

    // === 选中/标记更新 ===

    _updateSelectedInMonths(newDate) {
      const updates = {};
      this.data.months.forEach((month, mi) => {
        month.weeks.forEach((week, wi) => {
          week.days.forEach((day, di) => {
            const shouldSelect = day.date === newDate;
            if (day.isSelected !== shouldSelect) {
              updates[`months[${mi}].weeks[${wi}].days[${di}].isSelected`] = shouldSelect;
            }
          });
        });
      });
      if (Object.keys(updates).length > 0) {
        this.setData(updates);
      }
    },

    _applyMarkedDates() {
      const updates = {};
      this.data.months.forEach((month, mi) => {
        month.weeks.forEach((week, wi) => {
          week.days.forEach((day, di) => {
            const shouldMark = this._markedSet.has(day.date);
            if (day.hasRecord !== shouldMark) {
              updates[`months[${mi}].weeks[${wi}].days[${di}].hasRecord`] = shouldMark;
            }
          });
        });
      });
      if (Object.keys(updates).length > 0) {
        this.setData(updates);
      }
    },

    // === 标记日期加载 ===

    _loadAllMarkedDates() {
      const months = this.data.months;
      if (!months.length) return;
      const first = months[0];
      const last = months[months.length - 1];
      const startDate = this._formatDateStr(first.year, first.month, 1);
      const lastDay = new Date(last.year, last.month, 0).getDate();
      const endDate = this._formatDateStr(last.year, last.month, lastDay);

      getDiaryRecordDates(startDate, endDate).then(result => {
        if (result.code === 0) {
          this._markedSet = new Set(result.data || []);
          this._applyMarkedDates();
        }
      }).catch(() => {});
    },

    _loadMarkedDatesForRange(sy, sm, ey, em) {
      const startDate = this._formatDateStr(sy, sm, 1);
      const lastDay = new Date(ey, em, 0).getDate();
      const endDate = this._formatDateStr(ey, em, lastDay);

      getDiaryRecordDates(startDate, endDate).then(result => {
        if (result.code === 0 && result.data) {
          result.data.forEach(d => this._markedSet.add(d));
          this._applyMarkedDates();
        }
      }).catch(() => {});
    },

    // 公开方法：父页面保存/删除记录后调用
    refreshMarkedDates() {
      this._loadAllMarkedDates();
    },

    // === 日期点击 ===

    onDayTap(e) {
      const { day } = e.currentTarget.dataset;
      if (!day || day.isFuture) return;
      this.triggerEvent('dateSelect', { date: day.date });
    },

    // === 滚动 ===

    onScroll(e) {
      const now = Date.now();
      if (now - this._lastScrollTime < 100) return;
      this._lastScrollTime = now;

      const scrollTop = e.detail.scrollTop;
      const offsets = this._monthOffsets;
      if (!offsets || !offsets.length) return;

      let current = offsets[0];
      for (let i = offsets.length - 1; i >= 0; i--) {
        if (scrollTop >= offsets[i].top - 10) {
          current = offsets[i];
          break;
        }
      }

      if (current) {
        const label = `${current.year}年${current.month}月`;
        if (label !== this.data.displayLabel) {
          this.setData({ displayLabel: label });
          this.triggerEvent('monthChange', { year: current.year, month: current.month });
        }
      }
    },

    onScrollToUpper() {
      if (this._loadingMore) return;
      this._loadingMore = true;

      let y = this._oldestYear;
      let m = this._oldestMonth;
      const newMonths = [];

      for (let i = 0; i < 3; i++) {
        m--;
        if (m < 1) { y--; m = 12; }
        newMonths.unshift(this._generateMonthWeeks(y, m));
      }

      this._oldestYear = newMonths[0].year;
      this._oldestMonth = newMonths[0].month;

      const anchorId = this.data.months[0].key;
      const merged = this._dedupBoundaryWeeks([...newMonths, ...this.data.months]);
      this.setData({
        months: merged,
        scrollIntoView: anchorId
      }, () => {
        this._loadingMore = false;
        this._calcMonthOffsets();
        const last = newMonths[newMonths.length - 1];
        this._loadMarkedDatesForRange(newMonths[0].year, newMonths[0].month, last.year, last.month);
      });
    },

    _calcMonthOffsets() {
      const query = this.createSelectorQuery();
      query.selectAll('.month-anchor').boundingClientRect();
      query.select('.weeks-scroll').boundingClientRect();
      query.select('.weeks-scroll').scrollOffset();
      query.exec(res => {
        const rects = res[0] || [];
        const scrollRect = res[1];
        const scrollInfo = res[2] || { scrollTop: 0 };
        if (!scrollRect) return;

        this._monthOffsets = rects.map(r => ({
          top: r.top - scrollRect.top + scrollInfo.scrollTop,
          year: Number(r.dataset.year),
          month: Number(r.dataset.month)
        }));
      });
    },

    // === 回到今天 ===

    onGoToday() {
      const todayWeekId = this._findWeekIdForDate(this._todayStr, this.data.months);
      if (todayWeekId) {
        this.setData({ scrollIntoView: '' }, () => {
          this.setData({
            scrollIntoView: todayWeekId,
            displayLabel: `${this._todayYear}年${this._todayMonth}月`
          });
        });
      }
      this.triggerEvent('dateSelect', { date: this._todayStr });
    },

    // === 年月选择器 ===

    onMonthTitleTap() {
      const { displayLabel, pickerYears } = this.data;
      const match = displayLabel.match(/(\d+)年(\d+)月/);
      const curYear = match ? Number(match[1]) : this._todayYear;
      const curMonth = match ? Number(match[2]) : this._todayMonth;
      const yearIndex = pickerYears.indexOf(curYear);

      this.setData({
        showPicker: true,
        pickerValue: [yearIndex >= 0 ? yearIndex : pickerYears.length - 1, curMonth - 1],
        _pickerYear: curYear,
        _pickerMonth: curMonth
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

      // 不允许选择未来月份
      if (year > this._todayYear || (year === this._todayYear && month > this._todayMonth)) {
        this.setData({ showPicker: false });
        return;
      }

      const targetKey = `m-${year}-${String(month).padStart(2, '0')}`;
      const exists = this.data.months.some(m => m.key === targetKey);
      if (!exists) {
        this._expandToMonth(year, month);
      }

      this.setData({ showPicker: false, scrollIntoView: '' }, () => {
        this.setData({
          scrollIntoView: targetKey,
          displayLabel: `${year}年${month}月`
        });
      });
    },

    _expandToMonth(targetYear, targetMonth) {
      const newMonths = [];
      let y = this._oldestYear;
      let m = this._oldestMonth;

      while (y > targetYear || (y === targetYear && m > targetMonth)) {
        m--;
        if (m < 1) { y--; m = 12; }
        newMonths.unshift(this._generateMonthWeeks(y, m));
      }

      if (newMonths.length > 0) {
        this._oldestYear = newMonths[0].year;
        this._oldestMonth = newMonths[0].month;
        const merged = this._dedupBoundaryWeeks([...newMonths, ...this.data.months]);
        this.setData({ months: merged }, () => {
          this._calcMonthOffsets();
          const last = newMonths[newMonths.length - 1];
          this._loadMarkedDatesForRange(newMonths[0].year, newMonths[0].month, last.year, last.month);
        });
      }
    },

    onClosePicker() {
      this.setData({ showPicker: false });
    },

    // 公开方法：滚动到指定日期
    scrollToDate(dateStr) {
      const weekId = this._findWeekIdForDate(dateStr, this.data.months);
      if (weekId) {
        this.setData({ scrollIntoView: '' }, () => {
          this.setData({ scrollIntoView: weekId });
        });
      }
    }
  }
});
