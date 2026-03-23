/**
 * Strip markdown code fences from LLM JSON responses.
 */
export declare function stripCodeFences(text: string): string;
/**
 * Parse a JSON response from an LLM, stripping code fences and handling errors.
 */
export declare function parseJsonResponse<T>(text: string, fallback: T): T;
/**
 * Clean up common GPT output issues:
 * - Convert task list checkboxes to regular bullets
 * - Remove trailing meta description / SEO notes from body
 * - Strip dangerous HTML tags
 */
export declare function sanitizeMarkdown(markdown: string): string;
/**
 * Print a labeled dry-run block to the console.
 */
export declare function printDryRunBlock(label: string, content: string): void;
//# sourceMappingURL=utils.d.ts.map