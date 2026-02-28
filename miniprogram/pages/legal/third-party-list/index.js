const { LEGAL_CONFIG } = require('../../../utils/constants.js');

Page({
  data: {
    legal: LEGAL_CONFIG,
    list: [
      {
        name: '微信云开发（CloudBase）',
        purpose: '用于数据存储、文件存储与云函数计算',
        types: '文字内容、图片、语音、账号资料',
        policy: 'https://cloud.tencent.com/document/product/301/11470'
      },
      {
        name: '微信基础能力（小程序运行环境）',
        purpose: '用于权限申请、媒体选择、位置与录音能力调用',
        types: '权限状态、设备能力返回信息',
        policy: 'https://weixin.qq.com/cgi-bin/readtemplate?lang=zh_CN&t=weixin_agreement&s=privacy'
      }
    ]
  }
});
