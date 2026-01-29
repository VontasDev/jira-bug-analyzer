import fs from 'node:fs/promises';
import path from 'node:path';
import ora from 'ora';
import chalk from 'chalk';
import { ClaudeService } from '../services/claude.js';
import { TerminalFormatter } from '../formatters/terminal.js';
import { JsonFormatter } from '../formatters/json.js';
import { ReportFormatter } from '../formatters/report.js';
import type { AnalyzeOptions, Config, JiraBug, PatternAnalysis } from '../types/index.js';

export async function analyzeCommand(
  options: AnalyzeOptions,
  config: Config
): Promise<PatternAnalysis> {
  const spinner = ora('Loading bugs from file...').start();

  try {
    // Load bugs from file
    const inputPath = path.resolve(options.inputFile);
    const fileContent = await fs.readFile(inputPath, 'utf-8');
    const bugs: JiraBug[] = JSON.parse(fileContent);

    spinner.text = `Loaded ${bugs.length} bugs. Analyzing with Claude AI...`;

    if (bugs.length === 0) {
      spinner.fail('No bugs found in input file.');
      process.exit(1);
    }

    // Analyze with Claude
    const claudeService = new ClaudeService(config.anthropicApiKey);
    const analysis = await claudeService.analyzeBugs(bugs);

    spinner.succeed('Analysis complete');

    // Format and output results
    await outputResults(analysis, options);

    return analysis;
  } catch (error) {
    spinner.fail('Analysis failed');
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
    process.exit(1);
  }
}

async function outputResults(
  analysis: PatternAnalysis,
  options: AnalyzeOptions
): Promise<void> {
  const format = options.outputFormat || 'terminal';

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

  if (options.outputFile) {
    let outputPath = path.resolve(options.outputFile);

    // Add extension if not present
    if (!outputPath.endsWith(fileExtension)) {
      outputPath += fileExtension;
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, output, 'utf-8');
    console.log(chalk.green(`\nReport saved to: ${outputPath}`));
  } else {
    console.log(output);
  }
}
