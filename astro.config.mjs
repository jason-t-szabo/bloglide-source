// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('./bloglide.config.json', 'utf8'));

// https://astro.build/config
export default defineConfig({
  site: config.site.url,
  base: config.site.base,
  vite: {
    plugins: [tailwindcss()]
  }
});
