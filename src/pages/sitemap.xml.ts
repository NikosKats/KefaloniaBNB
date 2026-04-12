import type { APIRoute } from 'astro';
import { getServiceClient } from '../lib/supabase.ts';
import { ALL_LOCATIONS } from '../lib/locations.ts';

export const GET: APIRoute = async () => {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? 'https://kefaloniabnb.com';
  const service = getServiceClient();
  const LANGS = ['el', 'bg', 'ro', 'tr'] as const;

  const [{ data: listings }, { data: blogPosts }] = await Promise.all([
    service.from('listings').select('slug, updated_at, title, listing_images(*)').eq('is_active', true),
    service.from('blog_posts').select('slug, updated_at, published_at').eq('is_published', true),
  ]);

  // ── Static pages ───────────────────────────────────────────────────────────
  const staticPages = [
    // Core — highest priority
    { url: '/',                      priority: '1.0', changefreq: 'weekly'  },
    { url: '/rentals',               priority: '0.9', changefreq: 'daily'   },
    { url: '/locations',             priority: '0.9', changefreq: 'weekly'  },

    // Destination filters (Kefalonia vs Thassos)
    { url: '/rentals?region=kefalonia', priority: '0.9', changefreq: 'daily'   },
    { url: '/rentals?region=thassos',priority: '0.9', changefreq: 'daily'   },

    // Key marketing / conversion pages
    { url: '/blog',                  priority: '0.8', changefreq: 'weekly'  },
    { url: '/for-owners',            priority: '0.8', changefreq: 'monthly' },
    { url: '/why-not-airbnb',        priority: '0.8', changefreq: 'monthly' },
    { url: '/list-your-property',    priority: '0.8', changefreq: 'monthly' },
    { url: '/become-a-cleaner',      priority: '0.7', changefreq: 'monthly' },
    { url: '/services',              priority: '0.6', changefreq: 'monthly' },

    // Info pages
    { url: '/area-guide',            priority: '0.8', changefreq: 'monthly' },
    { url: '/about',                 priority: '0.7', changefreq: 'monthly' },
    { url: '/faqs',                  priority: '0.7', changefreq: 'monthly' },
    { url: '/contact',               priority: '0.6', changefreq: 'monthly' },

    // Policy pages
    { url: '/cancellation-policy',   priority: '0.4', changefreq: 'yearly'  },
    { url: '/privacy-policy',        priority: '0.3', changefreq: 'yearly'  },
    { url: '/terms',                 priority: '0.3', changefreq: 'yearly'  },
  ];

  const today = new Date().toISOString().split('T')[0];

  // Build hreflang block for multilingual pages
  function hreflangBlock(canonical: string): string {
    const alts = [
      `      <xhtml:link rel="alternate" hreflang="en"        href="${canonical}" />`,
      ...LANGS.map((l) => `      <xhtml:link rel="alternate" hreflang="${l}" href="${canonical}?lang=${l}" />`),
      `      <xhtml:link rel="alternate" hreflang="x-default" href="${canonical}" />`,
    ];
    return alts.join('\n');
  }

  function urlEntry({
    loc,
    lastmod = today,
    changefreq,
    priority,
    imageBlock = '',
    withHreflang = false,
  }: {
    loc: string;
    lastmod?: string;
    changefreq: string;
    priority: string;
    imageBlock?: string;
    withHreflang?: boolean;
  }) {
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${withHreflang ? hreflangBlock(loc) : ''}${imageBlock}
  </url>`;
  }

  // ── Static page entries ────────────────────────────────────────────────────
  const staticEntries = staticPages.map((p) =>
    urlEntry({
      loc: `${siteUrl}${p.url}`,
      changefreq: p.changefreq,
      priority: p.priority,
      withHreflang: !p.url.includes('?'),  // skip hreflang for ?region= pages
    }),
  );

  // ── Location SEO pages ─────────────────────────────────────────────────────
  // Priority by demand level
  const demandPriority: Record<string, string> = {
    high: '0.85',
    medium: '0.75',
    emerging: '0.65',
  };

  const locationEntries = ALL_LOCATIONS.map((loc) =>
    urlEntry({
      loc: `${siteUrl}/locations/${loc.slug}`,
      changefreq: 'weekly',
      priority: demandPriority[loc.demand] ?? '0.7',
      withHreflang: true,
    }),
  );

  // ── Individual listing pages ───────────────────────────────────────────────
  const listingEntries = (listings ?? []).map((l: any) => {
    const loc = `${siteUrl}/rentals/${l.slug}`;
    const lastmod = l.updated_at?.split('T')[0] ?? today;

    const images: any[] = l.listing_images ?? [];
    const cover = images.find((i: any) => i.is_cover) ?? images[0];
    const imageBlock = cover
      ? `    <image:image>
      <image:loc>${escapeXml(cover.url)}</image:loc>
      <image:title>${escapeXml(l.title ?? '')}</image:title>
    </image:image>`
      : '';

    return urlEntry({
      loc,
      lastmod,
      changefreq: 'weekly',
      priority: '0.9',
      imageBlock,
      withHreflang: true,
    });
  });

  // ── Blog post entries ──────────────────────────────────────────────────
  const blogEntries = (blogPosts ?? []).map((p: any) =>
    urlEntry({
      loc: `${siteUrl}/blog/${p.slug}`,
      lastmod: (p.updated_at ?? p.published_at ?? today).split('T')[0],
      changefreq: 'monthly',
      priority: '0.7',
    }),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
>
${[...staticEntries, ...locationEntries, ...listingEntries, ...blogEntries].join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
