import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// Raw zod schemas are exported separately (in addition to the
// defineCollection-wrapped versions below) so they can be unit-tested in
// isolation with plain objects, without needing a full Astro content build.
export const officerSchema = z.object({
  name: z.string(),
  role: z.string(),
  photo: z.string().optional(),
  bio: z.string().optional(),
  links: z.object({ linkedin: z.string().optional(), github: z.string().optional() }).optional(),
});

export const workshopSchema = z.object({
  title: z.string(),
  day: z.string(),
  time: z.string(),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  description: z.string().optional(),
});

export const eventSchema = z.object({
  title: z.string(),
  date: z.string(),
  type: z.enum(['hackathon', 'competition', 'talk']),
  description: z.string().optional(),
  link: z.string().optional(),
});

export const showcaseSchema = z.object({
  title: z.string(),
  event: z.string(),
  team: z.array(z.string()).optional(),
  devpostUrl: z.string().optional(),
  image: z.string().optional(),
  description: z.string().optional(),
});

const officers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/officers' }),
  schema: officerSchema,
});

const workshops = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/workshops' }),
  schema: workshopSchema,
});

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: eventSchema,
});

const showcase = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/showcase' }),
  schema: showcaseSchema,
});

export const collections = { officers, workshops, events, showcase };
