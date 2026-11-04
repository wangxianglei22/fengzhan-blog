import { defineCollection, z } from "astro:content";

const postsCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		hidden: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});
const diaryCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		date: z.date(),
		mood: z.string().default("😊"),
		moodLabel: z.string().optional().default("今天的心情"),
		excerpt: z.string().optional().default(""),
		cover: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		pinned: z.boolean().optional().default(false),
		draft: z.boolean().optional().default(false),
		hidden: z.boolean().optional().default(false),
	}),
});
const specCollection = defineCollection({
	schema: z.object({}),
});
export const collections = {
	posts: postsCollection,
	diary: diaryCollection,
	spec: specCollection,
};
