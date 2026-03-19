export interface AutoBloggerConfig {
    /** Display name of the site/product */
    siteName: string;
    /** Full URL of the site (e.g. "https://example.com") */
    siteUrl: string;
    /** Path to the blog content directory (absolute or relative to cwd) */
    contentDir: string;
    /** Path to the guides content directory (optional) */
    guidesDir?: string;
    /** Languages to generate content for (e.g. ['en', 'sv']) */
    languages: string[];

    topic: {
        /** Primary topic area (e.g. "email marketing") */
        primary: string;
        /** Seed keywords for gap finding */
        keywords: string[];
        /** Product/brand name */
        productName: string;
    };

    /** Per-language content guidelines */
    contentGuidelines: Record<
        string,
        {
            tone: string;
            audience: string;
            wordCount: { min: number; max: number };
            localContext?: string;
        }
    >;

    internalLinks: {
        guidesBaseUrl: string;
        blogBaseUrl: string;
    };

    generation: {
        /** Number of posts to generate per run */
        postsPerRun: number;
        /** OpenAI model to use (e.g. "gpt-4o", "gpt-5.4") */
        model: string;
    };

    /**
     * Product context injected into gap finder and researcher prompts.
     * Typically includes product features, capabilities, and what NOT to mention.
     */
    productContext?: string;

    /**
     * Content rules for the gap finder (what kind of content to write/avoid).
     * If not provided, a generic set of rules is used.
     */
    contentRules?: string;

    /** Per-language prompt definitions for article generation */
    prompts: Record<string, LanguagePrompts>;
}

export interface LanguagePrompts {
    /** System prompt for the article writer */
    systemPrompt: string;
    /** System prompt for the editor (second pass) */
    editorPrompt: string;
    /** Builds the user prompt for article generation */
    articlePrompt: (params: ArticlePromptParams) => string;
}

export interface ArticlePromptParams {
    topic: string;
    angle: string;
    suggestedTags: string[];
    internalLinks: string[];
    slug?: string;
    research?: string;
}

export interface ContentItem {
    title: string;
    description?: string;
    slug: string;
    tags: string[];
    lang: string;
    type: 'blog' | 'guide';
    publishDate?: Date;
}

export interface ContentInventory {
    posts: ContentItem[];
    guides: ContentItem[];
    linkTargets: Array<{ slug: string; title: string; type: 'blog' | 'guide'; lang: string }>;
}

export interface TopicSuggestion {
    title: string;
    angle: string;
    rationale: string;
    suggestedTags: string[];
    score: number;
}

export interface TopicResearch {
    summary: string;
    seoKeywords: string[];
}

export interface GeneratedArticle {
    rawMarkdown: string;
    topic: TopicSuggestion;
    lang: string;
}

export interface WriteResult {
    filePath: string;
    slug: string;
    title: string;
}
