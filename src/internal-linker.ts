import type { ContentInventory, AutoBloggerConfig } from './types.js';

/**
 * Validates that internal links in the generated markdown point to real pages.
 * Removes broken links (replaces with plain text).
 */
export function validateInternalLinks(
    markdown: string,
    inventory: ContentInventory,
    config: AutoBloggerConfig,
    lang: string
): string {
    const validSlugs = new Set(
        [...inventory.posts, ...inventory.guides]
            .filter((item) => item.lang === lang)
            .map((item) => item.slug)
    );

    return markdown.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (match, text: string, url: string) => {
            const siteUrl = config.siteUrl.replace(/\/$/, '');
            const normalizedUrl = url.startsWith(siteUrl)
                ? url.slice(siteUrl.length)
                : url;

            // Skip truly external links
            if (
                normalizedUrl.startsWith('http://') ||
                normalizedUrl.startsWith('https://')
            ) {
                return match;
            }

            const parts = normalizedUrl.split('/').filter(Boolean);
            const slug = parts[parts.length - 1];

            const isGuidePath = normalizedUrl.includes(
                config.internalLinks.guidesBaseUrl
            );
            const isBlogPath = normalizedUrl.includes(
                config.internalLinks.blogBaseUrl
            );

            if ((isGuidePath || isBlogPath) && !validSlugs.has(slug)) {
                console.warn(`Removing broken internal link: ${url}`);
                return text;
            }

            // Convert full URLs to relative paths
            if (url.startsWith(siteUrl)) {
                return `[${text}](${normalizedUrl})`;
            }

            return match;
        }
    );
}
