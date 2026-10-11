/**
 * Duffel API Client
 * Thin HTTP wrapper around the Duffel REST API (https://duffel.com/docs/api)
 *
 * - Auth: Bearer access token (DUFFEL_ACCESS_TOKEN)
 * - Versioning: Duffel-Version header (v2)
 * - Errors: Duffel returns { errors: [{ title, message, code, type }] }
 */
const axios = require('axios');
const logger = require('../../config/winstonLogger');

const DUFFEL_BASE_URL = process.env.DUFFEL_BASE_URL || 'https://api.duffel.com';
const DUFFEL_VERSION = 'v2';

/**
 * Error raised for any failed Duffel call, carrying Duffel's own error code
 */
class DuffelError extends Error {
  constructor(message, { status = null, code = null, errors = [] } = {}) {
    super(message);
    this.name = 'DuffelError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

class DuffelClient {
  constructor() {
    this.http = axios.create({
      baseURL: DUFFEL_BASE_URL,
      timeout: 60000,
      headers: {
        'Duffel-Version': DUFFEL_VERSION,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip'
      }
    });
  }

  getToken() {
    const token = process.env.DUFFEL_ACCESS_TOKEN;
    if (!token) {
      throw new DuffelError('DUFFEL_ACCESS_TOKEN is not configured');
    }
    return token;
  }

  /**
   * True when using a test-mode token (no real bookings or money)
   */
  isTestMode() {
    return (process.env.DUFFEL_ACCESS_TOKEN || '').startsWith('duffel_test_');
  }

  async request(method, url, { params, data, timeout } = {}) {
    try {
      const response = await this.http.request({
        method,
        url,
        params,
        data,
        timeout,
        headers: { Authorization: `Bearer ${this.getToken()}` }
      });
      return response.data;
    } catch (error) {
      if (error instanceof DuffelError) throw error;

      const errors = error.response?.data?.errors || [];
      const first = errors[0] || {};
      const message = first.message || first.title || error.message;

      logger.error(`[Duffel] ${method.toUpperCase()} ${url} failed (${error.response?.status || 'network'}): ${message}`);

      throw new DuffelError(message, {
        status: error.response?.status || null,
        code: first.code || null,
        errors
      });
    }
  }

  get(url, params, options = {}) {
    return this.request('get', url, { params, ...options });
  }

  post(url, data, params, options = {}) {
    return this.request('post', url, { data, params, ...options });
  }
}

const duffelClient = new DuffelClient();

module.exports = duffelClient;
module.exports.DuffelError = DuffelError;
