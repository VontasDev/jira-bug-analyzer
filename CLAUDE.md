# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jira Bug Analyzer - A TypeScript CLI tool that pulls bugs from Jira Cloud and uses Claude AI to analyze patterns, group bugs by root cause, and identify component hotspots. Specifically designed to analyze **escaped bugs** (bugs that escaped SIT testing) to understand WHY they escaped and suggest test scenarios to prevent future escapes.

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

# List available bug filters (recommended for restricted Jira instances)
jira-analyzer fetch --list-filters

# Fetch bugs using a saved filter (recommended)
jira-analyzer fetch --filter-id 21725 --max 100 --output bugs.json

# Fetch bugs from a project (may not work if search API is restricted)
jira-analyzer fetch --project PROJ --max 100 --output bugs.json

# Analyze bugs from file
jira-analyzer analyze --input bugs.json --format html --output report.html

# Full pipeline (fetch + analyze)
jira-analyzer run --filter-id 21725 --format markdown --output report.md
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
│   ├── jira.ts        # Jira Cloud API client (direct fetch, not jira.js for search)
│   └── claude.ts      # Claude API integration with escape analysis prompts
├── formatters/
│   ├── terminal.ts    # Rich CLI output with chalk + cli-table3
│   ├── json.ts        # Structured JSON export
│   └── report.ts      # Markdown/HTML report generation
└── types/
    └── index.ts       # TypeScript interfaces (JiraBug, PatternAnalysis, EscapePattern, TestScenario, TestingGap, DefectInjectionPoint, ComponentRiskScore, RegressionAnalysis, CustomerImpact, TestDataRecommendation, ProcessImprovement, TrendMetrics, Recommendation)
```

## Key Patterns

- Config loads from environment variables first, falls back to ~/.jira-bug-analyzer/config.json
- Uses `/rest/api/3/search/jql` (GET) endpoint instead of POST `/rest/api/3/search` (see Known Issues)
- Fetches individual issues via `/rest/api/3/issue/{id}` after getting IDs from JQL search
- Descriptions and comments may be in Atlassian Document Format (ADF) - converted to plain text
- Output formats: terminal (default), json, markdown, html
- All bug keys in reports are clickable links to Jira (vontas.atlassian.net/browse/KEY)

## Analysis Output

The analysis report includes the following sections:

### Standard Analysis
- **Root Cause Clusters** - Groups bugs by underlying cause with severity and suggested fixes
- **Recurring Issues** - Patterns that appear multiple times across bugs
- **Component Hotspots** - Areas with high bug density and trend indicators
- **Recommendations** - Actionable suggestions with reasoning:
  - Priority level (critical/high/medium)
  - Reasoning explaining why the recommendation helps
  - Target bugs that drove the recommendation

### Escape Analysis (for escaped bugs)
- **Escape Patterns** - Categorizes WHY bugs escaped SIT testing:
  - `edge-case` - Unusual input combinations or boundary conditions
  - `environment` - Environment-specific issues (prod vs test)
  - `timing` - Race conditions or timing-dependent behavior
  - `data-driven` - Issues with specific data patterns
  - `integration` - Cross-system interaction problems
  - `configuration` - Config differences between environments
  - `race-condition` - Concurrency issues
  - `hardware-specific` - Device or hardware-dependent bugs

- **Suggested Test Scenarios** - Specific test cases that would have caught the bugs:
  - Prioritized as critical/high/medium
  - Includes preconditions, steps, and expected outcomes
  - Maps to specific bugs that would be caught

- **Testing Gap Analysis** - Areas where test coverage needs improvement:
  - Current coverage assessment
  - Number of bugs impacted
  - Suggested improvements

### Advanced Analysis
- **Defect Injection Analysis** - Where in the SDLC defects were introduced:
  - Phases: requirements, design, coding, integration, deployment
  - Prevention strategies for each phase
  - Bug frequency by phase

- **Component Risk Scores** - Risk assessment for components:
  - Risk score (1-10) based on escape history
  - Complexity and change frequency factors
  - Mitigation recommendations

- **Regression Analysis** - Identifies bugs that are regressions:
  - Types: exact, similar, related-area
  - Links to previously fixed bugs
  - Likely cause of regression

- **Customer Impact Analysis** - Business impact assessment:
  - Impact level (critical/high/medium/low)
  - Affected user scope (all/many/some/few)
  - Business function affected
  - Workaround availability
  - Estimated cost

- **Test Data Recommendations** - Data patterns that would catch bugs:
  - Specific data patterns to test
  - Edge cases to cover
  - Priority ranking

- **Process Improvement Suggestions** - SIT process changes:
  - Areas: code-review, testing, deployment, requirements, environment
  - Effort and impact ratings
  - Rationale for each suggestion

- **Trend Analysis** - Metrics over time:
  - Escapes by category
  - Top affected components
  - Risk trend (improving/stable/worsening)
  - Comparison to typical patterns

## Known Issues & Workarounds

### Jira Search API Returns 410 Gone
Some Jira Cloud instances (including vontas.atlassian.net) block the standard POST `/rest/api/3/search` endpoint, returning HTTP 410 Gone.

**Workaround implemented:** Use GET `/rest/api/3/search/jql?jql=...` endpoint instead, which returns issue IDs only. Then fetch full issue details individually via `/rest/api/3/issue/{id}`.

**User workaround:** Use saved Jira filters (`--filter-id`) instead of direct project queries (`--project`). List available filters with `--list-filters`.

### chalk v5 Type Compatibility
chalk v5 changed its TypeScript types. Return type for color functions should be `(text: string) => string` instead of `chalk.Chalk`.

### Node.js PATH on Windows
After installing Node.js via winget, you may need to restart your terminal or use full paths:
- Node: `"C:\Program Files\nodejs\node.exe"`
- NPM: `"C:\Program Files\nodejs\npm.cmd"`

## Target Jira Instance

- URL: https://vontas.atlassian.net
- Primary project: TMMOB (TransitMaster Mobile)
- Useful filter: 21725 (Escaped bug 2025 - TMMOB)
