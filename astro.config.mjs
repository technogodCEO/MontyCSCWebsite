// @ts-check
import { defineConfig } from 'astro/config';

import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://montycsc.example.com', // TODO: replace with real production domain once known
  integrations: [vue(), sitemap()],

  // The sign-up API route (src/pages/api/signup.ts) needs on-demand rendering, so the site as a
  // whole now needs a server adapter even though every other page still prerenders statically.
  adapter: vercel(),

  vite: {
    plugins: [tailwindcss()]
  }
});