/**
 * Hotel API Functions
 * Search, details and booking calls for the hotel pages
 */

import apiClient from './client';

/**
 * Destination autocomplete
 * @param {string} query - e.g. "goa"
 * @returns {Promise<Array>} [{ cityName, countryCode, label }]
 */
export async function searchDestinations(query) {
  const response = await apiClient.get('/hotels/destinations', { q: query || '' });
  return response.data || [];
}

/**
 * Hotels in a destination with their cheapest room for the stay
 * @param {Object} params - { cityName, countryCode, checkInDate, checkOutDate, adults, rooms, childrenAges, sortBy }
 */
export async function searchHotels(params) {
  const response = await apiClient.get('/hotels/search', params);
  return response.data;
}

/**
 * Hotel content + room rates for the stay
 * @param {string} hotelId
 * @param {Object} stay - { checkInDate, checkOutDate, adults, rooms, childrenAges }
 */
export async function getHotelDetails(hotelId, stay) {
  const response = await apiClient.get(`/hotels/${encodeURIComponent(hotelId)}/details`, stay);
  return response.data;
}

/**
 * Confirm a room offer's live price and availability before booking
 * @param {string} offerId - Standard offer ID (HOTEL_OFFER_...)
 */
export async function confirmHotelOffer(offerId) {
  const response = await apiClient.get(`/hotels/offers/${encodeURIComponent(offerId)}`);
  return response.data;
}

/**
 * Create the hotel booking and start payment
 * @param {Object} bookingData - { offerId, guests, contactEmail, contactPhone, specialRequests, hotelName, hotelData, successUrl, failureUrl }
 */
export async function createHotelBookingAndPay(bookingData) {
  return apiClient.post('/hotel-bookings/create-and-pay', bookingData);
}

/**
 * Hotel booking by reference (guests pass the contact email)
 */
export async function getHotelBookingByReference(reference, email) {
  const response = await apiClient.get(`/hotel-bookings/reference/${encodeURIComponent(reference)}`, email ? { email } : {});
  return response.data;
}

/**
 * Logged-in user's hotel bookings
 */
export async function getMyHotelBookings() {
  const response = await apiClient.get('/hotel-bookings/my-bookings');
  return response.data || [];
}

/**
 * Stay query string shared by search → details → booking pages
 */
export function stayQuery({ checkInDate, checkOutDate, adults, rooms, childrenAges }) {
  const params = new URLSearchParams({
    checkin: checkInDate,
    checkout: checkOutDate,
    adults: String(adults || 2),
    rooms: String(rooms || 1)
  });
  if (childrenAges && childrenAges.length > 0) params.set('children', childrenAges.join(','));
  return params.toString();
}

/**
 * Read stay params from a URLSearchParams (inverse of stayQuery)
 */
export function readStay(searchParams) {
  const children = searchParams.get('children');
  return {
    checkInDate: searchParams.get('checkin') || '',
    checkOutDate: searchParams.get('checkout') || '',
    adults: parseInt(searchParams.get('adults')) || 2,
    rooms: parseInt(searchParams.get('rooms')) || 1,
    childrenAges: children ? children.split(',').map(Number).filter(n => !isNaN(n)) : []
  };
}

/**
 * Format an amount in the offer currency
 */
export function formatMoney(amount, currency = 'INR') {
  if (amount === null || amount === undefined || isNaN(amount)) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * "26 Nov' 26" style date like the search bar
 */
export function formatStayDate(dateString) {
  if (!dateString) return '';
  const date = new Date(`${dateString}T00:00:00`);
  if (isNaN(date)) return dateString;
  const month = date.toLocaleDateString('en-IN', { month: 'short' });
  return `${date.getDate()} ${month}' ${String(date.getFullYear()).slice(2)}`;
}
