/**
 * Amadeus HTTP Client - Token Management & Request Handling
 * Centralized HTTP client for all Amadeus API calls
 * 
 * Features:
 * - Automatic token refresh
 * - Retry logic for expired tokens
 * - Error handling & logging
 * - Support for all HTTP methods
 */
const axios = require('axios');
const logger = require('../../config/winstonLogger');

class AmadeusClient {
  constructor() {
    this.baseURL = process.env.AMADEUS_BASE_URL || 'https://test.api.amadeus.com/v1';
    this.apiKey = process.env.AMADEUS_API_KEY;
    this.apiSecret = process.env.AMADEUS_API_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * 1️⃣ Get Access Token (OAuth2)
   * API: POST /v1/security/oauth2/token
   * Auto-refreshes when expired
   */
  async getAccessToken() {
    try {
      // Return cached token if still valid
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      logger.info('🔑 Requesting new Amadeus access token...');

      // Request new token
      const response = await axios.post(
        `${this.baseURL.replace('/v1', '')}/v1/security/oauth2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.apiKey,
          client_secret: this.apiSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry time (token valid for 1799 seconds, we refresh 1 minute early)
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;

      logger.info('✅ Amadeus access token obtained');
      return this.accessToken;

    } catch (error) {
      logger.error('❌ Amadeus token request failed:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Amadeus API');
    }
  }

  /**
   * Make authenticated API request
   * Handles token injection, retries, and error handling
   */
  async request(method, endpoint, params = {}, options = {}) {
    try {
      const token = await this.getAccessToken();

      // Build full URL (handle both v1 and v2 endpoints)
      let fullUrl;
      if (endpoint.startsWith('http')) {
        fullUrl = endpoint;
      } else if (endpoint.startsWith('/v')) {
        // Absolute path with version (e.g., /v2/shopping/flight-offers)
        fullUrl = `${this.baseURL.replace('/v1', '')}${endpoint}`;
      } else {
        // Relative path (e.g., /shopping/flight-offers)
        fullUrl = `${this.baseURL}${endpoint}`;
      }

      const config = {
        method,
        url: fullUrl,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        params: method === 'GET' ? params : undefined,
        data: method !== 'GET' ? params : undefined,
        timeout: options.timeout || 10000, // 10 second default timeout
      };

      const response = await axios(config);
      return response.data;

    } catch (error) {
      // Enhanced error logging
      if (error.response) {
        logger.error('Amadeus API error:', {
          status: error.response.status,
          endpoint,
          error: error.response.data
        });
      } else {
        logger.error('Amadeus request failed:', error.message);
      }
      
      // If token expired, retry once
      if (error.response?.status === 401 && !options.isRetry) {
        this.accessToken = null;
        logger.info('🔄 Token expired, retrying...');
        return this.request(method, endpoint, params, { ...options, isRetry: true });
      }

      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}, options = {}) {
    return this.request('GET', endpoint, params, options);
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}, options = {}) {
    return this.request('POST', endpoint, data, options);
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}, options = {}) {
    return this.request('PUT', endpoint, data, options);
  }

  /**
   * DELETE request
   */
  async delete(endpoint, params = {}, options = {}) {
    return this.request('DELETE', endpoint, params, options);
  }

  /**
   * Clear cached token (useful for testing)
   */
  clearToken() {
    this.accessToken = null;
    this.tokenExpiry = null;
    logger.info('🗑️ Amadeus token cache cleared');
  }

  /**
   * Get token status
   */
  getTokenStatus() {
    if (!this.accessToken) {
      return { hasToken: false, expiresIn: null };
    }

    const expiresIn = this.tokenExpiry ? Math.floor((this.tokenExpiry - Date.now()) / 1000) : 0;
    return {
      hasToken: true,
      expiresIn,
      isValid: expiresIn > 0
    };
  }
}

module.exports = new AmadeusClient();
