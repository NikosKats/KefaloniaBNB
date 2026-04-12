// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

const isProduction = process.env.NODE_ENV === 'production';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  // @cloudflare/vite-plugin (used by the adapter) requires miniflare to run
  // locally, which fails in dev. Skip the adapter in dev — Astro's built-in
  // dev server handles SSR fine. The adapter is only needed for `astro build`.
  adapter: isProduction ? cloudflare() : undefined,
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    // All images served from Supabase CDN — skip local optimisation
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
});
