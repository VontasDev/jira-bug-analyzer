# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jira Bug Analyzer - A TypeScript CLI tool that pulls bugs from Jira Cloud and uses Claude AI to analyze patterns, group bugs by root cause, and identify component hotspots.

## Commands

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev -- <command>

# Run built CLI
node dist/index.js <command>

# After npm link, use directly
jira-analyzer <command>
```

## CLI Usage

```bash
# Configure credentials
jira-analyzer config --jira-url https://yourco.atlassian.net --jira-email user@email.com --jira-token <token> --claude-key <key>

# Fetch bugs from a project
jira-analyzer fetch --project PROJ --max 100 --output bugs.json

# Analyze bugs from file
jira-analyzer analyze --input bugs.json --format html --output report.html

# Full pipeline (fetch + analyze)
jira-analyzer run --project PROJ --format markdown --output report.md
```

## Architecture

```
src/
├── index.ts           # CLI entry point (commander.js)
├── commands/          # CLI commands
│   ├── fetch.ts       # Pulls bugs from Jira, caches as JSON
│   ├── analyze.ts     # Runs Claude AI analysis on cached bugs
│   ├── run.ts         # Combined fetch + analyze pipeline
│   └── config.ts      # Credential management (~/.jira-bug-analyzer/config.json)
├── services/
│   ├── jira.ts        # Jira Cloud API client using jira.js
│   └── claude.ts      # Claude API integration with analysis prompts
├── formatters/
│   ├── terminal.ts    # Rich CLI output with chalk + cli-table3
│   ├── json.ts        # Structured JSON export
│   └── report.ts      # Markdown/HTML report generation
└── types/
    └── index.ts       # TypeScript interfaces and Zod schemas
```

## Key Patterns

- Config loads from environment variables first, falls back to ~/.jira-bug-analyzer/config.json
- Bugs are fetched via JQL queries with pagination (50 per request)
- Claude analysis uses a structured JSON response format for parsing
- Output formats: terminal (default), json, markdown, html
