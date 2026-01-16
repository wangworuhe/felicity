const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

/**
 * 创建销售数据集合
 */
const createCollection = async () => {
  try {
    await db.createCollection('sales');
    await db.collection('sales').add({
      data: { region: '华东', city: '上海', sales: 11 },
    });
    await db.collection('sales').add({
      data: { region: '华东', city: '南京', sales: 11 },
    });
    await db.collection('sales').add({
      data: { region: '华南', city: '广州', sales: 22 },
    });
    await db.collection('sales').add({
      data: { region: '华南', city: '深圳', sales: 22 },
    });
    return { success: true };
  } catch (e) {
    return { success: true, data: 'create collection success' };
  }
};

/**
 * 查询销售记录
 */
const selectRecord = async () => {
  return await db.collection('sales').get();
};

/**
 * 更新销售记录
 */
const updateRecord = async (event) => {
  try {
    for (let i = 0; i < event.data.length; i++) {
      await db
        .collection('sales')
        .where({ _id: event.data[i]._id })
        .update({ data: { sales: event.data[i].sales } });
    }
    return { success: true, data: event.data };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

/**
 * 新增销售记录
 */
const insertRecord = async (event) => {
  try {
    const record = event.data;
    await db.collection('sales').add({
      data: {
        region: record.region,
        city: record.city,
        sales: Number(record.sales),
      },
    });
    return { success: true, data: event.data };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

/**
 * 删除销售记录
 */
const deleteRecord = async (event) => {
  try {
    await db.collection('sales').where({ _id: event.data._id }).remove();
    return { success: true };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};

// 云函数入口函数
exports.main = async (event, context) => {
  const { type } = event;

  switch (type) {
    case 'createCollection':
      return await createCollection();
    case 'selectRecord':
      return await selectRecord();
    case 'updateRecord':
      return await updateRecord(event);
    case 'insertRecord':
      return await insertRecord(event);
    case 'deleteRecord':
      return await deleteRecord(event);
    default:
      return { success: false, error: 'Unknown type' };
  }
};
