import type { AutoBloggerConfig } from './types.js';
import { sanitizeMarkdown } from './utils.js';
export { sanitizeMarkdown };
export interface PipelineOptions {
    dryRun?: boolean;
    targetLang?: string;
}
export declare function runPipeline(config: AutoBloggerConfig, options?: PipelineOptions): Promise<void>;
//# sourceMappingURL=pipeline.d.ts.map