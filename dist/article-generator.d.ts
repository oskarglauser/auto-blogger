import OpenAI from 'openai';
import type { AutoBloggerConfig, TopicSuggestion, ContentInventory, GeneratedArticle } from './types.js';
export declare function generateArticle(openai: OpenAI, topic: TopicSuggestion, inventory: ContentInventory, config: AutoBloggerConfig, lang: string, research?: string): Promise<GeneratedArticle>;
//# sourceMappingURL=article-generator.d.ts.map