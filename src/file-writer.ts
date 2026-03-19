import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import slugify from 'slugify';
import matter from 'gray-matter';
import type { AutoBloggerConfig, WriteResult } from './types.js';

export function writeArticle(
    markdown: string,
    config: AutoBloggerConfig,
    lang: string,
    forceSlug?: string
): WriteResult {
    const { data, content } = matter(markdown);

    if (!data.title) {
        throw new Error('Generated article missing title in frontmatter');
    }
    if (!data.description) {
        throw new Error(
            'Generated article missing description in frontmatter'
        );
    }

    // Sanitize forceSlug if provided (re-slugify to prevent path traversal)
    const slug = forceSlug
        ? slugify(forceSlug, { lower: true, strict: true })
        : slugify(data.title, { lower: true, strict: true, locale: lang });

    if (!slug) {
        throw new Error('Generated slug is empty');
    }

    const dir = join(config.contentDir, lang);
    const filePath = join(dir, `${slug}.md`);
    const resolvedPath = resolve(filePath);
    const resolvedBase = resolve(config.contentDir);

    if (!resolvedPath.startsWith(resolvedBase)) {
        throw new Error(`Path traversal detected: ${filePath}`);
    }

    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    if (existsSync(filePath)) {
        throw new Error(`Article already exists: ${filePath}`);
    }

    const validatedFrontmatter = {
        title: data.title,
        description: data.description,
        publishDate:
            data.publishDate || new Date().toISOString().split('T')[0],
        lang,
        tags: Array.isArray(data.tags) ? data.tags : [],
        author: data.author || config.siteName,
        category: data.category || config.topic.primary,
        ...(data.seoTitle ? { seoTitle: data.seoTitle } : {}),
    };

    const output = matter.stringify(content.trim(), validatedFrontmatter);
    writeFileSync(filePath, output, 'utf-8');

    return {
        filePath,
        slug,
        title: data.title,
    };
}
