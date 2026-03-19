import { readFileSync } from 'fs';
import { glob } from 'glob';
import matter from 'gray-matter';
import type { AutoBloggerConfig, ContentItem, ContentInventory } from './types.js';

export async function analyzeContent(
    config: AutoBloggerConfig
): Promise<ContentInventory> {
    const posts = await readMarkdownFiles(config.contentDir, 'blog');
    const guides = config.guidesDir
        ? await readMarkdownFiles(config.guidesDir, 'guide')
        : [];

    const allItems = [...posts, ...guides];
    const allTitles = allItems.map((item) => item.title);
    const allTags = [...new Set(allItems.flatMap((item) => item.tags))];

    const linkTargets = allItems.map((item) => ({
        slug: item.slug,
        title: item.title,
        type: item.type,
    }));

    return { posts, guides, allTitles, allTags, linkTargets };
}

async function readMarkdownFiles(
    dir: string,
    type: 'blog' | 'guide'
): Promise<ContentItem[]> {
    const files = await glob(`${dir}/**/*.md`);
    const items: ContentItem[] = [];

    for (const file of files) {
        try {
            const content = readFileSync(file, 'utf-8');
            const { data } = matter(content);

            const slug = file
                .split('/')
                .pop()!
                .replace(/\.md$/, '');

            items.push({
                title: data.title || slug,
                description: data.description,
                slug,
                tags: data.tags || [],
                lang: data.lang || 'en',
                type,
                publishDate: data.publishDate
                    ? new Date(data.publishDate)
                    : undefined,
            });
        } catch {
            // Skip files that can't be parsed
        }
    }

    return items;
}
