# auto-blogger

AI-powered blog post generator that researches topics, finds content gaps, and writes SEO-optimized articles in multiple languages.

## What it does

1. **Analyzes** your existing blog posts and guides to understand what you've already written
2. **Finds content gaps** using AI-powered keyword research and trend analysis
3. **Researches** the selected topic using web search for up-to-date information
4. **Generates** a draft article with proper frontmatter, internal links, and SEO structure
5. **Edits** the draft in a second AI pass for better flow, tighter prose, and no repetition
6. **Validates** internal links against your actual content inventory
7. **Writes** the final markdown file to your content directory

Supports multiple languages out of the box. In multi-language mode, it generates the same topic across all configured languages with matching slugs.

## Installation

```bash
npm install auto-blogger
```

Or use directly with npx:

```bash
npx auto-blogger --config=./auto-blogger.config.ts
```

## Quick start

### 1. Set your OpenAI API key

```bash
export OPENAI_API_KEY=sk-...
```

### 2. Create a config file

Create `auto-blogger.config.ts` in your project root:

```typescript
import type { AutoBloggerConfig } from 'auto-blogger';

const config: AutoBloggerConfig = {
    siteName: 'My Blog',
    siteUrl: 'https://myblog.com',
    contentDir: './content/blog',
    languages: ['en'],

    topic: {
        primary: 'web development',
        keywords: [
            'javascript',
            'react',
            'typescript',
            'css',
            'web performance',
        ],
        productName: 'My Blog',
    },

    contentGuidelines: {
        en: {
            tone: 'Friendly and practical. Write like a senior developer mentoring a colleague.',
            audience: 'Intermediate web developers who want to level up their skills.',
            wordCount: { min: 1200, max: 1800 },
        },
    },

    internalLinks: {
        guidesBaseUrl: '/guides',
        blogBaseUrl: '/blog',
    },

    generation: {
        postsPerRun: 1,
        model: 'gpt-4o',
    },

    prompts: {
        en: {
            systemPrompt: `You are a technical writer for My Blog. You write helpful, practical blog posts about web development.

Writing guidelines:
- Tone: Friendly and practical.
- Target word count: 1200-1800 words.
- Use H2 and H3 headings for structure.
- Include code examples where relevant.
- End with a clear takeaway.

Format your response as a complete markdown file with YAML frontmatter.`,

            editorPrompt: `You are an editor reviewing a blog post. Improve the draft while preserving its structure, topic, and frontmatter.

Focus on:
- Better flow between sections
- Eliminate repetition
- Tighten the language
- Keep the word count between 1200-1800 words

Return the complete improved markdown file (with frontmatter).`,

            articlePrompt: ({ topic, angle, suggestedTags, internalLinks, research }) => {
                let prompt = `Write a blog post about: "${topic}"

Angle/hook: ${angle}

Include at most 2-3 natural internal links from this list where relevant:
${internalLinks.map((l) => `- ${l}`).join('\n')}

Format the output as a markdown file starting with YAML frontmatter:
---
title: "The post title"
description: "A compelling meta description under 160 characters."
publishDate: ${new Date().toISOString().split('T')[0]}
lang: en
tags: [${suggestedTags.map((t) => `"${t}"`).join(', ')}]
author: "My Blog"
category: "web development"
---

Then write the full article in markdown.`;

                if (research) {
                    prompt += `\n\n## Research context\n\n${research}`;
                }

                return prompt;
            },
        },
    },
};

export default config;
```

### 3. Run it

```bash
# Preview without writing files
npx auto-blogger --dry-run

# Generate and write
npx auto-blogger

# Generate for a specific language only
npx auto-blogger --lang=en
```

## Multi-language support

To generate posts in multiple languages, add each language to the `languages` array and provide prompts for each:

```typescript
const config: AutoBloggerConfig = {
    // ...
    languages: ['en', 'sv'],

    contentGuidelines: {
        en: {
            tone: 'Friendly and practical.',
            audience: 'Web developers.',
            wordCount: { min: 1200, max: 1800 },
        },
        sv: {
            tone: 'Vänlig och praktisk.',
            audience: 'Webbutvecklare.',
            wordCount: { min: 1200, max: 1800 },
            localContext: 'Use Swedish examples and references.',
        },
    },

    prompts: {
        en: { /* ... */ },
        sv: { /* ... */ },
    },
};
```

When run without `--lang`, auto-blogger will:

1. Find a topic using the primary language (first in the array)
2. Generate the article in the primary language
3. Translate the topic and generate for each additional language
4. Use the same slug across all languages for URL consistency

## Product context

If you're writing for a product blog, you can provide product context that gets injected into the gap finder and researcher prompts. This helps the AI understand what features to mention (and what to avoid):

```typescript
const config: AutoBloggerConfig = {
    // ...
    productContext: `MY PRODUCT FEATURES:
- Feature A: does X
- Feature B: does Y

DOES NOT HAVE:
- Feature C (never mention this as available)`,

    contentRules: `Write general, educational content about the topic.
Do NOT center articles around specific product features.
Keep product mentions minimal and natural.`,
};
```

## Programmatic usage

You can also use auto-blogger as a library:

```typescript
import {
    runPipeline,
    analyzeContent,
    findContentGaps,
    researchTopic,
    generateArticle,
} from 'auto-blogger';

// Run the full pipeline
await runPipeline(config, { dryRun: true });

// Or use individual steps
const inventory = await analyzeContent(config);
const gaps = await findContentGaps(openai, inventory, config, 'en');
```

## CLI reference

```
auto-blogger [options]

Options:
  --config=<path>   Path to config file (default: auto-blogger.config.ts)
  --dry-run         Preview output without writing files
  --lang=<code>     Generate for a single language only
  --help, -h        Show this help message

Environment:
  OPENAI_API_KEY    Required. Your OpenAI API key.
```

## How it works

```
┌─────────────────┐
│ Content Analysis │  Read existing posts + guides
└────────┬────────┘
         │
┌────────▼────────┐
│  Gap Finding     │  AI identifies missing topics + SEO opportunities
└────────┬────────┘
         │
┌────────▼────────┐
│  Web Research    │  Searches the web for current info on the topic
└────────┬────────┘
         │
┌────────▼────────┐
│  Draft Writing   │  AI generates full article with frontmatter
└────────┬────────┘
         │
┌────────▼────────┐
│  Editor Pass     │  Second AI pass for quality, flow, and brevity
└────────┬────────┘
         │
┌────────▼────────┐
│  Link Validation │  Removes broken internal links
└────────┬────────┘
         │
┌────────▼────────┐
│  Write to Disk   │  Saves markdown file with validated frontmatter
└────────┘
```

## Contributing

Contributions are welcome! Please open an issue or pull request.

## License

MIT
