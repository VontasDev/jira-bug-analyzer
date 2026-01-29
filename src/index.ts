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
  .option('-p, --project <project>', 'Jira project key')
  .option('-q, --jql <query>', 'Custom JQL query')
  .option('-m, --max <number>', 'Maximum bugs to fetch', '100')
  .option('-o, --output <file>', 'Output file path (JSON)')
  .action(async (options) => {
    const config = await loadConfig();
    await fetchCommand(
      {
        project: options.project,
        jql: options.jql,
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
  .action(async (options) => {
    const config = await loadConfig();
    await analyzeCommand(
      {
        inputFile: options.input,
        outputFormat: options.format,
        outputFile: options.output,
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
  .option('-m, --max <number>', 'Maximum bugs to fetch', '100')
  .option('-f, --format <format>', 'Output format: terminal, json, markdown, html', 'terminal')
  .option('-o, --output <file>', 'Output file path')
  .action(async (options) => {
    const config = await loadConfig();
    await runCommand(
      {
        project: options.project,
        jql: options.jql,
        maxResults: parseInt(options.max, 10),
        outputFormat: options.format,
        outputFile: options.output,
      },
      config
    );
  });

program.parse();
