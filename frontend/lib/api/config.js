/**
 * API Configuration
 * Centralized API endpoint management
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    SIGNUP: `${API_BASE_URL}/auth/signup`,
    LOGIN: `${API_BASE_URL}/auth/login`,
    VERIFY_EMAIL: `${API_BASE_URL}/auth/verify-email`,
    VERIFY_PHONE: `${API_BASE_URL}/auth/verify-phone`,
    PROFILE: `${API_BASE_URL}/auth/profile`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
  },

  // Flights
  FLIGHTS: {
    SEARCH: `${API_BASE_URL}/flights/search`,
    PRICE: `${API_BASE_URL}/flights/price`,
    DETAILS: (id) => `${API_BASE_URL}/flights/${id}`,
  },

  // Bookings
  BOOKINGS: {
    CREATE: `${API_BASE_URL}/bookings/create`,
    CREATE_AND_PAY: `${API_BASE_URL}/bookings/create-and-pay`,
    BY_ID: (id) => `${API_BASE_URL}/bookings/${id}`,
    BY_REFERENCE: (ref) => `${API_BASE_URL}/bookings/reference/${ref}`,
    MY_BOOKINGS: `${API_BASE_URL}/bookings/my-bookings`,
    CANCEL: (id) => `${API_BASE_URL}/bookings/${id}/cancel`,
  },

  // Payments
  PAYMENTS: {
    CREATE: `${API_BASE_URL}/payments/create`,
    CALLBACK: `${API_BASE_URL}/payments/callback`,
    STATUS: (ref) => `${API_BASE_URL}/payments/${ref}/status`,
    DETAILS: (ref) => `${API_BASE_URL}/payments/${ref}`,
  },

  // Reference Data
  REFERENCE: {
    LOCATIONS: `${API_BASE_URL}/reference/locations/search`,
    AIRPORTS: (code) => `${API_BASE_URL}/reference/airports/${code}`,
    AIRLINES: (code) => `${API_BASE_URL}/reference/airlines/${code}`,
  },
};

export default API_BASE_URL;
