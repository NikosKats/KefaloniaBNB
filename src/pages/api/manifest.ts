import type { APIRoute } from 'astro';

/**
 * Dynamic Web App Manifest — returns page-specific name, short_name, and start_url
 * so each "Add to Home Screen" save gets a unique PWA identity.
 *
 * Usage: <link rel="manifest" href="/api/manifest?page=admin" />
 */

interface ManifestConfig {
  name: string;
  short_name: string;
  start_url: string;
  description: string;
}

const MANIFESTS: Record<string, ManifestConfig> = {
  // Super Admin
  admin: {
    name: 'Kefalonia Admin Dashboard',
    short_name: 'Kefalonia Admin',
    start_url: '/admin',
    description: 'KefaloniaBNB admin dashboard — manage bookings, listings, and platform settings.',
  },
  // Property Owner
  'admin-owner': {
    name: 'Kefalonia Owner Dashboard',
    short_name: 'Kefalonia Owner',
    start_url: '/admin',
    description: 'KefaloniaBNB property owner dashboard — manage your listings and bookings.',
  },
  // Restaurant Owner
  'admin-restaurant': {
    name: 'Kefalonia Restaurant Dashboard',
    short_name: 'Kefalonia Restaurant',
    start_url: '/admin/restaurant',
    description: 'KefaloniaBNB restaurant dashboard — manage reservations and tables.',
  },
  // Community Board
  community: {
    name: 'Kefalonia Community',
    short_name: 'Kefalonia Community',
    start_url: '/community/board',
    description: 'KefaloniaBNB community board — posts, friends, and local events.',
  },
  // Messages
  messages: {
    name: 'Kefalonia Messages',
    short_name: 'Kefalonia Messages',
    start_url: '/account/messages',
    description: 'KefaloniaBNB messaging — chat with community members.',
  },
  // My Bookings (guest)
  bookings: {
    name: 'Kefalonia My Bookings',
    short_name: 'My Bookings',
    start_url: '/my-bookings',
    description: 'View and manage your KefaloniaBNB bookings.',
  },
  // My Account
  account: {
    name: 'Kefalonia My Account',
    short_name: 'My Account',
    start_url: '/account',
    description: 'Your KefaloniaBNB account — profile, notifications, and settings.',
  },
  // Favorites
  favorites: {
    name: 'Kefalonia Favorites',
    short_name: 'Kefalonia Favorites',
    start_url: '/account/favorites',
    description: 'Your saved favorite listings on KefaloniaBNB.',
  },
  // Cleaner Portal
  cleaner: {
    name: 'Kefalonia Cleaner Portal',
    short_name: 'Kefalonia Cleaner',
    start_url: '/cleaner/dashboard',
    description: 'KefaloniaBNB cleaner portal — find jobs and manage payouts.',
  },
  // Rentals browsing
  rentals: {
    name: 'KefaloniaBNB',
    short_name: 'KefaloniaBNB',
    start_url: '/rentals',
    description: 'Browse vacation rentals in Keramoti & Kefalonia, Greece.',
  },
  // Notifications
  notifications: {
    name: 'Kefalonia Notifications',
    short_name: 'Kefalonia Notifs',
    start_url: '/account/notifications',
    description: 'Your KefaloniaBNB notifications.',
  },
  // Friends
  friends: {
    name: 'Kefalonia Friends',
    short_name: 'Kefalonia Friends',
    start_url: '/account/friends',
    description: 'Your friends on KefaloniaBNB community.',
  },
};

const DEFAULT_MANIFEST: ManifestConfig = {
  name: 'KefaloniaBNB — Vacation & Community',
  short_name: 'KefaloniaBNB',
  start_url: '/',
  description: 'Vacation rentals in Keramoti & Kefalonia, Greece. Community, messaging & more.',
};

export const GET: APIRoute = async ({ url }) => {
  const page = url.searchParams.get('page') ?? '';
  const config = MANIFESTS[page] ?? DEFAULT_MANIFEST;

  const manifest = {
    name: config.name,
    short_name: config.short_name,
    description: config.description,
    start_url: config.start_url,
    display: 'standalone',
    background_color: '#1a1a2e',
    theme_color: '#1a1a2e',
    orientation: 'portrait-primary',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    categories: ['travel', 'social'],
    lang: 'en',
    scope: '/',
  };

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
