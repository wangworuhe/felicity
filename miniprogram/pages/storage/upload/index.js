/**
 * 文件上传页面
 */
import { uploadImage } from '../../../services/storage.js';
import { showSuccess, showError } from '../../../utils/toast.js';

Page({
  data: {
    haveGetImgSrc: false,
    imgSrc: '',
  },

  /**
   * 选择并上传图片
   */
  async uploadImg() {
    try {
      const result = await uploadImage(1);
      this.setData({
        haveGetImgSrc: true,
        imgSrc: result.fileID,
      });
    } catch (error) {
      showError('上传失败');
      console.error('Upload image error:', error);
    }
  },

  /**
   * 清除图片
   */
  clearImgSrc() {
    this.setData({
      haveGetImgSrc: false,
      imgSrc: '',
    });
  },

  /**
   * 预览图片
   */
  previewImage() {
    const { imgSrc } = this.data;
    wx.previewImage({
      urls: [imgSrc],
    });
  },

  /**
   * 复制文件ID
   */
  copyFileId() {
    const { imgSrc } = this.data;
    wx.setClipboardData({
      data: imgSrc,
      success: () => {
        showSuccess('复制成功');
      },
    });
  },
});
