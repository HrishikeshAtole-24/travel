/**
 * API Client
 * Handles all HTTP requests with auth token management
 */

class ApiClient {
  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
  }

  // Get auth token from localStorage
  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  // Set auth token
  setToken(token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  // Remove auth token
  removeToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  // Build headers with auth
  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // Generic request method
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: this.getHeaders(options.headers),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    const url = new URL(`${this.baseURL}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    return this.request(url.toString(), {
      method: 'GET',
    });
  }

  // POST request
  async post(endpoint, body = {}) {
    return this.request(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // PUT request
  async put(endpoint, body = {}) {
    return this.request(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
    });
  }

  // ============================
  // BOOKING API METHODS
  // ============================

  /**
   * Create a new booking
   * @param {Object} bookingData - Booking details
   * @returns {Promise} Booking response
   */
  async createBooking(bookingData) {
    return this.post('/bookings/create', bookingData);
  }

  /**
   * Create booking and initiate payment in one step
   * @param {Object} bookingData - Booking details with payment info
   * @returns {Promise} Booking and payment response
   */
  async createBookingAndPay(bookingData) {
    return this.post('/bookings/create-and-pay', bookingData);
  }

  /**
   * Get booking by ID
   * @param {string|number} bookingId - Booking ID
   * @returns {Promise} Booking details
   */
  async getBookingById(bookingId) {
    return this.get(`/bookings/${bookingId}`);
  }

  /**
   * Get booking by reference number
   * @param {string} bookingReference - Booking reference number
   * @param {string} email - Email for verification (guest bookings)
   * @returns {Promise} Booking details
   */
  async getBookingByReference(bookingReference, email) {
    const params = email ? { email } : {};
    return this.get(`/bookings/reference/${bookingReference}`, params);
  }

  /**
   * Get all bookings for logged-in user
   * @returns {Promise} User's bookings
   */
  async getMyBookings() {
    return this.get('/bookings/my-bookings');
  }

  /**
   * Cancel a booking
   * @param {string|number} bookingId - Booking ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise} Cancellation confirmation
   */
  async cancelBooking(bookingId, reason) {
    return this.post(`/bookings/${bookingId}/cancel`, { reason });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
