export async function researchTopic(openai, topic, config, lang) {
    const langInstruction = lang !== 'en'
        ? `Search in both ${lang} and English. Write your summary in the target language (${lang}).`
        : 'Search and write your summary in English.';
    const productContext = config.productContext
        ? `\n${config.siteName} product context for reference:\n${config.productContext}\n`
        : '';
    const prompt = `Research the following blog topic for ${config.siteName}, a ${config.topic.primary} platform.

Topic: "${topic.title}"
Angle: ${topic.angle}

${langInstruction}

Please research:
1. Recent articles and trends about this topic (from the last 6 months)
2. SEO keywords that competitors are targeting for this topic
3. What questions people are asking about this topic
4. How ${config.siteName}'s specific features fit this topic
${productContext}
Return your findings in this format:

## Research summary
[2-3 paragraphs summarizing key findings, trends, and angles worth covering]

## SEO keywords
[Comma-separated list of 10-15 relevant keywords]

## Key questions people ask
[Bullet list of 5-8 questions]

## Feature alignment
[How ${config.siteName}'s real features relate to this topic, and what to avoid mentioning]`;
    const response = await openai.responses.create({
        model: config.generation.model,
        tools: [{ type: 'web_search' }],
        input: prompt,
        temperature: 0.7,
    });
    const text = response.output_text || '';
    const keywordsMatch = text.match(/## SEO keywords\s*\n([\s\S]*?)(?=\n## |$)/i);
    const seoKeywords = keywordsMatch
        ? keywordsMatch[1]
            .trim()
            .split(/,\s*/)
            .map((k) => k.trim())
            .filter(Boolean)
        : [];
    return {
        summary: text,
        seoKeywords,
    };
}
//# sourceMappingURL=web-researcher.js.map