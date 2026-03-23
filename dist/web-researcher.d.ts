import OpenAI from 'openai';
import type { TopicSuggestion, AutoBloggerConfig, TopicResearch } from './types.js';
export declare function researchTopic(openai: OpenAI, topic: TopicSuggestion, config: AutoBloggerConfig, lang: string): Promise<TopicResearch>;
//# sourceMappingURL=web-researcher.d.ts.map