// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://rekapu.com',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru', 'uk'],
    routing: {
      prefixDefaultLocale: true,
    }
  },
  integrations: [tailwind()],
});