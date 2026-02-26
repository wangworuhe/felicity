/**
 * 云开发工具封装
 */
import { showLoading, hideLoading } from './toast.js';
import { ERROR_MESSAGES, TOAST_MESSAGES } from './constants.js';

/**
 * 获取云环境
 */
const getCloudEnv = () => {
  const app = getApp();
  return app.globalData.env;
};

/**
 * 检查云环境是否配置
 */
const checkCloudEnv = () => !!getCloudEnv();

/**
 * 云环境未配置提示
 */
const showEnvNotConfigured = () => {
  wx.showModal({
    title: '提示',
    content: '请在 `miniprogram/app.js` 中正确配置 `env` 参数',
    showCancel: false,
  });
};

/**
 * 调用云函数
 * @param {string} name - 云函数名称
 * @param {object} data - 传递给云函数的数据
 * @param {object} options - 可选配置
 */
export const callFunction = (name, data, options = {}) => {
  const { showLoading: isLoading = true } = options;

  return new Promise((resolve, reject) => {
    if (!checkCloudEnv()) {
      showEnvNotConfigured();
      reject(new Error('Cloud environment not configured'));
      return;
    }

    if (isLoading) {
      showLoading(options.loadingText);
    }

    wx.cloud
      .callFunction({
        name,
        data,
      })
      .then((resp) => {
        // 统一 resolve，页面层通过 result.code 判断业务成功/失败
        // 仅网络错误/函数不存在等异常走 reject
        resolve(resp.result || resp);
      })
      .catch((e) => {
        const { errCode, errMsg } = e;

        if (errMsg.includes('Environment not found')) {
          wx.showModal({
            title: TOAST_MESSAGES.ENV_NOT_FOUND,
            content: ERROR_MESSAGES.ENV_NOT_FOUND,
            showCancel: false,
          });
        } else if (errMsg.includes('FunctionName parameter could not be found')) {
          wx.showModal({
            title: TOAST_MESSAGES.FUNCTION_NOT_FOUND,
            content: ERROR_MESSAGES.FUNCTION_NOT_FOUND,
            showCancel: false,
          });
        }

        reject(e);
      })
      .finally(() => {
        if (isLoading) {
          hideLoading();
        }
      });
  });
};

/**
 * 上传文件到云存储
 * @param {string} cloudPath - 云存储路径
 * @param {string} filePath - 本地文件路径
 */
export const uploadFile = (cloudPath, filePath) => {
  return new Promise((resolve, reject) => {
    showLoading();

    wx.cloud
      .uploadFile({
        cloudPath,
        filePath,
      })
      .then((res) => {
        resolve(res);
      })
      .catch((e) => {
        console.error('Upload error:', e);
        reject(e);
      })
      .finally(() => {
        hideLoading();
      });
  });
};

/**
 * 选择并上传图片
 * @param {number} count - 选择图片数量
 */
export const chooseAndUploadImage = (count = 1) => {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count,
      mediaType: ['image'],
      success: (chooseResult) => {
        const file = chooseResult.tempFiles[0];
        const cloudPath = `image-${Date.now()}.${file.tempFilePath.split('.').pop()}`;

        uploadFile(cloudPath, file.tempFilePath)
          .then(resolve)
          .catch(reject);
      },
      fail: reject,
    });
  });
};

/**
 * 删除云存储文件
 * @param {array} fileList - 文件ID列表
 */
export const deleteFile = (fileList) => {
  return new Promise((resolve, reject) => {
    wx.cloud
      .deleteFile({
        fileList,
      })
      .then((res) => {
        resolve(res);
      })
      .catch(reject);
  });
};

/**
 * 上传图片到云存储
 * @param {string} filePath - 本地文件路径
 * @param {string} prefix - 云存储路径前缀，默认 'happiness'
 * @returns {Promise<string>} 云文件ID
 */
export const uploadImageToCloud = async (filePath, prefix = 'happiness') => {
  const cloudPath = `${prefix}/${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`;
  const result = await uploadFile(cloudPath, filePath);
  return result.fileID;
};

/**
 * 上传语音到云存储
 * @param {string} filePath - 本地文件路径
 * @returns {Promise<string>} 云文件ID
 */
export const uploadVoiceToCloud = async (filePath) => {
  const cloudPath = `voice/${Date.now()}-${Math.random().toString(16).slice(2)}.mp3`;
  const result = await uploadFile(cloudPath, filePath);
  return result.fileID;
};
