// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

const SITE_URL = process.env.SITE_URL ?? 'https://humanizerbench.example.com';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  // `static` output by default; individual routes opt-in to server rendering
  // by exporting `prerender = false` (currently only /api/subscribe).
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  integrations: [react(), sitemap(), mdx()],
  build: {
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
});
