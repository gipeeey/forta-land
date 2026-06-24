// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// NOTE: replace `site` with FORTA's real domain when chosen.
// It powers canonical URLs, the sitemap and RSS absolute links.
export default defineConfig({
  site: 'https://forta.studio',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
});
