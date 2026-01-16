/**
 * 表单验证工具
 */

/**
 * 验证是否为空
 * @param {any} value - 待验证的值
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
};

/**
 * 验证必填字段
 * @param {object} data - 数据对象
 * @param {array} fields - 必填字段列表
 */
export const validateRequired = (data, fields) => {
  const errors = [];

  fields.forEach((field) => {
    if (isEmpty(data[field])) {
      errors.push(`${field} 不能为空`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * 验证数字
 * @param {any} value - 待验证的值
 */
export const isNumber = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

/**
 * 验证手机号
 * @param {string} phone - 手机号
 */
export const isPhone = (phone) => {
  return /^1[3-9]\d{9}$/.test(phone);
};

/**
 * 验证邮箱
 * @param {string} email - 邮箱地址
 */
export const isEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * 验证字符串长度
 * @param {string} value - 待验证的字符串
 * @param {number} min - 最小长度
 * @param {number} max - 最大长度
 */
export const validateLength = (value, min, max) => {
  if (typeof value !== 'string') {
    return false;
  }
  const len = value.length;
  return len >= min && len <= max;
};

/**
 * 销售数据验证
 * @param {object} data - 销售数据
 */
export const validateSalesData = (data) => {
  const { region, city, sales } = data;
  const errors = [];

  if (isEmpty(region)) {
    errors.push('地区不能为空');
  }

  if (isEmpty(city)) {
    errors.push('城市不能为空');
  }

  if (isEmpty(sales)) {
    errors.push('销售额不能为空');
  } else if (!isNumber(sales)) {
    errors.push('销售额必须是数字');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
