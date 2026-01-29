import chalk from 'chalk';
import Table from 'cli-table3';
import type { PatternAnalysis, JiraBug, BugCluster } from '../types/index.js';

export class TerminalFormatter {
  formatAnalysis(analysis: PatternAnalysis): string {
    const sections: string[] = [];

    sections.push(this.formatHeader());
    sections.push(this.formatSummary(analysis.summary));
    sections.push(this.formatClusters(analysis.rootCauseClusters));
    sections.push(this.formatRecurringIssues(analysis.recurringIssues));
    sections.push(this.formatHotspots(analysis.componentHotspots));
    sections.push(this.formatRecommendations(analysis.recommendations));

    return sections.join('\n\n');
  }

  private formatHeader(): string {
    return chalk.bold.cyan('\n=== Jira Bug Analysis Report ===\n');
  }

  private formatSummary(summary: string): string {
    return chalk.bold('Summary:\n') + chalk.white(summary);
  }

  private formatClusters(clusters: BugCluster[]): string {
    if (clusters.length === 0) {
      return chalk.yellow('No bug clusters identified.');
    }

    const lines = [chalk.bold.green(`\nRoot Cause Clusters (${clusters.length}):\n`)];

    for (const cluster of clusters) {
      const severityColor = this.getSeverityColor(cluster.severity);

      lines.push(
        chalk.bold(`  ${cluster.name}`) +
        ` [${severityColor(cluster.severity.toUpperCase())}]`
      );
      lines.push(chalk.gray(`    ${cluster.description}`));
      lines.push(chalk.white(`    Root cause: ${cluster.rootCause}`));
      lines.push(
        chalk.cyan(`    Bugs: ${cluster.bugs.map((b) => b.key).join(', ')}`)
      );
      lines.push(
        chalk.magenta(`    Components: ${cluster.affectedComponents.join(', ') || 'N/A'}`)
      );
      lines.push(chalk.yellow(`    Fix: ${cluster.suggestedFix}`));
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatRecurringIssues(issues: any[]): string {
    if (issues.length === 0) {
      return chalk.yellow('No recurring issues detected.');
    }

    const table = new Table({
      head: [
        chalk.bold('Pattern'),
        chalk.bold('Count'),
        chalk.bold('Bugs'),
        chalk.bold('Timespan'),
      ],
      colWidths: [40, 8, 30, 15],
      wordWrap: true,
    });

    for (const issue of issues) {
      table.push([
        issue.pattern,
        issue.occurrences.toString(),
        issue.bugKeys?.join(', ') || issue.bugs?.join(', ') || '',
        issue.timespan,
      ]);
    }

    return chalk.bold.green('\nRecurring Issues:\n') + table.toString();
  }

  private formatHotspots(hotspots: any[]): string {
    if (hotspots.length === 0) {
      return chalk.yellow('No component hotspots identified.');
    }

    const table = new Table({
      head: [
        chalk.bold('Component'),
        chalk.bold('Bugs'),
        chalk.bold('Severity'),
        chalk.bold('Trend'),
      ],
      colWidths: [30, 8, 12, 12],
    });

    for (const hotspot of hotspots) {
      const trendIcon =
        hotspot.trend === 'increasing' ? chalk.red('↑') :
        hotspot.trend === 'decreasing' ? chalk.green('↓') :
        chalk.gray('→');

      table.push([
        hotspot.component,
        hotspot.bugCount.toString(),
        this.getSeverityColor(hotspot.severity)(hotspot.severity),
        `${trendIcon} ${hotspot.trend}`,
      ]);
    }

    return chalk.bold.green('\nComponent Hotspots:\n') + table.toString();
  }

  private formatRecommendations(recommendations: string[]): string {
    if (recommendations.length === 0) {
      return '';
    }

    const lines = [chalk.bold.green('\nRecommendations:\n')];
    for (let i = 0; i < recommendations.length; i++) {
      lines.push(chalk.white(`  ${i + 1}. ${recommendations[i]}`));
    }
    return lines.join('\n');
  }

  private getSeverityColor(severity: string): chalk.Chalk {
    switch (severity.toLowerCase()) {
      case 'critical':
        return chalk.bgRed.white;
      case 'high':
        return chalk.red;
      case 'medium':
        return chalk.yellow;
      case 'low':
        return chalk.green;
      default:
        return chalk.gray;
    }
  }

  formatBugList(bugs: JiraBug[]): string {
    const table = new Table({
      head: [
        chalk.bold('Key'),
        chalk.bold('Summary'),
        chalk.bold('Status'),
        chalk.bold('Priority'),
        chalk.bold('Components'),
      ],
      colWidths: [12, 40, 12, 10, 20],
      wordWrap: true,
    });

    for (const bug of bugs) {
      table.push([
        chalk.cyan(bug.key),
        bug.summary.substring(0, 60) + (bug.summary.length > 60 ? '...' : ''),
        bug.status,
        bug.priority || 'N/A',
        bug.components.join(', ') || 'N/A',
      ]);
    }

    return chalk.bold(`\nFetched ${bugs.length} bugs:\n`) + table.toString();
  }
}
