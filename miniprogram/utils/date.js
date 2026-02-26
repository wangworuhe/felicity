/**
 * 日期格式化工具
 */

const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/**
 * 格式化 ISO 日期字符串
 * @param {string} isoString - ISO 日期字符串
 * @param {object} options - 格式选项
 * @param {boolean} options.includeYear - 是否包含年份，默认 true
 * @param {boolean} options.includeSeconds - 是否包含秒，默认 false
 * @param {string} options.dateSeparator - 日期分隔符，'cn'(年月日) / 'dot'(点号)，默认 'cn'
 */
const formatDate = (isoString, options = {}) => {
  const {
    includeYear = true,
    includeSeconds = false,
    dateSeparator = 'cn'
  } = options;

  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  const weekDay = WEEK_DAYS[date.getDay()];

  let datePart;
  if (dateSeparator === 'dot') {
    datePart = includeYear ? `${year}.${month}.${day}` : `${month}.${day}`;
  } else {
    datePart = includeYear ? `${year}年${month}月${day}日` : `${month}月${day}日`;
  }

  const timePart = includeSeconds ? `${hour}:${minute}:${second}` : `${hour}:${minute}`;

  return `${datePart} ${weekDay} ${timePart}`;
};

module.exports = { formatDate };
