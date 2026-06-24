import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Journal posts are plain Markdown files in src/content/journal.
// Add a new article by dropping in a new .md file with this frontmatter.
const journal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/journal' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tag: z.string(),
    readingTime: z.string(),
    author: z.string().default('FORTA'),
    authorRole: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { journal };
