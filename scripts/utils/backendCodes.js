/**
 * 后端数字 errcode → Skill 稳定 error_code。
 */
const { ApiError } = require("./errors");

const BACKEND_CODE_MAP = {
  2: {
    code: "RATE_LIMITED",
    noRetry: true,
    defaultMessage: "短时间内提交任务过多，请稍后重试",
  },
  14: {
    code: "PLAN_LIMIT",
    noRetry: true,
    defaultMessage:
      "当前 TOKEN 套餐单次条数超限（包月：文章/视频搜索最多 20 条）。请降低 --limit，或到 www.guaikei.com 升级按量套餐",
  },
  15: {
    code: "INSUFFICIENT_BALANCE",
    noRetry: true,
    defaultMessage:
      "TOKEN 余额可能不足，请通过 www.guaikei.com 充值后重试",
  },
  17: {
    code: "DAILY_LIMIT",
    noRetry: true,
    defaultMessage:
      "今日调用次数已达上限，请明日再试或到 www.guaikei.com 升级套餐",
  },
};

/**
 * @param {number} errcode
 * @param {string} [errmsg]
 * @returns {ApiError}
 */
function mapBackendApiError(errcode, errmsg) {
  const mapped = BACKEND_CODE_MAP[errcode];
  if (mapped) {
    return new ApiError(
      mapped.code,
      (errmsg && String(errmsg).trim()) || mapped.defaultMessage,
      mapped.noRetry !== false,
    );
  }
  return new ApiError(
    errcode.toString(),
    errmsg || "请求失败",
    errcode >= 10,
  );
}

module.exports = {
  BACKEND_CODE_MAP,
  mapBackendApiError,
};
