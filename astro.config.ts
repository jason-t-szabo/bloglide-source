// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { bloglide } from './src/lib/config';
import { unified } from '@astrojs/markdown-remark';
import { remarkVaultPaths } from './plugins/remark-vault-paths.mjs';

// https://astro.build/config
export default defineConfig({
  site: bloglide.site.url,
  base: bloglide.site.base,
  markdown: { processor: unified({ remarkPlugins: [remarkVaultPaths] }) },
  vite: {
    plugins: [tailwindcss()]
  },
});
