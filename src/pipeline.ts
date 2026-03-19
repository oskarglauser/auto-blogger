import OpenAI from 'openai';
import matter from 'gray-matter';
import type { AutoBloggerConfig, TopicSuggestion, ContentInventory } from './types.js';
import { analyzeContent } from './content-analyzer.js';
import { findContentGaps } from './gap-finder.js';
import { generateArticle } from './article-generator.js';
import { validateInternalLinks } from './internal-linker.js';
import { writeArticle } from './file-writer.js';
import { researchTopic } from './web-researcher.js';

export interface PipelineOptions {
    dryRun?: boolean;
    targetLang?: string;
}

export async function runPipeline(
    config: AutoBloggerConfig,
    options: PipelineOptions = {}
) {
    const { dryRun = false, targetLang } = options;

    if (targetLang && !config.languages.includes(targetLang)) {
        throw new Error(
            `Invalid language "${targetLang}". Allowed: ${config.languages.join(', ')}`
        );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required');
    }

    const openai = new OpenAI({ apiKey });

    console.log('Analyzing existing content...');
    const inventory = await analyzeContent(config);
    console.log(
        `Found ${inventory.posts.length} blog posts and ${inventory.guides.length} guides`
    );

    if (targetLang) {
        await generateForLanguage(openai, inventory, config, targetLang, dryRun);
    } else if (config.languages.length === 1) {
        await generateForLanguage(
            openai,
            inventory,
            config,
            config.languages[0],
            dryRun
        );
    } else {
        // Multi-language: find one topic via primary language, generate all with same slug
        const primaryLang = config.languages[0];

        console.log(`\n--- Finding topic (${primaryLang.toUpperCase()}) ---`);
        const gaps = await findContentGaps(openai, inventory, config, primaryLang);

        if (gaps.length === 0) {
            throw new Error('No content gaps found');
        }

        const sortedGaps = gaps.sort((a, b) => b.score - a.score);
        const selectedTopic = sortedGaps[0];
        console.log(
            `Selected topic: "${selectedTopic.title}" (score: ${selectedTopic.score})`
        );
        console.log(`Angle: ${selectedTopic.angle}`);

        // Generate primary language first
        console.log(`\n--- Researching topic (${primaryLang.toUpperCase()}) ---`);
        const primaryResearch = await researchTopic(
            openai,
            selectedTopic,
            config,
            primaryLang
        );
        console.log(
            `Research complete. Found ${primaryResearch.seoKeywords.length} SEO keywords.`
        );
        if (dryRun) {
            console.log(`\n=== RESEARCH SUMMARY (${primaryLang.toUpperCase()}) ===\n`);
            console.log(primaryResearch.summary);
            console.log('\n=== END RESEARCH ===\n');
        }

        console.log(
            `\n--- Generating ${primaryLang.toUpperCase()} article ---`
        );
        const primaryGenerated = await generateArticle(
            openai,
            selectedTopic,
            inventory,
            config,
            primaryLang,
            primaryResearch.summary
        );
        const primaryCleaned = sanitizeMarkdown(
            validateInternalLinks(
                primaryGenerated.rawMarkdown,
                inventory,
                config,
                primaryLang
            )
        );

        let primarySlug: string | undefined;

        if (dryRun) {
            console.log(`\n=== DRY RUN (${primaryLang.toUpperCase()}) ===\n`);
            console.log(primaryCleaned);
            console.log('\n=== END DRY RUN ===\n');
        } else {
            console.log(`Writing ${primaryLang.toUpperCase()} article...`);
            const result = writeArticle(primaryCleaned, config, primaryLang);
            primarySlug = result.slug;
            console.log(`Written: ${result.filePath}`);
            console.log(`Slug: ${result.slug}`);
            console.log(`Title: ${result.title}`);
        }

        // Generate for remaining languages
        for (const lang of config.languages.slice(1)) {
            console.log(
                `\n--- Generating ${lang.toUpperCase()} article (same topic) ---`
            );

            const translatedTopic = await translateTopic(
                openai,
                selectedTopic,
                config,
                lang
            );

            console.log(`\n--- Researching topic (${lang.toUpperCase()}) ---`);
            const research = await researchTopic(
                openai,
                translatedTopic,
                config,
                lang
            );
            console.log(
                `Research complete. Found ${research.seoKeywords.length} SEO keywords.`
            );
            if (dryRun) {
                console.log(
                    `\n=== RESEARCH SUMMARY (${lang.toUpperCase()}) ===\n`
                );
                console.log(research.summary);
                console.log('\n=== END RESEARCH ===\n');
            }

            const generated = await generateArticle(
                openai,
                translatedTopic,
                inventory,
                config,
                lang,
                research.summary
            );
            const cleaned = sanitizeMarkdown(
                validateInternalLinks(
                    generated.rawMarkdown,
                    inventory,
                    config,
                    lang
                )
            );

            if (dryRun) {
                console.log(`\n=== DRY RUN (${lang.toUpperCase()}) ===\n`);
                console.log(cleaned);
                console.log('\n=== END DRY RUN ===\n');
            } else {
                console.log(`Writing ${lang.toUpperCase()} article...`);
                const result = writeArticle(cleaned, config, lang, primarySlug);
                console.log(`Written: ${result.filePath}`);
                console.log(`Slug: ${result.slug}`);
                console.log(`Title: ${result.title}`);
            }
        }
    }

    console.log('\nDone!');
}

async function generateForLanguage(
    openai: OpenAI,
    inventory: ContentInventory,
    config: AutoBloggerConfig,
    lang: string,
    dryRun: boolean
) {
    console.log(`\n--- Generating for ${lang.toUpperCase()} ---`);

    console.log('Finding content gaps...');
    const gaps = await findContentGaps(openai, inventory, config, lang);

    if (gaps.length === 0) {
        console.error(`No content gaps found for ${lang}`);
        return;
    }

    const sortedGaps = gaps.sort((a, b) => b.score - a.score);
    const selectedTopic = sortedGaps[0];
    console.log(
        `Selected topic: "${selectedTopic.title}" (score: ${selectedTopic.score})`
    );
    console.log(`Angle: ${selectedTopic.angle}`);

    console.log('Researching topic...');
    const research = await researchTopic(openai, selectedTopic, config, lang);
    console.log(
        `Research complete. Found ${research.seoKeywords.length} SEO keywords.`
    );
    if (dryRun) {
        console.log('\n=== RESEARCH SUMMARY ===\n');
        console.log(research.summary);
        console.log('\n=== END RESEARCH ===\n');
    }

    console.log('Generating article...');
    const generated = await generateArticle(
        openai,
        selectedTopic,
        inventory,
        config,
        lang,
        research.summary
    );

    const cleanedMarkdown = sanitizeMarkdown(
        validateInternalLinks(generated.rawMarkdown, inventory, config, lang)
    );

    if (dryRun) {
        console.log('\n=== DRY RUN OUTPUT ===\n');
        console.log(cleanedMarkdown);
        console.log('\n=== END DRY RUN ===\n');
    } else {
        console.log('Writing article...');
        const result = writeArticle(cleanedMarkdown, config, lang);
        console.log(`Written: ${result.filePath}`);
        console.log(`Slug: ${result.slug}`);
        console.log(`Title: ${result.title}`);
    }
}

/**
 * Clean up common GPT output issues:
 * - Convert task list checkboxes to regular bullets
 * - Remove trailing meta description / SEO notes from body
 * - Strip dangerous HTML tags
 */
export function sanitizeMarkdown(markdown: string): string {
    const { data, content } = matter(markdown);

    let cleaned = content
        .replace(/^(\s*)-\s*\[[ x]\]\s*/gm, '$1- ')
        .replace(
            /\n+(?:\*\*)?(?:Meta\s*description|SEO\s*(?:note|title|description))(?:\*\*)?[:\s].*$/gi,
            ''
        )
        .replace(/\n+description:\s*"[^"]*"\s*$/i, '')
        .replace(
            /<\s*\/?\s*(script|iframe|object|embed|form)[^>]*>/gi,
            ''
        )
        .trim();

    return matter.stringify(cleaned, data);
}

async function translateTopic(
    openai: OpenAI,
    topic: TopicSuggestion,
    config: AutoBloggerConfig,
    targetLang: string
): Promise<TopicSuggestion> {
    const response = await openai.responses.create({
        model: config.generation.model,
        input: `Translate this blog topic to ${targetLang}. Return ONLY a JSON object with: title, angle, suggestedTags (array of translated tags), score.

Title: ${topic.title}
Angle: ${topic.angle}
Tags: ${topic.suggestedTags.join(', ')}

Return ONLY the JSON object, no markdown formatting.`,
        temperature: 0.3,
    });

    const content = response.output_text || '{}';
    try {
        const cleaned = content
            .replace(/```json?\n?/g, '')
            .replace(/```/g, '')
            .trim();
        const translated = JSON.parse(cleaned);
        return {
            title:
                typeof translated.title === 'string'
                    ? translated.title
                    : topic.title,
            angle:
                typeof translated.angle === 'string'
                    ? translated.angle
                    : topic.angle,
            suggestedTags: Array.isArray(translated.suggestedTags)
                ? translated.suggestedTags
                : topic.suggestedTags,
            score: topic.score,
            rationale: topic.rationale || '',
        };
    } catch {
        console.error('Failed to translate topic, using original');
        return { ...topic, rationale: topic.rationale || '' };
    }
}
