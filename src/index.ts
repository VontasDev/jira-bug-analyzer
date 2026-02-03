#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { fetchCommand } from './commands/fetch.js';
import { analyzeCommand } from './commands/analyze.js';
import { runCommand } from './commands/run.js';
import { configCommand, loadConfig } from './commands/config.js';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('jira-analyzer')
  .description('CLI tool to analyze Jira bugs using Claude AI')
  .version('1.0.0');

// Config command
program
  .command('config')
  .description('Configure Jira and Claude API credentials')
  .option('--jira-url <url>', 'Jira Cloud URL (e.g., https://company.atlassian.net)')
  .option('--jira-email <email>', 'Your Jira email address')
  .option('--jira-token <token>', 'Jira API token')
  .option('--claude-key <key>', 'Anthropic API key')
  .option('--show', 'Show current configuration')
  .action(async (options) => {
    await configCommand({
      jiraUrl: options.jiraUrl,
      jiraEmail: options.jiraEmail,
      jiraToken: options.jiraToken,
      claudeKey: options.claudeKey,
      show: options.show,
    });
  });

// Fetch command
program
  .command('fetch')
  .description('Fetch bugs from Jira')
  .option('-q, --jql <query>', 'Custom JQL query (primary method)')
  .option('-p, --project <project>', 'Jira project key (adds to JQL)')
  .option('--escape-bugs', 'Filter to escape bugs only (adds to JQL)')
  .option('--since <date>', 'Bugs created since date, e.g., 2025-01-01 (adds to JQL)')
  .option('--until <date>', 'Bugs created before date, e.g., 2025-04-01 (adds to JQL)')
  .option('--exclude-wont-fix', 'Exclude Won\'t Fix, Duplicate, Cannot Reproduce resolutions')
  .option('-f, --filter-id <id>', 'Use a saved Jira filter by ID (alternative to JQL)')
  .option('-l, --list-filters', 'List available bug-related filters')
  .option('-m, --max <number>', 'Maximum bugs to fetch', '100')
  .option('-o, --output <file>', 'Output file path (JSON)')
  .option('--show-jql', 'Show the generated JQL without fetching')
  .action(async (options) => {
    const config = await loadConfig();

    // Build JQL from options if not provided directly
    let jql = options.jql;
    if (!jql && !options.filterId && !options.listFilters) {
      const conditions: string[] = ['Type = Bug'];

      if (options.project) {
        conditions.push(`project = "${options.project}"`);
      }

      if (options.escapeBugs) {
        conditions.push('"Escaped Bug[Radio Buttons]" = Yes');
      }

      if (options.since) {
        conditions.push(`createdDate >= '${options.since}'`);
      }

      if (options.until) {
        conditions.push(`createdDate < '${options.until}'`);
      }

      if (options.excludeWontFix) {
        conditions.push('(resolution = EMPTY OR (resolution != "Cannot Reproduce" and resolution != "Duplicate" and resolution != "Won\'t Do" and resolution != "Working as Designed" and resolution != "Won\'t Fix / Won\'t Do / Rejected" and resolution != "Canceled" and resolution != "Declined" and resolution != "Won\'t Fix"))');
      }

      jql = conditions.join(' AND ') + ' ORDER BY created DESC';
    }

    if (options.showJql) {
      console.log('Generated JQL:');
      console.log(jql || '(using filter ID)');
      return;
    }

    await fetchCommand(
      {
        project: options.project,
        jql: jql,
        filterId: options.filterId,
        listFilters: options.listFilters,
        maxResults: parseInt(options.max, 10),
        outputFile: options.output,
      },
      config
    );
  });

// Analyze command
program
  .command('analyze')
  .description('Analyze bugs from a JSON file')
  .requiredOption('-i, --input <file>', 'Input JSON file with bugs')
  .option('-f, --format <format>', 'Output format: terminal, json, markdown, html', 'terminal')
  .option('-o, --output <file>', 'Output file path')
  .option('--mode <mode>', 'Analysis mode: escape (confirmed escape bugs) or all (all failures by type)', 'escape')
  .action(async (options) => {
    const config = await loadConfig();
    await analyzeCommand(
      {
        inputFile: options.input,
        outputFormat: options.format,
        outputFile: options.output,
        mode: options.mode,
      },
      config
    );
  });

// Run command (full pipeline)
program
  .command('run')
  .description('Fetch bugs and run full analysis pipeline')
  .option('-p, --project <project>', 'Jira project key')
  .option('-q, --jql <query>', 'Custom JQL query')
  .option('--filter-id <id>', 'Use a saved Jira filter by ID')
  .option('-m, --max <number>', 'Maximum bugs to fetch', '100')
  .option('-f, --format <format>', 'Output format: terminal, json, markdown, html', 'terminal')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    const config = await loadConfig();
    await runCommand(
      {
        project: options.project,
        jql: options.jql,
        filterId: options.filterId,
        maxResults: parseInt(options.max, 10),
        outputFormat: options.format,
        outputFile: options.output,
      },
      config
    );
  });

program.parse();
