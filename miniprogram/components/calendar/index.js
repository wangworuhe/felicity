const { getDiaryRecordDates } = require('../../services/diary.js');

Component({
  properties: {
    selectedDate: { type: String, value: '' }
  },

  data: {
    months: [],
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    displayLabel: '',
    swiperCurrent: 1,
    swiperHeight: 228,

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
      this._viewYear = this._todayYear;
      this._viewMonth = this._todayMonth;
      this._swiping = false;

      // 年份列表（过去5年到今年）
      const pickerYears = [];
      for (let y = this._todayYear - 5; y <= this._todayYear; y++) {
        pickerYears.push(y);
      }

      const months = this._buildSwiperMonths(this._viewYear, this._viewMonth);
      const swiperHeight = months[1].weeks.length * 38;

      this.setData({
        months,
        pickerYears,
        swiperCurrent: 1,
        swiperHeight,
        displayLabel: `${this._viewYear}年${this._viewMonth}月`
      }, () => {
        this._loadAllMarkedDates();
        this.triggerEvent('heightChange');
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
    // === 月份数据生成 ===

    _generateMonthWeeks(year, month) {
      const todayStr = this._todayStr;
      const selectedDate = this.properties.selectedDate;
      const markedSet = this._markedSet || new Set();

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
      }

      return {
        key: `m-${year}-${String(month).padStart(2, '0')}`,
        label: `${month}月`,
        year,
        month,
        weeks
      };
    },

    // 构建 swiper 的 3 个月数据 [上月, 当月, 下月]
    _buildSwiperMonths(year, month) {
      let py = year, pm = month - 1;
      if (pm < 1) { py--; pm = 12; }
      let ny = year, nm = month + 1;
      if (nm > 12) { ny++; nm = 1; }
      return [
        this._generateMonthWeeks(py, pm),
        this._generateMonthWeeks(year, month),
        this._generateMonthWeeks(ny, nm)
      ];
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

    // === 左右滑动 ===

    onSwiperFinish(e) {
      // 导航锁：上一次滑动的数据更新未完成时，跳过本次
      if (this._swiping) return;

      const idx = e.detail.current;
      const target = this.data.months[idx];
      if (!target) return;

      // 目标月份与当前一致，无需处理
      if (target.year === this._viewYear && target.month === this._viewMonth) return;

      this._swiping = true;
      this._viewYear = target.year;
      this._viewMonth = target.month;

      // 计算前后月份
      let py = target.year, pm = target.month - 1;
      if (pm < 1) { py--; pm = 12; }
      let ny = target.year, nm = target.month + 1;
      if (nm > 12) { ny++; nm = 1; }

      // 只更新不在屏的 slot，不重置 swiperCurrent
      const prevSlot = (idx + 2) % 3;
      const nextSlot = (idx + 1) % 3;
      const updates = {};

      const prevData = this.data.months[prevSlot];
      if (prevData.year !== py || prevData.month !== pm) {
        updates[`months[${prevSlot}]`] = this._generateMonthWeeks(py, pm);
      }
      const nextData = this.data.months[nextSlot];
      if (nextData.year !== ny || nextData.month !== nm) {
        updates[`months[${nextSlot}]`] = this._generateMonthWeeks(ny, nm);
      }

      updates.swiperHeight = target.weeks.length * 38;
      updates.displayLabel = `${target.year}年${target.month}月`;

      this.setData(updates, () => {
        this._swiping = false;
        this.triggerEvent('heightChange');
        this.triggerEvent('monthChange', { year: target.year, month: target.month });
      });

      this._loadMarkedDatesForRange(py, pm, ny, nm);
    },

    // 跳转到指定月份（年月选择器、回到今天等非滑动场景）
    _navigateToMonth(year, month) {
      this._viewYear = year;
      this._viewMonth = month;
      const months = this._buildSwiperMonths(year, month);
      const swiperHeight = months[1].weeks.length * 38;
      this.setData({
        months,
        swiperCurrent: 1,
        swiperHeight,
        displayLabel: `${year}年${month}月`
      }, () => {
        this.triggerEvent('heightChange');
        this.triggerEvent('monthChange', { year, month });
      });
      this._loadMarkedDatesForRange(months[0].year, months[0].month, months[2].year, months[2].month);
    },

    // === 回到今天 ===

    onGoToday() {
      this._navigateToMonth(this._todayYear, this._todayMonth);
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

      this.setData({ showPicker: false });
      this._navigateToMonth(year, month);
    },

    onClosePicker() {
      this.setData({ showPicker: false });
    },

    // 公开方法：导航到指定日期所在月份
    scrollToDate(dateStr) {
      if (!dateStr) return;
      const parts = dateStr.split('-');
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      if (year && month) {
        this._navigateToMonth(year, month);
      }
    }
  }
});
