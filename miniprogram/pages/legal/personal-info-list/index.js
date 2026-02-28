const { LEGAL_CONFIG } = require('../../../utils/constants.js');

Page({
  data: {
    legal: LEGAL_CONFIG,
    list: [
      {
        name: '昵称',
        purpose: '用于账号展示',
        scene: '我的页编辑资料',
        retention: '用户主动修改或删除账号数据前'
      },
      {
        name: '头像',
        purpose: '用于账号展示',
        scene: '我的页选择头像',
        retention: '用户主动修改或删除账号数据前'
      },
      {
        name: '文字内容',
        purpose: '用于记录与回顾幸福内容',
        scene: '幸福/反思/手账记录',
        retention: '用户主动删除前'
      },
      {
        name: '图片与语音文件',
        purpose: '用于多媒体记录',
        scene: '上传图片、录制语音',
        retention: '用户主动删除前'
      },
      {
        name: '位置信息',
        purpose: '用于记录事件发生地点',
        scene: '幸福记录页获取位置',
        retention: '随记录数据保存，用户删除记录后移除'
      }
    ]
  }
});
