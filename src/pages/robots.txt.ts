import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? 'https://kefaloniabnb.com';

  const body = `User-agent: *
Allow: /
Allow: /rentals
Allow: /locations
Allow: /rentals/
Allow: /locations/

Disallow: /admin/
Disallow: /api/
Disallow: /book/
Disallow: /owner/
Disallow: /cleaner/
Disallow: /my-booking
Disallow: /review
Disallow: /*?lang=*

# Googlebot — explicit allow for key paths
User-agent: Googlebot
Allow: /
Allow: /rentals/
Allow: /locations/
Allow: /why-not-airbnb
Allow: /list-your-property
Allow: /area-guide
Disallow: /admin/
Disallow: /api/
Disallow: /book/
Disallow: /owner/
Disallow: /cleaner/

User-agent: Bingbot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /book/
Disallow: /owner/
Disallow: /cleaner/

Crawl-delay: 1

Sitemap: ${siteUrl}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
