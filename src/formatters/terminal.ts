import chalk from 'chalk';
import Table from 'cli-table3';
import type {
  PatternAnalysis,
  JiraBug,
  BugCluster,
  EscapePattern,
  TestScenario,
  TestingGap,
  ComponentRiskScore,
  CustomerImpact,
  ProcessImprovement,
} from '../types/index.js';

export class TerminalFormatter {
  formatAnalysis(analysis: PatternAnalysis): string {
    const sections: string[] = [];

    sections.push(this.formatHeader());
    sections.push(this.formatSummary(analysis.summary));
    sections.push(this.formatClusters(analysis.rootCauseClusters));
    sections.push(this.formatRecurringIssues(analysis.recurringIssues));
    sections.push(this.formatHotspots(analysis.componentHotspots));
    sections.push(this.formatEscapePatterns(analysis.escapePatterns));
    sections.push(this.formatTestScenarios(analysis.suggestedTestScenarios));
    sections.push(this.formatTestingGaps(analysis.testingGaps));
    sections.push(this.formatRiskScores(analysis.componentRiskScores));
    sections.push(this.formatCustomerImpacts(analysis.customerImpacts));
    sections.push(this.formatProcessImprovements(analysis.processImprovements));
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

  private getSeverityColor(severity: string): (text: string) => string {
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

  private formatEscapePatterns(patterns: EscapePattern[]): string {
    if (!patterns || patterns.length === 0) {
      return chalk.yellow('No escape patterns identified.');
    }

    const table = new Table({
      head: [
        chalk.bold('Category'),
        chalk.bold('Description'),
        chalk.bold('Freq'),
        chalk.bold('Bugs'),
      ],
      colWidths: [18, 35, 6, 30],
      wordWrap: true,
    });

    const categoryColors: Record<string, (text: string) => string> = {
      'edge-case': chalk.magenta,
      'environment': chalk.blue,
      'timing': chalk.yellow,
      'data-driven': chalk.cyan,
      'integration': chalk.green,
      'configuration': chalk.gray,
      'race-condition': chalk.red,
      'hardware-specific': chalk.white,
    };

    for (const pattern of patterns) {
      const colorFn = categoryColors[pattern.category] || chalk.white;
      table.push([
        colorFn(pattern.category.replace(/-/g, ' ')),
        pattern.description,
        pattern.frequency.toString(),
        pattern.bugKeys.join(', '),
      ]);
    }

    return chalk.bold.red('\nEscape Analysis (Why bugs escaped SIT):\n') + table.toString();
  }

  private formatTestScenarios(scenarios: TestScenario[]): string {
    if (!scenarios || scenarios.length === 0) {
      return chalk.yellow('No test scenarios suggested.');
    }

    const lines = [chalk.bold.blue('\nSuggested Test Scenarios:\n')];

    // Show top priority scenarios (critical and high only in terminal)
    const priorityScenarios = scenarios.filter(s => s.priority === 'critical' || s.priority === 'high');
    const toShow = priorityScenarios.length > 0 ? priorityScenarios.slice(0, 5) : scenarios.slice(0, 5);

    for (const scenario of toShow) {
      const priorityColor = scenario.priority === 'critical' ? chalk.bgRed.white :
                           scenario.priority === 'high' ? chalk.red : chalk.yellow;

      lines.push(
        chalk.bold(`  ${scenario.name}`) +
        ` [${priorityColor(scenario.priority.toUpperCase())}]` +
        chalk.gray(` (${scenario.type})`)
      );
      lines.push(chalk.gray(`    ${scenario.description}`));
      lines.push(chalk.cyan(`    Targets: ${scenario.targetBugs.join(', ')}`));
      lines.push(chalk.white(`    Steps: ${scenario.steps.length} steps`));
      lines.push(chalk.green(`    Expected: ${scenario.expectedOutcome}`));
      lines.push('');
    }

    if (scenarios.length > toShow.length) {
      lines.push(chalk.gray(`  ... and ${scenarios.length - toShow.length} more scenarios (see full report)`));
    }

    return lines.join('\n');
  }

  private formatTestingGaps(gaps: TestingGap[]): string {
    if (!gaps || gaps.length === 0) {
      return chalk.yellow('No testing gaps identified.');
    }

    const table = new Table({
      head: [
        chalk.bold('Area'),
        chalk.bold('Current Coverage'),
        chalk.bold('Bugs'),
        chalk.bold('Improvement'),
      ],
      colWidths: [20, 25, 6, 35],
      wordWrap: true,
    });

    for (const gap of gaps) {
      table.push([
        chalk.yellow(gap.area),
        gap.currentCoverage,
        gap.impactedBugCount.toString(),
        gap.suggestedImprovement,
      ]);
    }

    return chalk.bold.yellow('\nTesting Gap Analysis:\n') + table.toString();
  }

  private formatRiskScores(scores: ComponentRiskScore[]): string {
    if (!scores || scores.length === 0) {
      return chalk.yellow('No component risk scores available.');
    }

    const lines = [chalk.bold.red('\nComponent Risk Scores:\n')];

    // Show top 5 highest risk components
    const topRisks = [...scores].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

    for (const score of topRisks) {
      const riskColor = score.riskScore >= 8 ? chalk.bgRed.white :
                        score.riskScore >= 5 ? chalk.yellow : chalk.green;

      lines.push(
        chalk.bold(`  ${score.component}`) +
        ` [${riskColor(`Risk: ${score.riskScore}/10`)}]` +
        chalk.gray(` (${score.escapeHistory} escapes)`)
      );
      lines.push(chalk.gray(`    Complexity: ${score.complexityFactor} | Changes: ${score.changeFrequency}`));
      lines.push(chalk.cyan(`    ${score.recommendation}`));
      lines.push('');
    }

    if (scores.length > 5) {
      lines.push(chalk.gray(`  ... and ${scores.length - 5} more components (see full report)`));
    }

    return lines.join('\n');
  }

  private formatCustomerImpacts(impacts: CustomerImpact[]): string {
    if (!impacts || impacts.length === 0) {
      return chalk.yellow('No customer impact data available.');
    }

    // Show only critical and high impact bugs
    const highImpact = impacts.filter(i => i.impactLevel === 'critical' || i.impactLevel === 'high');
    if (highImpact.length === 0) {
      return chalk.green('No critical or high-impact bugs identified.');
    }

    const lines = [chalk.bold.magenta('\nHigh-Impact Bugs:\n')];

    for (const impact of highImpact.slice(0, 5)) {
      const impactColor = impact.impactLevel === 'critical' ? chalk.bgRed.white : chalk.red;
      const workaround = impact.workaroundAvailable ? chalk.green('✓ workaround') : chalk.red('✗ no workaround');

      lines.push(
        chalk.bold(`  ${impact.bugKey}`) +
        ` [${impactColor(impact.impactLevel.toUpperCase())}]` +
        ` - ${workaround}`
      );
      lines.push(chalk.gray(`    Business: ${impact.businessFunction}`));
      lines.push(chalk.cyan(`    Users: ${impact.affectedUsers} | Cost: ${impact.estimatedCost}`));
      lines.push('');
    }

    if (highImpact.length > 5) {
      lines.push(chalk.gray(`  ... and ${highImpact.length - 5} more high-impact bugs (see full report)`));
    }

    return lines.join('\n');
  }

  private formatProcessImprovements(improvements: ProcessImprovement[]): string {
    if (!improvements || improvements.length === 0) {
      return chalk.yellow('No process improvements suggested.');
    }

    const lines = [chalk.bold.cyan('\nTop Process Improvements:\n')];

    // Show high-impact, low-effort improvements first (quick wins)
    const quickWins = improvements.filter(i => i.impact === 'high' && i.effort === 'low');
    const highImpact = improvements.filter(i => i.impact === 'high' && i.effort !== 'low');

    const toShow = [...quickWins, ...highImpact].slice(0, 5);
    if (toShow.length === 0) {
      toShow.push(...improvements.slice(0, 3));
    }

    for (const imp of toShow) {
      const areaColor = {
        'code-review': chalk.blue,
        'testing': chalk.green,
        'deployment': chalk.yellow,
        'requirements': chalk.magenta,
        'environment': chalk.cyan,
      }[imp.area] || chalk.white;

      const effortIcon = imp.effort === 'low' ? '⚡' : imp.effort === 'medium' ? '⏱️' : '🔨';
      const impactIcon = imp.impact === 'high' ? '↑↑' : imp.impact === 'medium' ? '↑' : '→';

      lines.push(
        chalk.bold(`  ${areaColor(imp.area)}`) +
        chalk.gray(` [${effortIcon} ${imp.effort} effort | ${impactIcon} ${imp.impact} impact]`)
      );
      lines.push(chalk.white(`    ${imp.suggestion}`));
      lines.push('');
    }

    if (improvements.length > toShow.length) {
      lines.push(chalk.gray(`  ... and ${improvements.length - toShow.length} more suggestions (see full report)`));
    }

    return lines.join('\n');
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
