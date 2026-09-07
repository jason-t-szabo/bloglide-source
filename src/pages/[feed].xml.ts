// src/pages/[feed].xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { bloglide } from '../lib/config';
import { href } from '../lib/paths';
import { sortByPubDate } from '../lib/dates';

export async function getStaticPaths() {
  return bloglide.features.rss ? [{ params: { feed: 'rss' } }] : [];
}

export async function GET(context: APIContext) {
  const filteredPosts = (await getCollection('blog'))
    .filter((post) => post.data.pubDate && post.data.visibility === 'public')
  const posts = sortByPubDate(filteredPosts)
  
  return rss({
    title: bloglide.site.title,
    description: bloglide.site.description,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: href(`posts/${post.id}/`),
      categories: post.data.topics,
    })),
    customData:
      `<language>${bloglide.site.language}</language>` +
      `<atom:link href="${new URL(href('rss.xml'), bloglide.site.url)}" ` +
      `rel="self" type="application/rss+xml"/>`,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
  });
}
