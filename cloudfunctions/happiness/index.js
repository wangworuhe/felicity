const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const ALLOWED_COLLECTIONS = ['happiness_records', 'fortune_records', 'diary_records', 'user_profiles'];
const USER_PROFILE_COLLECTION = 'user_profiles';

exports.main = async (event, context) => {
  const { type, collection, data, page, limit, id, dateKey, startDate, endDate } = event;
  const wxContext = cloud.getWXContext();

  if (collection && !ALLOWED_COLLECTIONS.includes(collection)) {
    return { code: -1, message: '无效的集合名称' };
  }

  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safeLimit = Math.min(50, Math.max(1, Math.floor(Number(limit) || 10)));

  switch (type) {
    case 'createRecord':
      return await createRecord(collection, wxContext.OPENID, data);
    case 'listRecords':
      return await listRecords(collection, wxContext.OPENID, safePage, safeLimit);
    case 'getRecordDetail':
      return await getRecordDetail(collection, wxContext.OPENID, id);
    case 'deleteRecord':
      return await deleteRecord(collection, wxContext.OPENID, id);
    case 'getRandomRecord':
      return await getRandomRecord(collection, wxContext.OPENID);
    case 'upsertRecord':
      return await upsertRecord(collection, wxContext.OPENID, data);
    case 'listRecordsByDateKey':
      return await listRecordsByDateKey(collection, wxContext.OPENID, dateKey);
    case 'listRecordDates':
      return await listRecordDates(collection, wxContext.OPENID, startDate, endDate);
    case 'getUserProfile':
      return await getUserProfile(wxContext.OPENID);
    case 'upsertUserProfile':
      return await upsertUserProfile(wxContext.OPENID, data || {});
    case 'getMyDataSummary':
      return await getMyDataSummary(wxContext.OPENID);
    case 'deleteMyData':
      return await deleteMyData(wxContext.OPENID);
    default:
      return {
        code: -1,
        message: '未知操作类型'
      };
  }
};

function sanitizeData(data) {
  return {
    content: data.content || '',
    image_urls: Array.isArray(data.image_urls) ? data.image_urls : [],
    voice_urls: Array.isArray(data.voice_urls) ? data.voice_urls : [],
    location: data.location || null,
    date_key: data.date_key || '',
    order: typeof data.order === 'number' ? data.order : 1
  };
}

function sanitizeDiaryData(data) {
  return {
    content: data.content || '',
    tag: data.tag || '日常',
    voice_urls: Array.isArray(data.voice_urls) ? data.voice_urls : [],
    date_key: data.date_key || ''
  };
}

function getSanitizedData(collection, data) {
  return collection === 'diary_records' ? sanitizeDiaryData(data) : sanitizeData(data);
}

async function createRecord(collection, openid, data) {
  try {
    const now = new Date().toISOString();
    const record = {
      ...getSanitizedData(collection, data),
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
    };
  }
}

async function listRecordsByDateKey(collection, openid, dateKey) {
  try {
    const result = await db.collection(collection)
      .where({ _openid: openid, date_key: dateKey })
      .orderBy('created_at', 'desc')
      .get();

    return {
      code: 0,
      message: '获取成功',
      data: result.data
    };
  } catch (error) {
    console.error('按日期获取记录失败:', error);
    return {
      code: -1,
      message: '获取记录失败',
    };
  }
}

async function listRecordDates(collection, openid, startDate, endDate) {
  try {
    const result = await db.collection(collection)
      .where({
        _openid: openid,
        date_key: _.gte(startDate).and(_.lte(endDate))
      })
      .field({ date_key: true })
      .limit(500)
      .get();

    const dates = [...new Set(result.data.map(r => r.date_key))];
    return { code: 0, message: '获取成功', data: dates };
  } catch (error) {
    console.error('获取记录日期失败:', error);
    return { code: -1, message: '获取记录日期失败' };
  }
}

async function upsertRecord(collection, openid, data) {
  try {
    const now = new Date().toISOString();
    const record = {
      ...getSanitizedData(collection, data),
      _openid: openid,
      updated_at: now
    };

    if (data._id) {
      const _id = data._id;

      const updateResult = await db.collection(collection)
        .where({ _id, _openid: openid })
        .update({ data: record });

      if (updateResult.stats.updated === 0) {
        return { code: -1, message: '记录不存在或无权修改' };
      }

      return {
        code: 0,
        message: '更新成功',
        data: { _id, ...record }
      };
    }

    const existResult = await db.collection(collection)
      .where({ _openid: openid, date_key: record.date_key, order: record.order })
      .limit(1)
      .get();

    if (existResult.data.length > 0) {
      const existId = existResult.data[0]._id;
      delete record._id;

      await db.collection(collection)
        .where({ _id: existId, _openid: openid })
        .update({ data: record });

      return {
        code: 0,
        message: '更新成功',
        data: { _id: existId, ...record }
      };
    }

    const createData = {
      ...record,
      created_at: now
    };

    const result = await db.collection(collection).add({
      data: createData
    });

    return {
      code: 0,
      message: '记录成功',
      data: { _id: result._id, ...createData }
    };
  } catch (error) {
    console.error('更新/创建记录失败:', error);
    return {
      code: -1,
      message: '更新记录失败',
    };
  }
}

function maskOpenId(openid) {
  if (!openid || openid.length < 8) return openid || '';
  return `${openid.slice(0, 4)}****${openid.slice(-4)}`;
}

async function getUserProfile(openid) {
  try {
    const result = await db.collection(USER_PROFILE_COLLECTION)
      .where({ _openid: openid })
      .limit(1)
      .get();

    const profile = result.data[0] || null;
    return {
      code: 0,
      message: '获取成功',
      data: {
        masked_openid: maskOpenId(openid),
        nick_name: profile ? (profile.nick_name || '') : '',
        avatar_url: profile ? (profile.avatar_url || '') : '',
        created_at: profile ? profile.created_at : '',
        updated_at: profile ? profile.updated_at : ''
      }
    };
  } catch (error) {
    console.error('获取用户资料失败:', error);
    return {
      code: -1,
      message: '获取用户资料失败',
    };
  }
}

async function upsertUserProfile(openid, data) {
  try {
    const now = new Date().toISOString();
    const nickName = String(data.nick_name || '').trim().slice(0, 20);
    const avatarUrl = typeof data.avatar_url === 'string' ? data.avatar_url : '';

    const payload = {
      nick_name: nickName,
      avatar_url: avatarUrl,
      updated_at: now
    };

    const existResult = await db.collection(USER_PROFILE_COLLECTION)
      .where({ _openid: openid })
      .limit(1)
      .get();

    if (existResult.data.length > 0) {
      const _id = existResult.data[0]._id;
      await db.collection(USER_PROFILE_COLLECTION)
        .where({ _id, _openid: openid })
        .update({ data: payload });

      return {
        code: 0,
        message: '更新成功',
        data: {
          _id,
          _openid: openid,
          masked_openid: maskOpenId(openid),
          ...payload,
          created_at: existResult.data[0].created_at || now
        }
      };
    }

    const createData = {
      ...payload,
      _openid: openid,
      created_at: now
    };
    const addResult = await db.collection(USER_PROFILE_COLLECTION).add({ data: createData });

    return {
      code: 0,
      message: '创建成功',
      data: {
        _id: addResult._id,
        masked_openid: maskOpenId(openid),
        ...createData
      }
    };
  } catch (error) {
    console.error('更新用户资料失败:', error);
    return {
      code: -1,
      message: '更新用户资料失败',
    };
  }
}

async function getLatestTime(collection, openid) {
  try {
    const byUpdated = await db.collection(collection)
      .where({ _openid: openid })
      .orderBy('updated_at', 'desc')
      .limit(1)
      .get();
    if (byUpdated.data.length > 0 && byUpdated.data[0].updated_at) {
      return byUpdated.data[0].updated_at;
    }
  } catch (error) {
    console.warn('按 updated_at 查询最新时间失败:', collection, error);
  }

  try {
    const byCreated = await db.collection(collection)
      .where({ _openid: openid })
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();
    if (byCreated.data.length > 0 && byCreated.data[0].created_at) {
      return byCreated.data[0].created_at;
    }
  } catch (error) {
    console.warn('按 created_at 查询最新时间失败:', collection, error);
  }

  return '';
}

async function getMyDataSummary(openid) {
  try {
    const collections = ['happiness_records', 'fortune_records', 'diary_records'];
    const counts = {};
    let total = 0;
    let latestActiveAt = '';

    for (const name of collections) {
      const countRes = await db.collection(name).where({ _openid: openid }).count();
      const totalCount = countRes.total || 0;
      counts[name] = totalCount;
      total += totalCount;

      if (totalCount > 0) {
        const latest = await getLatestTime(name, openid);
        if (latest && (!latestActiveAt || latest > latestActiveAt)) {
          latestActiveAt = latest;
        }
      }
    }

    return {
      code: 0,
      message: '获取成功',
      data: {
        counts,
        total,
        latest_active_at: latestActiveAt
      }
    };
  } catch (error) {
    console.error('获取数据汇总失败:', error);
    return {
      code: -1,
      message: '获取数据汇总失败',
    };
  }
}

function collectFileIdsFromRecord(record) {
  const fileIds = [];
  const imageUrls = Array.isArray(record.image_urls) ? record.image_urls : [];
  const voiceUrls = Array.isArray(record.voice_urls) ? record.voice_urls : [];
  const singleImage = typeof record.image_url === 'string' ? record.image_url : '';
  const singleVoice = typeof record.voice_url === 'string' ? record.voice_url : '';

  imageUrls.forEach(id => {
    if (typeof id === 'string' && id) fileIds.push(id);
  });
  voiceUrls.forEach(id => {
    if (typeof id === 'string' && id) fileIds.push(id);
  });
  if (singleImage) fileIds.push(singleImage);
  if (singleVoice) fileIds.push(singleVoice);

  return fileIds;
}

async function collectRecords(collection, openid) {
  const all = [];
  const pageSize = 100;
  let skip = 0;

  while (true) {
    const result = await db.collection(collection)
      .where({ _openid: openid })
      .skip(skip)
      .limit(pageSize)
      .get();
    const list = result.data || [];
    all.push(...list);
    if (list.length < pageSize) break;
    skip += list.length;
    if (skip > 5000) break;
  }

  return all;
}

async function deleteFilesByChunks(fileIds) {
  const dedup = [...new Set(fileIds.filter(Boolean))];
  const failed = [];
  const chunkSize = 50;

  for (let i = 0; i < dedup.length; i += chunkSize) {
    const chunk = dedup.slice(i, i + chunkSize);
    try {
      await cloud.deleteFile({ fileList: chunk });
    } catch (error) {
      console.error('删除云文件失败:', error);
      failed.push(...chunk);
    }
  }

  return {
    total: dedup.length,
    failed
  };
}

async function deleteMyData(openid) {
  try {
    const businessCollections = ['happiness_records', 'fortune_records', 'diary_records'];
    const allFileIds = [];
    const removed = {};

    for (const name of businessCollections) {
      const records = await collectRecords(name, openid);
      records.forEach(record => {
        allFileIds.push(...collectFileIdsFromRecord(record));
      });

      const removeResult = await db.collection(name).where({ _openid: openid }).remove();
      removed[name] = removeResult.stats.removed || 0;
    }

    const profileList = await collectRecords(USER_PROFILE_COLLECTION, openid);
    profileList.forEach((profile) => {
      if (typeof profile.avatar_url === 'string' && profile.avatar_url) {
        allFileIds.push(profile.avatar_url);
      }
    });
    const profileRemoveResult = await db.collection(USER_PROFILE_COLLECTION).where({ _openid: openid }).remove();
    removed[USER_PROFILE_COLLECTION] = profileRemoveResult.stats.removed || 0;

    const fileResult = await deleteFilesByChunks(allFileIds);

    return {
      code: 0,
      message: '删除成功',
      data: {
        removed,
        files: {
          total: fileResult.total,
          failed: fileResult.failed
        }
      }
    };
  } catch (error) {
    console.error('删除用户数据失败:', error);
    return {
      code: -1,
      message: '删除用户数据失败',
    };
  }
}

