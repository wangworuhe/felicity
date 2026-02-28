import { callFunction } from '../utils/cloud.js';
import { FUNCTION_TYPES, CLOUD_FUNCTIONS } from '../utils/constants.js';

export const getUserProfile = () => {
  return callFunction(CLOUD_FUNCTIONS.HAPPINESS, {
    type: FUNCTION_TYPES.USER_GET_PROFILE,
  }, { showLoading: false });
};

export const upsertUserProfile = (data) => {
  return callFunction(CLOUD_FUNCTIONS.HAPPINESS, {
    type: FUNCTION_TYPES.USER_UPSERT_PROFILE,
    data,
  });
};

export const getMyDataSummary = () => {
  return callFunction(CLOUD_FUNCTIONS.HAPPINESS, {
    type: FUNCTION_TYPES.USER_GET_SUMMARY,
  }, { showLoading: false });
};

export const deleteMyData = () => {
  return callFunction(CLOUD_FUNCTIONS.HAPPINESS, {
    type: FUNCTION_TYPES.USER_DELETE_ALL_DATA,
  });
};
