// src/lib/dates.ts
import type { CollectionEntry } from 'astro:content'

/** Undated posts exist only in local dev; treat them as newest. */
export function sortByPubDate(
  posts: CollectionEntry<'blog'>[]
): CollectionEntry<'blog'>[] {
  const when = (p: CollectionEntry<'blog'>) =>
    p.data.pubDate?.valueOf() ?? Number.MAX_SAFE_INTEGER
  return [...posts].sort((a, b) => when(b) - when(a))
}
