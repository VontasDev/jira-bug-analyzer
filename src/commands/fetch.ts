import fs from 'node:fs/promises';
import path from 'node:path';
import ora from 'ora';
import chalk from 'chalk';
import { JiraService } from '../services/jira.js';
import { TerminalFormatter } from '../formatters/terminal.js';
import { JsonFormatter } from '../formatters/json.js';
import type { FetchOptions, Config, JiraBug } from '../types/index.js';

export async function fetchCommand(
  options: FetchOptions,
  config: Config
): Promise<JiraBug[]> {
  const spinner = ora('Connecting to Jira...').start();

  try {
    const jiraService = new JiraService({
      jiraHost: config.jiraHost,
      jiraEmail: config.jiraEmail,
      jiraApiToken: config.jiraApiToken,
    });

    // Test connection
    const connected = await jiraService.testConnection();
    if (!connected) {
      spinner.fail('Failed to connect to Jira. Check your credentials.');
      process.exit(1);
    }
    spinner.text = 'Connected. Fetching bugs...';

    // Build query info for display
    const queryInfo = options.jql
      ? `JQL: ${options.jql}`
      : options.project
        ? `Project: ${options.project}`
        : 'All bugs';

    spinner.text = `Fetching bugs (${queryInfo})...`;

    const bugs = await jiraService.fetchBugs({
      project: options.project,
      jql: options.jql,
      maxResults: options.maxResults,
    });

    spinner.succeed(`Fetched ${bugs.length} bugs from Jira`);

    // Output to file if specified
    if (options.outputFile) {
      const jsonFormatter = new JsonFormatter();
      const output = jsonFormatter.formatBugs(bugs);

      const outputPath = path.resolve(options.outputFile);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, output, 'utf-8');

      console.log(chalk.green(`\nBugs saved to: ${outputPath}`));
    } else {
      // Display in terminal
      const terminalFormatter = new TerminalFormatter();
      console.log(terminalFormatter.formatBugList(bugs));
    }

    return bugs;
  } catch (error) {
    spinner.fail('Failed to fetch bugs');
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }
}
