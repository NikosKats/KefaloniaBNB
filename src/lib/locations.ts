// ============================================================
// KefaloniaBNB — Master Location Config
// Used for: SEO pages, search filters, property categorization
// ============================================================

export type Region = 'kefalonia' | 'ithaca';
export type LocationType = 'city' | 'district' | 'beach' | 'village' | 'area' | 'island' | 'hub';
export type DemandLevel = 'high' | 'medium' | 'emerging';

export interface Location {
  slug: string;
  name: string;
  region: Region;
  type: LocationType;
  demand: DemandLevel;
  bestFor: string[];
  tags: string[];
  description: string;
  seoTitle: string;
  seoDescription: string;
  /** How to filter listings from the DB for this location */
  filter: {
    city?: string;
    cities?: string[];
    region?: string;
    area?: string;
  };
  latitude?: number;
  longitude?: number;
  /** Show on the locations hub page as a featured destination */
  featured?: boolean;
}

// ── KEFALONIA ISLAND ─────────────────────────────────────────────────────────────

export const KEFALONIA_LOCATIONS: Location[] = [

  // ── Capital & South ────────────────────────────────────────────────────────

  {
    slug: 'argostoli',
    name: 'Argostoli',
    region: 'kefalonia',
    type: 'city',
    demand: 'high',
    bestFor: ['couples', 'families', 'culture', 'city-break'],
    tags: ['city-center', 'waterfront', 'shopping', 'restaurants'],
    description: 'Kefalonia\'s lively capital. Waterfront promenade, De Bosset bridge, loggerhead turtles in the bay, and the island\'s best dining scene.',
    seoTitle: 'Vacation Rentals in Argostoli, Kefalonia — Book Direct, No Fees',
    seoDescription: 'Apartments and villas in Argostoli, the capital of Kefalonia. Walk to the waterfront, restaurants and shops. Direct booking, zero platform fees.',
    filter: { city: 'Argostoli', region: 'Kefalonia' },
    latitude: 38.1756,
    longitude: 20.4889,
    featured: true,
  },

  {
    slug: 'lassi',
    name: 'Lassi',
    region: 'kefalonia',
    type: 'area',
    demand: 'high',
    bestFor: ['families', 'couples', 'beach'],
    tags: ['beachfront', 'sandy-beach', 'family-friendly', 'near-airport'],
    description: 'Resort suburb of Argostoli with the famous Makris Gialos and Platis Gialos beaches. Closest beach base to the airport.',
    seoTitle: 'Holiday Rentals in Lassi, Kefalonia — Beachfront Villas',
    seoDescription: 'Villas and apartments in Lassi, Kefalonia. Walking distance to Makris Gialos beach. Family-friendly, near the airport. Book direct.',
    filter: { city: 'Lassi', region: 'Kefalonia' },
    latitude: 38.1647,
    longitude: 20.4744,
    featured: true,
  },

  {
    slug: 'svoronata',
    name: 'Svoronata',
    region: 'kefalonia',
    type: 'village',
    demand: 'medium',
    bestFor: ['couples', 'families', 'quiet'],
    tags: ['near-airport', 'quiet', 'sea-view'],
    description: 'Quiet hillside village just south of the airport, near Avithos and Ammes beaches. Easy access without the resort crowds.',
    seoTitle: 'Villa Rentals in Svoronata, Kefalonia — Near Airport',
    seoDescription: 'Holiday villas in Svoronata, Kefalonia. Quiet area near the airport and Avithos beach. Direct owner booking.',
    filter: { city: 'Svoronata', region: 'Kefalonia' },
    latitude: 38.1283,
    longitude: 20.4842,
    featured: false,
  },

  {
    slug: 'spartia',
    name: 'Spartia',
    region: 'kefalonia',
    type: 'village',
    demand: 'medium',
    bestFor: ['couples', 'families', 'quiet'],
    tags: ['sea-view', 'quiet', 'beachfront'],
    description: 'Traditional village above a string of small sandy coves. Authentic Kefalonian feel, a short drive from Argostoli.',
    seoTitle: 'Holiday Rentals in Spartia, Kefalonia — Quiet Coastal Village',
    seoDescription: 'Villas and apartments in Spartia, Kefalonia. Quiet village with small beaches nearby. Direct booking with owners.',
    filter: { city: 'Spartia', region: 'Kefalonia' },
    latitude: 38.1100,
    longitude: 20.5258,
    featured: false,
  },

  // ── South Coast ────────────────────────────────────────────────────────────

  {
    slug: 'lourdata',
    name: 'Lourdata',
    region: 'kefalonia',
    type: 'area',
    demand: 'high',
    bestFor: ['families', 'couples', 'beach'],
    tags: ['beachfront', 'long-beach', 'family-friendly', 'tavernas'],
    description: 'Long sweeping bay on the south coast. Lourdas beach is one of the island\'s best — wide, sandy and backed by tavernas.',
    seoTitle: 'Vacation Rentals Lourdata — Lourdas Beach Villas Kefalonia',
    seoDescription: 'Holiday rentals in Lourdata (Lourdas), Kefalonia. Long sandy south-coast beach, tavernas, family-friendly. Book direct.',
    filter: { cities: ['Lourdata', 'Lourdas'], region: 'Kefalonia' },
    latitude: 38.1314,
    longitude: 20.6075,
    featured: true,
  },

  {
    slug: 'trapezaki',
    name: 'Trapezaki',
    region: 'kefalonia',
    type: 'beach',
    demand: 'medium',
    bestFor: ['couples', 'families', 'quiet'],
    tags: ['beachfront', 'sandy-beach', 'quiet'],
    description: 'Quiet, organised sandy beach on the south coast with shallow water — a calmer alternative to Lourdas.',
    seoTitle: 'Trapezaki Beach Rentals — Holiday Villas South Kefalonia',
    seoDescription: 'Holiday rentals near Trapezaki beach, Kefalonia. Quiet sandy south-coast beach. Direct booking, zero fees.',
    filter: { city: 'Trapezaki', region: 'Kefalonia' },
    latitude: 38.1456,
    longitude: 20.6356,
    featured: false,
  },

  {
    slug: 'katelios',
    name: 'Katelios',
    region: 'kefalonia',
    type: 'village',
    demand: 'medium',
    bestFor: ['families', 'couples', 'quiet'],
    tags: ['beachfront', 'fishing-village', 'tavernas', 'turtle-nesting'],
    description: 'Sleepy fishing village on a long sandy bay. Loggerhead turtles nest on the beach. Excellent fish tavernas.',
    seoTitle: 'Holiday Rentals in Katelios, Kefalonia — Fishing Village',
    seoDescription: 'Villas and apartments in Katelios, Kefalonia. Sandy bay, fishing village, turtle nesting beach. Book direct with owners.',
    filter: { city: 'Katelios', region: 'Kefalonia' },
    latitude: 38.0700,
    longitude: 20.7411,
    featured: false,
  },

  {
    slug: 'skala',
    name: 'Skala',
    region: 'kefalonia',
    type: 'area',
    demand: 'high',
    bestFor: ['families', 'groups', 'couples'],
    tags: ['beachfront', 'long-beach', 'family-friendly', 'restaurants'],
    description: 'Kefalonia\'s most popular south-east resort. Long pebble-and-sand beach, Roman villa ruins, and a busy strip of restaurants and bars.',
    seoTitle: 'Vacation Rentals in Skala, Kefalonia — Beach Resort Villas',
    seoDescription: 'Holiday rentals in Skala, Kefalonia. Long Blue Flag beach, family resort, plenty of tavernas. Direct booking, no fees.',
    filter: { city: 'Skala', region: 'Kefalonia' },
    latitude: 38.0608,
    longitude: 20.7864,
    featured: true,
  },

  {
    slug: 'poros',
    name: 'Poros',
    region: 'kefalonia',
    type: 'area',
    demand: 'high',
    bestFor: ['families', 'couples', 'budget'],
    tags: ['near-ferry', 'beachfront', 'tavernas', 'family-friendly'],
    description: 'East-coast port town with ferries to Kyllini on the mainland. Pebble beach, harbour tavernas, and easy mainland connections.',
    seoTitle: 'Holiday Rentals in Poros, Kefalonia — Ferry Port Apartments',
    seoDescription: 'Villas and apartments in Poros, Kefalonia. Ferry port to Kyllini, beach, tavernas. Direct booking with local owners.',
    filter: { city: 'Poros', region: 'Kefalonia' },
    latitude: 38.1494,
    longitude: 20.7811,
    featured: true,
  },

  // ── East Coast ─────────────────────────────────────────────────────────────

  {
    slug: 'sami',
    name: 'Sami',
    region: 'kefalonia',
    type: 'area',
    demand: 'high',
    bestFor: ['couples', 'families', 'culture'],
    tags: ['near-ferry', 'beachfront', 'historic', 'tavernas'],
    description: 'East-coast harbour town and gateway port to Ithaca. Filming location for Captain Corelli\'s Mandolin. Caves, beaches and a working harbour.',
    seoTitle: 'Vacation Rentals in Sami, Kefalonia — Direct Booking',
    seoDescription: 'Holiday rentals in Sami, Kefalonia. Ferry port to Ithaca, near Antisamos beach and Melissani cave. Book direct.',
    filter: { city: 'Sami', region: 'Kefalonia' },
    latitude: 38.2492,
    longitude: 20.6500,
    featured: true,
  },

  {
    slug: 'antisamos',
    name: 'Antisamos Beach',
    region: 'kefalonia',
    type: 'beach',
    demand: 'high',
    bestFor: ['couples', 'beach', 'photography'],
    tags: ['beachfront', 'crystal-water', 'mountain-view', 'iconic'],
    description: 'Spectacular pebble beach in a green amphitheatre of hills, just east of Sami. Crystal turquoise water — one of Kefalonia\'s most photographed beaches.',
    seoTitle: 'Antisamos Beach Rentals — Villas Near Sami, Kefalonia',
    seoDescription: 'Holiday villas near Antisamos beach, Kefalonia. Iconic turquoise bay, walking distance to Sami. Direct booking.',
    filter: { city: 'Sami', area: 'Antisamos', region: 'Kefalonia' },
    latitude: 38.2553,
    longitude: 20.6831,
    featured: false,
  },

  {
    slug: 'karavomylos',
    name: 'Karavomylos',
    region: 'kefalonia',
    type: 'village',
    demand: 'medium',
    bestFor: ['couples', 'families', 'quiet'],
    tags: ['lakeside', 'quiet', 'near-melissani'],
    description: 'Tiny village on a small coastal lake just outside Sami. Home to the famous Melissani cave-lake.',
    seoTitle: 'Holiday Rentals Karavomylos — Near Melissani, Kefalonia',
    seoDescription: 'Villas and apartments in Karavomylos, Kefalonia. Steps from Melissani cave and the sea. Book direct.',
    filter: { city: 'Karavomylos', region: 'Kefalonia' },
    latitude: 38.2606,
    longitude: 20.6478,
    featured: false,
  },

  {
    slug: 'agia-efimia',
    name: 'Agia Efimia',
    region: 'kefalonia',
    type: 'area',
    demand: 'high',
    bestFor: ['couples', 'families', 'sailing'],
    tags: ['harbour', 'tavernas', 'sailing', 'quiet'],
    description: 'Picture-perfect fishing harbour on the east coast. A favourite stop for sailing flotillas, with waterfront tavernas and clear coves.',
    seoTitle: 'Vacation Rentals in Agia Efimia, Kefalonia — Harbour Villas',
    seoDescription: 'Holiday rentals in Agia Efimia, Kefalonia. Pretty harbour, tavernas, sailing. Direct booking with owners.',
    filter: { city: 'Agia Efimia', region: 'Kefalonia' },
    latitude: 38.3017,
    longitude: 20.5953,
    featured: true,
  },

  // ── North ──────────────────────────────────────────────────────────────────

  {
    slug: 'myrtos',
    name: 'Myrtos Beach',
    region: 'kefalonia',
    type: 'beach',
    demand: 'high',
    bestFor: ['couples', 'beach', 'photography'],
    tags: ['beachfront', 'iconic', 'cliff-view', 'crystal-water'],
    description: 'The most famous beach in the Ionian — a brilliant white pebble crescent between two towering cliffs. Voted one of the world\'s best beaches.',
    seoTitle: 'Myrtos Beach Rentals — Villas with View, Kefalonia',
    seoDescription: 'Holiday villas near Myrtos Beach, Kefalonia. Iconic clifftop views over the most famous beach in the Ionian. Book direct.',
    filter: { area: 'Myrtos', region: 'Kefalonia' },
    latitude: 38.3431,
    longitude: 20.5347,
    featured: true,
  },

  {
    slug: 'divarata',
    name: 'Divarata',
    region: 'kefalonia',
    type: 'village',
    demand: 'medium',
    bestFor: ['couples', 'families', 'beach'],
    tags: ['near-myrtos', 'mountain-view', 'tavernas'],
    description: 'Mountain village above Myrtos beach — the closest accommodation base to the famous bay.',
    seoTitle: 'Holiday Rentals Divarata — Villas Above Myrtos, Kefalonia',
    seoDescription: 'Villas and apartments in Divarata, Kefalonia. The closest village to Myrtos beach. Direct booking.',
    filter: { city: 'Divarata', region: 'Kefalonia' },
    latitude: 38.3411,
    longitude: 20.5683,
    featured: false,
  },

  {
    slug: 'assos',
    name: 'Assos',
    region: 'kefalonia',
    type: 'village',
    demand: 'high',
    bestFor: ['couples', 'romance', 'photography'],
    tags: ['iconic', 'harbour', 'venetian-castle', 'sea-view'],
    description: 'Pastel-coloured fishing village on a narrow isthmus, crowned by a Venetian castle. One of the most photographed spots in Greece.',
    seoTitle: 'Vacation Rentals in Assos, Kefalonia — Romantic Villas',
    seoDescription: 'Holiday villas and apartments in Assos, Kefalonia. Iconic pastel village under a Venetian castle. Book direct.',
    filter: { city: 'Assos', region: 'Kefalonia' },
    latitude: 38.3789,
    longitude: 20.5447,
    featured: true,
  },

  {
    slug: 'fiskardo',
    name: 'Fiskardo',
    region: 'kefalonia',
    type: 'area',
    demand: 'high',
    bestFor: ['couples', 'sailing', 'foodies', 'luxury'],
    tags: ['iconic', 'harbour', 'venetian', 'restaurants', 'sailing'],
    description: 'The only Kefalonian village to survive the 1953 earthquake intact. Venetian-era harbour, upmarket waterfront restaurants, sailing capital of the island.',
    seoTitle: 'Vacation Rentals in Fiskardo, Kefalonia — Harbour Villas',
    seoDescription: 'Villas and apartments in Fiskardo, Kefalonia. Venetian harbour, top restaurants, yachting hub. Direct booking, no fees.',
    filter: { city: 'Fiskardo', region: 'Kefalonia' },
    latitude: 38.4583,
    longitude: 20.5750,
    featured: true,
  },

  {
    slug: 'foki',
    name: 'Foki Beach',
    region: 'kefalonia',
    type: 'beach',
    demand: 'medium',
    bestFor: ['couples', 'beach', 'quiet'],
    tags: ['beachfront', 'pebble-beach', 'cypress-trees', 'near-fiskardo'],
    description: 'Small, sheltered pebble cove just south of Fiskardo, ringed by cypress trees. Crystal water, peaceful atmosphere.',
    seoTitle: 'Foki Beach Rentals — Villas Near Fiskardo, Kefalonia',
    seoDescription: 'Holiday rentals near Foki beach, Kefalonia. Quiet pebble cove south of Fiskardo. Direct booking.',
    filter: { area: 'Foki', region: 'Kefalonia' },
    latitude: 38.4500,
    longitude: 20.5783,
    featured: false,
  },

  {
    slug: 'emblisi',
    name: 'Emblisi Beach',
    region: 'kefalonia',
    type: 'beach',
    demand: 'medium',
    bestFor: ['couples', 'beach', 'snorkelling'],
    tags: ['beachfront', 'crystal-water', 'pebble-beach', 'near-fiskardo'],
    description: 'Tiny white-pebble cove with some of the clearest water on the island, just north of Fiskardo. Excellent snorkelling.',
    seoTitle: 'Emblisi Beach Rentals — Snorkelling Coves, Kefalonia',
    seoDescription: 'Holiday villas near Emblisi beach, Kefalonia. Crystal water, snorkelling, near Fiskardo. Book direct.',
    filter: { area: 'Emblisi', region: 'Kefalonia' },
    latitude: 38.4636,
    longitude: 20.5675,
    featured: false,
  },

  // ── Paliki Peninsula (West) ────────────────────────────────────────────────

  {
    slug: 'lixouri',
    name: 'Lixouri',
    region: 'kefalonia',
    type: 'city',
    demand: 'high',
    bestFor: ['families', 'budget', 'culture'],
    tags: ['waterfront', 'town', 'authentic', 'ferry'],
    description: 'Kefalonia\'s second town, on the Paliki peninsula. Ferry across the bay to Argostoli. Authentic, less touristed, gateway to the red-sand beaches of the west.',
    seoTitle: 'Vacation Rentals in Lixouri, Kefalonia — Direct Booking',
    seoDescription: 'Apartments and villas in Lixouri, Kefalonia. Authentic town on the Paliki peninsula, ferry to Argostoli. Book direct.',
    filter: { city: 'Lixouri', region: 'Kefalonia' },
    latitude: 38.2014,
    longitude: 20.4392,
    featured: true,
  },

  {
    slug: 'xi-beach',
    name: 'Xi Beach',
    region: 'kefalonia',
    type: 'beach',
    demand: 'high',
    bestFor: ['families', 'beach', 'wellness'],
    tags: ['beachfront', 'red-sand', 'shallow-water', 'family-friendly', 'iconic'],
    description: 'Famous red-sand beach on the Paliki peninsula. Shallow turquoise water, natural clay used as a face mask — an island highlight.',
    seoTitle: 'Xi Beach Rentals — Red-Sand Beach Villas, Kefalonia',
    seoDescription: 'Holiday rentals near Xi beach, Kefalonia. Iconic red sand, shallow water, near Lixouri. Direct booking.',
    filter: { area: 'Xi', region: 'Kefalonia' },
    latitude: 38.1594,
    longitude: 20.4150,
    featured: true,
  },

  {
    slug: 'megas-lakkos',
    name: 'Megas Lakkos',
    region: 'kefalonia',
    type: 'beach',
    demand: 'medium',
    bestFor: ['families', 'beach', 'quiet'],
    tags: ['beachfront', 'red-sand', 'cliff-backed', 'quiet'],
    description: 'Long red-sand beach south of Xi, framed by clay cliffs. Less crowded, equally striking colour.',
    seoTitle: 'Megas Lakkos Beach Rentals — Paliki, Kefalonia',
    seoDescription: 'Holiday rentals near Megas Lakkos beach, Kefalonia. Quiet red-sand alternative to Xi. Book direct.',
    filter: { area: 'Megas Lakkos', region: 'Kefalonia' },
    latitude: 38.1531,
    longitude: 20.4072,
    featured: false,
  },

  {
    slug: 'petani',
    name: 'Petani Beach',
    region: 'kefalonia',
    type: 'beach',
    demand: 'high',
    bestFor: ['couples', 'beach', 'photography'],
    tags: ['beachfront', 'iconic', 'cliff-view', 'crystal-water'],
    description: 'Stunning crescent of white pebbles between dramatic cliffs on the western Paliki coast — Kefalonia\'s "other Myrtos", with fewer crowds.',
    seoTitle: 'Petani Beach Rentals — West Coast Villas, Kefalonia',
    seoDescription: 'Holiday villas near Petani beach, Kefalonia. Dramatic west-coast bay, less crowded than Myrtos. Direct booking.',
    filter: { area: 'Petani', region: 'Kefalonia' },
    latitude: 38.2461,
    longitude: 20.3797,
    featured: true,
  },

  // ── Mountain & Inland ──────────────────────────────────────────────────────

  {
    slug: 'ainos',
    name: 'Mount Ainos',
    region: 'kefalonia',
    type: 'area',
    demand: 'emerging',
    bestFor: ['hiking', 'nature', 'couples'],
    tags: ['mountain', 'national-park', 'hiking', 'wildlife'],
    description: 'Greece\'s highest Ionian peak (1,628 m) and a national park. Endemic black fir forest, wild horses, sweeping island views.',
    seoTitle: 'Holiday Rentals Near Mount Ainos — Kefalonia Hiking',
    seoDescription: 'Villas near Mount Ainos National Park, Kefalonia. Hiking, nature, mountain views. Book direct.',
    filter: { area: 'Ainos', region: 'Kefalonia' },
    latitude: 38.1583,
    longitude: 20.6500,
    featured: false,
  },
];

// ── ITHACA ISLAND ─────────────────────────────────────────────────────────────

export const ITHACA_LOCATIONS: Location[] = [

  {
    slug: 'ithaca',
    name: 'Ithaca',
    region: 'ithaca',
    type: 'island',
    demand: 'high',
    bestFor: ['couples', 'culture', 'sailing', 'quiet'],
    tags: ['island', 'historic', 'mythology', 'sailing'],
    description: 'The legendary home of Odysseus. A short ferry from Sami, Ithaca is a quieter, smaller sister to Kefalonia — perfect for day trips or longer slow-travel stays.',
    seoTitle: 'Vacation Rentals on Ithaca, Greece — Book Direct',
    seoDescription: 'Villas and apartments on Ithaca island, near Kefalonia. Home of Odysseus, quiet bays, authentic villages. Direct booking.',
    filter: { region: 'Ithaca' },
    latitude: 38.4167,
    longitude: 20.6667,
    featured: true,
  },

  {
    slug: 'vathy',
    name: 'Vathy',
    region: 'ithaca',
    type: 'city',
    demand: 'high',
    bestFor: ['couples', 'families', 'culture'],
    tags: ['harbour', 'town', 'tavernas', 'sailing'],
    description: 'Ithaca\'s capital, wrapped around one of the deepest natural harbours in the Mediterranean. Pastel houses, waterfront cafes, sailing yachts.',
    seoTitle: 'Vacation Rentals in Vathy, Ithaca — Harbour Apartments',
    seoDescription: 'Apartments and villas in Vathy, Ithaca. Beautiful natural harbour, tavernas, near Kefalonia. Book direct.',
    filter: { city: 'Vathy', region: 'Ithaca' },
    latitude: 38.3667,
    longitude: 20.7167,
    featured: true,
  },

  {
    slug: 'kioni',
    name: 'Kioni',
    region: 'ithaca',
    type: 'village',
    demand: 'high',
    bestFor: ['couples', 'romance', 'sailing'],
    tags: ['harbour', 'iconic', 'tavernas', 'sailing'],
    description: 'Postcard-perfect fishing village on Ithaca\'s north-east coast, with a tiny harbour and three signature windmills at its entrance.',
    seoTitle: 'Holiday Rentals in Kioni, Ithaca — Romantic Harbour Villas',
    seoDescription: 'Villas and apartments in Kioni, Ithaca. Iconic fishing village with windmills and harbour. Direct booking.',
    filter: { city: 'Kioni', region: 'Ithaca' },
    latitude: 38.4500,
    longitude: 20.6917,
    featured: false,
  },

  {
    slug: 'frikes',
    name: 'Frikes',
    region: 'ithaca',
    type: 'village',
    demand: 'medium',
    bestFor: ['couples', 'sailing', 'quiet'],
    tags: ['harbour', 'fishing-village', 'tavernas', 'quiet'],
    description: 'Tiny harbour village on Ithaca\'s north-east coast. Working fishing port, a few waterfront tavernas, ferry link to Lefkada.',
    seoTitle: 'Vacation Rentals in Frikes, Ithaca — Fishing Village',
    seoDescription: 'Holiday rentals in Frikes, Ithaca. Quiet fishing village, ferry to Lefkada. Book direct with owners.',
    filter: { city: 'Frikes', region: 'Ithaca' },
    latitude: 38.4500,
    longitude: 20.6700,
    featured: false,
  },

  {
    slug: 'stavros',
    name: 'Stavros',
    region: 'ithaca',
    type: 'village',
    demand: 'medium',
    bestFor: ['families', 'culture', 'quiet'],
    tags: ['village', 'historic', 'quiet', 'central'],
    description: 'Ithaca\'s second-largest settlement, on a hilltop in the north. Archaeological museum and easy access to Polis Bay and the north-coast villages.',
    seoTitle: 'Holiday Rentals in Stavros, Ithaca — Hilltop Village',
    seoDescription: 'Villas and apartments in Stavros, Ithaca. Hilltop village near Polis Bay. Direct booking.',
    filter: { city: 'Stavros', region: 'Ithaca' },
    latitude: 38.4333,
    longitude: 20.6500,
    featured: false,
  },
];

// ── Combined Export ───────────────────────────────────────────────────────────

export const ALL_LOCATIONS: Location[] = [...KEFALONIA_LOCATIONS, ...ITHACA_LOCATIONS];

export function getLocationBySlug(slug: string): Location | undefined {
  return ALL_LOCATIONS.find((l) => l.slug === slug);
}

export function getLocationsByRegion(region: Region): Location[] {
  return ALL_LOCATIONS.filter((l) => l.region === region);
}

export function getFeaturedLocations(): Location[] {
  return ALL_LOCATIONS.filter((l) => l.featured);
}

/** Returns primary filter options for the rentals page UI */
export const DESTINATION_OPTIONS = [
  { value: '', label: 'All Destinations' },
  { value: 'kefalonia', label: 'Kefalonia Island' },
  { value: 'ithaca', label: 'Ithaca Island' },
] as const;

/** Secondary area options grouped by region for cascading filter */
export const KEFALONIA_AREA_OPTIONS = KEFALONIA_LOCATIONS.filter(
  (l) => l.demand !== 'emerging' || l.featured,
).map((l) => ({ value: l.slug, label: l.name }));

export const ITHACA_AREA_OPTIONS = ITHACA_LOCATIONS.filter(
  (l) => l.type !== 'beach' || l.demand === 'high',
).map((l) => ({ value: l.slug, label: l.name }));

/** Filter tags for the UI */
export const LOCATION_TAGS = [
  'beachfront',
  'sea-view',
  'near-ferry',
  'near-airport',
  'luxury',
  'family-friendly',
  'budget',
  'long-stay',
  'historic',
  'quiet',
  'crystal-water',
  'island',
  'hiking',
  'sailing',
] as const;

export type LocationTag = typeof LOCATION_TAGS[number];
