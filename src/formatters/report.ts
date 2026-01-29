import { marked } from 'marked';
import type { PatternAnalysis, BugCluster } from '../types/index.js';

export class ReportFormatter {
  formatMarkdown(analysis: PatternAnalysis): string {
    const sections: string[] = [];

    sections.push('# Jira Bug Analysis Report');
    sections.push(`*Generated: ${new Date().toLocaleString()}*\n`);

    sections.push('## Summary');
    sections.push(analysis.summary);

    sections.push(this.formatClustersMarkdown(analysis.rootCauseClusters));
    sections.push(this.formatRecurringIssuesMarkdown(analysis.recurringIssues));
    sections.push(this.formatHotspotsMarkdown(analysis.componentHotspots));
    sections.push(this.formatRecommendationsMarkdown(analysis.recommendations));

    return sections.join('\n\n');
  }

  async formatHtml(analysis: PatternAnalysis): Promise<string> {
    const markdown = this.formatMarkdown(analysis);
    const htmlContent = await marked(markdown);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jira Bug Analysis Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    h1 { color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 0.5rem; }
    h2 { color: #333; margin-top: 2rem; }
    h3 { color: #555; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    th, td {
      border: 1px solid #ddd;
      padding: 0.75rem;
      text-align: left;
    }
    th { background: #f8f9fa; font-weight: 600; }
    tr:nth-child(even) { background: #f8f9fa; }
    .severity-critical { color: white; background: #d32f2f; padding: 2px 8px; border-radius: 4px; }
    .severity-high { color: #d32f2f; font-weight: bold; }
    .severity-medium { color: #f57c00; }
    .severity-low { color: #388e3c; }
    .cluster { background: white; padding: 1rem; margin: 1rem 0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .recommendation { background: #e8f5e9; padding: 0.5rem 1rem; margin: 0.5rem 0; border-left: 4px solid #4caf50; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
  }

  private formatClustersMarkdown(clusters: BugCluster[]): string {
    if (clusters.length === 0) {
      return '## Root Cause Clusters\n\n*No clusters identified.*';
    }

    const lines = [`## Root Cause Clusters (${clusters.length})`];

    for (const cluster of clusters) {
      lines.push(`### ${cluster.name}`);
      lines.push(`**Severity:** ${cluster.severity.toUpperCase()}\n`);
      lines.push(cluster.description);
      lines.push(`\n**Root Cause:** ${cluster.rootCause}`);
      lines.push(`\n**Affected Bugs:** ${cluster.bugs.map((b) => `\`${b.key}\``).join(', ')}`);
      lines.push(`\n**Components:** ${cluster.affectedComponents.join(', ') || 'N/A'}`);
      lines.push(`\n**Suggested Fix:** ${cluster.suggestedFix}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatRecurringIssuesMarkdown(issues: any[]): string {
    if (issues.length === 0) {
      return '## Recurring Issues\n\n*No recurring issues detected.*';
    }

    const lines = ['## Recurring Issues'];
    lines.push('| Pattern | Occurrences | Bugs | Timespan |');
    lines.push('|---------|-------------|------|----------|');

    for (const issue of issues) {
      const bugs = issue.bugKeys?.join(', ') || issue.bugs?.join(', ') || '';
      lines.push(`| ${issue.pattern} | ${issue.occurrences} | ${bugs} | ${issue.timespan} |`);
    }

    return lines.join('\n');
  }

  private formatHotspotsMarkdown(hotspots: any[]): string {
    if (hotspots.length === 0) {
      return '## Component Hotspots\n\n*No hotspots identified.*';
    }

    const lines = ['## Component Hotspots'];
    lines.push('| Component | Bug Count | Severity | Trend |');
    lines.push('|-----------|-----------|----------|-------|');

    for (const hotspot of hotspots) {
      lines.push(
        `| ${hotspot.component} | ${hotspot.bugCount} | ${hotspot.severity} | ${hotspot.trend} |`
      );
    }

    return lines.join('\n');
  }

  private formatRecommendationsMarkdown(recommendations: string[]): string {
    if (recommendations.length === 0) {
      return '';
    }

    const lines = ['## Recommendations'];
    for (let i = 0; i < recommendations.length; i++) {
      lines.push(`${i + 1}. ${recommendations[i]}`);
    }

    return lines.join('\n');
  }
}
