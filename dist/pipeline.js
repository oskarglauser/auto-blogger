import OpenAI from 'openai';
import { analyzeContent } from './content-analyzer.js';
import { findContentGaps } from './gap-finder.js';
import { generateArticle } from './article-generator.js';
import { validateInternalLinks } from './internal-linker.js';
import { writeArticle } from './file-writer.js';
import { researchTopic } from './web-researcher.js';
import { sanitizeMarkdown, parseJsonResponse, printDryRunBlock } from './utils.js';
export { sanitizeMarkdown };
export async function runPipeline(config, options = {}) {
    const { dryRun = false, targetLang } = options;
    if (targetLang && !config.languages.includes(targetLang)) {
        throw new Error(`Invalid language "${targetLang}". Allowed: ${config.languages.join(', ')}`);
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required');
    }
    const openai = new OpenAI({ apiKey });
    console.log('Analyzing existing content...');
    const inventory = await analyzeContent(config);
    console.log(`Found ${inventory.posts.length} blog posts and ${inventory.guides.length} guides`);
    if (targetLang) {
        await processLanguage(openai, inventory, config, targetLang, dryRun);
    }
    else if (config.languages.length === 1) {
        await processLanguage(openai, inventory, config, config.languages[0], dryRun);
    }
    else {
        // Multi-language: find one topic via primary language, generate all with same slug
        const primaryLang = config.languages[0];
        console.log(`\n--- Finding topic (${primaryLang.toUpperCase()}) ---`);
        const gaps = await findContentGaps(openai, inventory, config, primaryLang);
        if (gaps.length === 0) {
            throw new Error('No content gaps found');
        }
        const sortedGaps = gaps.sort((a, b) => b.score - a.score);
        const selectedTopic = sortedGaps[0];
        console.log(`Selected topic: "${selectedTopic.title}" (score: ${selectedTopic.score})`);
        console.log(`Angle: ${selectedTopic.angle}`);
        // Generate primary language
        const primaryResult = await researchAndGenerate(openai, inventory, config, primaryLang, selectedTopic, dryRun);
        // Generate for remaining languages
        for (const lang of config.languages.slice(1)) {
            console.log(`\n--- Generating ${lang.toUpperCase()} article (same topic) ---`);
            const translatedTopic = await translateTopic(openai, selectedTopic, config, lang);
            await researchAndGenerate(openai, inventory, config, lang, translatedTopic, dryRun, primaryResult?.slug);
        }
    }
    console.log('\nDone!');
}
/**
 * Single-language mode: find gaps, pick topic, then research and generate.
 */
async function processLanguage(openai, inventory, config, lang, dryRun) {
    console.log(`\n--- Generating for ${lang.toUpperCase()} ---`);
    console.log('Finding content gaps...');
    const gaps = await findContentGaps(openai, inventory, config, lang);
    if (gaps.length === 0) {
        console.error(`No content gaps found for ${lang}`);
        return;
    }
    const sortedGaps = gaps.sort((a, b) => b.score - a.score);
    const selectedTopic = sortedGaps[0];
    console.log(`Selected topic: "${selectedTopic.title}" (score: ${selectedTopic.score})`);
    console.log(`Angle: ${selectedTopic.angle}`);
    await researchAndGenerate(openai, inventory, config, lang, selectedTopic, dryRun);
}
/**
 * Research a topic, generate an article, validate links, and write to disk.
 * Shared by both single-language and multi-language paths.
 */
async function researchAndGenerate(openai, inventory, config, lang, topic, dryRun, forceSlug) {
    const langLabel = lang.toUpperCase();
    console.log(`\n--- Researching topic (${langLabel}) ---`);
    const research = await researchTopic(openai, topic, config, lang);
    console.log(`Research complete. Found ${research.seoKeywords.length} SEO keywords.`);
    if (dryRun) {
        printDryRunBlock(`RESEARCH SUMMARY (${langLabel})`, research.summary);
    }
    console.log(`Generating ${langLabel} article...`);
    const generated = await generateArticle(openai, topic, inventory, config, lang, research.summary);
    const cleaned = sanitizeMarkdown(validateInternalLinks(generated.rawMarkdown, inventory, config, lang));
    if (dryRun) {
        printDryRunBlock(`DRY RUN (${langLabel})`, cleaned);
        return null;
    }
    console.log(`Writing ${langLabel} article...`);
    const result = writeArticle(cleaned, config, lang, forceSlug);
    console.log(`Written: ${result.filePath}`);
    console.log(`Slug: ${result.slug}`);
    console.log(`Title: ${result.title}`);
    return result;
}
async function translateTopic(openai, topic, config, targetLang) {
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
    const translated = parseJsonResponse(content, {});
    return {
        title: typeof translated.title === 'string'
            ? translated.title
            : topic.title,
        angle: typeof translated.angle === 'string'
            ? translated.angle
            : topic.angle,
        suggestedTags: Array.isArray(translated.suggestedTags)
            ? translated.suggestedTags
            : topic.suggestedTags,
        score: topic.score,
        rationale: topic.rationale || '',
    };
}
//# sourceMappingURL=pipeline.js.map