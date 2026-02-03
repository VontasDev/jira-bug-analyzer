import Anthropic from '@anthropic-ai/sdk';
import type { JiraBug, BugCluster, PatternAnalysis, EscapePattern, TestScenario, TestingGap } from '../types/index.js';

export class ClaudeService {
  private client: Anthropic;
  private model = 'claude-sonnet-4-20250514';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyzeBugs(bugs: JiraBug[]): Promise<PatternAnalysis> {
    const bugsContext = this.formatBugsForAnalysis(bugs);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `You are an expert software engineer and QA specialist analyzing bug reports that ESCAPED SIT (System Integration Testing).

These bugs were found in production or UAT after SIT was completed. Your goal is to understand WHY they escaped and HOW to prevent similar escapes.

Analyze the following ${bugs.length} bug reports and provide:
1. Group them into logical clusters based on root cause
2. Identify recurring issues (same problem appearing multiple times)
3. Identify component hotspots (areas with high bug density)
4. Provide actionable recommendations
5. Analyze WHY these bugs escaped SIT testing - categorize the escape patterns
6. Suggest specific test scenarios that would have caught each bug cluster
7. Identify testing methodology gaps (what types of tests are missing)

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
  "summary": "High-level summary of findings including escape analysis",
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Return ONLY valid JSON, no markdown code blocks or explanations.`,
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
      // Remove opening ```json or ``` and closing ```
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const analysis = JSON.parse(jsonText);
    return this.enrichAnalysis(analysis, bugs);
  }

  private formatBugsForAnalysis(bugs: JiraBug[]): string {
    return bugs
      .map((bug) => {
        const parts = [
          `[${bug.key}] ${bug.summary}`,
          `Status: ${bug.status} | Priority: ${bug.priority || 'None'}`,
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

    return {
      rootCauseClusters,
      recurringIssues: analysis.recurringIssues || [],
      componentHotspots: analysis.componentHotspots || [],
      summary: analysis.summary || '',
      recommendations: analysis.recommendations || [],
      escapePatterns,
      suggestedTestScenarios,
      testingGaps,
    };
  }
}
