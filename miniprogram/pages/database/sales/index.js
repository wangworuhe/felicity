/**
 * 销售数据管理页面
 */
import {
  selectSalesRecord,
  updateSalesRecord,
  insertSalesRecord,
  deleteSalesRecord,
} from '../../../services/database.js';
import { validateSalesData } from '../../../utils/validator.js';
import { showLoading, hideLoading, showSuccess, showError } from '../../../utils/toast.js';

Page({
  data: {
    haveGetRecord: false,
    record: [],
    showInsertModal: false,
    insertRegion: '',
    insertCity: '',
    insertSales: '',
  },

  onLoad() {
    this.getRecord();
  },

  /**
   * 获取销售记录
   */
  async getRecord() {
    showLoading();

    try {
      const result = await selectSalesRecord();
      this.setData({
        haveGetRecord: true,
        record: result.data || [],
      });
    } catch (error) {
      showError('获取失败');
      console.error('Get record error:', error);
    } finally {
      hideLoading();
    }
  },

  /**
   * 刷新记录
   */
  refreshRecord() {
    this.getRecord();
  },

  /**
   * 清除数据
   */
  clearRecord() {
    this.setData({
      haveGetRecord: false,
      record: [],
    });
  },

  /**
   * 更新记录
   */
  async updateRecord() {
    showLoading();

    try {
      await updateSalesRecord(this.data.record);
      showSuccess('更新成功');
    } catch (error) {
      showError('更新失败');
      console.error('Update record error:', error);
    } finally {
      hideLoading();
    }
  },

  /**
   * 输入框事件
   */
  bindInput(e) {
    const index = e.currentTarget.dataset.index;
    const record = this.data.record;
    record[index].sales = Number(e.detail.value);
    this.setData({ record });
  },

  /**
   * 显示插入弹窗
   */
  insertRecord() {
    this.setData({
      showInsertModal: true,
      insertRegion: '',
      insertCity: '',
      insertSales: '',
    });
  },

  /**
   * 输入框事件
   */
  onInsertRegionInput(e) {
    this.setData({ insertRegion: e.detail.value });
  },

  onInsertCityInput(e) {
    this.setData({ insertCity: e.detail.value });
  },

  onInsertSalesInput(e) {
    this.setData({ insertSales: e.detail.value });
  },

  /**
   * 取消弹窗
   */
  onInsertCancel() {
    this.setData({ showInsertModal: false });
  },

  /**
   * 确认插入
   */
  async onInsertConfirm() {
    const { insertRegion, insertCity, insertSales } = this.data;

    // 验证数据
    const validation = validateSalesData({
      region: insertRegion,
      city: insertCity,
      sales: insertSales,
    });

    if (!validation.valid) {
      showError(validation.errors[0]);
      return;
    }

    showLoading('插入中...');

    try {
      await insertSalesRecord({
        region: insertRegion,
        city: insertCity,
        sales: Number(insertSales),
      });

      showSuccess('插入成功');
      this.setData({ showInsertModal: false });
      this.getRecord();
    } catch (error) {
      showError('插入失败');
      console.error('Insert record error:', error);
    } finally {
      hideLoading();
    }
  },

  /**
   * 删除记录
   */
  async deleteRecord(e) {
    const { id } = e.currentTarget.dataset;

    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
    });

    if (!res.confirm) return;

    showLoading('删除中...');

    try {
      await deleteSalesRecord(id);
      showSuccess('删除成功');
      this.getRecord();
    } catch (error) {
      showError('删除失败');
      console.error('Delete record error:', error);
    } finally {
      hideLoading();
    }
  },
});
