// src/lib/pages.mjs
export const PAGE_FILES = ['README.md', 'About.md'];
export const PAGE_GLOB_EXCLUDES = PAGE_FILES.map((f) => `!${f}`);