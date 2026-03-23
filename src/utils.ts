import matter from 'gray-matter';

/**
 * Strip markdown code fences from LLM JSON responses.
 */
export function stripCodeFences(text: string): string {
    return text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
}

/**
 * Parse a JSON response from an LLM, stripping code fences and handling errors.
 */
export function parseJsonResponse<T>(text: string, fallback: T): T {
    try {
        const cleaned = stripCodeFences(text);
        return JSON.parse(cleaned) as T;
    } catch {
        return fallback;
    }
}

/**
 * Clean up common GPT output issues:
 * - Convert task list checkboxes to regular bullets
 * - Remove trailing meta description / SEO notes from body
 * - Strip dangerous HTML tags
 */
export function sanitizeMarkdown(markdown: string): string {
    // Strip wrapping code fences that LLMs sometimes add (```markdown ... ```)
    let stripped = markdown.trim();
    if (stripped.startsWith('```')) {
        stripped = stripped.replace(/^```\w*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const { data, content } = matter(stripped);

    const cleaned = content
        .replace(/^(\s*)-\s*\[[ x]\]\s*/gm, '$1- ')
        .replace(
            /\n+(?:\*\*)?(?:Meta\s*description|SEO\s*(?:note|title|description))(?:\*\*)?[:\s].*$/gi,
            ''
        )
        .replace(/\n+description:\s*"[^"]*"\s*$/i, '')
        .replace(/<\s*\/?\s*(script|iframe|object|embed|form)[^>]*>/gi, '')
        .trim();

    return matter.stringify(cleaned, data);
}

/**
 * Print a labeled dry-run block to the console.
 */
export function printDryRunBlock(label: string, content: string): void {
    console.log(`\n=== ${label} ===\n`);
    console.log(content);
    console.log(`\n=== END ${label} ===\n`);
}
