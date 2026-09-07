// src/lib/topics.ts
import { getCollection, type CollectionEntry } from 'astro:content';
import { warn } from './warn';
import { sortByPubDate } from './dates';

type Post = CollectionEntry<'blog'>;

const SLUG_OVERRIDES: Record<string, string> = {
  'c#': 'c-sharp',
  'c++': 'cpp',
  'f#': 'f-sharp',
  '.net': 'dotnet',
};

export function slugifyTopic(topic: string): string {
  const key = topic.trim().toLowerCase();
  if (key in SLUG_OVERRIDES) return SLUG_OVERRIDES[key];

  return topic
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Variants differing only by case or whitespace are an intended merge. */
function casefoldKey(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface TopicInfo {
  slug: string;
  display: string;
  variants: Map<string, number>;
  posts: Post[];
}

let cached: Map<string, TopicInfo> | null = null;

export async function getTopicRegistry(): Promise<Map<string, TopicInfo>> {
  if (cached) return cached;

  const posts = await getCollection('blog');
  const registry = new Map<string, TopicInfo>();

  for (const post of posts) {
    for (const raw of post.data.topics ?? []) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      const slug = slugifyTopic(trimmed);
      if (!slug) {
        warn(`Topic "${trimmed}" in ${post.id} slugs to an empty string; skipped. Add a SLUG_OVERRIDES entry.`);
        continue;
      }

      let info = registry.get(slug);
      if (!info) {
        info = { slug, display: trimmed, variants: new Map(), posts: [] };
        registry.set(slug, info);
      }
      info.variants.set(trimmed, (info.variants.get(trimmed) ?? 0) + 1);
      if (!info.posts.includes(post)) info.posts.push(post);
    }
  }

  for (const info of registry.values()) {
    // Most frequent wins; alphabetical tie-break keeps builds deterministic.
    info.display = [...info.variants.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    )[0][0];

    const concepts = new Set([...info.variants.keys()].map(casefoldKey));
    if (concepts.size > 1) {
      warn(
        `Slug "${info.slug}" collides across distinct topics: ${[...concepts]
          .map((c) => `"${c}"`)
          .join(', ')}. Add SLUG_OVERRIDES entries to separate them.`
      );
    }

    info.posts = sortByPubDate(info.posts);
  }

  cached = registry;
  return registry;
}

export async function getSortedTopics(): Promise<TopicInfo[]> {
  const registry = await getTopicRegistry();
  return [...registry.values()].sort(
    (a, b) => b.posts.length - a.posts.length || a.display.localeCompare(b.display)
  );
}
