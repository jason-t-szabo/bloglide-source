// src/lib/pages.mjs
const anyCase = (name) =>
  name.replace(/[A-Za-z]/g, (c) => `[${c.toLowerCase()}${c.toUpperCase()}]`);

export const PAGE_FILES = ['About.md'];
export const IGNORED_FILES = ['README.md'];

export const PAGE_GLOBS = PAGE_FILES.map(anyCase);
export const BLOG_GLOB_EXCLUDES = [...PAGE_FILES, ...IGNORED_FILES].map(
  (f) => `!${anyCase(f)}`
);

const PAGE_KEYS = new Set(PAGE_FILES.map((f) => f.toLowerCase()));
export const isPage = (key) => PAGE_KEYS.has(key.toLowerCase());