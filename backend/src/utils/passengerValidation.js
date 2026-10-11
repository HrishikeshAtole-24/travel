/**
 * Passenger Validation
 * Validates traveler details against what the airline needs to issue tickets.
 * Runs BEFORE payment so a customer is never charged for a booking the
 * supplier will reject.
 */
const ApiError = require('../core/ApiError');

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s'-]{0,49}$/;
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const VALID_TYPES = ['ADULT', 'CHILD', 'INFANT'];

/**
 * Normalize a phone number to E.164 (+<country><number>)
 * Bare 10-digit numbers are treated as Indian mobiles.
 * @returns {string|null}
 */
function normalizePhone(phone, defaultCountryCode = '91') {
  if (!phone) return null;
  const raw = String(phone).trim();
  const digits = raw.replace(/[^\d]/g, '');

  let candidate;
  if (raw.startsWith('+')) candidate = `+${digits}`;
  else if (raw.startsWith('00')) candidate = `+${digits.slice(2)}`;
  else if (digits.length === 10) candidate = `+${defaultCountryCode}${digits}`;
  else if (digits.length === 11 && digits.startsWith('0')) candidate = `+${defaultCountryCode}${digits.slice(1)}`;
  else candidate = `+${digits}`;

  return E164_PATTERN.test(candidate) ? candidate : null;
}

/**
 * Age in whole years on a given date
 */
function ageOn(dateOfBirth, onDate) {
  const dob = new Date(dateOfBirth);
  const on = new Date(onDate);
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = on.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

function isValidDateString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(new Date(value).getTime());
}

/**
 * First departure / last arrival dates of a standard offer (YYYY-MM-DD)
 */
function getTravelDates(offer) {
  const segments = (offer?.itinerary?.slices || []).flatMap(s => s.segments || []);
  const first = segments[0]?.departure?.time;
  const last = segments[segments.length - 1]?.arrival?.time || first;
  return {
    firstDeparture: first ? String(first).slice(0, 10) : new Date().toISOString().slice(0, 10),
    lastArrival: last ? String(last).slice(0, 10) : new Date().toISOString().slice(0, 10)
  };
}

/**
 * Validate travelers for a priced offer and attach supplier passenger IDs.
 *
 * @param {Array} travelers - Travelers from the booking form
 * @param {Object} pricedOffer - Standard priced offer (with passengers + requirements)
 * @param {Object} contact - { email, phone } fallbacks
 * @returns {Array} Normalized travelers, each with type, gender, phone and supplierPassengerId
 * @throws {ApiError} 400 listing every problem found
 */
function validateTravelersForOffer(travelers, pricedOffer, contact = {}) {
  const offerPassengers = pricedOffer?.passengers;

  // Suppliers that don't publish passenger slots (legacy Amadeus) only get basic checks
  if (!Array.isArray(offerPassengers) || offerPassengers.length === 0) {
    return travelers;
  }

  const errors = [];

  if (travelers.length !== offerPassengers.length) {
    throw ApiError.badRequest(
      `This fare is for ${offerPassengers.length} passenger(s) but ${travelers.length} were provided`
    );
  }

  const { firstDeparture, lastArrival } = getTravelDates(pricedOffer);
  const documentsRequired = Boolean(pricedOffer.requirements?.identityDocumentsRequired);
  const contactPhone = normalizePhone(contact.phone);

  // Match travelers to the offer's passenger slots: by supplier ID when given, else by type order
  const unclaimed = [...offerPassengers];
  const claimSlot = (traveler) => {
    let index = unclaimed.findIndex(p => p.supplierPassengerId && p.supplierPassengerId === traveler.supplierPassengerId);
    if (index === -1) {
      const type = String(traveler.type || 'ADULT').toUpperCase();
      index = unclaimed.findIndex(p => p.type === type);
    }
    return index === -1 ? null : unclaimed.splice(index, 1)[0];
  };

  const normalized = travelers.map((traveler, i) => {
    const label = `Passenger ${i + 1}`;
    const slot = claimSlot(traveler);

    if (!slot) {
      errors.push(`${label}: passenger type does not match this fare`);
      return traveler;
    }

    const type = slot.type;
    const firstName = String(traveler.firstName || '').trim();
    const lastName = String(traveler.lastName || '').trim();

    if (!NAME_PATTERN.test(firstName)) errors.push(`${label}: enter the first name exactly as on the passport (letters only)`);
    if (!NAME_PATTERN.test(lastName)) errors.push(`${label}: enter the last name exactly as on the passport (letters only)`);

    if (!isValidDateString(traveler.dateOfBirth)) {
      errors.push(`${label}: date of birth is required`);
    } else {
      const age = ageOn(traveler.dateOfBirth, firstDeparture);
      if (new Date(traveler.dateOfBirth) > new Date()) errors.push(`${label}: date of birth cannot be in the future`);
      else if (type === 'INFANT' && age >= 2) errors.push(`${label}: infants must be under 2 years old on the travel date`);
      else if (type === 'CHILD' && (age < 2 || age >= 18)) errors.push(`${label}: children must be 2–17 years old on the travel date`);
      else if (type === 'ADULT' && age < 18) errors.push(`${label}: adults must be 18 or older on the travel date`);
    }

    const gender = String(traveler.gender || '').toUpperCase();
    if (!['MALE', 'FEMALE'].includes(gender)) {
      errors.push(`${label}: airlines require gender as shown on the passport (male or female)`);
    }

    const phone = normalizePhone(traveler.phone) || contactPhone;
    if (!phone) errors.push(`${label}: enter a valid phone number with country code, e.g. +919876543210`);

    const email = String(traveler.email || contact.email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(`${label}: a valid email is required`);

    if (documentsRequired) {
      if (!traveler.documentNumber) errors.push(`${label}: passport number is required for this flight`);
      if (!isValidDateString(traveler.documentExpiry)) errors.push(`${label}: passport expiry date is required`);
      else if (new Date(traveler.documentExpiry) <= new Date(lastArrival)) errors.push(`${label}: passport must be valid beyond the travel dates`);
      if (!/^[A-Za-z]{2}$/.test(String(traveler.nationality || ''))) errors.push(`${label}: nationality must be a 2-letter country code, e.g. IN`);
    }

    return {
      ...traveler,
      type,
      supplierPassengerId: slot.supplierPassengerId,
      firstName,
      lastName,
      gender,
      email,
      phone,
      nationality: traveler.nationality ? String(traveler.nationality).toUpperCase() : null
    };
  });

  if (errors.length > 0) {
    throw ApiError.badRequest(errors[0], errors);
  }

  return normalized;
}

module.exports = {
  normalizePhone,
  validateTravelersForOffer,
  ageOn,
  VALID_TYPES
};
