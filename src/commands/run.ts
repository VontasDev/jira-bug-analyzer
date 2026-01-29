import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import ora from 'ora';
import chalk from 'chalk';
import { JiraService } from '../services/jira.js';
import { ClaudeService } from '../services/claude.js';
import { TerminalFormatter } from '../formatters/terminal.js';
import { JsonFormatter } from '../formatters/json.js';
import { ReportFormatter } from '../formatters/report.js';
import type { RunOptions, Config, PatternAnalysis } from '../types/index.js';

export async function runCommand(
  options: RunOptions,
  config: Config
): Promise<PatternAnalysis> {
  console.log(chalk.bold.cyan('\n=== Jira Bug Analyzer ===\n'));

  const spinner = ora('Connecting to Jira...').start();

  try {
    // Step 1: Connect to Jira and fetch bugs
    const jiraService = new JiraService({
      jiraHost: config.jiraHost,
      jiraEmail: config.jiraEmail,
      jiraApiToken: config.jiraApiToken,
    });

    const connected = await jiraService.testConnection();
    if (!connected) {
      spinner.fail('Failed to connect to Jira');
      process.exit(1);
    }

    spinner.text = 'Fetching bugs from Jira...';
    const bugs = await jiraService.fetchBugs({
      project: options.project,
      jql: options.jql,
      filterId: options.filterId,
      maxResults: options.maxResults,
    });

    if (bugs.length === 0) {
      spinner.warn('No bugs found matching your criteria.');
      process.exit(0);
    }

    spinner.succeed(`Fetched ${bugs.length} bugs`);

    // Step 2: Cache bugs locally
    const cacheDir = path.join(os.tmpdir(), 'jira-bug-analyzer');
    await fs.mkdir(cacheDir, { recursive: true });
    const cacheFile = path.join(cacheDir, `bugs-${Date.now()}.json`);
    await fs.writeFile(cacheFile, JSON.stringify(bugs, null, 2));

    // Step 3: Analyze with Claude
    spinner.start('Analyzing bugs with Claude AI...');
    const claudeService = new ClaudeService(config.anthropicApiKey);
    const analysis = await claudeService.analyzeBugs(bugs);
    spinner.succeed('Analysis complete');

    // Step 4: Output results
    const format = options.outputFormat || 'terminal';
    await outputResults(analysis, format, options.outputFile);

    // Summary
    console.log(chalk.bold.green('\nAnalysis Summary:'));
    console.log(`  - Bug clusters identified: ${analysis.rootCauseClusters.length}`);
    console.log(`  - Recurring issues: ${analysis.recurringIssues.length}`);
    console.log(`  - Component hotspots: ${analysis.componentHotspots.length}`);
    console.log(`  - Recommendations: ${analysis.recommendations.length}`);

    return analysis;
  } catch (error) {
    spinner.fail('Pipeline failed');
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }
}

async function outputResults(
  analysis: PatternAnalysis,
  format: string,
  outputFile?: string
): Promise<void> {
  let output: string;
  let fileExtension: string;

  switch (format) {
    case 'json': {
      const jsonFormatter = new JsonFormatter();
      output = jsonFormatter.formatAnalysis(analysis);
      fileExtension = '.json';
      break;
    }
    case 'markdown': {
      const reportFormatter = new ReportFormatter();
      output = reportFormatter.formatMarkdown(analysis);
      fileExtension = '.md';
      break;
    }
    case 'html': {
      const reportFormatter = new ReportFormatter();
      output = await reportFormatter.formatHtml(analysis);
      fileExtension = '.html';
      break;
    }
    case 'terminal':
    default: {
      const terminalFormatter = new TerminalFormatter();
      output = terminalFormatter.formatAnalysis(analysis);
      fileExtension = '.txt';
      break;
    }
  }

  if (outputFile) {
    let outputPath = path.resolve(outputFile);
    if (!path.extname(outputPath)) {
      outputPath += fileExtension;
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, output, 'utf-8');
    console.log(chalk.green(`\nReport saved to: ${outputPath}`));
  } else if (format !== 'terminal') {
    // For non-terminal formats without a file, still output to console
    console.log(output);
  } else {
    console.log(output);
  }
}
