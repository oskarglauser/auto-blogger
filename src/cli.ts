#!/usr/bin/env node

import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { runPipeline } from './pipeline.js';
import type { AutoBloggerConfig } from './types.js';

async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        printHelp();
        process.exit(0);
    }

    const dryRun = args.includes('--dry-run');
    const langArg = args.find((a) => a.startsWith('--lang='));
    const targetLang = langArg ? langArg.split('=')[1] : undefined;
    const configArg = args.find((a) => a.startsWith('--config='));
    const configPath = configArg
        ? configArg.split('=')[1]
        : 'auto-blogger.config.ts';

    const config = await loadConfig(configPath);

    await runPipeline(config, { dryRun, targetLang });
}

async function loadConfig(configPath: string): Promise<AutoBloggerConfig> {
    const resolved = resolve(configPath);
    const fileUrl = pathToFileURL(resolved).href;

    try {
        const mod = await import(fileUrl);
        const config = mod.default || mod.config;

        if (!config) {
            console.error(
                `Config file "${configPath}" must export a default or named "config" export.`
            );
            process.exit(1);
        }

        return config as AutoBloggerConfig;
    } catch (err) {
        console.error(`Failed to load config from "${configPath}":`, err);
        process.exit(1);
    }
}

function printHelp() {
    console.log(`
auto-blogger - AI-powered blog post generator

Usage:
  auto-blogger [options]

Options:
  --config=<path>   Path to config file (default: auto-blogger.config.ts)
  --dry-run         Preview output without writing files
  --lang=<code>     Generate for a single language only (e.g. --lang=en)
  --help, -h        Show this help message

Environment:
  OPENAI_API_KEY    Required. Your OpenAI API key.

Examples:
  auto-blogger --config=./my-config.ts
  auto-blogger --dry-run
  auto-blogger --lang=en
  auto-blogger --config=./config.ts --dry-run --lang=sv
`);
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
