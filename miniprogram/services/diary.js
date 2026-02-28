import { callFunction } from '../utils/cloud.js';
import { COLLECTIONS, FUNCTION_TYPES, CLOUD_FUNCTIONS } from '../utils/constants.js';

export const createDiaryRecord = (data) => {
  return callFunction(CLOUD_FUNCTIONS.HAPPINESS, {
    type: FUNCTION_TYPES.DIARY_CREATE,
    collection: COLLECTIONS.DIARY_RECORDS,
    data
  });
};

export const getDiaryRecords = (page = 1, limit = 10) => {
  return callFunction(CLOUD_FUNCTIONS.HAPPINESS, {
    type: FUNCTION_TYPES.DIARY_LIST,
    collection: COLLECTIONS.DIARY_RECORDS,
    page,
    limit
  });
};

export const getDiaryRecordsByDateKey = (dateKey) => {
  return callFunction(CLOUD_FUNCTIONS.HAPPINESS, {
    type: FUNCTION_TYPES.DIARY_LIST_BY_DATE,
    collection: COLLECTIONS.DIARY_RECORDS,
    dateKey
  });
};

export const upsertDiaryRecord = (data) => {
  return callFunction(CLOUD_FUNCTIONS.HAPPINESS, {
    type: FUNCTION_TYPES.DIARY_UPSERT,
    collection: COLLECTIONS.DIARY_RECORDS,
    data
  });
};

export const deleteDiaryRecord = (id) => {
  return callFunction(CLOUD_FUNCTIONS.HAPPINESS, {
    type: FUNCTION_TYPES.DIARY_DELETE,
    collection: COLLECTIONS.DIARY_RECORDS,
    id
  });
};

export const getDiaryRecordDates = (startDate, endDate) => {
  return callFunction(CLOUD_FUNCTIONS.HAPPINESS, {
    type: FUNCTION_TYPES.DIARY_LIST_DATES,
    collection: COLLECTIONS.DIARY_RECORDS,
    startDate,
    endDate
  }, { showLoading: false });
};
