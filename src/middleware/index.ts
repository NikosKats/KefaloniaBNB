import { defineMiddleware } from 'astro:middleware';
import { createSupabaseServerClient, getServiceClient } from '../lib/supabase.ts';
import { isValidLang, DEFAULT_LANG, type Lang } from '../i18n/translations.ts';

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, locals, redirect } = context;
  const path = url.pathname;

  // ── Referral tracking — capture ?ref= param, store in cookie ──────────
  const refCode = url.searchParams.get('ref');
  if (refCode) {
    cookies.set('ref_source', refCode, { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax', httpOnly: false });
    // Fire-and-forget: track click in DB
    fetch(new URL('/api/referral/track', url).href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref_code: refCode, landing_page: url.pathname }),
    }).catch(() => {/* ignore */});
  }

  // ── Language detection ─────────────────────────────────────────────────
  // Priority: ?lang= query param > lang cookie > Accept-Language header > default
  const queryLang  = url.searchParams.get('lang');
  const cookieLang = cookies.get('lang')?.value;
  const acceptLang = context.request.headers.get('accept-language')?.split(',')[0]?.split('-')[0];

  let lang: Lang = DEFAULT_LANG;
  if (queryLang && isValidLang(queryLang)) {
    lang = queryLang;
    cookies.set('lang', lang, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  } else if (cookieLang && isValidLang(cookieLang)) {
    lang = cookieLang;
  } else if (acceptLang && isValidLang(acceptLang)) {
    lang = acceptLang;
  }
  locals.lang = lang;

  // Attach Supabase client to every request
  const supabase = createSupabaseServerClient(context.request, cookies);
  locals.supabase = supabase;

  // SECURITY: Use getUser() to validate the JWT server-side with Supabase Auth.
  // getSession() only reads from the cookie without verification, allowing JWT forgery.
  const { data: { user } } = await supabase.auth.getUser();
  // After validation, extract the access_token from session for client-side realtime
  let accessToken = '';
  if (user) {
    const { data: { session: rawSession } } = await supabase.auth.getSession();
    accessToken = rawSession?.access_token ?? '';
  }
  // Construct a session-like object so existing code (locals.session.user.id) works
  const session = user ? { user, access_token: accessToken, refresh_token: '', expires_in: 0, expires_at: 0, token_type: '' } as any : null;
  locals.session = session;

  // Default ownerListingIds/ownerRestaurantIds to empty (populated below for owners)
  locals.ownerListingIds = [];
  locals.ownerRestaurantIds = [];

  // Guard /admin/* and /api/admin/* routes (except /admin/login)
  const isAdminPage = path.startsWith('/admin') && !path.startsWith('/admin/login') && !path.startsWith('/admin/set-password');
  const isAdminApi  = path.startsWith('/api/admin');

  // Guard /cleaner/* and /owner/* routes
  const isCleanerPage = path.startsWith('/cleaner') && !path.startsWith('/cleaner/login') && !path.startsWith('/cleaner/signup') && !path.startsWith('/cleaner/set-password');
  const isOwnerPage   = path.startsWith('/owner');

  if (isAdminPage || isAdminApi || isCleanerPage || isOwnerPage) {
    if (!session) {
      if (isAdminApi) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (isCleanerPage) return redirect('/cleaner/login?next=' + encodeURIComponent(path));
      if (isOwnerPage)   return redirect('/admin/login?next=' + encodeURIComponent(path));
      return redirect('/admin/login?next=' + encodeURIComponent(path));
    }

    // Fetch profile for all guarded routes
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    // Cleaner pages: allow cleaner role + admin/super_admin
    if (isCleanerPage) {
      const allowedOnCleanerPages = ['cleaner', 'admin', 'super_admin'];
      if (!profile || !allowedOnCleanerPages.includes(profile.role)) {
        return redirect('/cleaner/login?error=unauthorized');
      }
      locals.profile = profile;
      return next();
    }

    // Admin / owner pages: require admin/super_admin/property_owner/restaurant_owner
    if (!profile || !['admin', 'super_admin', 'property_owner', 'restaurant_owner'].includes(profile.role)) {
      if (isAdminApi) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      await supabase.auth.signOut();
      return redirect('/admin/login?error=unauthorized');
    }
    locals.profile = profile;

    // Property owners: scope to their own listings (service client bypasses RLS so inactive listings are included)
    if (profile.role === 'property_owner') {
      const { data: ownedListings } = await getServiceClient()
        .from('listings')
        .select('id')
        .eq('owner_id', session.user.id);
      locals.ownerListingIds = ownedListings?.map((l: { id: string }) => l.id) ?? [];

      // Block pages property_owners can't access
      const ownerBlocked = ['/admin/owners', '/admin/platform', '/admin/telegram', '/admin/coupons', '/admin/content', '/admin/reviews'];
      if (isAdminPage && ownerBlocked.some((p) => path.startsWith(p))) {
        return redirect('/admin');
      }
    }

    // Restaurant owners: scope to their own restaurants
    if (profile.role === 'restaurant_owner') {
      const { data: ownedRestaurants } = await getServiceClient()
        .from('restaurants')
        .select('id')
        .eq('owner_id', session.user.id);
      locals.ownerRestaurantIds = ownedRestaurants?.map((r: { id: string }) => r.id) ?? [];

      // Restaurant owners can only access /admin/restaurant/* pages
      const restaurantOwnerAllowed = ['/admin/restaurant', '/admin/profile', '/admin/qr-codes'];
      if (isAdminPage && !restaurantOwnerAllowed.some((p) => path.startsWith(p)) && path !== '/admin') {
        return redirect('/admin/restaurant');
      }
    }
  }

  // Populate locals.profile for all authenticated users (not just admin routes)
  // This ensures API endpoints like /api/availability/block can check the role
  if (session && !locals.profile) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (profile) locals.profile = profile;
  }

  const response = await next();

  // Never cache admin pages — always serve fresh from the worker
  if (path.startsWith('/admin')) {
    response.headers.set('Cache-Control', 'no-store');
  }

  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://unpkg.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co https://img.shields.io https://*.tile.openstreetmap.org https://images.unsplash.com https://www.google-analytics.com https://www.facebook.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://www.facebook.com https://connect.facebook.net; frame-src https://js.stripe.com https://www.facebook.com; object-src 'none';"
  );
  return response;
});
