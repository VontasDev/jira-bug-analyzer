import Anthropic from '@anthropic-ai/sdk';
import type {
  JiraBug,
  BugCluster,
  PatternAnalysis,
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
  Recommendation,
  AnalysisMode,
} from '../types/index.js';

export class ClaudeService {
  private client: Anthropic;
  private model = 'claude-sonnet-4-20250514';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyzeBugs(bugs: JiraBug[], mode: AnalysisMode = 'escape'): Promise<PatternAnalysis> {
    const bugsContext = this.formatBugsForAnalysis(bugs);
    const prompt = mode === 'escape'
      ? this.buildEscapeAnalysisPrompt(bugs, bugsContext)
      : this.buildAllBugsAnalysisPrompt(bugs, bugsContext);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Strip markdown code blocks if present
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const analysis = JSON.parse(jsonText);
    return this.enrichAnalysis(analysis, bugs);
  }

  private buildEscapeAnalysisPrompt(bugs: JiraBug[], bugsContext: string): string {
    return `You are an expert software engineer and QA specialist analyzing bug reports that ESCAPED SIT (System Integration Testing).

These bugs were found in production or UAT after SIT was completed. Your goal is to understand WHY they escaped and HOW to prevent similar escapes.

Analyze the following ${bugs.length} bug reports and provide:
1. Group them into logical clusters based on root cause
2. Identify recurring issues (same problem appearing multiple times)
3. Identify component hotspots (areas with high bug density)
4. Provide actionable recommendations
5. Analyze WHY these bugs escaped SIT testing - categorize the escape patterns
6. Suggest specific test scenarios that would have caught each bug cluster
7. Identify testing methodology gaps (what types of tests are missing)
8. Analyze defect injection points - where in the SDLC were bugs introduced (requirements, design, coding, integration, deployment)
9. Calculate risk scores for components based on escape patterns, complexity, and change frequency
10. Identify regression bugs - issues that appear to be regressions of previously fixed problems
11. Assess customer impact of each bug (business function affected, user impact, workaround availability)
12. Recommend specific test data patterns that would catch these bugs
13. Suggest process improvements for code review, testing, and deployment
14. Provide trend analysis summary comparing to typical patterns

Bug Reports:
${bugsContext}

Respond with a JSON object matching this exact structure:
{
  "rootCauseClusters": [
    {
      "id": "cluster-1",
      "name": "Descriptive cluster name",
      "description": "What these bugs have in common",
      "rootCause": "The underlying cause",
      "bugKeys": ["BUG-1", "BUG-2"],
      "affectedComponents": ["component1"],
      "severity": "critical|high|medium|low",
      "suggestedFix": "How to address this"
    }
  ],
  "recurringIssues": [
    {
      "pattern": "Description of recurring pattern",
      "occurrences": 3,
      "bugKeys": ["BUG-1", "BUG-2", "BUG-3"],
      "timespan": "Over 2 months"
    }
  ],
  "componentHotspots": [
    {
      "component": "Component name",
      "bugCount": 5,
      "severity": "high",
      "trend": "increasing|stable|decreasing"
    }
  ],
  "escapePatterns": [
    {
      "category": "edge-case|environment|timing|data-driven|integration|configuration|race-condition|hardware-specific",
      "description": "Why these bugs escaped SIT testing",
      "bugKeys": ["BUG-1", "BUG-2"],
      "frequency": 3
    }
  ],
  "suggestedTestScenarios": [
    {
      "name": "Test scenario name",
      "description": "What this test validates",
      "type": "unit|integration|e2e|performance|stress|environment",
      "targetBugs": ["BUG-1", "BUG-2"],
      "preconditions": ["Condition 1", "Condition 2"],
      "steps": ["Step 1", "Step 2", "Step 3"],
      "expectedOutcome": "What should happen",
      "priority": "critical|high|medium"
    }
  ],
  "testingGaps": [
    {
      "area": "Area or type of testing",
      "description": "What is missing or insufficient",
      "currentCoverage": "Description of current state",
      "suggestedImprovement": "How to improve coverage",
      "impactedBugCount": 5
    }
  ],
  "defectInjectionPoints": [
    {
      "phase": "requirements|design|coding|integration|deployment",
      "description": "How defects were introduced at this phase",
      "bugKeys": ["BUG-1", "BUG-2"],
      "frequency": 3,
      "preventionStrategy": "How to prevent defects at this phase"
    }
  ],
  "componentRiskScores": [
    {
      "component": "Component name",
      "riskScore": 8,
      "escapeHistory": 5,
      "complexityFactor": "low|medium|high",
      "changeFrequency": "low|medium|high",
      "recommendation": "Risk mitigation recommendation"
    }
  ],
  "regressionAnalysis": [
    {
      "isRegression": true,
      "bugKey": "BUG-1",
      "relatedBugKeys": ["BUG-OLD-1"],
      "regressionType": "exact|similar|related-area",
      "likelyCause": "What likely caused the regression"
    }
  ],
  "customerImpacts": [
    {
      "bugKey": "BUG-1",
      "impactLevel": "critical|high|medium|low",
      "affectedUsers": "all|many|some|few",
      "businessFunction": "What business function is affected",
      "workaroundAvailable": true,
      "estimatedCost": "high|medium|low"
    }
  ],
  "testDataRecommendations": [
    {
      "category": "Category of test data",
      "description": "What data patterns to test",
      "dataPatterns": ["Pattern 1", "Pattern 2"],
      "edgeCases": ["Edge case 1", "Edge case 2"],
      "targetBugs": ["BUG-1", "BUG-2"],
      "priority": "critical|high|medium"
    }
  ],
  "processImprovements": [
    {
      "area": "code-review|testing|deployment|requirements|environment",
      "suggestion": "Specific process improvement",
      "rationale": "Why this would help",
      "targetBugs": ["BUG-1", "BUG-2"],
      "effort": "low|medium|high",
      "impact": "low|medium|high"
    }
  ],
  "trendMetrics": {
    "period": "Analysis period (e.g., Q1 2025)",
    "totalBugs": ${bugs.length},
    "escapesByCategory": {"edge-case": 3, "environment": 2},
    "topComponents": ["Component1", "Component2"],
    "riskTrend": "improving|stable|worsening",
    "comparisonToPrevious": "Summary comparison to typical patterns"
  },
  "summary": "High-level summary of findings including escape analysis",
  "recommendations": [
    {
      "text": "Specific actionable recommendation",
      "reasoning": "Why this recommendation will help prevent escapes, based on the analysis",
      "targetBugs": ["BUG-1", "BUG-2"],
      "priority": "critical|high|medium"
    }
  ]
}

Return ONLY valid JSON, no markdown code blocks or explanations.`;
  }

  private buildAllBugsAnalysisPrompt(bugs: JiraBug[], bugsContext: string): string {
    // Count bugs by failure type
    const positiveBugs = bugs.filter(b => b.failureType === 'Positive Failure');
    const negativeBugs = bugs.filter(b => b.failureType === 'Negative Failure');
    const openBugs = bugs.filter(b => b.status === 'Open');

    return `You are an expert software engineer and QA specialist analyzing ALL bug reports from a project.

This analysis includes all bugs, grouped by Failure Type:
- Positive Failure (${positiveBugs.length} bugs): Feature works but not as expected
- Negative Failure (${negativeBugs.length} bugs): Feature completely fails or missing functionality
- Open/Unconfirmed (${openBugs.length} bugs): Status is Open, may not be confirmed bugs yet (could be configuration, user error, etc.)

Analyze the following ${bugs.length} bug reports and provide:
1. Group them into logical clusters based on root cause
2. Identify recurring issues (same problem appearing multiple times)
3. Identify component hotspots (areas with high bug density)
4. Analyze patterns by Failure Type (positive vs negative)
5. Analyze resolution patterns for resolved bugs
6. Identify which "Open" bugs are likely real bugs vs configuration/user issues
7. Assess customer impact of each bug
8. Provide actionable recommendations
9. Calculate risk scores for components
10. Provide trend analysis

Bug Reports:
${bugsContext}

Respond with a JSON object matching this exact structure:
{
  "rootCauseClusters": [
    {
      "id": "cluster-1",
      "name": "Descriptive cluster name",
      "description": "What these bugs have in common",
      "rootCause": "The underlying cause",
      "bugKeys": ["BUG-1", "BUG-2"],
      "affectedComponents": ["component1"],
      "severity": "critical|high|medium|low",
      "suggestedFix": "How to address this"
    }
  ],
  "recurringIssues": [
    {
      "pattern": "Description of recurring pattern",
      "occurrences": 3,
      "bugKeys": ["BUG-1", "BUG-2", "BUG-3"],
      "timespan": "Over 2 months"
    }
  ],
  "componentHotspots": [
    {
      "component": "Component name",
      "bugCount": 5,
      "severity": "high",
      "trend": "increasing|stable|decreasing"
    }
  ],
  "escapePatterns": [
    {
      "category": "positive-failure|negative-failure|unconfirmed",
      "description": "Pattern description for this failure type",
      "bugKeys": ["BUG-1", "BUG-2"],
      "frequency": 3
    }
  ],
  "suggestedTestScenarios": [
    {
      "name": "Test scenario name",
      "description": "What this test validates",
      "type": "unit|integration|e2e|performance|stress|environment",
      "targetBugs": ["BUG-1", "BUG-2"],
      "preconditions": ["Condition 1"],
      "steps": ["Step 1", "Step 2"],
      "expectedOutcome": "What should happen",
      "priority": "critical|high|medium"
    }
  ],
  "testingGaps": [
    {
      "area": "Area or type of testing",
      "description": "What is missing",
      "currentCoverage": "Current state",
      "suggestedImprovement": "How to improve",
      "impactedBugCount": 5
    }
  ],
  "defectInjectionPoints": [
    {
      "phase": "requirements|design|coding|integration|deployment",
      "description": "How defects were introduced",
      "bugKeys": ["BUG-1"],
      "frequency": 3,
      "preventionStrategy": "Prevention approach"
    }
  ],
  "componentRiskScores": [
    {
      "component": "Component name",
      "riskScore": 8,
      "escapeHistory": 5,
      "complexityFactor": "low|medium|high",
      "changeFrequency": "low|medium|high",
      "recommendation": "Risk mitigation"
    }
  ],
  "regressionAnalysis": [
    {
      "isRegression": true,
      "bugKey": "BUG-1",
      "relatedBugKeys": ["BUG-OLD-1"],
      "regressionType": "exact|similar|related-area",
      "likelyCause": "Likely cause"
    }
  ],
  "customerImpacts": [
    {
      "bugKey": "BUG-1",
      "impactLevel": "critical|high|medium|low",
      "affectedUsers": "all|many|some|few",
      "businessFunction": "Affected function",
      "workaroundAvailable": true,
      "estimatedCost": "high|medium|low"
    }
  ],
  "testDataRecommendations": [
    {
      "category": "Category",
      "description": "What to test",
      "dataPatterns": ["Pattern 1"],
      "edgeCases": ["Edge case 1"],
      "targetBugs": ["BUG-1"],
      "priority": "critical|high|medium"
    }
  ],
  "processImprovements": [
    {
      "area": "code-review|testing|deployment|requirements|environment",
      "suggestion": "Improvement",
      "rationale": "Why it helps",
      "targetBugs": ["BUG-1"],
      "effort": "low|medium|high",
      "impact": "low|medium|high"
    }
  ],
  "trendMetrics": {
    "period": "Analysis period",
    "totalBugs": ${bugs.length},
    "escapesByCategory": {"positive-failure": ${positiveBugs.length}, "negative-failure": ${negativeBugs.length}, "unconfirmed": ${openBugs.length}},
    "topComponents": ["Component1"],
    "riskTrend": "improving|stable|worsening",
    "comparisonToPrevious": "Comparison summary"
  },
  "summary": "High-level summary including failure type breakdown and open bug assessment",
  "recommendations": [
    {
      "text": "Actionable recommendation",
      "reasoning": "Why this helps",
      "targetBugs": ["BUG-1"],
      "priority": "critical|high|medium"
    }
  ]
}

Return ONLY valid JSON, no markdown code blocks or explanations.`;
  }

  private formatBugsForAnalysis(bugs: JiraBug[]): string {
    return bugs
      .map((bug) => {
        const parts = [
          `[${bug.key}] ${bug.summary}`,
          `Status: ${bug.status} | Resolution: ${bug.resolution || 'Unresolved'} | Priority: ${bug.priority || 'None'}`,
          `Failure Type: ${bug.failureType || 'Unknown'} | Customer: ${bug.customer || 'Unknown'}`,
          `Customer Impact: ${bug.customerImpact || 'Unknown'} | Severity: ${bug.severity || 'Unknown'}`,
          `Components: ${bug.components.join(', ') || 'None'}`,
          `Labels: ${bug.labels.join(', ') || 'None'}`,
        ];

        if (bug.description) {
          const desc = bug.description.substring(0, 500);
          parts.push(`Description: ${desc}${bug.description.length > 500 ? '...' : ''}`);
        }

        if (bug.comments.length > 0) {
          const recentComments = bug.comments.slice(-2);
          parts.push(
            `Recent comments: ${recentComments.map((c) => c.body.substring(0, 200)).join(' | ')}`
          );
        }

        return parts.join('\n');
      })
      .join('\n\n---\n\n');
  }

  private enrichAnalysis(
    analysis: any,
    bugs: JiraBug[]
  ): PatternAnalysis {
    const bugMap = new Map(bugs.map((b) => [b.key, b]));

    const rootCauseClusters: BugCluster[] = (analysis.rootCauseClusters || []).map(
      (cluster: any) => ({
        id: cluster.id,
        name: cluster.name,
        description: cluster.description,
        rootCause: cluster.rootCause,
        bugs: (cluster.bugKeys || [])
          .map((key: string) => bugMap.get(key))
          .filter(Boolean),
        affectedComponents: cluster.affectedComponents || [],
        severity: cluster.severity || 'medium',
        suggestedFix: cluster.suggestedFix,
      })
    );

    const escapePatterns: EscapePattern[] = (analysis.escapePatterns || []).map(
      (pattern: any) => ({
        category: pattern.category || 'edge-case',
        description: pattern.description,
        bugKeys: pattern.bugKeys || [],
        frequency: pattern.frequency || 0,
      })
    );

    const suggestedTestScenarios: TestScenario[] = (analysis.suggestedTestScenarios || []).map(
      (scenario: any) => ({
        name: scenario.name,
        description: scenario.description,
        type: scenario.type || 'integration',
        targetBugs: scenario.targetBugs || [],
        preconditions: scenario.preconditions || [],
        steps: scenario.steps || [],
        expectedOutcome: scenario.expectedOutcome,
        priority: scenario.priority || 'medium',
      })
    );

    const testingGaps: TestingGap[] = (analysis.testingGaps || []).map(
      (gap: any) => ({
        area: gap.area,
        description: gap.description,
        currentCoverage: gap.currentCoverage || 'Unknown',
        suggestedImprovement: gap.suggestedImprovement,
        impactedBugCount: gap.impactedBugCount || 0,
      })
    );

    const defectInjectionPoints: DefectInjectionPoint[] = (analysis.defectInjectionPoints || []).map(
      (point: any) => ({
        phase: point.phase || 'coding',
        description: point.description || '',
        bugKeys: point.bugKeys || [],
        frequency: point.frequency || 0,
        preventionStrategy: point.preventionStrategy || '',
      })
    );

    const componentRiskScores: ComponentRiskScore[] = (analysis.componentRiskScores || []).map(
      (score: any) => ({
        component: score.component || '',
        riskScore: score.riskScore || 0,
        escapeHistory: score.escapeHistory || 0,
        complexityFactor: score.complexityFactor || 'medium',
        changeFrequency: score.changeFrequency || 'medium',
        recommendation: score.recommendation || '',
      })
    );

    const regressionAnalysis: RegressionAnalysis[] = (analysis.regressionAnalysis || []).map(
      (reg: any) => ({
        isRegression: reg.isRegression || false,
        bugKey: reg.bugKey || '',
        relatedBugKeys: reg.relatedBugKeys || [],
        regressionType: reg.regressionType || 'similar',
        likelyCause: reg.likelyCause || '',
      })
    );

    const customerImpacts: CustomerImpact[] = (analysis.customerImpacts || []).map(
      (impact: any) => ({
        bugKey: impact.bugKey || '',
        impactLevel: impact.impactLevel || 'medium',
        affectedUsers: impact.affectedUsers || 'some',
        businessFunction: impact.businessFunction || '',
        workaroundAvailable: impact.workaroundAvailable || false,
        estimatedCost: impact.estimatedCost || 'medium',
      })
    );

    const testDataRecommendations: TestDataRecommendation[] = (analysis.testDataRecommendations || []).map(
      (rec: any) => ({
        category: rec.category || '',
        description: rec.description || '',
        dataPatterns: rec.dataPatterns || [],
        edgeCases: rec.edgeCases || [],
        targetBugs: rec.targetBugs || [],
        priority: rec.priority || 'medium',
      })
    );

    const processImprovements: ProcessImprovement[] = (analysis.processImprovements || []).map(
      (imp: any) => ({
        area: imp.area || 'testing',
        suggestion: imp.suggestion || '',
        rationale: imp.rationale || '',
        targetBugs: imp.targetBugs || [],
        effort: imp.effort || 'medium',
        impact: imp.impact || 'medium',
      })
    );

    const trendMetrics: TrendMetrics = {
      period: analysis.trendMetrics?.period || 'Current Period',
      totalBugs: analysis.trendMetrics?.totalBugs || bugs.length,
      escapesByCategory: analysis.trendMetrics?.escapesByCategory || {},
      topComponents: analysis.trendMetrics?.topComponents || [],
      riskTrend: analysis.trendMetrics?.riskTrend || 'stable',
      comparisonToPrevious: analysis.trendMetrics?.comparisonToPrevious || '',
    };

    const recommendations: Recommendation[] = (analysis.recommendations || []).map(
      (rec: any) => {
        // Handle both old string format and new object format
        if (typeof rec === 'string') {
          return {
            text: rec,
            reasoning: '',
            targetBugs: [],
            priority: 'medium' as const,
          };
        }
        return {
          text: rec.text || '',
          reasoning: rec.reasoning || '',
          targetBugs: rec.targetBugs || [],
          priority: rec.priority || 'medium',
        };
      }
    );

    return {
      rootCauseClusters,
      recurringIssues: analysis.recurringIssues || [],
      componentHotspots: analysis.componentHotspots || [],
      summary: analysis.summary || '',
      recommendations,
      escapePatterns,
      suggestedTestScenarios,
      testingGaps,
      defectInjectionPoints,
      componentRiskScores,
      regressionAnalysis,
      customerImpacts,
      testDataRecommendations,
      processImprovements,
      trendMetrics,
    };
  }
}
