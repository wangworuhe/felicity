import { callFunction } from '../utils/cloud.js';
import { COLLECTIONS, FUNCTION_TYPES } from '../utils/constants.js';

export const createHappinessRecord = (data) => {
  return callFunction('happiness', {
    type: FUNCTION_TYPES.HAPPINESS_CREATE,
    collection: COLLECTIONS.HAPPINESS_RECORDS,
    data
  });
};

export const getHappinessRecords = (page = 1, limit = 10) => {
  return callFunction('happiness', {
    type: FUNCTION_TYPES.HAPPINESS_LIST,
    collection: COLLECTIONS.HAPPINESS_RECORDS,
    page,
    limit
  });
};

export const getHappinessRecordDetail = (id) => {
  return callFunction('happiness', {
    type: FUNCTION_TYPES.HAPPINESS_DETAIL,
    collection: COLLECTIONS.HAPPINESS_RECORDS,
    id
  });
};

export const deleteHappinessRecord = (id) => {
  return callFunction('happiness', {
    type: FUNCTION_TYPES.HAPPINESS_DELETE,
    collection: COLLECTIONS.HAPPINESS_RECORDS,
    id
  });
};

export const getRandomHappinessRecord = () => {
  return callFunction('happiness', {
    type: FUNCTION_TYPES.HAPPINESS_RANDOM,
    collection: COLLECTIONS.HAPPINESS_RECORDS
  });
};

export const upsertHappinessRecord = (data) => {
  return callFunction('happiness', {
    type: FUNCTION_TYPES.HAPPINESS_UPSERT,
    collection: COLLECTIONS.HAPPINESS_RECORDS,
    data
  });
};

export const getHappinessRecordsByDateKey = (dateKey) => {
  return callFunction('happiness', {
    type: FUNCTION_TYPES.HAPPINESS_LIST_BY_DATE,
    collection: COLLECTIONS.HAPPINESS_RECORDS,
    dateKey
  });
};
