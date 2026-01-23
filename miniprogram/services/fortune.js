import { callFunction } from '../utils/cloud.js';
import { COLLECTIONS, FUNCTION_TYPES } from '../utils/constants.js';

export const createFortuneRecord = (data) => {
  return callFunction('happiness', {
    type: FUNCTION_TYPES.FORTUNE_CREATE,
    collection: COLLECTIONS.FORTUNE_RECORDS,
    data
  });
};

export const getFortuneRecords = (page = 1, limit = 10) => {
  return callFunction('happiness', {
    type: FUNCTION_TYPES.FORTUNE_LIST,
    collection: COLLECTIONS.FORTUNE_RECORDS,
    page,
    limit
  });
};

export const upsertFortuneRecord = (data) => {
  return callFunction('happiness', {
    type: FUNCTION_TYPES.FORTUNE_UPSERT,
    collection: COLLECTIONS.FORTUNE_RECORDS,
    data
  });
};
