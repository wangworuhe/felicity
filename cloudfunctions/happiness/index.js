const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { type, collection, data, page, limit, id } = event;
  const wxContext = cloud.getWXContext();

  switch (type) {
    case 'createRecord':
      return await createRecord(collection, wxContext.OPENID, data);
    case 'listRecords':
      return await listRecords(collection, wxContext.OPENID, page, limit);
    case 'getRecordDetail':
      return await getRecordDetail(collection, wxContext.OPENID, id);
    case 'deleteRecord':
      return await deleteRecord(collection, wxContext.OPENID, id);
    case 'getRandomRecord':
      return await getRandomRecord(collection, wxContext.OPENID);
    default:
      return {
        code: -1,
        message: '未知操作类型'
      };
  }
};

async function createRecord(collection, openid, data) {
  try {
    const now = new Date().toISOString();
    const record = {
      ...data,
      _openid: openid,
      created_at: now,
      updated_at: now
    };

    const result = await db.collection(collection).add({
      data: record
    });

    return {
      code: 0,
      message: '记录成功',
      data: {
        _id: result._id,
        ...record
      }
    };
  } catch (error) {
    console.error('创建记录失败:', error);
    return {
      code: -1,
      message: '记录失败',
      error: error.message
    };
  }
}

async function listRecords(collection, openid, page = 1, limit = 10) {
  try {
    const result = await db.collection(collection)
      .where({ _openid: openid })
      .orderBy('created_at', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();

    return {
      code: 0,
      message: '获取成功',
      data: result.data,
      page,
      limit
    };
  } catch (error) {
    console.error('获取记录列表失败:', error);
    return {
      code: -1,
      message: '获取记录列表失败',
      error: error.message
    };
  }
}

async function getRecordDetail(collection, openid, id) {
  try {
    const result = await db.collection(collection)
      .where({ _id: id, _openid: openid })
      .get();

    if (result.data.length === 0) {
      return {
        code: -1,
        message: '记录不存在'
      };
    }

    return {
      code: 0,
      message: '获取成功',
      data: result.data[0]
    };
  } catch (error) {
    console.error('获取记录详情失败:', error);
    return {
      code: -1,
      message: '获取记录详情失败',
      error: error.message
    };
  }
}

async function deleteRecord(collection, openid, id) {
  try {
    const result = await db.collection(collection)
      .where({ _id: id, _openid: openid })
      .remove();

    if (result.stats.removed === 0) {
      return {
        code: -1,
        message: '记录不存在'
      };
    }

    return {
      code: 0,
      message: '删除成功'
    };
  } catch (error) {
    console.error('删除记录失败:', error);
    return {
      code: -1,
      message: '删除记录失败',
      error: error.message
    };
  }
}

async function getRandomRecord(collection, openid) {
  try {
    const countResult = await db.collection(collection)
      .where({ _openid: openid })
      .count();
    
    const total = countResult.total;
    if (total === 0) {
      return {
        code: -1,
        message: '暂无记录'
      };
    }

    const skip = Math.floor(Math.random() * total);
    const result = await db.collection(collection)
      .where({ _openid: openid })
      .orderBy('created_at', 'desc')
      .skip(skip)
      .limit(1)
      .get();

    return {
      code: 0,
      message: '获取成功',
      data: result.data[0]
    };
  } catch (error) {
    console.error('获取随机记录失败:', error);
    return {
      code: -1,
      message: '获取随机记录失败',
      error: error.message
    };
  }
}
