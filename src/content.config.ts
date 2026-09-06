import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { fromZonedTime } from 'date-fns-tz';
import { bloglide } from './lib/config';

const wallClock = z.union([z.string(), z.date()]).transform((v) => {
  // js-yaml parses naive timestamps as UTC; recover the author's wall clock.
  const s = v instanceof Date ? v.toISOString().slice(0, 19) : v;
  const naive = s.length === 10 ? `${s}T00:00:00` : s.slice(0, 19);
  return fromZonedTime(naive, bloglide.site.timezone);
});

const blog = defineCollection({
	loader: glob({
  		pattern: ['**/*.{md,mdx}', '!README.md', '!**/_*/**', '!**/_*.{md,mdx}'],
  		base: './src/content/blog',
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: wallClock.optional(),
			updatedDate: wallClock.optional(),
			heroImage: z.string().optional(),
			visibility: z.enum(['public', 'friends', 'private']).default('public'),
			topics: z.array(z.string()).default([]),
			// Obsidian-native fields: accepted, never read by Bloglide.
			tags: z.array(z.string()).optional(),
			aliases: z.array(z.string()).optional(),
			cssclasses: z.array(z.string()).optional(),
		}).strict(),
});

export const collections = { blog };
