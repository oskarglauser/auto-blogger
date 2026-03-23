import type { ContentInventory, AutoBloggerConfig } from './types.js';
/**
 * Validates that internal links in the generated markdown point to real pages.
 * Removes broken links (replaces with plain text).
 */
export declare function validateInternalLinks(markdown: string, inventory: ContentInventory, config: AutoBloggerConfig, lang: string): string;
//# sourceMappingURL=internal-linker.d.ts.map