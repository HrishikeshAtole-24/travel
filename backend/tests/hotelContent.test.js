const { htmlToParagraphs, mapLiteApiHotelDetails } = require('../src/assembly_line/mappers/hotelContent.mapper');

describe('htmlToParagraphs', () => {
  it('turns supplier HTML into plain paragraphs and bullets', () => {
    const html = '<p><strong>Great location</strong><br>Near the beach &amp; market</p><ul><li>Pool</li><li>Spa</li></ul>';
    expect(htmlToParagraphs(html)).toEqual(['Great location', 'Near the beach & market', '• Pool', '• Spa']);
  });

  it('strips scripts and markup so nothing executable reaches the page', () => {
    const paragraphs = htmlToParagraphs('<p>Hello<script>alert(1)</script><img src=x onerror=alert(2)></p>');
    expect(paragraphs.join(' ')).not.toMatch(/<|>|onerror/);
  });

  it('handles empty input', () => {
    expect(htmlToParagraphs(null)).toEqual([]);
    expect(htmlToParagraphs('')).toEqual([]);
  });
});

describe('mapLiteApiHotelDetails', () => {
  const raw = {
    id: 'lp1',
    name: 'Sea View Hotel',
    hotelDescription: '<p>Lovely stay</p>',
    hotelImportantInformation: 'GST applies',
    starRating: 4,
    rating: 8.7,
    reviewCount: 120,
    address: '1 Beach Rd',
    city: 'Goa',
    country: 'in',
    location: { latitude: 15.5, longitude: 73.8 },
    hotelImages: [
      { url: 'https://img/2.jpg', defaultImage: false },
      { url: 'https://img/1.jpg', urlHd: 'https://img/1-hd.jpg', caption: 'pool', defaultImage: true }
    ],
    hotelFacilities: ['Pool', 'WiFi'],
    checkinCheckoutTimes: { checkin_start: '02:00 PM', checkout: '11:00 AM' },
    rooms: [{
      id: 99,
      roomName: 'Deluxe King',
      description: '<p>Sea facing</p>',
      roomSizeSquare: 30,
      roomSizeUnit: 'sqm',
      maxOccupancy: 3,
      bedTypes: [{ quantity: 1, bedType: 'King bed' }],
      roomAmenities: [{ name: 'Minibar' }],
      photos: [{ url: 'https://img/r2.jpg', mainPhoto: false }, { url: 'https://img/r1.jpg', hd_url: 'https://img/r1-hd.jpg', mainPhoto: true }]
    }]
  };

  it('maps content, putting the default photo first', () => {
    const hotel = mapLiteApiHotelDetails(raw);
    expect(hotel).toMatchObject({
      hotelId: 'lp1', name: 'Sea View Hotel', stars: 4, rating: 8.7, countryCode: 'IN',
      description: ['Lovely stay'], importantInformation: ['GST applies'],
      facilities: ['Pool', 'WiFi'], location: { latitude: 15.5, longitude: 73.8 },
      checkIn: { from: '02:00 PM', checkout: '11:00 AM' }
    });
    expect(hotel.images[0]).toEqual({ url: 'https://img/1-hd.jpg', caption: 'pool', isDefault: true });
  });

  it('maps rooms with photos, size and beds', () => {
    const [room] = mapLiteApiHotelDetails(raw).rooms;
    expect(room).toMatchObject({
      roomId: 99, name: 'Deluxe King', description: 'Sea facing', sizeSqm: 30,
      bedTypes: ['1 × King bed'], amenities: ['Minibar'], photos: ['https://img/r1-hd.jpg', 'https://img/r2.jpg']
    });
  });
});
