// Mirrors Astro's glob-loader ID generation closely enough to detect
// collisions. Used for diagnostics only — never to construct URLs.
export const slugifyPath = (key) =>
  key
    .replace(/\.mdx?$/i, '')
    .split('/')
    .map((seg) =>
      seg
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    )
    .join('/')