import OpenAI from 'openai';
import type {
    AutoBloggerConfig,
    TopicSuggestion,
    ContentInventory,
    GeneratedArticle,
} from './types.js';

export async function generateArticle(
    openai: OpenAI,
    topic: TopicSuggestion,
    inventory: ContentInventory,
    config: AutoBloggerConfig,
    lang: string,
    research?: string
): Promise<GeneratedArticle> {
    const langPrompts = config.prompts[lang];
    if (!langPrompts) {
        throw new Error(
            `No prompts configured for language "${lang}". Add prompts for this language in your config.`
        );
    }

    // Build internal link list for the prompt
    const linkTargets = inventory.linkTargets
        .filter((t) => t.lang === lang)
        .map((t) => {
            const baseUrl =
                t.type === 'guide'
                    ? config.internalLinks.guidesBaseUrl
                    : config.internalLinks.blogBaseUrl;
            const prefix = lang === config.languages[0] ? '' : `/${lang}`;
            return `[${t.title}](${prefix}${baseUrl}/${t.slug})`;
        });

    const articlePrompt = langPrompts.articlePrompt({
        topic: topic.title,
        angle: topic.angle,
        suggestedTags: topic.suggestedTags,
        internalLinks: linkTargets,
        slug: undefined,
        research,
    });

    const response = await openai.responses.create({
        model: config.generation.model,
        instructions: langPrompts.systemPrompt,
        input: articlePrompt,
        temperature: 0.7,
        max_output_tokens: 4000,
    });

    const draft = response.output_text || '';

    // Second pass: editor review
    console.log(`  Running editor pass (${lang})...`);

    const editedResponse = await openai.responses.create({
        model: config.generation.model,
        instructions: langPrompts.editorPrompt,
        input: draft,
        temperature: 0.4,
        max_output_tokens: 8000,
    });

    const rawMarkdown = editedResponse.output_text || draft;

    return {
        rawMarkdown,
        topic,
        lang,
    };
}
