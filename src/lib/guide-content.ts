// ============================================================
// Local Guide Content — hand-curated per location
// Fallback templates generated from location tags/type
// ============================================================

import type { Location } from './locations.ts';

export interface GuideActivity {
  name: string;
  description: string;
  category: 'beach' | 'boat' | 'hike' | 'culture' | 'watersport' | 'nature' | 'food' | 'shopping' | 'tour';
  priceRange?: '€' | '€€' | '€€€';
  tip?: string;
}

export interface GuideDining {
  name: string;
  description: string;
  type: 'taverna' | 'restaurant' | 'cafe' | 'bar' | 'meze' | 'grill';
  priceRange: '€' | '€€' | '€€€';
}

export interface LocationGuide {
  intro: string;
  activities: GuideActivity[];
  dining: GuideDining[];
  gettingAround: string[];
  tips: string[];
  bestTime: string;
}

// ── Curated content per slug ───────────────────────────────────────────────

const GUIDES: Record<string, LocationGuide> = {

  kefalonia: {
    intro: 'Kefalonia is Northern Greece\'s most photogenic port city — Byzantine castle, Ottoman aqueduct, ancient ruins and a lively waterfront all within walking distance. It\'s also the main gateway to Thassos Island.',
    activities: [
      { name: 'Byzantine Castle (Kastro)', description: 'Climb the walls of the 15th-century castle for panoramic views over the city, port and Thassos Island on the horizon. Free entry to grounds.', category: 'culture', tip: 'Visit at sunset — the golden light on the sea is spectacular.' },
      { name: 'Kamares Aqueduct', description: '16th-century Ottoman aqueduct that dominates the lower city. Best photographed from Eleftherias Square below.', category: 'culture' },
      { name: 'Archaeological Museum of Kefalonia', description: 'Outstanding collection from ancient Amphipolis and Philippi. Well worth two hours.', category: 'culture', priceRange: '€', tip: 'Free entry on first Sunday of each month.' },
      { name: 'Mehmed Ali Birthplace', description: 'The birthplace of Egypt\'s modernising ruler. A rare Ottoman mansion preserved in the Panagia district.', category: 'culture' },
      { name: 'Harbor Promenade Walk', description: 'The seafront from the port to the lighthouse is the city\'s social spine — evening walks, fishing boats, cafes.', category: 'nature' },
      { name: 'Day Ferry to Thassos', description: 'Jump on the hourly ferry from Kefalonia port to Thassos Town (1h 30min). Perfect as a day trip.', category: 'boat', priceRange: '€', tip: 'Buy return tickets at the port kiosk.' },
      { name: 'Boat Trips to Nearby Coves', description: 'Small boats depart from the old harbor for half-day trips to secluded coves along the coast.', category: 'boat', priceRange: '€€' },
      { name: 'Ancient Philippi', description: 'UNESCO World Heritage Site, 15km west of Kefalonia. Ancient theatre, basilicas, where St Paul first preached in Europe.', category: 'culture', priceRange: '€', tip: 'Combined ticket covers the whole site.' },
    ],
    dining: [
      { name: 'Antigoni', description: 'Classic waterfront taverna serving traditional Greek dishes. Reliable, good for groups.', type: 'taverna', priceRange: '€€' },
      { name: 'Thalassino Ageri', description: 'The best fresh fish in Kefalonia. On the rocks below the old town walls.', type: 'restaurant', priceRange: '€€€' },
      { name: 'Panos Zafeira', description: 'Old-school ouzo bar with outstanding meze. Locals only know this one.', type: 'meze', priceRange: '€' },
      { name: 'Cafe Bostani', description: 'Coffee and pastries in a neoclassical mansion courtyard in the Panagia district.', type: 'cafe', priceRange: '€' },
    ],
    gettingAround: [
      'The old town (Panagia district) and harbor are fully walkable — most sights within 20 minutes on foot.',
      'Rent a scooter or car for day trips to nearby beaches (Nea Peramos, Ofrinio, Keramoti).',
      'City buses connect the center to suburbs. Taxis are cheap and always available at the port.',
      'Ferry to Thassos departs from the central port — no reservation needed in spring/autumn.',
    ],
    tips: [
      'Park near the port for free after 20:00 — parking wardens finish early.',
      'The old town\'s cobblestone alleys are steep — wear comfortable shoes.',
      'Coffee culture is serious here. Budget at least one hour at a kafeneion.',
      'Avoid driving into the old town (Panagia) — use the parking at the base of the hill.',
      'Supermarkets are open Sunday mornings. Most shops close 14:00–17:30.',
    ],
    bestTime: 'May–June and September for great weather without peak crowds. July–August is busy but energetic.',
  },

  keramoti: {
    intro: 'Keramoti is the closest mainland point to Thassos — a 15-minute ferry crossing. It\'s a relaxed sandy beach village with excellent fish tavernas and a loyal base of repeat visitors who love its unhurried atmosphere.',
    activities: [
      { name: 'Keramoti Beach', description: '3km of sandy beach with calm, shallow water. Perfect for young children and swimmers of all levels.', category: 'beach', tip: 'North end is less crowded than near the village center.' },
      { name: 'Ferry to Thassos (Limenas)', description: 'Departs every hour in summer (less frequent off-season). The 15-minute crossing is the fastest way to Thassos.', category: 'boat', priceRange: '€', tip: 'Buy tickets at the port kiosk. No need to pre-book for foot passengers.' },
      { name: 'Fishing Boat Trips', description: 'Local fishermen offer informal trips from the port at dawn — ask at the harbor the evening before.', category: 'boat', priceRange: '€' },
      { name: 'Coastal Cycling', description: 'Flat coast road ideal for cycling. Rent bikes in the village and ride toward the Nestos river delta.', category: 'nature', tip: 'The delta area is excellent for birdwatching.' },
      { name: 'Nestos River Delta', description: '20km west — one of Greece\'s most important wetlands. Birdwatching, boat tours available from Chrysoupoli.', category: 'nature' },
      { name: 'Sunset Harbor Walk', description: 'Evening stroll along the port watching the ferry come and go with Thassos lit up across the water.', category: 'nature' },
    ],
    dining: [
      { name: 'Akrogiali', description: 'The best fish taverna in Keramoti. Tables almost in the water, excellent fresh seafood.', type: 'taverna', priceRange: '€€' },
      { name: 'Keramoti harbor tavernas', description: 'Several reliable fish restaurants line the port — try whichever looks busiest with locals.', type: 'taverna', priceRange: '€€' },
      { name: 'Beach cafes', description: 'Casual beach bars along the main beach serving coffee, cold drinks and light snacks.', type: 'cafe', priceRange: '€' },
    ],
    gettingAround: [
      'Keramoti is completely walkable — beach, port, tavernas and shops all within 10 minutes.',
      'The ferry port is right in the village center.',
      'Car or scooter needed to reach the Nestos delta or other nearby beaches.',
      'Kefalonia city is 40 minutes by car — easy half-day trip.',
    ],
    tips: [
      'Morning ferries (7–9am) are much less busy than midday.',
      'August weekends get crowded at the beach — arrive early for a good spot.',
      'The beach has no shade — bring your own umbrella or rent one.',
      'Supermarket in the village is well stocked for self-catering.',
    ],
    bestTime: 'June and September — warm enough for swimming, without the August crowds at the ferry.',
  },

  'nea-peramos': {
    intro: 'Nea Peramos has one of the longest sandy beaches in the Kefalonia region — calm, shallow water, ideal for families. It\'s a genuinely popular Greek holiday town with all facilities and a great evening atmosphere along the beach road.',
    activities: [
      { name: 'Nea Peramos Beach', description: 'Long sandy beach with organized sections (sunbeds/umbrellas) and free areas. Calm, shallow water great for kids.', category: 'beach' },
      { name: 'Pedal Boats & Kayak Rental', description: 'Available along the beach throughout summer. Perfect for exploring the calm bay.', category: 'watersport', priceRange: '€' },
      { name: 'Fishing Pier Walk', description: 'Evening walk along the pier — locals fish here through the night.', category: 'nature' },
      { name: 'Sunset Beach Walk', description: 'The beach faces west, making Nea Peramos one of the best sunset spots in the Kefalonia region.', category: 'nature', tip: 'The best sunsets are August–September.' },
      { name: 'Day Trip to Kefalonia', description: '30 minutes by car. The city archaeological museum, castle and harbor make a full day out.', category: 'culture' },
    ],
    dining: [
      { name: 'Paralia beach tavernas', description: 'Multiple tavernas and grills line the beach road — fresh fish, grilled meats, salads.', type: 'taverna', priceRange: '€€' },
      { name: 'Beach bars', description: 'Casual spots for coffee, cocktails and snacks directly on the beach.', type: 'bar', priceRange: '€' },
    ],
    gettingAround: [
      'The beach strip is walkable but the town is spread out — a car or scooter helps.',
      'Direct connection to the E90 motorway — easy access from Thessaloniki (90 min).',
      'Kefalonia city is 30 minutes by car.',
    ],
    tips: [
      'Best sunsets in the region face this beach.',
      'Busy Greek domestic tourism in July–August — arrive by 10am for beach space.',
      'Local supermarkets well-stocked for self-catering families.',
    ],
    bestTime: 'June–September. The beach is excellent from mid-May in calm years.',
  },

  thassos: {
    intro: 'Thassos is Northern Greece\'s most beautiful island — pine forests running down to white marble beaches, crystal turquoise water, charming villages and two ferry connections to the mainland. Rent a car to do it justice.',
    activities: [
      { name: 'Island Circuit by Car/Scooter', description: 'The 95km island road takes 3–4 hours including stops. A must-do — every bend reveals a new beach or village.', category: 'tour', tip: 'Start early and drive anti-clockwise (west coast first).' },
      { name: 'Boat Trip Around the Island', description: 'Full-day boat tours depart from Limenas. See Marble Beach, secluded coves and sea caves unreachable by road.', category: 'boat', priceRange: '€€', tip: 'Book in Limenas harbor — compare prices between operators.' },
      { name: 'Mount Ipsarion Summit Hike', description: 'Thassos\'s highest peak (1205m) accessed from Potamia village. Full-day hike with extraordinary pine forest and sea views.', category: 'hike', tip: 'Start before 7am in summer to avoid heat.' },
      { name: 'Giola Natural Pool', description: 'A natural rock pool connected to the sea near Astris. One of Greece\'s most photographed spots.', category: 'nature', tip: 'Go before 9am or after 17:00 to avoid crowds.' },
      { name: 'Marble Beach (Saliara)', description: 'Pure white marble beach accessible only by boat. Departs from Limenas and Skala Rachoni harbors.', category: 'boat', priceRange: '€€' },
      { name: 'Alyki Ancient Quarry', description: 'Twin coves with ancient marble quarry ruins. Snorkel among ancient column fragments in crystal water.', category: 'culture' },
      { name: 'Ancient Theatre of Thassos', description: 'Well-preserved ancient theatre in Limenas used for summer performances. Free to visit outside events.', category: 'culture' },
      { name: 'Archangelou Monastery', description: 'Cliffside monastery on the south coast. Relic of St Luke. Dress code required (coverings available).', category: 'culture' },
    ],
    dining: [
      { name: 'Limenas harbor restaurants', description: 'Best selection on the island — fresh fish, local wine, harbor views. Try Symi or To Karnagio.', type: 'taverna', priceRange: '€€' },
      { name: 'Panagia village tavernas', description: 'Mountain tavernas above Golden Beach serving grilled meats and local wine with spectacular valley views.', type: 'taverna', priceRange: '€' },
      { name: 'Potos beach restaurants', description: 'Lively resort dining — beach clubs, seafood, pizza, cocktails.', type: 'restaurant', priceRange: '€€' },
      { name: 'Theologos honey shops', description: 'Stop in Theologos for local thyme honey, olive oil and mountain herbs to take home.', type: 'grill', priceRange: '€' },
    ],
    gettingAround: [
      'Rent a car or scooter at Limenas port immediately after arriving — public buses run but are infrequent.',
      'The island circuit is 95km — a full tank of petrol is plenty.',
      'Fill up petrol in Limenas (most complete services) or Limenaria.',
      'Two ferry routes: Kefalonia → Limenas (1h 30min) and Kefalonia → Skala Prinos (1h). Keramoti → Limenas is fastest (15min).',
      'Parking in Limenas is tight in August — arrive before 9am or park on the outskirts.',
    ],
    tips: [
      'A car is not a luxury on Thassos — it\'s necessary. Rent at least for 2–3 days.',
      'Avoid the island in the last 2 weeks of August — absolute peak crowds.',
      'Thassos water is drinkable from the tap — one of few Greek islands where this is true.',
      'Petrol stations close at 22:00 — fill up before evening.',
      'Mobile coverage is good on most of the island. The west coast mountain areas have gaps.',
      'Buy local: Thassos olive oil, honey and wine are exceptional and very affordable.',
    ],
    bestTime: 'June and September are ideal. Sea warm, crowds manageable, tavernas open. July is great but busy. August is peak.',
  },

  limenas: {
    intro: 'Limenas (Thassos Town) is the island capital and main ferry arrival point. Ancient ruins sit next to the harbor, a marble-paved promenade lines the marina, and all island exploration starts here.',
    activities: [
      { name: 'Ancient Agora & Ruins', description: 'Extensive ancient Greek ruins in the center of town — columns, temples, walls. Walk through 2,500 years of history in 20 minutes.', category: 'culture', tip: 'Free to enter most areas. Best in early morning light.' },
      { name: 'Ancient Theatre of Thassos', description: 'Well-preserved Hellenistic theatre on the hill above town. Used for the annual summer festival.', category: 'culture', priceRange: '€' },
      { name: 'Archaeological Museum', description: 'Excellent collection of finds from ancient Thassos — particularly the 6th century BC kouroi statues.', category: 'culture', priceRange: '€' },
      { name: 'Harbor & Marina Walk', description: 'Evening promenade along the harbor — fishing boats, yachts, restaurants and the warm glow of a Greek port.', category: 'nature' },
      { name: 'Makryammos Beach', description: 'Exclusive pine-forest beach 15 minutes walk from the port. Pebble-sand mix, crystal water.', category: 'beach' },
      { name: 'Boat Trips', description: 'Day trips to Marble Beach, island circumnavigation and fishing trips all depart from the harbor.', category: 'boat', priceRange: '€€' },
    ],
    dining: [
      { name: 'Symi', description: 'Classic harbor-front taverna. Fresh fish, reliable quality, beautiful setting.', type: 'taverna', priceRange: '€€' },
      { name: 'To Karnagio', description: 'Best fresh fish in Limenas. Slightly off the main harbor strip — worth finding.', type: 'restaurant', priceRange: '€€€' },
      { name: 'Harbor cafes', description: 'Greek coffee and pastries watching the ferry come in. Several good spots on the main promenade.', type: 'cafe', priceRange: '€' },
    ],
    gettingAround: [
      'The port and ancient ruins are walkable from each other.',
      'Rent a car or scooter here for island exploration — multiple rental offices at the port.',
      'Bus station is 5 minutes walk from the ferry terminal.',
      'Taxi stand at the port serves all island destinations.',
    ],
    tips: [
      'Rent your vehicle as soon as you arrive — choices get limited by afternoon in August.',
      'The ancient ruins are best visited before 9am before tour groups arrive.',
      'The harbor fish market operates early morning — great to browse even if not buying.',
      'Thassos town has the best ATMs and pharmacies on the island — stock up before heading to remote areas.',
    ],
    bestTime: 'May–October. Limenas has the widest range of services open from early in the season.',
  },

  potos: {
    intro: 'Potos is Thassos\'s most developed resort — lively beach, non-stop watersports, beach bars and a buzzing nightlife strip. If you want action and entertainment, this is your base.',
    activities: [
      { name: 'Organized Beach', description: 'Well-equipped beach with sunbeds, umbrellas and beach bars along the full length.', category: 'beach', tip: 'Arrive before 10am in August to get a good spot.' },
      { name: 'Watersports Center', description: 'Jet ski, parasailing, banana boat, ringos, wakeboard — the south end of the beach has a full watersports operation.', category: 'watersport', priceRange: '€€' },
      { name: 'Boat Rental', description: 'Rent a small motorboat (no license required) and explore Paradise Beach and nearby coves independently.', category: 'boat', priceRange: '€€', tip: 'Great value for groups — split the cost.' },
      { name: 'Boat Trip to Paradise Beach', description: 'Just 10 minutes by water to Thassos\'s party beach. Departs from Potos harbor throughout the day.', category: 'boat', priceRange: '€' },
      { name: 'Giola Natural Pool', description: '15km south of Potos — a unique natural rock lagoon. Drive down and hike 20 minutes.', category: 'nature', tip: 'Very early morning only — gets crowded by 10am.' },
      { name: 'Evening Bar Strip', description: 'Potos has the best nightlife on Thassos — bars along the main street get going after midnight.', category: 'food' },
    ],
    dining: [
      { name: 'O Glaros', description: 'Popular beachfront restaurant, fresh fish and seafood mezedes. Best table gets booked fast.', type: 'restaurant', priceRange: '€€' },
      { name: 'Beach clubs', description: 'Multiple beach club restaurants serving food and cocktails directly on the sand.', type: 'bar', priceRange: '€€' },
      { name: 'Village tavernas', description: 'Go slightly inland (5-minute walk) for cheaper, more local options away from the beach strip.', type: 'taverna', priceRange: '€' },
    ],
    gettingAround: [
      'Potos itself is walkable — beach, bars and restaurants all within 10 minutes.',
      'Limenaria is 10 minutes by car or taxi.',
      'Scooter recommended for day trips — Paradise Beach, Giola, Alyki.',
      'Taxi service available — negotiate price for island trips.',
    ],
    tips: [
      'High season August is very busy — book restaurants in advance.',
      'The best beach spots go by 9:30am in August.',
      'Local currency: ATM on the main street.',
      'Nightlife starts late — bars fill up after midnight.',
    ],
    bestTime: 'July–August for the full resort experience. June is perfect if you want beach without noise.',
  },

  limenaria: {
    intro: 'Limenaria is Thassos\'s second-largest town — a charming harbor, organized beach, excellent fish restaurants and the atmospheric ruins of a German mining-era mansion. More authentic than Potos with a real local life year-round.',
    activities: [
      { name: 'Limenaria Beach', description: 'Well-organized beach in the town center. Shallow, sandy, with sunbed rental and beach facilities.', category: 'beach' },
      { name: 'Sassnitz Mansion (Palataki)', description: 'Atmospheric ruins of a 1903 German mining company mansion on the hill above town. Free to explore.', category: 'culture', tip: 'Best photographed at dusk.' },
      { name: 'Harbor Promenade', description: 'The harbor is small and walkable — fishing boats, yachts and excellent fish restaurants overlook the water.', category: 'nature' },
      { name: 'Boat Hire', description: 'Small boats available for rent at the harbor — explore Paradise Beach and sea caves south of town.', category: 'boat', priceRange: '€€' },
      { name: 'Potos & Paradise Beach', description: '10 minutes by car to Potos and its watersports. Paradise Beach is a further 5 minutes.', category: 'beach' },
      { name: 'Alyki Ancient Site', description: '20 minutes north along the coast — twin coves, ancient marble quarry, snorkeling in crystal water.', category: 'culture' },
    ],
    dining: [
      { name: 'Harbor fish restaurants', description: 'Fresh catch of the day, octopus, grilled fish — several excellent options on the harbor front.', type: 'restaurant', priceRange: '€€' },
      { name: 'To Akroyiali', description: 'Local favorite on the waterfront — good value mezedes and fresh fish.', type: 'taverna', priceRange: '€€' },
      { name: 'Village cafes', description: 'Traditional Greek kafeneions in the town center for morning coffee and evening drinks.', type: 'cafe', priceRange: '€' },
    ],
    gettingAround: [
      'Limenaria is the most central town on the south coast — perfect base.',
      'Potos is 10 minutes by car; Alyki 20 minutes north.',
      'Rent scooter or car here — several rental shops in town.',
    ],
    tips: [
      'Much more relaxed than Potos — good choice for couples and families who want atmosphere without noise.',
      'The Sassnitz ruins are best at sunset — dramatic light.',
      'Tuesday morning has a small street market with local produce.',
    ],
    bestTime: 'June–September. Limenaria stays open longer into autumn than other tourist areas.',
  },

  'golden-beach': {
    intro: 'Golden Beach is consistently ranked one of Greece\'s finest family beaches — 1.5km of powder-white sand, shallow warm water and pine-tree shade at the edges. The twin villages of Skala Potamias and Skala Panagia bookend this exceptional stretch of coast.',
    activities: [
      { name: 'Golden Beach Walk', description: '1.5km beach walk from end to end. The north end (Skala Panagia) is noticeably quieter.', category: 'beach', tip: 'Walk at dawn before the beach fills up — magical light.' },
      { name: 'Kayak Rental', description: 'Paddle along the coast and explore the sea caves at the southern end of the bay.', category: 'watersport', priceRange: '€' },
      { name: 'Horse Riding on the Beach', description: 'Morning horse rides along the shoreline — one of the most unique activities in Thassos.', category: 'tour', priceRange: '€€', tip: 'Book the day before at the stables near Skala Potamias.' },
      { name: 'Beach Volleyball', description: 'Nets set up at the center of the beach throughout summer. Join a pickup game.', category: 'beach' },
      { name: 'Panagia Village (10 min drive)', description: 'Drive up to the mountain village above the beach — cobbled streets, spring fountain, spectacular valley views.', category: 'culture' },
      { name: 'Cycling to Potamia Village', description: 'Flat road from the beach to Potamia village (3km). Hire bikes at the beach.', category: 'nature', priceRange: '€' },
    ],
    dining: [
      { name: 'Beachfront tavernas', description: 'Several excellent tavernas on the beach road — fresh fish, Greek salads, cold beer. Tables under tamarisk trees.', type: 'taverna', priceRange: '€€' },
      { name: 'Akti Restaurant', description: 'Good value beachfront restaurant mid-beach. Fresh fish daily.', type: 'restaurant', priceRange: '€€' },
      { name: 'Skala Potamias village restaurants', description: 'A few minutes walk from the beach for slightly cheaper, more local dining.', type: 'taverna', priceRange: '€' },
    ],
    gettingAround: [
      'The beach is 1.5km long and walkable end-to-end.',
      'Car or scooter essential — the beach road has limited public transport.',
      'Panagia village is 5 minutes by car uphill.',
      'Limenas (Thassos Town) is 20 minutes north.',
    ],
    tips: [
      'Arrive before 10am in August for a parking spot.',
      'The north end (Skala Panagia) is 30% quieter than the south.',
      'Beach beds get scarce by 10:30am in high season — arrive early or bring your own mat.',
      'The beach has natural pine shade at the northern fringe — prime spots.',
    ],
    bestTime: 'June and September — warm sea, uncrowded beach, all facilities open.',
  },

  'skala-potamias': {
    intro: 'Skala Potamias is the main village on Golden Beach — Greece\'s finest family beach stretches from here northward. A lively beachfront with excellent tavernas and all facilities.',
    activities: [
      { name: 'Golden Beach', description: 'The main event — 1.5km of award-winning sandy beach with shallow crystal water. One of Greece\'s best.', category: 'beach' },
      { name: 'Watersports', description: 'Kayak, pedal boat, paddleboard and occasional jet ski rental from the beach.', category: 'watersport', priceRange: '€€' },
      { name: 'Panagia Village', description: 'Drive 10 minutes uphill to the most beautiful inland village in Thassos. Cobblestones, stone houses, natural spring.', category: 'culture' },
      { name: 'Potamia Village & Museum', description: 'Lush green village 3km inland. Home to the Polygnotos Vagis sculpture museum.', category: 'culture', priceRange: '€' },
    ],
    dining: [
      { name: 'Beach tavernas', description: 'Excellent fresh fish and Greek classics at tables practically on the sand.', type: 'taverna', priceRange: '€€' },
      { name: 'Molos restaurant', description: 'Popular beachfront spot for fresh fish and seafood.', type: 'restaurant', priceRange: '€€' },
    ],
    gettingAround: [
      'The beach and village center are all walkable.',
      'Car needed for Panagia village, Limenas (20 min) or the south coast.',
      'Limited bus service — having your own vehicle is strongly recommended.',
    ],
    tips: [
      'Skala Potamias village has the most facilities (supermarket, ATM, pharmacy) compared to the north end.',
      'August is extremely busy — consider visiting in June or September.',
    ],
    bestTime: 'June and early September for the best experience.',
  },

  'panagia-thassos': {
    intro: 'Panagia is Thassos\'s most beautiful inland village — stone houses, cobbled alleys, a central square with a natural spring and the most dramatic valley views on the island. A 10-minute drive above Golden Beach.',
    activities: [
      { name: 'Village Square & Spring Fountain', description: 'The heart of Panagia — flowing spring water, plane trees, traditional kafeneions. The most quintessentially Greek village scene in Thassos.', category: 'culture', tip: 'The spring water is cold and delicious — fill your bottle here.' },
      { name: 'Cobblestone Alley Walk', description: 'Wander the narrow stone lanes, past flowering balconies and traditional houses. Allow 45–60 minutes.', category: 'culture' },
      { name: 'Valley View Sunset', description: 'The terrace above the village looks down over Golden Beach and the entire east coast. Best sunset point in east Thassos.', category: 'nature', tip: 'Arrive 30 minutes before sunset.' },
      { name: 'Hiking Trail to Golden Beach', description: 'A marked trail descends through pine forest to the beach (1.5km, 30 min). Walk down, take a dip, taxi or hitch back up.', category: 'hike' },
      { name: 'Local Craft Shops', description: 'Small shops selling local honey, olive oil, herbs and handmade ceramics — excellent for gifts.', category: 'shopping', priceRange: '€' },
    ],
    dining: [
      { name: 'Mountain tavernas', description: 'Several traditional tavernas with valley and sea views. Grilled meats, local wine, simple Greek cooking at its best.', type: 'taverna', priceRange: '€' },
      { name: 'Village kafeneion', description: 'Old men\'s coffee house on the central square — the most authentic Greek experience on the island.', type: 'cafe', priceRange: '€' },
    ],
    gettingAround: [
      'Panagia is 10 minutes by car from Golden Beach (steep uphill road).',
      'The village itself is entirely on foot — no cars in the narrow lanes.',
      'A hike trail connects to Golden Beach (1.5km down).',
    ],
    tips: [
      'Visit in the evening when day-trippers have left — the atmosphere transforms.',
      'The spring fountain has been flowing continuously for centuries — bring a water bottle.',
      'Local honey from Panagia village is excellent — buy a jar from any small shop.',
      'Some lanes are very steep — comfortable shoes essential.',
    ],
    bestTime: 'Year-round. Spring and autumn are particularly beautiful with wildflowers or autumn color.',
  },

  theologos: {
    intro: 'Theologos was Thassos\'s old capital — a well-preserved mountain village with Ottoman-era architecture, craft workshops, honey and olive oil production. A fascinating cultural stop away from the beaches.',
    activities: [
      { name: 'Village Exploration', description: 'Walk the main street lined with old mansions, craft shops and small churches. Allow 1–2 hours.', category: 'culture' },
      { name: 'Honey & Olive Oil Tasting', description: 'Several small producers offer tastings and sell their products directly. Best quality honey on the island.', category: 'food', priceRange: '€' },
      { name: 'Mountain Hiking', description: 'Trails lead into the pine forests above the village. Ask at the kafeneion for current trail conditions.', category: 'hike' },
      { name: 'Traditional Crafts', description: 'Wood carving, weaving and pottery workshops still active in the village.', category: 'shopping' },
    ],
    dining: [
      { name: 'Mountain tavernas', description: 'Simple, hearty Greek mountain food — grilled lamb, village salad, local wine. Very affordable.', type: 'taverna', priceRange: '€' },
      { name: 'Village kafeneion', description: 'Traditional Greek coffee house on the main square — the social center of the village.', type: 'cafe', priceRange: '€' },
    ],
    gettingAround: [
      'Theologos is 30 minutes by car from Potos, inland from the south coast.',
      'Car is essential — no regular bus service.',
    ],
    tips: [
      'Buy local thyme honey here — significantly better than anything you\'ll find in supermarkets.',
      'Village is cooler than the coast in summer — good midday escape.',
      'Most craft shops and tavernas close for afternoon break (14:00–17:30).',
    ],
    bestTime: 'May–October. Spring and early summer are the most atmospheric.',
  },

  alyki: {
    intro: 'Alyki is one of Thassos\'s most unique spots — twin coves of crystal water with the ruins of an ancient marble quarry rising from the rock between them. Snorkelling among ancient column fragments is an extraordinary experience.',
    activities: [
      { name: 'Twin Coves Swimming', description: 'Two coves side by side with crystal clear water. Left cove has more shade, right is more dramatic.', category: 'beach', tip: 'Right cove (north) has the ancient quarry ruins — swim there.' },
      { name: 'Snorkelling', description: 'The water is incredibly clear. Ancient marble blocks lie just below the surface near the quarry ruins.', category: 'watersport' },
      { name: 'Ancient Marble Quarry', description: 'Free to explore the ruins of a 5th century BC quarry — columns, carved blocks, the ancient harbour wall.', category: 'culture' },
      { name: 'Sunset Walk', description: 'Walk the rocky headland between the two coves at sunset — one of Thassos\'s most romantic spots.', category: 'nature' },
    ],
    dining: [
      { name: 'Alyki beach taverna', description: 'Single taverna at the beach — good fresh fish and cold drinks. Gets busy at lunch.', type: 'taverna', priceRange: '€€' },
    ],
    gettingAround: [
      'Drive only — Alyki is 25km from Limenaria on the south coast road.',
      'Parking is limited — arrive before 10am in July/August.',
    ],
    tips: [
      'Go early morning or late afternoon — midday is very hot with little shade.',
      'Bring your own snorkel and mask if you have them.',
      'The ruins are free and unsupervised — respectful exploration welcomed.',
      'No shade on the rocks — bring hat and sunscreen.',
    ],
    bestTime: 'May–June and September — cooler, less crowded, parking easier.',
  },

  'marble-beach': {
    intro: 'Marble Beach (Saliara) is accessible only by boat — pure white marble rocks tumble into a bay of impossibly turquoise water. One of the most photographed beaches in Greece and entirely worth the boat trip.',
    activities: [
      { name: 'Boat Trip from Limenas', description: 'Day tours to Marble Beach depart from Limenas harbor — book at the harbor kiosks. Usually combined with other stops.', category: 'boat', priceRange: '€€', tip: 'Morning departures have better light for photos.' },
      { name: 'Boat Trip from Skala Rachoni', description: 'Shorter boat trip from the north coast village (15 minutes vs 45 from Limenas).', category: 'boat', priceRange: '€€' },
      { name: 'Swimming', description: 'The water between the marble rocks is extraordinary — crystal clear over white marble bottom.', category: 'beach' },
      { name: 'Photography', description: 'The white marble against turquoise water creates unique images unlike anywhere else in Greece.', category: 'tour' },
    ],
    dining: [
      { name: 'Pack a picnic', description: 'No taverna at the beach — bring food and drinks from your boat or pack a cooler bag.', type: 'grill', priceRange: '€' },
    ],
    gettingAround: [
      'No road access. Boat only.',
      'Tours depart from Limenas and Skala Rachoni.',
      'Some visitors arrive by private boat or hired motorboat from Skala Rachoni.',
    ],
    tips: [
      'Marble rocks get extremely hot in midday sun — water shoes strongly recommended.',
      'Morning visits have calmer water and better photography light.',
      'Combine with other north-coast stops on the boat tour.',
    ],
    bestTime: 'June and September — calmer sea, less crowded, clearer water visibility.',
  },

  giola: {
    intro: 'Giola is a natural rock lagoon carved by centuries of waves near the village of Astris. It\'s connected to the sea through an underwater tunnel and has become one of Greece\'s most iconic natural swimming spots.',
    activities: [
      { name: 'Giola Natural Pool', description: 'A circular rock pool filled with seawater, connected to the open sea. Jump in from the rocks or swim through the tunnel.', category: 'nature', tip: 'Go before 9am — it gets dangerously crowded by 10:30am.' },
      { name: 'Cliff Jumping', description: 'Various heights around the pool (2m to 6m). Judge conditions before jumping — check for boats and other swimmers.', category: 'watersport', tip: 'Only jump if you can see the bottom clearly.' },
      { name: 'Hiking Trail', description: '20-minute rocky trail from the parking area. Bring water and wear proper shoes.', category: 'hike', tip: 'The path is unmarked in places — follow other people or use Google Maps offline.' },
    ],
    dining: [
      { name: 'Potos & Astris tavernas', description: 'No facilities at Giola — the nearest restaurants are in Astris (10 min) or Potos (15 min).', type: 'taverna', priceRange: '€€' },
    ],
    gettingAround: [
      'Drive to the parking area near Astris village (signposted from the main road).',
      'Then 20-minute walk to the pool.',
      'Potos is 15 minutes by car.',
    ],
    tips: [
      'Absolutely go before 9am. After 10am the path and pool are dangerously crowded.',
      'Wear shoes with grip — the rocks are slippery when wet.',
      'Bring your own water and snacks — nothing available at the site.',
      'The underwater tunnel to the sea can be swum through with calm conditions and confidence.',
    ],
    bestTime: 'June and September. July–August gets dangerously overcrowded.',
  },

  philippi: {
    intro: 'Ancient Philippi is a UNESCO World Heritage Site and one of the most important archaeological sites in Northern Greece — where St Paul first preached the Gospel in Europe, and where decisive Roman battles were fought.',
    activities: [
      { name: 'Ancient Philippi Site', description: 'Extensive ruins including a Roman forum, Hellenistic theatre, basilicas and the prison where St Paul was held. Allow 2–3 hours.', category: 'culture', priceRange: '€', tip: 'Combined ticket covers museum and site. Go early morning in summer.' },
      { name: 'Philippi Museum', description: 'Well-curated exhibits of finds from the site — statues, coins, mosaics.', category: 'culture', priceRange: '€' },
      { name: 'Ancient Theatre', description: 'One of the best-preserved ancient theatres in Northern Greece. Used for summer performances.', category: 'culture' },
      { name: 'Baptistery of Lydia', description: 'Riverside site where St Paul baptised Lydia, his first European convert. 3km from the main site.', category: 'culture' },
    ],
    dining: [
      { name: 'Kefalonia city restaurants', description: 'Philippi is 15km from Kefalonia — best to eat in the city before or after your visit.', type: 'restaurant', priceRange: '€€' },
    ],
    gettingAround: [
      'Philippi is 15km west of Kefalonia, easily reached by car (20 minutes).',
      'Local buses run from Kefalonia bus station.',
    ],
    tips: [
      'Combine with a morning in Kefalonia city — 20 minutes apart.',
      'The site is large and exposed — bring water, hat and sunscreen.',
      'Free entry on the first Sunday of each month.',
      'The annual Philippi Festival hosts ancient drama performances in the theatre in July/August.',
    ],
    bestTime: 'April–June and September–October — cooler for walking the extensive site.',
  },

  'kefalonia-old-town': {
    intro: 'The Panagia district is Kefalonia\'s historic heart — a medieval neighbourhood inside Byzantine walls with cobblestone alleys, Ottoman mansions, castle views and a completely different atmosphere from the modern city below.',
    activities: [
      { name: 'Byzantine Castle Walk', description: 'Climb inside the Byzantine castle walls for 360° views over the city, harbor and Thassos Island. Free entry to most areas.', category: 'culture', tip: 'Visit at dusk for golden light on the sea.' },
      { name: 'Panagia Alley Walk', description: 'Wander the narrow cobblestone lanes lined with Ottoman-era houses, small churches and flowering balconies.', category: 'culture', tip: 'Get deliberately lost — every lane reveals something interesting.' },
      { name: 'Mehmed Ali Birthplace', description: 'The preserved 18th-century mansion where Egypt\'s great reformer was born. Fascinating interiors.', category: 'culture' },
      { name: 'Imaret (exterior)', description: 'Magnificent Ottoman imaret (hospice) converted to a luxury hotel. Walk around the exterior — one of the finest Ottoman buildings in Greece.', category: 'culture' },
    ],
    dining: [
      { name: 'Ta Fanaria', description: 'Traditional Greek cuisine in a beautifully restored Panagia district house. Reserve in advance.', type: 'restaurant', priceRange: '€€' },
      { name: 'Imaret Hotel cafe', description: 'Coffee in the Ottoman courtyard of this extraordinary building. A special experience.', type: 'cafe', priceRange: '€€' },
    ],
    gettingAround: [
      'Walk from the harbor (15 minutes uphill) or take a taxi to the castle entrance.',
      'Everything in the old town is on foot — no cars in the narrow lanes.',
      'Steep cobblestones throughout — wear proper shoes.',
    ],
    tips: [
      'Visit in the evening when the day-trippers leave and the light is magical.',
      'The cobblestones are uneven and steep — not suitable for wheelchairs or pushchairs.',
      'Parking at the base of the hill is free in the evening.',
    ],
    bestTime: 'Year-round. Spring and autumn evenings are the most atmospheric.',
  },

};

// ── Tag-based fallback templates ────────────────────────────────────────────

function buildFallback(loc: Location): LocationGuide {
  const tags = loc.tags;
  const type = loc.type;
  const region = loc.region;
  const isBeach = tags.some(t => ['beachfront', 'sandy-beach', 'crystal-water', 'organized-beach', 'long-beach'].includes(t));
  const isVillage = type === 'village' || tags.includes('mountain-village');
  const isFerry = tags.includes('near-ferry') || tags.includes('ferry-port');
  const isIsland = region === 'thassos';
  const isHistoric = tags.some(t => ['historic', 'UNESCO', 'archaeological', 'heritage'].includes(t));

  const activities: GuideActivity[] = [];
  const dining: GuideDining[] = [];
  const gettingAround: string[] = [];
  const tips: string[] = [];

  // Beach activities
  if (isBeach) {
    activities.push({ name: `${loc.name} Beach`, description: `The main draw — swim, sunbathe and enjoy the ${isIsland ? 'crystal-clear Thassos waters' : 'calm Kefalonia coast waters'}.`, category: 'beach', tip: 'Arrive before 10am in peak season for the best spots.' });
    activities.push({ name: 'Beach Watersports', description: 'Pedal boats, kayaks and other watersports typically available from the beach in summer.', category: 'watersport', priceRange: '€€' });
  }

  // Village activities
  if (isVillage) {
    activities.push({ name: 'Village Walk', description: `Explore ${loc.name}'s traditional lanes, local kafeneion and ${isIsland ? 'Aegean island' : 'Northern Greek'} village architecture.`, category: 'culture' });
    activities.push({ name: 'Local Produce', description: 'Look for local honey, olive oil and herbs sold by small producers in the village.', category: 'shopping', priceRange: '€' });
    if (tags.includes('hiking') || tags.includes('mountain-village')) {
      activities.push({ name: 'Hiking Trails', description: 'Walking trails through the surrounding pine forest and hills. Ask locally for current conditions.', category: 'hike' });
    }
  }

  // Ferry/port activities
  if (isFerry) {
    activities.push({ name: `Ferry to ${isIsland ? 'Kefalonia Mainland' : 'Thassos Island'}`, description: `Regular ferry service connects ${loc.name} — ${isIsland ? 'a great day trip to the mainland' : 'the quickest way to reach Thassos'}.`, category: 'boat', priceRange: '€' });
  }

  // Nature/outdoor activities
  if (tags.some(t => ['olive-grove', 'delta', 'nature', 'pine-forest'].includes(t))) {
    activities.push({ name: 'Nature Walks', description: `The surrounding ${tags.includes('pine-forest') ? 'pine forest' : tags.includes('olive-grove') ? 'olive groves' : 'countryside'} around ${loc.name} are ideal for quiet morning walks.`, category: 'nature' });
  }

  // Historic
  if (isHistoric) {
    activities.push({ name: 'Historic Sites', description: `${loc.name} has significant historical heritage — explore the area's ancient and Byzantine remains.`, category: 'culture' });
  }

  // Boat
  if (isIsland && isBeach) {
    activities.push({ name: 'Boat Trips', description: 'Day boat excursions available from the local harbor — explore coves and beaches unreachable by road.', category: 'boat', priceRange: '€€' });
  }

  // Dining fallbacks
  dining.push({ name: 'Local tavernas', description: `${loc.name} has traditional Greek tavernas serving fresh fish, grilled meats and salads. Ask locals for the current favourite.`, type: 'taverna', priceRange: '€€' });
  if (isBeach) {
    dining.push({ name: 'Beach cafes', description: 'Casual cafes and snack bars on or near the beach for coffee, cold drinks and light snacks.', type: 'cafe', priceRange: '€' });
  }
  if (isVillage) {
    dining.push({ name: 'Village kafeneion', description: 'The traditional Greek coffee house is the social heart of the village — great for morning coffee and people-watching.', type: 'cafe', priceRange: '€' });
  }

  // Getting around
  if (isIsland) {
    gettingAround.push('A car or scooter is strongly recommended on Thassos — rent from Limenas port on arrival.');
    gettingAround.push('Bus service exists but is infrequent — check the KTEL schedule if you plan to rely on it.');
  } else {
    gettingAround.push('Car recommended for exploring the wider Kefalonia region.');
    gettingAround.push(`Kefalonia city is ${loc.tags.includes('near-airport') ? '15' : '30–45'} minutes by car.`);
  }
  if (isFerry) {
    gettingAround.push('The ferry port is the main transport hub — timetables posted at the ticket office.');
  }

  // Tips
  tips.push('Most tavernas and shops close for afternoon break from 14:00–17:30 — plan accordingly.');
  if (isBeach) tips.push('Peak season (July–August): arrive at the beach before 10am for a good spot.');
  if (isIsland) tips.push('Thassos tap water is drinkable — refill your bottle freely.');
  if (isVillage) tips.push('Village life moves slowly — embrace it. Morning coffee at the kafeneion is a cultural experience.');
  tips.push(`${loc.name} is at its best in June and September — great weather without peak-season crowds.`);

  const bestTime = loc.demand === 'high'
    ? 'June and September are ideal — warm weather and manageable crowds. July is great, August is peak season.'
    : 'May–October for good weather. This location is quieter than main resorts, which is part of its charm.';

  return {
    intro: loc.description,
    activities,
    dining,
    gettingAround,
    tips,
    bestTime,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export function getGuideForLocation(loc: Location): LocationGuide {
  return GUIDES[loc.slug] ?? buildFallback(loc);
}

export const categoryIcon: Record<string, string> = {
  beach: '🏖',
  boat: '⛵',
  hike: '🥾',
  culture: '🏛',
  watersport: '🏄',
  nature: '🌿',
  food: '🍽',
  shopping: '🛍',
  tour: '🗺',
};

export const diningIcon: Record<string, string> = {
  taverna: '🐟',
  restaurant: '🍽',
  cafe: '☕',
  bar: '🍹',
  meze: '🫙',
  grill: '🥩',
};

export const priceLabel: Record<string, string> = {
  '€': 'Budget-friendly',
  '€€': 'Mid-range',
  '€€€': 'Upscale',
};
