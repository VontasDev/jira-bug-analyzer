import Anthropic from '@anthropic-ai/sdk';
import type { JiraBug, BugCluster, PatternAnalysis } from '../types/index.js';

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
          content: `You are an expert software engineer analyzing bug reports to identify patterns and root causes.

Analyze the following ${bugs.length} bug reports and provide:
1. Group them into logical clusters based on root cause
2. Identify recurring issues (same problem appearing multiple times)
3. Identify component hotspots (areas with high bug density)
4. Provide actionable recommendations

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
  "summary": "High-level summary of findings",
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

    const analysis = JSON.parse(content.text);
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

    return {
      rootCauseClusters,
      recurringIssues: analysis.recurringIssues || [],
      componentHotspots: analysis.componentHotspots || [],
      summary: analysis.summary || '',
      recommendations: analysis.recommendations || [],
    };
  }
}
