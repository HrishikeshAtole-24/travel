/**
 * LiteAPI (Nuitée Connect) Client
 * Docs: https://docs.liteapi.travel
 *
 * - Auth: X-API-Key header (LITEAPI_API_KEY; sand_... keys hit the sandbox)
 * - Two hosts: api.liteapi.travel (search/data/flights) and book.liteapi.travel (hotel prebook/book)
 * - Errors: { error: { code, description, message } }
 */
const axios = require('axios');
const logger = require('../../config/winstonLogger');

const API_BASE_URL = process.env.LITEAPI_BASE_URL || 'https://api.liteapi.travel/v3.0';
const BOOK_BASE_URL = process.env.LITEAPI_BOOK_BASE_URL || 'https://book.liteapi.travel/v3.0';

/**
 * Error raised for any failed LiteAPI call
 */
class LiteApiError extends Error {
  constructor(message, { status = null, code = null, details = null } = {}) {
    super(message);
    this.name = 'LiteApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

class LiteApiClient {
  getApiKey() {
    const key = process.env.LITEAPI_API_KEY;
    if (!key) {
      throw new LiteApiError('LITEAPI_API_KEY is not configured');
    }
    return key;
  }

  /**
   * True when using a sandbox key (simulated bookings, no charges)
   */
  isSandbox() {
    return (process.env.LITEAPI_API_KEY || '').startsWith('sand_');
  }

  async request(method, url, { data, params, timeout = 60000 } = {}) {
    try {
      const response = await axios.request({
        method,
        url,
        data,
        params,
        timeout,
        headers: {
          'X-API-Key': this.getApiKey(),
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      if (error instanceof LiteApiError) throw error;

      const apiError = error.response?.data?.error || {};
      // `description` is usually the specific, human-readable reason
      const message = apiError.description || apiError.message || error.message;

      logger.error(`[LiteAPI] ${method.toUpperCase()} ${url} failed (${error.response?.status || 'network'}): ${message}`);

      throw new LiteApiError(message, {
        status: error.response?.status || null,
        code: apiError.code || null,
        details: apiError
      });
    }
  }

  api(method, path, options) {
    return this.request(method, `${API_BASE_URL}${path}`, options);
  }

  book(method, path, options) {
    return this.request(method, `${BOOK_BASE_URL}${path}`, options);
  }
}

/**
 * LiteAPI wraps single results in `data` as either an object or a one-item array
 */
const unwrap = (response) => {
  const data = response?.data;
  return Array.isArray(data) ? data[0] : data;
};

module.exports = new LiteApiClient();
module.exports.LiteApiError = LiteApiError;
module.exports.unwrap = unwrap;
