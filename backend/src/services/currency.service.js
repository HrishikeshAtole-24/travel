/**
 * Currency Service
 * Exchange rates for presenting and charging supplier prices in INR.
 *
 * Suppliers price in their own currency (Duffel test mode returns USD) but the
 * payment gateway (Razorpay India) can only charge INR, so offers are converted
 * once at search/price time and the original supplier amount is kept for ordering.
 *
 * Rates: ExchangeRate-API open access endpoint (no key, refreshed daily)
 *   https://www.exchangerate-api.com/docs/free
 */
const axios = require('axios');
const logger = require('../config/winstonLogger');

const RATES_URL = process.env.FX_RATES_URL || 'https://open.er-api.com/v6/latest';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // provider updates daily; refresh every 6h

// Optional safety margin added to converted prices to absorb FX movement, e.g. 2 = +2%
const FX_MARKUP_PERCENT = parseFloat(process.env.FX_MARKUP_PERCENT || '0');

// base currency → { rates, fetchedAt }
const cache = new Map();

/**
 * Get the conversion rate from one currency to another
 * @param {string} from - ISO 4217 code, e.g. 'USD'
 * @param {string} to - ISO 4217 code, e.g. 'INR'
 * @returns {Promise<number>}
 */
async function getRate(from, to) {
  from = String(from).toUpperCase();
  to = String(to).toUpperCase();
  if (from === to) return 1;

  const cached = cache.get(from);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS && cached.rates[to]) {
    return cached.rates[to];
  }

  try {
    const response = await axios.get(`${RATES_URL}/${encodeURIComponent(from)}`, { timeout: 10000 });
    if (response.data?.result !== 'success' || !response.data.rates?.[to]) {
      throw new Error(`No ${from}→${to} rate in provider response`);
    }
    cache.set(from, { rates: response.data.rates, fetchedAt: Date.now() });
    logger.info(`[FX] Refreshed ${from} rates (${from}→${to} = ${response.data.rates[to]})`);
    return response.data.rates[to];
  } catch (error) {
    // Fall back to the last known rate rather than failing searches
    if (cached?.rates[to]) {
      logger.warn(`[FX] Rate refresh failed (${error.message}); using cached ${from}→${to}`);
      return cached.rates[to];
    }

    // Manual override, e.g. FX_FALLBACK_USD_INR=83.5
    const fallback = parseFloat(process.env[`FX_FALLBACK_${from}_${to}`]);
    if (Number.isFinite(fallback) && fallback > 0) {
      logger.warn(`[FX] Using FX_FALLBACK_${from}_${to}=${fallback}`);
      return fallback;
    }

    throw new Error(`Exchange rate ${from}→${to} unavailable: ${error.message}`);
  }
}

/**
 * Rate including the configured FX markup
 */
async function getChargeRate(from, to) {
  const rate = await getRate(from, to);
  if (String(from).toUpperCase() === String(to).toUpperCase()) return 1;
  return rate * (1 + FX_MARKUP_PERCENT / 100);
}

/**
 * Get charge rates for every currency used by the given offers
 * @param {Array} offers - Standard flight offers
 * @param {string} target - Target currency
 * @returns {Promise<Object>} { USD: 96.83, INR: 1, ... }
 */
async function getRatesForOffers(offers, target) {
  const currencies = [...new Set(offers.map(o => o.pricing?.totalCurrency).filter(Boolean))];
  const rates = {};
  for (const currency of currencies) {
    rates[currency] = await getChargeRate(currency, target);
  }
  return rates;
}

/** Test helper */
function clearCache() {
  cache.clear();
}

module.exports = {
  getRate,
  getChargeRate,
  getRatesForOffers,
  clearCache
};
