/**
 * 存储相关服务
 */
import { chooseAndUploadImage, uploadFile } from '../utils/cloud.js';
import { showSuccess, showError } from '../utils/toast.js';

/**
 * 选择并上传图片
 * @param {number} count - 选择图片数量
 * @returns {Promise<object>} 上传结果 { fileID }
 */
export const uploadImage = async (count = 1) => {
  try {
    const result = await chooseAndUploadImage(count);
    showSuccess('上传成功');
    return result;
  } catch (error) {
    showError('上传失败');
    console.error('Upload image error:', error);
    throw error;
  }
};

/**
 * 上传指定文件
 * @param {string} cloudPath - 云存储路径
 * @param {string} filePath - 本地文件路径
 * @returns {Promise<object>} 上传结果 { fileID }
 */
export const uploadFileToCloud = async (cloudPath, filePath) => {
  try {
    const result = await uploadFile(cloudPath, filePath);
    showSuccess('上传成功');
    return result;
  } catch (error) {
    showError('上传失败');
    console.error('Upload file error:', error);
    throw error;
  }
};
