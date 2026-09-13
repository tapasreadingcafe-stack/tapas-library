/* The cafe's real-world details — one source for every public surface.
 *
 * These were literals inside SiteFooter, which meant any new page wanting the
 * address had to either copy them or read `contact_info` from the CMS. The
 * second option is a trap: that table is still carrying the demo seed row from
 * the original migration (a Massachusetts address and a US phone number), so a
 * page trusting it would publish the wrong address to customers. Until someone
 * fills that table in with the real thing, these are the facts.
 */

export const CAFE_NAME = 'Tapas Reading Cafe';

export const CAFE_ADDRESS =
  '2nd Floor, 2628, 27th Main Rd, above Juice Junction, 1st Sector, HSR Layout, Bengaluru, Karnataka 560102';

export const CAFE_PHONES = [
  { label: '+91 77603 93951', tel: '+917760393951' },
  { label: '+91 87924 70576', tel: '+918792470576' },
];

export const CAFE_EMAIL = 'tapasreadingcafe@gmail.com';

export const CAFE_HANDLE = 'tapasreadingcafe';
export const CAFE_TAGLINE = 'Read. Sip. Discover Your Neighbourhood Reading Cafe';
export const CAFE_FOUNDER = '@sunitad';

/* Opening hours. 10am to 8pm, closed Mondays.
 *
 * Here rather than read from the CMS `hours` table for the same reason the
 * address is: that table still holds the demo seed row, and the live badge was
 * telling customers the cafe was open until 9pm. null means closed that day.
 */
export const CAFE_HOURS = {
  Mon: null,
  Tue: { open: '10:00', close: '20:00' },
  Wed: { open: '10:00', close: '20:00' },
  Thu: { open: '10:00', close: '20:00' },
  Fri: { open: '10:00', close: '20:00' },
  Sat: { open: '10:00', close: '20:00' },
  Sun: { open: '10:00', close: '20:00' },
};

// Exact place coordinates, read off the Google Maps place link. Embedding by
// address text geocodes loosely — it was dropping the map near the neighbouring
// shops with no pin on the cafe at all. Coordinates put the pin on the door.
export const CAFE_COORDS = { lat: 12.915047, lng: 77.6517005 };

export const CAFE_LINKS = {
  instagram: 'https://www.instagram.com/tapasreadingcafe/',
  whatsapp:  'https://wa.me/918792470576',
  // The community group is a different destination from a direct chat — one is
  // "talk to the cafe", the other is "join the readers".
  whatsappCommunity: 'https://chat.whatsapp.com/LuMKiQrCWKA5MYuPGSxqkc',
  maps:      'https://maps.app.goo.gl/i24rAtukZxwuL1Uk9',
  youtube:   'https://www.youtube.com/@TapasReadingCafe',
};
