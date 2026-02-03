# Jira Bug Analyzer

A TypeScript CLI tool that pulls bugs from Jira Cloud and uses Claude AI to analyze patterns, group bugs by root cause, and identify component hotspots. Specifically designed to analyze **escaped bugs** (bugs that escaped SIT testing) to understand WHY they escaped and suggest test scenarios to prevent future escapes.

## Features

### Core Analysis
- **Root Cause Clustering** - Groups bugs by underlying cause with severity ratings and suggested fixes
- **Recurring Issue Detection** - Identifies patterns that appear multiple times across bugs
- **Component Hotspots** - Highlights areas with high bug density and trend indicators
- **Actionable Recommendations** - Prioritized suggestions with reasoning and target bugs

### Escape Analysis
Analyzes WHY bugs escaped SIT testing:
- Edge cases and boundary conditions
- Environment-specific issues (prod vs test)
- Race conditions and timing-dependent behavior
- Data-driven issues with specific patterns
- Integration and cross-system problems
- Configuration differences
- Hardware-specific bugs

### Advanced Analysis
- **Defect Injection Points** - Where in the SDLC defects were introduced (requirements, design, coding, integration, deployment)
- **Component Risk Scores** - Risk assessment (1-10) based on escape history, complexity, and change frequency
- **Regression Detection** - Identifies bugs that are regressions of previously fixed issues
- **Customer Impact Analysis** - Business impact with affected users, workaround availability, and cost estimates
- **Test Data Recommendations** - Specific data patterns and edge cases to test
- **Process Improvements** - SIT process changes with effort/impact ratings
- **Trend Analysis** - Metrics over time with category breakdowns

### Report Features
- Multiple output formats: terminal, JSON, Markdown, HTML
- All bug keys are clickable links to Jira
- Recommendations include reasoning explaining why each suggestion helps
- Priority-based grouping throughout

## Installation

```bash
# Clone the repository
git clone https://github.com/VontasDev/jira-bug-analyzer.git
cd jira-bug-analyzer

# Install dependencies
npm install

# Build the project
npm run build

# Optional: Link for global CLI access
npm link
```

## Configuration

Configure your Jira and Claude API credentials:

```bash
jira-analyzer config \
  --jira-url https://yourcompany.atlassian.net \
  --jira-email your.email@company.com \
  --jira-token <your-jira-api-token> \
  --claude-key <your-anthropic-api-key>
```

Credentials are stored in `~/.jira-bug-analyzer/config.json`.

## Usage

### Fetch Bugs

```bash
# List available Jira filters (recommended)
jira-analyzer fetch --list-filters

# Fetch bugs using a saved filter (recommended for restricted Jira instances)
jira-analyzer fetch --filter-id 12345 --max 100 --output bugs.json

# Fetch bugs from a project (may not work if search API is restricted)
jira-analyzer fetch --project PROJ --max 100 --output bugs.json
```

### Analyze Bugs

```bash
# Analyze and output to terminal
jira-analyzer analyze --input bugs.json

# Generate HTML report
jira-analyzer analyze --input bugs.json --format html --output report.html

# Generate Markdown report
jira-analyzer analyze --input bugs.json --format markdown --output report.md

# Generate JSON output
jira-analyzer analyze --input bugs.json --format json --output report.json
```

### Full Pipeline

```bash
# Fetch and analyze in one command
jira-analyzer run --filter-id 12345 --format html --output report.html
```

## Development

```bash
# Run in development mode
npm run dev -- <command>

# Build
npm run build

# Run built CLI
node dist/index.js <command>
```

## Architecture

```
src/
├── index.ts           # CLI entry point (commander.js)
├── commands/          # CLI commands
│   ├── fetch.ts       # Pulls bugs from Jira
│   ├── analyze.ts     # Runs Claude AI analysis
│   ├── run.ts         # Combined fetch + analyze
│   └── config.ts      # Credential management
├── services/
│   ├── jira.ts        # Jira Cloud API client
│   └── claude.ts      # Claude API integration
├── formatters/
│   ├── terminal.ts    # CLI output (chalk + cli-table3)
│   ├── json.ts        # JSON export
│   └── report.ts      # Markdown/HTML generation
└── types/
    └── index.ts       # TypeScript interfaces
```

## Known Issues

### Jira Search API Returns 410 Gone
Some Jira Cloud instances block the standard POST `/rest/api/3/search` endpoint. The tool works around this by using the GET `/rest/api/3/search/jql` endpoint and fetching individual issues.

**Recommendation:** Use saved Jira filters (`--filter-id`) instead of direct project queries (`--project`).

## License

MIT
