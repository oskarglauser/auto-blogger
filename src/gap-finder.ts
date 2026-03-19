import OpenAI from 'openai';
import type { ContentInventory, AutoBloggerConfig, TopicSuggestion } from './types.js';
import { parseJsonResponse } from './utils.js';

export async function findContentGaps(
    openai: OpenAI,
    inventory: ContentInventory,
    config: AutoBloggerConfig,
    lang: string
): Promise<TopicSuggestion[]> {
    const langItems = [
        ...inventory.posts.filter((p) => p.lang === lang),
        ...inventory.guides.filter((g) => g.lang === lang),
    ];

    const existingTitles = langItems.map((i) => `- ${i.title}`).join('\n');
    const existingTags = [
        ...new Set(langItems.flatMap((i) => i.tags)),
    ].join(', ');

    const guidelines = config.contentGuidelines[lang];
    const localContext = guidelines?.localContext || '';

    const now = new Date();
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const currentMonth = monthNames[now.getMonth()];
    const currentYear = now.getFullYear();

    const contentRules = config.contentRules || `Write general, educational content about ${config.topic.primary}.
Focus on practical advice, strategy, and real-world examples.`;

    const productContext = config.productContext
        ? `\n${config.productContext}\n`
        : '';

    const prompt = `You are a content strategist and SEO researcher for ${config.siteName}, a ${config.topic.primary} platform.

## Step 1: Keyword research

Before suggesting topics, research what people are currently searching for related to ${config.topic.primary}. Think about:
- High-volume search queries related to ${config.topic.primary}
- Current trends (${currentMonth} ${currentYear})
- Seasonal opportunities (what's relevant this time of year)
- Long-tail keywords with lower competition but strong intent
- Questions people ask on forums, Reddit, and Q&A sites

## Step 2: Analyze existing content

Here are the existing articles (${lang}):
${existingTitles || '(no existing articles)'}

Existing tags: ${existingTags || '(none)'}

Seed keywords: ${config.topic.keywords.join(', ')}

Target audience: ${guidelines?.audience || 'Small business owners'}

${localContext ? `Local context: ${localContext}` : ''}

## Step 3: Identify gaps

Based on your keyword research and the existing content, identify 5 topic gaps. Consider:
- Search volume and SEO potential for specific keywords you researched
- What's genuinely missing from the existing content (not just reworded versions)
- Seasonal relevance for ${currentMonth} ${currentYear}
- Topics that naturally link to existing content

IMPORTANT: Avoid topics that overlap with existing articles. Each suggestion must cover a clearly different subject, not just a different angle on an existing topic.

## Content approach (MUST follow)

${contentRules}
${productContext}
Return a JSON array of objects with: title, angle (specific approach/hook), rationale (include the target keyword and why it has SEO potential), suggestedTags (array), score (1-10).

${lang !== 'en' ? `Write titles and angles in the target language (${lang}).` : 'Write titles and angles in English.'}

Return ONLY the JSON array, no markdown formatting.`;

    const response = await openai.responses.create({
        model: config.generation.model,
        input: prompt,
        temperature: 0.8,
    });

    const content = response.output_text || '[]';
    const parsed = parseJsonResponse<unknown[]>(content, []);

    if (!Array.isArray(parsed)) {
        console.error('Gap finder response is not an array');
        return [];
    }

    return parsed
        .slice(0, 10)
        .filter((raw): raw is TopicSuggestion => {
            const item = raw as Record<string, unknown>;
            return (
                typeof item.title === 'string' &&
                typeof item.angle === 'string' &&
                typeof item.score === 'number' &&
                item.score >= 1 &&
                item.score <= 10 &&
                Array.isArray(item.suggestedTags)
            );
        });
}
