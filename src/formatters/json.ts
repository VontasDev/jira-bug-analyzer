import type { PatternAnalysis, JiraBug } from '../types/index.js';

export class JsonFormatter {
  formatAnalysis(analysis: PatternAnalysis): string {
    return JSON.stringify(this.transformAnalysis(analysis), null, 2);
  }

  formatBugs(bugs: JiraBug[]): string {
    return JSON.stringify(bugs, null, 2);
  }

  private transformAnalysis(analysis: PatternAnalysis): object {
    return {
      generatedAt: new Date().toISOString(),
      summary: analysis.summary,
      statistics: {
        totalClusters: analysis.rootCauseClusters.length,
        totalRecurringIssues: analysis.recurringIssues.length,
        totalHotspots: analysis.componentHotspots.length,
      },
      rootCauseClusters: analysis.rootCauseClusters.map((cluster) => ({
        id: cluster.id,
        name: cluster.name,
        description: cluster.description,
        rootCause: cluster.rootCause,
        severity: cluster.severity,
        bugCount: cluster.bugs.length,
        bugKeys: cluster.bugs.map((b) => b.key),
        affectedComponents: cluster.affectedComponents,
        suggestedFix: cluster.suggestedFix,
      })),
      recurringIssues: analysis.recurringIssues,
      componentHotspots: analysis.componentHotspots,
      recommendations: analysis.recommendations,
    };
  }
}
