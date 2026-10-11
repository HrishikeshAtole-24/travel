/**
 * Currency Transformer - Convert offer prices into the display/charge currency
 * Pure function: exchange rates are fetched by the caller (currency.service).
 *
 * The supplier's original price is preserved on pricing.supplierPrice so the
 * supplier order can be paid in the supplier's currency later.
 */

/**
 * Round a converted amount up to the next paisa/cent so we never undercharge
 */
const roundUp = (amount) => Math.ceil(amount * 100) / 100;

/**
 * Convert a list of standard offers to the target currency
 * @param {Array} offers - Standard flight offers
 * @param {Object} rates - { [fromCurrency]: rateToTarget }
 * @param {string} target - Target currency, e.g. 'INR'
 * @returns {Array} Offers with pricing in the target currency
 */
const convertOffersCurrency = (offers, rates, target) => {
  return offers.map(offer => {
    const pricing = offer.pricing;
    const from = pricing.totalCurrency;

    if (from === target) {
      return offer;
    }

    const rate = rates[from];
    if (!rate) {
      throw new Error(`Missing exchange rate ${from}→${target}`);
    }

    const totalAmount = roundUp(pricing.totalAmount * rate);
    const baseAmount = roundUp(pricing.baseAmount * rate);

    offer.pricing = {
      ...pricing,
      totalAmount,
      totalCurrency: target,
      baseAmount,
      // Derived so base + taxes always equals total after rounding
      taxesAmount: Math.round((totalAmount - baseAmount) * 100) / 100,
      supplierPrice: {
        totalAmount: pricing.totalAmount,
        baseAmount: pricing.baseAmount,
        taxesAmount: pricing.taxesAmount,
        currency: from,
        exchangeRate: rate
      }
    };

    offer.travelerPricing = (offer.travelerPricing || []).map(tp => {
      if (!tp.price || typeof tp.price.totalAmount !== 'number') return tp;
      return {
        ...tp,
        price: {
          ...tp.price,
          totalAmount: roundUp(tp.price.totalAmount * rate),
          baseAmount: roundUp((tp.price.baseAmount || 0) * rate),
          taxesAmount: roundUp((tp.price.taxesAmount || 0) * rate),
          totalCurrency: target
        }
      };
    });

    if (offer.computed?.pricePerTraveler) {
      offer.computed.pricePerTraveler = Object.fromEntries(
        Object.entries(offer.computed.pricePerTraveler).map(([type, amount]) => [type, roundUp(amount * rate)])
      );
    }

    return offer;
  });
};

module.exports = { convertOffersCurrency };
