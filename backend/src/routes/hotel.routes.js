/**
 * Hotel Routes
 * Defines hotel search, offers, ratings, and autocomplete API endpoints
 */
const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotel.controller');
const asyncHandler = require('../core/AsyncHandler');

// ═══════════════════════════════════════════════════════════════
// 🏨 HOTEL LIST SEARCH
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/hotels/search/city
 * @desc    Search hotels by city code
 * @access  Public
 * @query   cityCode (required), radius, radiusUnit, chainCodes, amenities, ratings, hotelSource, page, pageSize
 * @example GET /api/hotels/search/city?cityCode=PAR&ratings=4,5&radius=10
 */
router.get('/search/city', asyncHandler(hotelController.searchByCity));

/**
 * @route   GET /api/hotels/search/geocode
 * @desc    Search hotels by latitude/longitude
 * @access  Public
 * @query   latitude (required), longitude (required), radius, radiusUnit, amenities, ratings, hotelSource
 * @example GET /api/hotels/search/geocode?latitude=48.8566&longitude=2.3522&radius=5
 */
router.get('/search/geocode', asyncHandler(hotelController.searchByGeocode));

// ═══════════════════════════════════════════════════════════════
// 💰 HOTEL OFFERS (Pricing & Availability)
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/hotels/offers
 * @desc    Search hotel offers (availability + real-time pricing)
 * @access  Public
 * @query   hotelIds (required), adults, checkInDate, checkOutDate, roomQuantity, currency, boardType
 * @example GET /api/hotels/offers?hotelIds=MCLONGHM&adults=2&checkInDate=2025-08-01&checkOutDate=2025-08-03
 */
router.get('/offers', asyncHandler(hotelController.searchOffers));

/**
 * @route   GET /api/hotels/offers/:offerId
 * @desc    Get specific hotel offer by ID (price validation)
 * @access  Public
 * @example GET /api/hotels/offers/3E32A38CF7A4B04B
 */
router.get('/offers/:offerId', asyncHandler(hotelController.getOfferById));

// ═══════════════════════════════════════════════════════════════
// ⭐ HOTEL RATINGS
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/hotels/ratings
 * @desc    Get hotel ratings and sentiments
 * @access  Public
 * @query   hotelIds (comma-separated, max 3)
 * @example GET /api/hotels/ratings?hotelIds=MCLONGHM,HILONDON
 */
router.get('/ratings', asyncHandler(hotelController.getRatings));

// ═══════════════════════════════════════════════════════════════
// 🔍 HOTEL AUTOCOMPLETE
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/hotels/autocomplete
 * @desc    Hotel name autocomplete search
 * @access  Public
 * @query   keyword (required, min 3 chars), subType (HOTEL_LEISURE|HOTEL_GDS), countryCode, lang, max
 * @example GET /api/hotels/autocomplete?keyword=hilton&subType=HOTEL_LEISURE
 */
router.get('/autocomplete', asyncHandler(hotelController.autocomplete));

module.exports = router;
