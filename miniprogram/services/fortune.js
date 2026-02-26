import { callFunction } from '../utils/cloud.js';
import { COLLECTIONS, FUNCTION_TYPES, CLOUD_FUNCTIONS } from '../utils/constants.js';

export const createFortuneRecord = (data) => {
  return callFunction(CLOUD_FUNCTIONS.HAPPINESS, {
    type: FUNCTION_TYPES.FORTUNE_CREATE,
    collection: COLLECTIONS.FORTUNE_RECORDS,
    data
  });
};

export const getFortuneRecords = (page = 1, limit = 10) => {
  return callFunction(CLOUD_FUNCTIONS.HAPPINESS, {
    type: FUNCTION_TYPES.FORTUNE_LIST,
    collection: COLLECTIONS.FORTUNE_RECORDS,
    page,
    limit
  });
};

export const upsertFortuneRecord = (data) => {
  return callFunction(CLOUD_FUNCTIONS.HAPPINESS, {
    type: FUNCTION_TYPES.FORTUNE_UPSERT,
    collection: COLLECTIONS.FORTUNE_RECORDS,
    data
  });
};

export const deleteFortuneRecord = (id) => {
  return callFunction(CLOUD_FUNCTIONS.HAPPINESS, {
    type: FUNCTION_TYPES.FORTUNE_DELETE,
    collection: COLLECTIONS.FORTUNE_RECORDS,
    id
  });
};
