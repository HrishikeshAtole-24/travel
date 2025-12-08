// Amadeus HTTP Client - Token Management & Request Handling
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
   * Get Access Token (with auto-refresh)
   */
  async getAccessToken() {
    try {
      // Return cached token if still valid
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

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
   */
  async request(method, endpoint, params = {}) {
    try {
      const token = await this.getAccessToken();

      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: method === 'GET' ? params : undefined,
        data: method !== 'GET' ? params : undefined,
      };

      const response = await axios(config);
      return response.data;

    } catch (error) {
      logger.error('Amadeus API request failed:', error.response?.data || error.message);
      
      // If token expired, retry once
      if (error.response?.status === 401) {
        this.accessToken = null;
        logger.info('Token expired, retrying...');
        return this.request(method, endpoint, params);
      }

      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint, params) {
    return this.request('GET', endpoint, params);
  }

  /**
   * POST request
   */
  async post(endpoint, data) {
    return this.request('POST', endpoint, data);
  }
}

module.exports = new AmadeusClient();
