import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	loader: glob({
  		pattern: ['**/*.{md,mdx}', '!README.md', '!_*/**', '!**/_*.{md,mdx}'],
  		base: './src/content/blog',
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			visibility: z.enum(['public', 'friends', 'private']).default('public'),
			draft: z.boolean().default(false),
			topics: z.array(z.string()).default([]),
			// Obsidian-native fields: accepted, never read by Bloglide.
			tags: z.array(z.string()).optional(),
			aliases: z.array(z.string()).optional(),
			cssclasses: z.array(z.string()).optional(),
		}).strict(),
});

export const collections = { blog };
