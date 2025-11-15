import { defineCollection, z } from 'astro:content';

const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().optional(),
    section: z.enum(['getting-started', 'guides', 'advanced', 'help']),
    draft: z.boolean().optional(),
  }),
});

export const collections = {
  docs,
};

// Docs are organized by locale: docs/en/*.md, docs/es/*.md, etc.

