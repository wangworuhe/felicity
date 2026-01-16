const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

// 获取 OpenId 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取基础信息
    const wxContext = cloud.getWXContext();
    return {
      success: true,
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
    };
  } catch (e) {
    console.error('Get OpenId error:', e);
    return {
      success: false,
      error: e.message,
    };
  }
};
