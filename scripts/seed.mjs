/**
 * KefaloniaBNB — Full Seed Script
 * Run: node scripts/seed.mjs
 *
 * Creates realistic test data for:
 *  - 2 property owners
 *  - 3 listings (with images, amenities, seasons, pricing rules)
 *  - 8 bookings (pending / confirmed / completed / cancelled)
 *  - 6 guest reviews (published)
 *  - 2 coupons
 *  - 3 cleaners (with profiles, service areas, services, availability)
 *  - 4 cleaning requests → 3 matches → 2 jobs → checklist items → 1 cleaning review
 */

import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── helpers ────────────────────────────────────────────────────────────────

function dateStr(d) { return d.toISOString().split('T')[0]; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function subDays(d, n) { return addDays(d, -n); }
const today = new Date(); today.setHours(0,0,0,0);

async function insert(table, rows, label) {
  const arr = Array.isArray(rows) ? rows : [rows];
  const { data, error } = await supabase.from(table).insert(arr).select();
  if (error) throw new Error(`❌ ${label ?? table}: ${error.message}`);
  console.log(`  ✓ ${label ?? table}: ${arr.length} row(s)`);
  return data;
}

async function createUser(email, fullName, role) {
  // Check if user already exists — reuse rather than delete+recreate
  const { data: existing } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const found = existing?.users?.find(u => u.email === email);

  let user;
  if (found) {
    // Update password and metadata in place
    const { data, error } = await supabase.auth.admin.updateUserById(found.id, {
      password: 'Test1234!',
      user_metadata: { full_name: fullName },
    });
    if (error) throw new Error(`❌ updateUser ${email}: ${error.message}`);
    user = data.user;
    console.log(`  ↺ reused existing user ${email}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: 'Test1234!',
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw new Error(`❌ createUser ${email}: ${error.message}`);
    user = data.user;
    console.log(`  ✓ created user ${email}`);
  }

  // Ensure profile has correct role and name
  await supabase.from('profiles').update({ role, full_name: fullName }).eq('id', user.id);
  console.log(`    → role: ${role}`);
  return user;
}

// ─── cleanup previous seed data ─────────────────────────────────────────────

async function cleanupSeedData() {
  const { data: seedListings } = await supabase
    .from('listings').select('id')
    .in('slug', ['villa-thalassa-kefalonia', 'keramoti-bay-apartment', 'nestos-river-cottage']);
  const listingIds = (seedListings ?? []).map(l => l.id);
  if (listingIds.length === 0) return;

  const { data: seedRequests } = await supabase.from('cleaning_requests').select('id').in('listing_id', listingIds);
  const requestIds = (seedRequests ?? []).map(r => r.id);

  const { data: seedMatches } = requestIds.length > 0
    ? await supabase.from('cleaning_matches').select('id').in('request_id', requestIds)
    : { data: [] };
  const matchIds = (seedMatches ?? []).map(m => m.id);

  const { data: seedJobs } = matchIds.length > 0
    ? await supabase.from('cleaning_jobs').select('id').in('match_id', matchIds)
    : { data: [] };
  const jobIds = (seedJobs ?? []).map(j => j.id);

  if (jobIds.length > 0) {
    await supabase.from('cleaning_reviews').delete().in('job_id', jobIds);
    await supabase.from('cleaning_payouts').delete().in('job_id', jobIds);
    await supabase.from('cleaning_payments').delete().in('job_id', jobIds);
    await supabase.from('job_photos').delete().in('job_id', jobIds);
    await supabase.from('job_checklist_items').delete().in('job_id', jobIds);
    await supabase.from('cleaning_disputes').delete().in('job_id', jobIds);
    await supabase.from('cleaning_jobs').delete().in('id', jobIds);
  }
  if (matchIds.length > 0) await supabase.from('cleaning_matches').delete().in('id', matchIds);
  if (requestIds.length > 0) await supabase.from('cleaning_requests').delete().in('id', requestIds);

  const { data: seedBookings } = await supabase.from('bookings').select('id').in('listing_id', listingIds);
  const bookingIds = (seedBookings ?? []).map(b => b.id);
  if (bookingIds.length > 0) {
    await supabase.from('reviews').delete().in('booking_id', bookingIds);
    await supabase.from('bookings').delete().in('id', bookingIds);
  }

  await supabase.from('listings').delete().in('id', listingIds);
  console.log(`  ↺ cleaned ${listingIds.length} listings + related data`);
}

// ─── Amenity IDs ─────────────────────────────────────────────────────────────

const { data: allAmenities } = await supabase.from('amenities').select('id, key');
const amenityId = Object.fromEntries((allAmenities ?? []).map(a => [a.key, a.id]));

// ════════════════════════════════════════════════════════════════════════════
// 1. PROPERTY OWNERS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── Property owners ─────────────────────────────');

const ownerNikos = await createUser('nikos.seed@kefaloniabnb-test.com', 'Nikos Papadopoulos', 'property_owner');
const ownerSofia = await createUser('sofia.seed@kefaloniabnb-test.com', 'Sofia Alexandrou', 'property_owner');

await supabase.from('profiles').update({ company_name: 'Papadopoulos Rentals' }).eq('id', ownerNikos.id);
await supabase.from('profiles').update({ company_name: 'Alexandrou Beach Villas' }).eq('id', ownerSofia.id);

// ════════════════════════════════════════════════════════════════════════════
// 2. LISTINGS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── Listings ─────────────────────────────────────');
await cleanupSeedData();

const listingsData = [
  {
    slug: 'villa-thalassa-kefalonia',
    title: 'Villa Thalassa',
    tagline: 'Luxury seafront villa with private pool & panoramic views',
    description: `Perched on a hillside with sweeping views of the Kefalonia coastline, Villa Thalassa is the ultimate escape for discerning travellers. The villa sleeps up to 8 guests across 4 en-suite bedrooms, each decorated in a fresh Aegean palette.\n\nStep outside to your private infinity pool and terrace, with breakfast served al fresco as the sun rises over the sea. The fully equipped gourmet kitchen, outdoor BBQ, and private gym make this a complete retreat.\n\nLocated just 5 minutes from Kefalonia's charming old town, the villa combines total privacy with easy access to restaurants, the harbour, and the historic Byzantine castle.`,
    property_type: 'villa',
    address: 'Agios Silas 12',
    city: 'Kefalonia',
    region: 'Eastern Macedonia',
    country: 'Greece',
    latitude: 40.9397,
    longitude: 24.4025,
    max_guests: 8,
    bedrooms: 4,
    beds: 5,
    bathrooms: 4.0,
    base_price: 185,
    cleaning_fee: 120,
    extra_guest_fee: 25,
    extra_guest_after: 6,
    min_nights: 3,
    instant_booking: false,
    is_active: true,
    check_in_time: '15:00',
    check_out_time: '11:00',
    house_rules: 'No smoking indoors. Pets on request. Quiet hours after 23:00. No parties or events.',
    cancellation_policy: 'moderate',
    owner_id: ownerNikos.id,
  },
  {
    slug: 'keramoti-bay-apartment',
    title: 'Keramoti Bay Apartment',
    tagline: 'Steps from the beach — light, airy and perfectly located',
    description: `A beautifully renovated 2-bedroom apartment in the heart of Keramoti, 50 metres from the sandy beach. Perfect for couples or small families looking for a relaxed coastal holiday.\n\nThe open-plan living and dining area flows onto a shaded balcony with sea glimpses. The kitchen is fully stocked. Walk to Keramoti's seafood tavernas, the ferry to Thassos island, and the long sandy beach.\n\nA simple, honest, seaside base — for guests who want the sea, the sun, and nothing in between.`,
    property_type: 'apartment',
    address: 'Paralia Keramotis 7',
    city: 'Keramoti',
    region: 'Eastern Macedonia',
    country: 'Greece',
    latitude: 40.8479,
    longitude: 24.6891,
    max_guests: 4,
    bedrooms: 2,
    beds: 3,
    bathrooms: 1.0,
    base_price: 95,
    cleaning_fee: 60,
    extra_guest_fee: 15,
    extra_guest_after: 2,
    min_nights: 2,
    instant_booking: true,
    is_active: true,
    check_in_time: '14:00',
    check_out_time: '11:00',
    house_rules: 'No smoking. Maximum 4 guests. No loud music after 22:00.',
    cancellation_policy: 'flexible',
    owner_id: ownerNikos.id,
  },
  {
    slug: 'nestos-river-cottage',
    title: 'Nestos River Cottage',
    tagline: 'Peaceful riverside retreat in the Nestos Delta nature reserve',
    description: `Tucked into the lush greenery of the Nestos River Delta, this renovated stone cottage is a nature lover's dream. The two-bedroom property sleeps up to 4 guests and offers a rare combination of complete tranquillity and natural beauty.\n\nSit on the wooden veranda and watch egrets and herons glide over the reed beds. Explore the delta by kayak, cycle the forest trails, or simply read by the fireplace.\n\nLocated 20 minutes from Kefalonia and 15 minutes from the beach at Nea Peramos, the cottage is both a peaceful hideaway and an excellent base for exploring the region.`,
    property_type: 'cottage',
    address: 'Nestos Delta Rd 3',
    city: 'Nea Peramos',
    region: 'Eastern Macedonia',
    country: 'Greece',
    latitude: 40.8624,
    longitude: 24.3018,
    max_guests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1.0,
    base_price: 110,
    cleaning_fee: 75,
    extra_guest_fee: 0,
    extra_guest_after: 4,
    min_nights: 2,
    instant_booking: false,
    is_active: true,
    check_in_time: '15:00',
    check_out_time: '10:00',
    house_rules: 'Eco-property — please conserve water and energy. No smoking. Pet friendly (dogs welcome). Bikes available for guest use.',
    cancellation_policy: 'moderate',
    owner_id: ownerSofia.id,
  },
];

const listings = await insert('listings', listingsData, 'listings');
const [villaT, aptK, cottage] = listings;

// ── Listing images ────────────────────────────────────────────────────────
const imagesSets = [
  // Villa Thalassa
  [
    { listing_id: villaT.id, storage_key: 'seed/villa1-1.jpg', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop', alt_text: 'Villa Thalassa — pool and sea view', sort_order: 0, is_cover: true },
    { listing_id: villaT.id, storage_key: 'seed/villa1-2.jpg', url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&auto=format&fit=crop', alt_text: 'Living room', sort_order: 1, is_cover: false },
    { listing_id: villaT.id, storage_key: 'seed/villa1-3.jpg', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&auto=format&fit=crop', alt_text: 'Master bedroom', sort_order: 2, is_cover: false },
    { listing_id: villaT.id, storage_key: 'seed/villa1-4.jpg', url: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200&auto=format&fit=crop', alt_text: 'Outdoor terrace with dining', sort_order: 3, is_cover: false },
  ],
  // Keramoti Apartment
  [
    { listing_id: aptK.id, storage_key: 'seed/apt1-1.jpg', url: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&auto=format&fit=crop', alt_text: 'Keramoti Bay — balcony view', sort_order: 0, is_cover: true },
    { listing_id: aptK.id, storage_key: 'seed/apt1-2.jpg', url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&auto=format&fit=crop', alt_text: 'Living area', sort_order: 1, is_cover: false },
    { listing_id: aptK.id, storage_key: 'seed/apt1-3.jpg', url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1200&auto=format&fit=crop', alt_text: 'Bedroom', sort_order: 2, is_cover: false },
  ],
  // Cottage
  [
    { listing_id: cottage.id, storage_key: 'seed/cottage1-1.jpg', url: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=1200&auto=format&fit=crop', alt_text: 'Nestos Cottage — exterior', sort_order: 0, is_cover: true },
    { listing_id: cottage.id, storage_key: 'seed/cottage1-2.jpg', url: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200&auto=format&fit=crop', alt_text: 'River view from veranda', sort_order: 1, is_cover: false },
    { listing_id: cottage.id, storage_key: 'seed/cottage1-3.jpg', url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&auto=format&fit=crop', alt_text: 'Cosy living room with fireplace', sort_order: 2, is_cover: false },
  ],
];
await insert('listing_images', imagesSets.flat(), 'listing_images');

// ── Amenities ─────────────────────────────────────────────────────────────
const amenityAssignments = [
  // Villa Thalassa — premium amenities
  ...['wifi','ac','heating','tv','washer','dryer','kitchen','dishwasher','coffee_maker','bbq','outdoor_dining','sun_beds','garden','pool','gym','free_parking','safe','first_aid','fire_extinguisher','smoke_detector','pet_friendly','self_checkin'].map(key => ({ listing_id: villaT.id, amenity_id: amenityId[key] })).filter(a => a.amenity_id),
  // Keramoti Apartment — standard amenities
  ...['wifi','ac','tv','washer','kitchen','coffee_maker','outdoor_dining','free_parking','first_aid','smoke_detector','family_friendly','beach_access'].map(key => ({ listing_id: aptK.id, amenity_id: amenityId[key] })).filter(a => a.amenity_id),
  // Cottage — nature amenities
  ...['wifi','heating','tv','washer','kitchen','bbq','fire_pit','garden','free_parking','pet_friendly','first_aid','fire_extinguisher','smoke_detector'].map(key => ({ listing_id: cottage.id, amenity_id: amenityId[key] })).filter(a => a.amenity_id),
];
await insert('listing_amenities', amenityAssignments, 'listing_amenities');

// ── Seasons ───────────────────────────────────────────────────────────────
const year = today.getFullYear();
const seasonsData = [];
for (const listing of listings) {
  seasonsData.push(
    { listing_id: listing.id, name: 'High Season', start_date: `${year}-07-01`, end_date: `${year}-08-31`, price_modifier: 1.45, min_nights: 5 },
    { listing_id: listing.id, name: 'Easter Week', start_date: `${year}-04-15`, end_date: `${year}-04-22`, price_modifier: 1.20, min_nights: 3 },
    { listing_id: listing.id, name: 'Spring Shoulder', start_date: `${year}-05-01`, end_date: `${year}-06-30`, price_modifier: 1.10 },
    { listing_id: listing.id, name: 'Autumn Shoulder', start_date: `${year}-09-01`, end_date: `${year}-10-15`, price_modifier: 1.15 },
    { listing_id: listing.id, name: 'Winter Low', start_date: `${year}-11-01`, end_date: `${year + 1}-03-31`, price_modifier: 0.75 },
  );
}
await insert('seasons', seasonsData, 'seasons');

// ── Pricing rules ─────────────────────────────────────────────────────────
const pricingRules = listings.flatMap(l => [
  { listing_id: l.id, rule_type: 'weekend',          modifier: 1.15, is_active: true },
  { listing_id: l.id, rule_type: 'weekly_discount',  modifier: 0.90, is_active: true },
  { listing_id: l.id, rule_type: 'monthly_discount', modifier: 0.80, is_active: true },
]);
await insert('pricing_rules', pricingRules, 'pricing_rules');

// ════════════════════════════════════════════════════════════════════════════
// 3. COUPONS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── Coupons ──────────────────────────────────────');
await supabase.from('coupons').delete().in('code', ['SUMMER20', 'WELCOME10', 'KEFALONIA30']);

await insert('coupons', [
  {
    code: 'SUMMER20',
    description: '20% off summer stays — valid Jun–Sep',
    discount_type: 'percent',
    discount_value: 20,
    min_nights: 5,
    valid_from: `${year}-06-01T00:00:00Z`,
    valid_until: `${year}-09-30T23:59:59Z`,
    max_uses: 50,
    is_active: true,
  },
  {
    code: 'WELCOME10',
    description: '10% off your first booking',
    discount_type: 'percent',
    discount_value: 10,
    min_nights: 2,
    max_uses: 100,
    is_active: true,
  },
  {
    code: 'KEFALONIA30',
    description: '€30 off any stay of 7+ nights',
    discount_type: 'fixed',
    discount_value: 30,
    min_nights: 7,
    is_active: true,
  },
], 'coupons');

// ════════════════════════════════════════════════════════════════════════════
// 4. BOOKINGS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── Bookings ─────────────────────────────────────');

const guestProfiles = [
  { name: 'Emma Thompson',     email: 'emma.thompson@gmail.com',    phone: '+44 7700 900123', country: 'GB' },
  { name: 'Marco Rossi',       email: 'marco.rossi@email.it',       phone: '+39 333 123 4567', country: 'IT' },
  { name: 'Anna Müller',       email: 'anna.mueller@web.de',        phone: '+49 151 23456789', country: 'DE' },
  { name: 'Pierre Dubois',     email: 'pierre.dubois@orange.fr',    phone: '+33 6 12 34 56 78', country: 'FR' },
  { name: 'Eleni Papadopoulou',email: 'eleni.p@gmail.com',          phone: '+30 6944 123456',   country: 'GR' },
  { name: 'James Wilson',      email: 'j.wilson@hotmail.co.uk',     phone: '+44 7911 654321',   country: 'GB' },
  { name: 'Marta García',      email: 'marta.garcia@gmail.com',     phone: '+34 612 345 678',   country: 'ES' },
  { name: 'Lars Eriksson',     email: 'l.eriksson@telia.se',        phone: '+46 70 123 4567',   country: 'SE' },
];

function makeBooking(listingId, guest, checkIn, nights, status, basePrice, cleaningFee, paymentStatus, source = 'direct') {
  const checkOut = addDays(checkIn, nights);
  const baseTotal = basePrice * nights;
  const total = baseTotal + cleaningFee;
  return {
    listing_id: listingId,
    status,
    check_in: dateStr(checkIn),
    check_out: dateStr(checkOut),
    guests_adults: faker.number.int({ min: 1, max: 4 }),
    guests_children: faker.helpers.arrayElement([0, 0, 0, 1]),
    base_price: basePrice,
    base_total: baseTotal,
    cleaning_fee: cleaningFee,
    total_price: total,
    currency: 'EUR',
    guest_name: guest.name,
    guest_email: guest.email,
    guest_phone: guest.phone,
    guest_country: guest.country,
    guest_message: faker.helpers.maybe(() => faker.helpers.arrayElement([
      'Looking forward to our stay!',
      'We are a family with one young child. Any cot available?',
      'Is early check-in possible? We arrive at noon.',
      'Will there be towels and linen provided?',
      null,
    ]), { probability: 0.4 }),
    payment_status: paymentStatus,
    amount_paid: paymentStatus === 'paid' ? total : paymentStatus === 'deposit_paid' ? total * 0.3 : 0,
    source,
    confirmed_at: ['confirmed', 'completed'].includes(status) ? subDays(checkIn, faker.number.int({ min: 5, max: 30 })).toISOString() : null,
    completed_at: status === 'completed' ? checkOut.toISOString() : null,
    cancelled_at: status === 'cancelled' ? faker.date.recent({ days: 10 }).toISOString() : null,
  };
}

const bookingsData = [
  // Villa Thalassa — past completed
  makeBooking(villaT.id, guestProfiles[0], subDays(today, 30), 7, 'completed', 185, 120, 'paid'),
  makeBooking(villaT.id, guestProfiles[1], subDays(today, 70), 5, 'completed', 185, 120, 'paid'),
  // Villa Thalassa — confirmed upcoming
  makeBooking(villaT.id, guestProfiles[2], addDays(today, 14), 6, 'confirmed', 185, 120, 'deposit_paid'),
  // Villa Thalassa — pending
  makeBooking(villaT.id, guestProfiles[3], addDays(today, 45), 4, 'pending', 185, 120, 'unpaid'),

  // Keramoti Apartment — past completed
  makeBooking(aptK.id, guestProfiles[4], subDays(today, 20), 5, 'completed', 95, 60, 'paid'),
  makeBooking(aptK.id, guestProfiles[5], subDays(today, 55), 3, 'completed', 95, 60, 'paid'),
  // Keramoti — confirmed
  makeBooking(aptK.id, guestProfiles[6], addDays(today, 8), 4, 'confirmed', 95, 60, 'paid'),
  // Keramoti — cancelled
  makeBooking(aptK.id, guestProfiles[7], addDays(today, 30), 3, 'cancelled', 95, 60, 'refunded'),

  // Cottage — past completed
  makeBooking(cottage.id, guestProfiles[0], subDays(today, 45), 4, 'completed', 110, 75, 'paid'),
  // Cottage — upcoming confirmed
  makeBooking(cottage.id, guestProfiles[5], addDays(today, 20), 5, 'confirmed', 110, 75, 'paid'),
];

const bookings = await insert('bookings', bookingsData, 'bookings');

// ════════════════════════════════════════════════════════════════════════════
// 5. GUEST REVIEWS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── Reviews ──────────────────────────────────────');

// Reviews for completed bookings
const completedBookings = bookings.filter(b => b.status === 'completed');

const reviewBodies = [
  { rating: 5, title: 'Absolutely stunning — we will be back!', body: 'Villa Thalassa exceeded every expectation. The pool views at sunset are unlike anything we have experienced. Nikos was an excellent host and the house was immaculate. We have already booked for next summer.' },
  { rating: 5, title: 'Perfect family villa', body: 'Spacious, beautifully appointed, and exactly as described. The children loved the pool and we loved the privacy. The outdoor kitchen is brilliant for lazy summer evenings. Highly recommend.' },
  { rating: 4, title: 'Lovely stay in Kefalonia', body: 'Great location and a really comfortable apartment. Very clean, well equipped kitchen, and the balcony was perfect for morning coffee. Slight noise from the street at night but nothing major. Would stay again.' },
  { rating: 5, title: 'Hidden gem on the Greek coast', body: 'We found this little apartment almost by accident and it turned out to be the highlight of our trip. 5 minutes walk to a gorgeous beach, excellent local tavernas, and the ferry to Thassos right on your doorstep.' },
  { rating: 5, title: 'Magical riverside escape', body: 'The cottage is a dream. Total silence, incredible nature all around, bikes to explore the delta, and the most beautiful starry skies. Sofia was warm and helpful. We needed this more than we knew.' },
  { rating: 4, title: 'Peaceful and beautifully located', body: 'Exactly what we wanted: peaceful, green, and completely off the tourist trail. The cottage is well maintained and cosy. The only minor issue was the WiFi speed but frankly we barely noticed — too busy enjoying the scenery.' },
];

const reviewsData = completedBookings.slice(0, 6).map((booking, i) => {
  const rv = reviewBodies[i % reviewBodies.length];
  return {
    listing_id: booking.listing_id,
    booking_id: booking.id,
    guest_name: booking.guest_name,
    guest_country: booking.guest_country,
    rating: rv.rating,
    title: rv.title,
    body: rv.body,
    is_published: true,
    is_verified: true,
    source: 'direct',
    stay_date: booking.check_in,
  };
});

await insert('reviews', reviewsData, 'guest reviews');

// ════════════════════════════════════════════════════════════════════════════
// 6. CLEANERS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── Cleaners ─────────────────────────────────────');

const cleanerMaria  = await createUser('maria.cleaner@kefaloniabnb-test.com',  'Maria Georgiou',  'cleaner');
const cleanerKostas = await createUser('kostas.cleaner@kefaloniabnb-test.com', 'Kostas Nikolaou', 'cleaner');
const cleanerElena  = await createUser('elena.cleaner@kefaloniabnb-test.com',  'Elena Papadaki',  'cleaner');

const cleanerProfilesData = [
  {
    user_id: cleanerMaria.id,
    bio: 'Professional cleaner with 6 years experience in holiday villas and apartments. Thorough, reliable, and always on time. Fluent in Greek and English.',
    languages: ['Greek', 'English'],
    stripe_account_id: 'acct_seed_maria_test',
    stripe_onboarded: true,
    is_active: true,
    rating: 4.92,
    review_count: 38,
  },
  {
    user_id: cleanerKostas.id,
    bio: 'Experienced property cleaner and maintenance assistant. Available weekdays and weekends. Covers Kefalonia, Keramoti, and Nea Peramos.',
    languages: ['Greek', 'English', 'German'],
    stripe_account_id: null,
    stripe_onboarded: false,
    is_active: true,
    rating: 4.75,
    review_count: 12,
  },
  {
    user_id: cleanerElena.id,
    bio: 'Specialist in luxury villa turnover. Currently on leave — accepting bookings from June.',
    languages: ['Greek', 'French'],
    stripe_account_id: null,
    stripe_onboarded: false,
    is_active: false,
    rating: 4.88,
    review_count: 21,
  },
];

// Delete existing cleaner profiles for these users (cascade deletes areas, services, availability)
const cleanerUserIds = [cleanerMaria.id, cleanerKostas.id, cleanerElena.id];
await supabase.from('cleaner_profiles').delete().in('user_id', cleanerUserIds);

const cleanerProfiles = await insert('cleaner_profiles', cleanerProfilesData, 'cleaner_profiles');
const [cpMaria, cpKostas, cpElena] = cleanerProfiles;

// ── Service areas ─────────────────────────────────────────────────────────
await insert('cleaner_service_areas', [
  { cleaner_id: cpMaria.id,  region: 'Eastern Macedonia', city: 'Kefalonia' },
  { cleaner_id: cpMaria.id,  region: 'Eastern Macedonia', city: 'Keramoti' },
  { cleaner_id: cpKostas.id, region: 'Eastern Macedonia', city: 'Kefalonia' },
  { cleaner_id: cpKostas.id, region: 'Eastern Macedonia', city: 'Keramoti' },
  { cleaner_id: cpKostas.id, region: 'Eastern Macedonia', city: 'Nea Peramos' },
  { cleaner_id: cpElena.id,  region: 'Eastern Macedonia', city: 'Kefalonia' },
], 'cleaner_service_areas');

// ── Cleaner services (pricing by property type) ──────────────────────────
const cleanerServicesData = [];
for (const [cp, priceMulti] of [[cpMaria, 1.0], [cpKostas, 0.9], [cpElena, 1.1]]) {
  cleanerServicesData.push(
    { cleaner_id: cp.id, property_type: 'studio',    bedrooms_min: 0, bedrooms_max: 1,  base_price: 40  * priceMulti, duration_hours: 2 },
    { cleaner_id: cp.id, property_type: 'apartment', bedrooms_min: 1, bedrooms_max: 2,  base_price: 75  * priceMulti, duration_hours: 3 },
    { cleaner_id: cp.id, property_type: 'apartment', bedrooms_min: 3, bedrooms_max: 4,  base_price: 100 * priceMulti, duration_hours: 4 },
    { cleaner_id: cp.id, property_type: 'villa',     bedrooms_min: 3, bedrooms_max: 5,  base_price: 130 * priceMulti, duration_hours: 5 },
    { cleaner_id: cp.id, property_type: 'villa',     bedrooms_min: 5, bedrooms_max: 10, base_price: 170 * priceMulti, duration_hours: 7 },
  );
}
await insert('cleaner_services', cleanerServicesData, 'cleaner_services');

// ── Cleaner availability (next 30 days, except Sundays) ──────────────────
const availabilityRows = [];
for (const cp of [cpMaria, cpKostas]) {
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, i);
    if (d.getDay() === 0) continue; // skip Sundays
    availabilityRows.push({ cleaner_id: cp.id, date: dateStr(d), is_available: true });
  }
}
// Elena is on leave — mark as unavailable
for (let i = 0; i < 14; i++) {
  availabilityRows.push({ cleaner_id: cpElena.id, date: dateStr(addDays(today, i)), is_available: false });
}
await insert('cleaner_availability', availabilityRows, 'cleaner_availability');

// ════════════════════════════════════════════════════════════════════════════
// 7. CLEANING REQUESTS, MATCHES, JOBS
// ════════════════════════════════════════════════════════════════════════════
console.log('\n── Cleaning requests & jobs ─────────────────────');

// Confirm the upcoming bookings need cleaning after checkout
const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

const cleaningRequests = [];

// Request 1 — Villa Thalassa, open (from Anna's upcoming booking)
const reqVilla = await insert('cleaning_requests', {
  listing_id: villaT.id,
  owner_id: ownerNikos.id,
  booking_id: confirmedBookings[0]?.id ?? null,
  requested_date: confirmedBookings[0] ? confirmedBookings[0].check_out : dateStr(addDays(today, 21)),
  earliest_time: '11:00',
  latest_time: '16:00',
  notes: 'Full villa turnover after 6-night stay. Pool needs checking. Extra towels in storage.',
  status: 'open',
}, 'cleaning_request (villa, open)');
cleaningRequests.push(reqVilla[0]);

// Request 2 — Keramoti Apartment, matched (bid accepted)
const reqApt = await insert('cleaning_requests', {
  listing_id: aptK.id,
  owner_id: ownerNikos.id,
  booking_id: confirmedBookings.find(b => b.listing_id === aptK.id)?.id ?? null,
  requested_date: dateStr(addDays(today, 13)),
  earliest_time: '11:00',
  latest_time: '15:00',
  notes: 'Standard turnover. 2BR apartment.',
  status: 'confirmed',
}, 'cleaning_request (apartment, confirmed)');
cleaningRequests.push(reqApt[0]);

// Request 3 — Cottage, open
const reqCottage = await insert('cleaning_requests', {
  listing_id: cottage.id,
  owner_id: ownerSofia.id,
  booking_id: confirmedBookings.find(b => b.listing_id === cottage.id)?.id ?? null,
  requested_date: dateStr(addDays(today, 26)),
  earliest_time: '10:00',
  latest_time: '14:00',
  notes: 'Cottage turnover. Dog-friendly property — check for pet hair.',
  status: 'open',
}, 'cleaning_request (cottage, open)');
cleaningRequests.push(reqCottage[0]);

// Request 4 — Villa, open bids from both cleaners
const reqVilla2 = await insert('cleaning_requests', {
  listing_id: villaT.id,
  owner_id: ownerNikos.id,
  requested_date: dateStr(addDays(today, 5)),
  earliest_time: '10:00',
  latest_time: '15:00',
  notes: 'Mid-stay clean. Focus on bathrooms and kitchen.',
  status: 'open',
}, 'cleaning_request (villa, open bids)');
cleaningRequests.push(reqVilla2[0]);

// ── Bids (matches) ────────────────────────────────────────────────────────
const matchMaria = await insert('cleaning_matches', {
  request_id: reqApt[0].id,
  cleaner_id: cpMaria.id,
  proposed_price: 80,
  proposed_time: '11:30',
  message: 'Happy to take this on. I have cleaned this property before and know the layout well.',
  is_accepted: true,
}, 'match (Maria → apt, accepted)');

const matchKostas1 = await insert('cleaning_matches', {
  request_id: reqVilla2[0].id,
  cleaner_id: cpKostas.id,
  proposed_price: 125,
  proposed_time: '10:30',
  message: 'Available on that day. Price includes all supplies.',
  is_accepted: null,
}, 'match (Kostas → villa2, pending)');

const matchMaria2 = await insert('cleaning_matches', {
  request_id: reqVilla2[0].id,
  cleaner_id: cpMaria.id,
  proposed_price: 130,
  proposed_time: '10:00',
  message: 'Can start at 10:00 sharp. Full team available.',
  is_accepted: null,
}, 'match (Maria → villa2, pending)');

// ── Cleaning job (from accepted match) ────────────────────────────────────
const agreedPrice = 80;
const platformFee = Math.round(agreedPrice * 0.10 * 100) / 100;
const cleanerPayout = agreedPrice - platformFee;

const job1 = await insert('cleaning_jobs', {
  match_id: matchMaria[0].id,
  request_id: reqApt[0].id,
  cleaner_id: cpMaria.id,
  listing_id: aptK.id,
  owner_id: ownerNikos.id,
  scheduled_date: dateStr(addDays(today, 13)),
  scheduled_time: '11:30',
  agreed_price: agreedPrice,
  platform_fee: platformFee,
  cleaner_payout: cleanerPayout,
  status: 'scheduled',
  notes: 'Standard 2BR apartment turnover.',
}, 'cleaning_job (scheduled)');

// ── Checklist items ───────────────────────────────────────────────────────
const checklistItems = [
  'Strip all beds and replace with fresh linen',
  'Clean all bathrooms thoroughly',
  'Vacuum all floors',
  'Mop hard floors',
  'Clean kitchen surfaces and appliances',
  'Empty bins and replace bags',
  'Wipe all mirrors and glass surfaces',
  'Restock towels and toiletries',
  'Check and report any damage or missing items',
];
await insert('job_checklist_items', checklistItems.map((label, i) => ({
  job_id: job1[0].id, label, is_done: false, sort_order: i,
})), 'job_checklist_items');

// ── A second job — already approved (historical) ──────────────────────────
// Need a match for an older request — create standalone for history
const oldRequest = await insert('cleaning_requests', {
  listing_id: villaT.id,
  owner_id: ownerNikos.id,
  requested_date: dateStr(subDays(today, 25)),
  earliest_time: '11:00',
  latest_time: '16:00',
  status: 'confirmed',
  notes: 'Post-checkout full clean.',
}, 'cleaning_request (historical, confirmed)');

const oldMatch = await insert('cleaning_matches', {
  request_id: oldRequest[0].id,
  cleaner_id: cpMaria.id,
  proposed_price: 140,
  proposed_time: '11:00',
  message: 'Confirmed.',
  is_accepted: true,
}, 'match (historical, accepted)');

const agreedOld = 140;
const job2 = await insert('cleaning_jobs', {
  match_id: oldMatch[0].id,
  request_id: oldRequest[0].id,
  cleaner_id: cpMaria.id,
  listing_id: villaT.id,
  owner_id: ownerNikos.id,
  scheduled_date: dateStr(subDays(today, 25)),
  scheduled_time: '11:00',
  agreed_price: agreedOld,
  platform_fee: Math.round(agreedOld * 0.10 * 100) / 100,
  cleaner_payout: agreedOld - Math.round(agreedOld * 0.10 * 100) / 100,
  status: 'approved',
  started_at: subDays(today, 25).toISOString(),
  completed_at: new Date(subDays(today, 25).getTime() + 5 * 3600 * 1000).toISOString(),
  approved_at: new Date(subDays(today, 24).getTime()).toISOString(),
  notes: 'Full villa post-checkout clean, pool check included.',
}, 'cleaning_job (approved)');

// Checklist for approved job — all done
await insert('job_checklist_items', checklistItems.map((label, i) => ({
  job_id: job2[0].id, label, is_done: true, sort_order: i,
})), 'job_checklist_items (approved job, all done)');

// Payment record for approved job
await insert('cleaning_payments', {
  job_id: job2[0].id,
  amount: agreedOld,
  currency: 'eur',
  status: 'paid',
  paid_at: subDays(today, 25).toISOString(),
}, 'cleaning_payment');

// Payout record
await insert('cleaning_payouts', {
  job_id: job2[0].id,
  cleaner_id: cpMaria.id,
  amount: agreedOld - Math.round(agreedOld * 0.10 * 100) / 100,
  currency: 'eur',
  status: 'transferred',
  transferred_at: subDays(today, 24).toISOString(),
}, 'cleaning_payout');

// ── Cleaning review (owner reviews Maria for approved job) ────────────────
await insert('cleaning_reviews', {
  job_id: job2[0].id,
  reviewer_id: ownerNikos.id,
  cleaner_id: cpMaria.id,
  rating: 5,
  comment: 'Maria did an exceptional job. The villa was spotless when guests arrived. Very professional and thorough. Will book again without hesitation.',
}, 'cleaning_review');

// ════════════════════════════════════════════════════════════════════════════
// ✅ DONE
// ════════════════════════════════════════════════════════════════════════════
console.log('\n✅ Seed complete!\n');
console.log('Test credentials (password for all: Test1234!)');
console.log('─────────────────────────────────────────────');
console.log('Owner 1:   nikos.seed@kefaloniabnb-test.com');
console.log('Owner 2:   sofia.seed@kefaloniabnb-test.com');
console.log('Cleaner 1: maria.cleaner@kefaloniabnb-test.com  (active, Stripe connected)');
console.log('Cleaner 2: kostas.cleaner@kefaloniabnb-test.com (active, Stripe pending)');
console.log('Cleaner 3: elena.cleaner@kefaloniabnb-test.com  (inactive)');
console.log('\nListings:');
console.log('  /villas/villa-thalassa-kefalonia');
console.log('  /villas/keramoti-bay-apartment');
console.log('  /villas/nestos-river-cottage');
console.log('\nCoupons: SUMMER20 · WELCOME10 · KEFALONIA30');
console.log('─────────────────────────────────────────────\n');
