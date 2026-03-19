// Core pipeline
export { runPipeline, sanitizeMarkdown } from './pipeline.js';
export type { PipelineOptions } from './pipeline.js';

// Individual steps (for custom pipelines)
export { analyzeContent } from './content-analyzer.js';
export { findContentGaps } from './gap-finder.js';
export { researchTopic } from './web-researcher.js';
export { generateArticle } from './article-generator.js';
export { validateInternalLinks } from './internal-linker.js';
export { writeArticle } from './file-writer.js';

// Types
export type {
    AutoBloggerConfig,
    LanguagePrompts,
    ArticlePromptParams,
    ContentItem,
    ContentInventory,
    TopicSuggestion,
    TopicResearch,
    GeneratedArticle,
    WriteResult,
} from './types.js';
