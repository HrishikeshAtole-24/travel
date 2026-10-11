/**
 * Hotel Content Mapper - Supplier hotel content → standard hotel details
 * (description, photos, amenities, rooms, policies) for the hotel details page.
 */

const ENTITIES = { '&amp;': '&', '&nbsp;': ' ', '&#39;': "'", '&apos;': "'", '&quot;': '"', '&lt;': '<', '&gt;': '>' };

/**
 * Convert supplier HTML into plain-text paragraphs.
 * We never render supplier HTML directly (XSS); the frontend renders these as text.
 * @param {string} html
 * @returns {string[]} paragraphs
 */
const htmlToParagraphs = (html) => {
  if (!html) return [];
  return String(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n• ')
    .replace(/<\/\s*(p|div|li|ul|ol|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? ' ')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
};

/**
 * Map LiteAPI /data/hotel content to the standard hotel details shape
 * @param {Object} raw - LiteAPI hotel content
 * @returns {Object} Standard hotel details
 */
const mapLiteApiHotelDetails = (raw) => {
  if (!raw) return null;

  const images = (raw.hotelImages || [])
    .map(img => ({ url: img.urlHd || img.url, caption: img.caption || '', isDefault: Boolean(img.defaultImage) }))
    .filter(img => img.url)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

  const rooms = (raw.rooms || []).map(room => ({
    roomId: room.id,
    name: room.roomName,
    description: htmlToParagraphs(room.description).join(' '),
    sizeSqm: room.roomSizeUnit === 'sqm' ? room.roomSizeSquare : null,
    maxAdults: room.maxAdults ?? null,
    maxChildren: room.maxChildren ?? null,
    maxOccupancy: room.maxOccupancy ?? null,
    bedTypes: (room.bedTypes || []).map(b => `${b.quantity} × ${b.bedType}`),
    amenities: (room.roomAmenities || []).map(a => a.name).filter(Boolean),
    views: (room.views || []).map(v => v.view).filter(Boolean),
    photos: (room.photos || [])
      .sort((a, b) => Number(b.mainPhoto) - Number(a.mainPhoto))
      .map(p => p.hd_url || p.url)
      .filter(Boolean)
  }));

  return {
    hotelId: raw.id,
    name: raw.name,
    description: htmlToParagraphs(raw.hotelDescription),
    importantInformation: htmlToParagraphs(raw.hotelImportantInformation),
    stars: raw.starRating ?? null,
    rating: raw.rating ?? null,
    reviewCount: raw.reviewCount ?? null,
    hotelType: raw.hotelType || null,
    chain: raw.chain && raw.chain !== 'Not Available' ? raw.chain : null,
    address: raw.address || null,
    city: raw.city || null,
    countryCode: raw.country ? String(raw.country).toUpperCase() : null,
    zip: raw.zip || null,
    location: raw.location ? { latitude: raw.location.latitude, longitude: raw.location.longitude } : null,
    mainPhoto: raw.main_photo || images[0]?.url || null,
    images,
    facilities: (raw.hotelFacilities || []).filter(Boolean),
    checkIn: {
      from: raw.checkinCheckoutTimes?.checkin_start || null,
      until: raw.checkinCheckoutTimes?.checkin_end || null,
      checkout: raw.checkinCheckoutTimes?.checkout || null,
      instructions: (raw.checkinCheckoutTimes?.instructions || []).flatMap(htmlToParagraphs)
    },
    policies: (raw.policies || []).map(p => ({
      name: p.name || p.policy_type || 'Policy',
      description: htmlToParagraphs(p.description).join(' ')
    })),
    childAllowed: raw.childAllowed ?? null,
    petsAllowed: raw.petsAllowed ?? null,
    parking: raw.parking || null,
    rooms
  };
};

module.exports = {
  htmlToParagraphs,
  mapLiteApiHotelDetails
};
