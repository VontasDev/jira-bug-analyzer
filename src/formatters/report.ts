import { marked } from 'marked';
import type {
  PatternAnalysis,
  BugCluster,
  EscapePattern,
  TestScenario,
  TestingGap,
  DefectInjectionPoint,
  ComponentRiskScore,
  RegressionAnalysis,
  CustomerImpact,
  TestDataRecommendation,
  ProcessImprovement,
  TrendMetrics,
  QuarterlyMetrics,
  Recommendation,
  AutomationOpportunity,
  LinuxPortAnalysis,
} from '../types/index.js';

const JIRA_BASE_URL = 'https://vontas.atlassian.net/browse';

export class ReportFormatter {
  private linkBugKey(key: string): string {
    return `[${key}](${JIRA_BASE_URL}/${key})`;
  }

  private linkBugKeys(keys: string[]): string {
    return keys.map(k => this.linkBugKey(k)).join(', ');
  }
  formatMarkdown(analysis: PatternAnalysis): string {
    const sections: string[] = [];

    sections.push('# Jira Bug Analysis Report');
    sections.push(`*Generated: ${new Date().toLocaleString()}*\n`);

    sections.push('## Summary');
    sections.push(analysis.summary);

    sections.push(this.formatClustersMarkdown(analysis.rootCauseClusters));
    sections.push(this.formatRecurringIssuesMarkdown(analysis.recurringIssues));
    sections.push(this.formatHotspotsMarkdown(analysis.componentHotspots));
    sections.push(this.formatEscapePatternsMarkdown(analysis.escapePatterns));
    sections.push(this.formatTestScenariosMarkdown(analysis.suggestedTestScenarios));
    sections.push(this.formatTestingGapsMarkdown(analysis.testingGaps));
    sections.push(this.formatDefectInjectionMarkdown(analysis.defectInjectionPoints));
    sections.push(this.formatRiskScoresMarkdown(analysis.componentRiskScores));
    sections.push(this.formatRegressionAnalysisMarkdown(analysis.regressionAnalysis));
    sections.push(this.formatCustomerImpactMarkdown(analysis.customerImpacts));
    sections.push(this.formatTestDataRecommendationsMarkdown(analysis.testDataRecommendations));
    sections.push(this.formatProcessImprovementsMarkdown(analysis.processImprovements));
    sections.push(this.formatTrendMetricsMarkdown(analysis.trendMetrics));
    sections.push(this.formatAutomationOpportunitiesMarkdown(analysis.automationOpportunities));
    sections.push(this.formatLinuxPortAnalysisMarkdown(analysis.linuxPortAnalysis));
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
      lines.push(`\n**Affected Bugs:** ${cluster.bugs.map((b) => this.linkBugKey(b.key)).join(', ')}`);
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
      const bugKeys = issue.bugKeys || issue.bugs || [];
      const bugs = this.linkBugKeys(bugKeys);
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

  private formatRecommendationsMarkdown(recommendations: Recommendation[]): string {
    if (!recommendations || recommendations.length === 0) {
      return '';
    }

    const lines = ['## Recommendations'];
    lines.push('\nPrioritized actions to prevent future escape bugs.\n');

    // Group by priority
    const critical = recommendations.filter(r => r.priority === 'critical');
    const high = recommendations.filter(r => r.priority === 'high');
    const medium = recommendations.filter(r => r.priority === 'medium');

    let idx = 1;
    const formatRec = (rec: Recommendation) => {
      const recLines: string[] = [];
      const priorityEmoji = rec.priority === 'critical' ? '🔴' :
                            rec.priority === 'high' ? '🟠' : '🟡';
      recLines.push(`### ${idx++}. ${rec.text}`);
      recLines.push(`**Priority:** ${priorityEmoji} ${rec.priority.toUpperCase()}\n`);
      if (rec.reasoning) {
        recLines.push(`**Why:** ${rec.reasoning}\n`);
      }
      if (rec.targetBugs && rec.targetBugs.length > 0) {
        recLines.push(`**Related Bugs:** ${this.linkBugKeys(rec.targetBugs)}`);
      }
      recLines.push('');
      return recLines.join('\n');
    };

    if (critical.length > 0) {
      lines.push('---\n#### Critical Priority\n');
      critical.forEach(r => lines.push(formatRec(r)));
    }
    if (high.length > 0) {
      lines.push('---\n#### High Priority\n');
      high.forEach(r => lines.push(formatRec(r)));
    }
    if (medium.length > 0) {
      lines.push('---\n#### Medium Priority\n');
      medium.forEach(r => lines.push(formatRec(r)));
    }

    return lines.join('\n');
  }

  private formatEscapePatternsMarkdown(patterns: EscapePattern[]): string {
    if (!patterns || patterns.length === 0) {
      return '## Escape Analysis\n\n*No escape patterns identified.*';
    }

    const lines = ['## Escape Analysis'];
    lines.push('\nThis section analyzes WHY bugs escaped SIT testing.\n');
    lines.push('| Category | Description | Frequency | Affected Bugs |');
    lines.push('|----------|-------------|-----------|---------------|');

    for (const pattern of patterns) {
      const category = pattern.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const bugs = this.linkBugKeys(pattern.bugKeys);
      lines.push(`| **${category}** | ${pattern.description} | ${pattern.frequency} | ${bugs} |`);
    }

    return lines.join('\n');
  }

  private formatTestScenariosMarkdown(scenarios: TestScenario[]): string {
    if (!scenarios || scenarios.length === 0) {
      return '## Suggested Test Scenarios\n\n*No test scenarios suggested.*';
    }

    const lines = ['## Suggested Test Scenarios'];
    lines.push('\nThese test scenarios would have caught the escaped bugs.\n');

    // Group by priority
    const critical = scenarios.filter(s => s.priority === 'critical');
    const high = scenarios.filter(s => s.priority === 'high');
    const medium = scenarios.filter(s => s.priority === 'medium');

    const formatScenario = (scenario: TestScenario, index: number) => {
      const scenarioLines: string[] = [];
      scenarioLines.push(`### ${index}. ${scenario.name}`);
      scenarioLines.push(`**Priority:** ${scenario.priority.toUpperCase()} | **Type:** ${scenario.type}\n`);
      scenarioLines.push(scenario.description);
      scenarioLines.push(`\n**Target Bugs:** ${this.linkBugKeys(scenario.targetBugs)}`);

      if (scenario.preconditions.length > 0) {
        scenarioLines.push('\n**Preconditions:**');
        scenario.preconditions.forEach(p => scenarioLines.push(`- ${p}`));
      }

      scenarioLines.push('\n**Steps:**');
      scenario.steps.forEach((step, i) => scenarioLines.push(`${i + 1}. ${step}`));

      scenarioLines.push(`\n**Expected Outcome:** ${scenario.expectedOutcome}`);
      scenarioLines.push('');
      return scenarioLines.join('\n');
    };

    let idx = 1;
    if (critical.length > 0) {
      lines.push('\n---\n#### Critical Priority\n');
      critical.forEach(s => lines.push(formatScenario(s, idx++)));
    }
    if (high.length > 0) {
      lines.push('\n---\n#### High Priority\n');
      high.forEach(s => lines.push(formatScenario(s, idx++)));
    }
    if (medium.length > 0) {
      lines.push('\n---\n#### Medium Priority\n');
      medium.forEach(s => lines.push(formatScenario(s, idx++)));
    }

    return lines.join('\n');
  }

  private formatTestingGapsMarkdown(gaps: TestingGap[]): string {
    if (!gaps || gaps.length === 0) {
      return '## Testing Gap Analysis\n\n*No testing gaps identified.*';
    }

    const lines = ['## Testing Gap Analysis'];
    lines.push('\nAreas where testing coverage needs improvement.\n');
    lines.push('| Area | Current Coverage | Bugs Impacted | Suggested Improvement |');
    lines.push('|------|------------------|---------------|----------------------|');

    for (const gap of gaps) {
      lines.push(`| **${gap.area}** | ${gap.currentCoverage} | ${gap.impactedBugCount} | ${gap.suggestedImprovement} |`);
    }

    lines.push('\n### Gap Details\n');
    for (const gap of gaps) {
      lines.push(`#### ${gap.area}`);
      lines.push(gap.description);
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatDefectInjectionMarkdown(points: DefectInjectionPoint[]): string {
    if (!points || points.length === 0) {
      return '## Defect Injection Analysis\n\n*No defect injection points identified.*';
    }

    const lines = ['## Defect Injection Analysis'];
    lines.push('\nWhere in the SDLC defects were introduced.\n');
    lines.push('| Phase | Frequency | Bugs | Prevention Strategy |');
    lines.push('|-------|-----------|------|---------------------|');

    const phaseOrder = ['requirements', 'design', 'coding', 'integration', 'deployment'];
    const sortedPoints = [...points].sort((a, b) =>
      phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase)
    );

    for (const point of sortedPoints) {
      const phaseName = point.phase.charAt(0).toUpperCase() + point.phase.slice(1);
      const bugs = this.linkBugKeys(point.bugKeys);
      lines.push(`| **${phaseName}** | ${point.frequency} | ${bugs} | ${point.preventionStrategy} |`);
    }

    lines.push('\n### Phase Details\n');
    for (const point of sortedPoints) {
      const phaseName = point.phase.charAt(0).toUpperCase() + point.phase.slice(1);
      lines.push(`#### ${phaseName} Phase`);
      lines.push(point.description);
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatRiskScoresMarkdown(scores: ComponentRiskScore[]): string {
    if (!scores || scores.length === 0) {
      return '## Component Risk Scores\n\n*No component risk scores calculated.*';
    }

    const lines = ['## Component Risk Scores'];
    lines.push('\nRisk assessment for components based on escape history, complexity, and change frequency.\n');
    lines.push('| Component | Risk Score | Escapes | Complexity | Change Freq | Recommendation |');
    lines.push('|-----------|------------|---------|------------|-------------|----------------|');

    const sortedScores = [...scores].sort((a, b) => b.riskScore - a.riskScore);

    for (const score of sortedScores) {
      const riskEmoji = score.riskScore >= 8 ? '🔴' : score.riskScore >= 5 ? '🟡' : '🟢';
      lines.push(`| **${score.component}** | ${riskEmoji} ${score.riskScore}/10 | ${score.escapeHistory} | ${score.complexityFactor} | ${score.changeFrequency} | ${score.recommendation} |`);
    }

    return lines.join('\n');
  }

  private formatRegressionAnalysisMarkdown(regressions: RegressionAnalysis[]): string {
    if (!regressions || regressions.length === 0) {
      return '## Regression Analysis\n\n*No regressions identified.*';
    }

    const actualRegressions = regressions.filter(r => r.isRegression);
    if (actualRegressions.length === 0) {
      return '## Regression Analysis\n\n*No regressions identified among the analyzed bugs.*';
    }

    const lines = ['## Regression Analysis'];
    lines.push(`\n${actualRegressions.length} bug(s) identified as potential regressions.\n`);
    lines.push('| Bug | Type | Related Bugs | Likely Cause |');
    lines.push('|-----|------|--------------|--------------|');

    for (const reg of actualRegressions) {
      const typeName = reg.regressionType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const related = reg.relatedBugKeys.length > 0 ? this.linkBugKeys(reg.relatedBugKeys) : 'N/A';
      lines.push(`| ${this.linkBugKey(reg.bugKey)} | ${typeName} | ${related} | ${reg.likelyCause} |`);
    }

    return lines.join('\n');
  }

  private formatCustomerImpactMarkdown(impacts: CustomerImpact[]): string {
    if (!impacts || impacts.length === 0) {
      return '## Customer Impact Analysis\n\n*No customer impact data available.*';
    }

    const lines = ['## Customer Impact Analysis'];
    lines.push('\nBusiness impact assessment for escaped bugs.\n');

    // Group by impact level
    const critical = impacts.filter(i => i.impactLevel === 'critical');
    const high = impacts.filter(i => i.impactLevel === 'high');
    const medium = impacts.filter(i => i.impactLevel === 'medium');
    const low = impacts.filter(i => i.impactLevel === 'low');

    lines.push('| Bug | Impact | Users Affected | Business Function | Workaround | Cost |');
    lines.push('|-----|--------|----------------|-------------------|------------|------|');

    const formatImpact = (impact: CustomerImpact) => {
      const workaround = impact.workaroundAvailable ? '✅ Yes' : '❌ No';
      const impactEmoji = impact.impactLevel === 'critical' ? '🔴' :
                          impact.impactLevel === 'high' ? '🟠' :
                          impact.impactLevel === 'medium' ? '🟡' : '🟢';
      return `| ${this.linkBugKey(impact.bugKey)} | ${impactEmoji} ${impact.impactLevel.toUpperCase()} | ${impact.affectedUsers} | ${impact.businessFunction} | ${workaround} | ${impact.estimatedCost} |`;
    };

    critical.forEach(i => lines.push(formatImpact(i)));
    high.forEach(i => lines.push(formatImpact(i)));
    medium.forEach(i => lines.push(formatImpact(i)));
    low.forEach(i => lines.push(formatImpact(i)));

    return lines.join('\n');
  }

  private formatTestDataRecommendationsMarkdown(recommendations: TestDataRecommendation[]): string {
    if (!recommendations || recommendations.length === 0) {
      return '## Test Data Recommendations\n\n*No test data recommendations available.*';
    }

    const lines = ['## Test Data Recommendations'];
    lines.push('\nData patterns and edge cases that would catch escaped bugs.\n');

    const critical = recommendations.filter(r => r.priority === 'critical');
    const high = recommendations.filter(r => r.priority === 'high');
    const medium = recommendations.filter(r => r.priority === 'medium');

    const formatRecommendation = (rec: TestDataRecommendation, index: number) => {
      const recLines: string[] = [];
      recLines.push(`### ${index}. ${rec.category}`);
      recLines.push(`**Priority:** ${rec.priority.toUpperCase()}\n`);
      recLines.push(rec.description);
      recLines.push(`\n**Target Bugs:** ${this.linkBugKeys(rec.targetBugs)}`);

      if (rec.dataPatterns.length > 0) {
        recLines.push('\n**Data Patterns to Test:**');
        rec.dataPatterns.forEach(p => recLines.push(`- ${p}`));
      }

      if (rec.edgeCases.length > 0) {
        recLines.push('\n**Edge Cases:**');
        rec.edgeCases.forEach(e => recLines.push(`- ${e}`));
      }

      recLines.push('');
      return recLines.join('\n');
    };

    let idx = 1;
    if (critical.length > 0) {
      lines.push('\n---\n#### Critical Priority\n');
      critical.forEach(r => lines.push(formatRecommendation(r, idx++)));
    }
    if (high.length > 0) {
      lines.push('\n---\n#### High Priority\n');
      high.forEach(r => lines.push(formatRecommendation(r, idx++)));
    }
    if (medium.length > 0) {
      lines.push('\n---\n#### Medium Priority\n');
      medium.forEach(r => lines.push(formatRecommendation(r, idx++)));
    }

    return lines.join('\n');
  }

  private formatProcessImprovementsMarkdown(improvements: ProcessImprovement[]): string {
    if (!improvements || improvements.length === 0) {
      return '## Process Improvement Suggestions\n\n*No process improvements suggested.*';
    }

    const lines = ['## Process Improvement Suggestions'];
    lines.push('\nSIT process changes to prevent future escapes.\n');
    lines.push('| Area | Suggestion | Effort | Impact | Target Bugs |');
    lines.push('|------|------------|--------|--------|-------------|');

    // Sort by impact (high first) then effort (low first)
    const impactOrder = { high: 0, medium: 1, low: 2 };
    const effortOrder = { low: 0, medium: 1, high: 2 };
    const sortedImprovements = [...improvements].sort((a, b) => {
      const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
      if (impactDiff !== 0) return impactDiff;
      return effortOrder[a.effort] - effortOrder[b.effort];
    });

    for (const imp of sortedImprovements) {
      const areaName = imp.area.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const effortEmoji = imp.effort === 'low' ? '🟢' : imp.effort === 'medium' ? '🟡' : '🔴';
      const impactEmoji = imp.impact === 'high' ? '⬆️' : imp.impact === 'medium' ? '➡️' : '⬇️';
      const bugs = this.linkBugKeys(imp.targetBugs);
      lines.push(`| **${areaName}** | ${imp.suggestion} | ${effortEmoji} ${imp.effort} | ${impactEmoji} ${imp.impact} | ${bugs} |`);
    }

    lines.push('\n### Improvement Details\n');
    for (const imp of sortedImprovements) {
      const areaName = imp.area.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      lines.push(`#### ${areaName}: ${imp.suggestion}`);
      lines.push(`**Rationale:** ${imp.rationale}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatTrendMetricsMarkdown(metrics: TrendMetrics): string {
    if (!metrics) {
      return '## Trend Analysis\n\n*No trend data available.*';
    }

    const lines = ['## Trend Analysis'];
    lines.push(`\n**Analysis Period:** ${metrics.period}\n`);

    const trendEmoji = metrics.riskTrend === 'improving' ? '📈 Improving' :
                       metrics.riskTrend === 'worsening' ? '📉 Worsening' : '➡️ Stable';

    lines.push(`**Total Bugs Analyzed:** ${metrics.totalBugs}`);
    lines.push(`**Overall Trend:** ${trendEmoji}\n`);

    // Quarterly breakdown section
    if (metrics.quarterlyBreakdown && metrics.quarterlyBreakdown.length > 0) {
      lines.push('### Quarterly Breakdown\n');
      lines.push('| Quarter | Bug Count | Top Categories | Top Components |');
      lines.push('|---------|-----------|----------------|----------------|');

      for (const q of metrics.quarterlyBreakdown) {
        const topCats = Object.entries(q.escapesByCategory)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([cat, count]) => `${cat.replace(/-/g, ' ')} (${count})`)
          .join(', ') || 'N/A';
        const topComps = q.topComponents.slice(0, 2).join(', ') || 'N/A';
        lines.push(`| **${q.quarter}** | ${q.bugCount} | ${topCats} | ${topComps} |`);
      }
      lines.push('');

      // Quarter-over-quarter comparison
      lines.push('### Quarter-over-Quarter Trends\n');
      const quarters = metrics.quarterlyBreakdown;
      for (let i = 1; i < quarters.length; i++) {
        const prev = quarters[i - 1];
        const curr = quarters[i];
        const diff = curr.bugCount - prev.bugCount;
        const diffText = diff > 0 ? `+${diff}` : diff.toString();
        const arrow = diff > 0 ? '⬆️' : diff < 0 ? '⬇️' : '➡️';
        lines.push(`- **${prev.quarter} → ${curr.quarter}:** ${arrow} ${diffText} bugs (${prev.bugCount} → ${curr.bugCount})`);
      }
      lines.push('');

      // Detailed quarterly sections
      lines.push('### Quarterly Details\n');
      for (const q of quarters) {
        lines.push(`#### ${q.quarter}`);
        lines.push(`**Bugs:** ${q.bugCount}`);
        if (q.bugKeys.length > 0) {
          lines.push(`**Bug Keys:** ${this.linkBugKeys(q.bugKeys)}`);
        }
        if (Object.keys(q.escapesByCategory).length > 0) {
          lines.push('\n**Escapes by Category:**');
          for (const [cat, count] of Object.entries(q.escapesByCategory)) {
            lines.push(`- ${cat.replace(/-/g, ' ')}: ${count}`);
          }
        }
        if (q.topComponents.length > 0) {
          lines.push(`\n**Top Components:** ${q.topComponents.join(', ')}`);
        }
        lines.push('');
      }
    }

    if (Object.keys(metrics.escapesByCategory).length > 0) {
      lines.push('### Annual Escapes by Category\n');
      lines.push('| Category | Count |');
      lines.push('|----------|-------|');
      for (const [category, count] of Object.entries(metrics.escapesByCategory)) {
        const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        lines.push(`| ${categoryName} | ${count} |`);
      }
      lines.push('');
    }

    if (metrics.topComponents.length > 0) {
      lines.push('### Top Affected Components (Annual)\n');
      metrics.topComponents.forEach((comp, i) => {
        lines.push(`${i + 1}. ${comp}`);
      });
      lines.push('');
    }

    if (metrics.comparisonToPrevious) {
      lines.push('### Comparison Summary\n');
      lines.push(metrics.comparisonToPrevious);
    }

    return lines.join('\n');
  }

  private formatAutomationOpportunitiesMarkdown(opportunities: AutomationOpportunity[]): string {
    if (!opportunities || opportunities.length === 0) {
      return '## Test Automation Opportunities\n\n*No automation opportunities identified.*';
    }

    const lines = ['## Test Automation Opportunities'];
    lines.push('\nTests that could be automated for the C++ codebase with hardware simulation.\n');

    // Sort by impact (high first) then effort (low first) - quick wins first
    const impactOrder = { high: 0, medium: 1, low: 2 };
    const effortOrder = { low: 0, medium: 1, high: 2 };
    const sorted = [...opportunities].sort((a, b) => {
      const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
      if (impactDiff !== 0) return impactDiff;
      return effortOrder[a.effort] - effortOrder[b.effort];
    });

    lines.push('| Test Type | Target Area | Effort | Impact | Tools |');
    lines.push('|-----------|-------------|--------|--------|-------|');

    for (const opp of sorted) {
      const effortEmoji = opp.effort === 'low' ? '🟢' : opp.effort === 'medium' ? '🟡' : '🔴';
      const impactEmoji = opp.impact === 'high' ? '⬆️' : opp.impact === 'medium' ? '➡️' : '⬇️';
      const tools = opp.toolsSuggested.slice(0, 2).join(', ') || 'N/A';
      const testType = opp.testType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      lines.push(`| **${testType}** | ${opp.targetArea} | ${effortEmoji} ${opp.effort} | ${impactEmoji} ${opp.impact} | ${tools} |`);
    }

    lines.push('\n### Automation Details\n');
    let idx = 1;
    for (const opp of sorted) {
      const testType = opp.testType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      lines.push(`#### ${idx++}. ${testType}: ${opp.targetArea}`);
      lines.push(opp.description);
      lines.push(`\n**Approach:** ${opp.automationApproach}`);
      if (opp.toolsSuggested.length > 0) {
        lines.push(`\n**Suggested Tools:** ${opp.toolsSuggested.join(', ')}`);
      }
      if (opp.targetBugs.length > 0) {
        lines.push(`\n**Would Catch:** ${this.linkBugKeys(opp.targetBugs)}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  private formatLinuxPortAnalysisMarkdown(analysis: LinuxPortAnalysis): string {
    if (!analysis || !analysis.isLinuxRelated || analysis.bugKeys.length === 0) {
      return '## Linux Port Analysis\n\n*No Linux port-related bugs identified in this dataset.*';
    }

    const lines = ['## Linux Port Analysis'];
    lines.push(`\n**${analysis.bugKeys.length} bug(s)** identified as related to the Linux port.\n`);
    lines.push(`**Affected Bugs:** ${this.linkBugKeys(analysis.bugKeys)}\n`);

    if (analysis.portingChallenges.length > 0) {
      lines.push('### Porting Challenges\n');
      analysis.portingChallenges.forEach((challenge, i) => {
        lines.push(`${i + 1}. ${challenge}`);
      });
      lines.push('');
    }

    if (analysis.platformSpecificIssues.length > 0) {
      lines.push('### Platform-Specific Issues\n');
      lines.push('| Issue |');
      lines.push('|-------|');
      analysis.platformSpecificIssues.forEach(issue => {
        lines.push(`| ${issue} |`);
      });
      lines.push('');
    }

    if (analysis.recommendations.length > 0) {
      lines.push('### Linux Port Recommendations\n');
      analysis.recommendations.forEach((rec, i) => {
        lines.push(`${i + 1}. ${rec}`);
      });
    }

    return lines.join('\n');
  }
}
