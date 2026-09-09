// src/lib/titles.ts
import type { CollectionEntry } from 'astro:content';

export function entryTitle(
  entry: CollectionEntry<'blog'> | CollectionEntry<'pages'>
): string {
  if (entry.data.title) return entry.data.title;
  const file = entry.filePath?.split('/').pop() ?? entry.id;
  return file.replace(/\.mdx?$/i, '');
}
