import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import chalk from 'chalk';
import { ConfigSchema, type Config } from '../types/index.js';

const CONFIG_DIR = path.join(os.homedir(), '.jira-bug-analyzer');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export async function configCommand(options: {
  jiraUrl?: string;
  jiraEmail?: string;
  jiraToken?: string;
  claudeKey?: string;
  show?: boolean;
}): Promise<void> {
  if (options.show) {
    await showConfig();
    return;
  }

  if (!options.jiraUrl && !options.jiraEmail && !options.jiraToken && !options.claudeKey) {
    console.log(chalk.yellow('No configuration options provided.'));
    console.log('Use --help to see available options, or --show to display current config.\n');
    await showConfig();
    return;
  }

  try {
    // Load existing config or create new
    let existingConfig: Partial<Config> = {};
    try {
      const content = await fs.readFile(CONFIG_FILE, 'utf-8');
      existingConfig = JSON.parse(content);
    } catch {
      // No existing config
    }

    // Merge with new values
    const newConfig: Partial<Config> = {
      ...existingConfig,
      ...(options.jiraUrl && { jiraHost: options.jiraUrl }),
      ...(options.jiraEmail && { jiraEmail: options.jiraEmail }),
      ...(options.jiraToken && { jiraApiToken: options.jiraToken }),
      ...(options.claudeKey && { anthropicApiKey: options.claudeKey }),
    };

    // Save config
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(CONFIG_FILE, JSON.stringify(newConfig, null, 2));

    console.log(chalk.green('Configuration saved successfully!'));
    console.log(chalk.gray(`Location: ${CONFIG_FILE}`));

    // Check if config is complete
    const result = ConfigSchema.safeParse(newConfig);
    if (!result.success) {
      console.log(chalk.yellow('\nWarning: Configuration is incomplete.'));
      console.log('Missing or invalid fields:');
      for (const issue of result.error.issues) {
        console.log(chalk.red(`  - ${issue.path.join('.')}: ${issue.message}`));
      }
    }
  } catch (error) {
    console.error(chalk.red('Failed to save configuration.'));
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
}

async function showConfig(): Promise<void> {
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(content);

    console.log(chalk.bold('Current Configuration:'));
    console.log(chalk.gray(`Location: ${CONFIG_FILE}\n`));

    if (config.jiraHost) {
      console.log(`  Jira URL: ${chalk.cyan(config.jiraHost)}`);
    }
    if (config.jiraEmail) {
      console.log(`  Jira Email: ${chalk.cyan(config.jiraEmail)}`);
    }
    if (config.jiraApiToken) {
      console.log(`  Jira Token: ${chalk.cyan('****' + config.jiraApiToken.slice(-4))}`);
    }
    if (config.anthropicApiKey) {
      console.log(`  Claude API Key: ${chalk.cyan('****' + config.anthropicApiKey.slice(-4))}`);
    }
  } catch {
    console.log(chalk.yellow('No configuration found.'));
    console.log('Run "jira-analyzer config" with options to set up credentials.');
    console.log('\nRequired configuration:');
    console.log('  --jira-url     Jira Cloud URL (e.g., https://company.atlassian.net)');
    console.log('  --jira-email   Your Jira email address');
    console.log('  --jira-token   Jira API token');
    console.log('  --claude-key   Anthropic API key');
  }
}

export async function loadConfig(): Promise<Config> {
  // First try environment variables
  const envConfig: Partial<Config> = {
    jiraHost: process.env.JIRA_HOST,
    jiraEmail: process.env.JIRA_EMAIL,
    jiraApiToken: process.env.JIRA_API_TOKEN,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  };

  // Then try config file
  let fileConfig: Partial<Config> = {};
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf-8');
    fileConfig = JSON.parse(content);
  } catch {
    // No config file
  }

  // Merge with env taking precedence
  const merged = {
    jiraHost: envConfig.jiraHost || fileConfig.jiraHost || '',
    jiraEmail: envConfig.jiraEmail || fileConfig.jiraEmail || '',
    jiraApiToken: envConfig.jiraApiToken || fileConfig.jiraApiToken || '',
    anthropicApiKey: envConfig.anthropicApiKey || fileConfig.anthropicApiKey || '',
  };

  const result = ConfigSchema.safeParse(merged);
  if (!result.success) {
    console.error(chalk.red('Invalid or missing configuration.'));
    console.error('Run "jira-analyzer config --help" to set up credentials.\n');
    console.error('Missing fields:');
    for (const issue of result.error.issues) {
      console.error(chalk.red(`  - ${issue.path.join('.')}: ${issue.message}`));
    }
    process.exit(1);
  }

  return result.data;
}
