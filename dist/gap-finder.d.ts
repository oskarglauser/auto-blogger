import OpenAI from 'openai';
import type { ContentInventory, AutoBloggerConfig, TopicSuggestion } from './types.js';
export declare function findContentGaps(openai: OpenAI, inventory: ContentInventory, config: AutoBloggerConfig, lang: string): Promise<TopicSuggestion[]>;
//# sourceMappingURL=gap-finder.d.ts.map