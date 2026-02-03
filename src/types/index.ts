import { z } from 'zod';

export const ConfigSchema = z.object({
  jiraHost: z.string().url(),
  jiraEmail: z.string().email(),
  jiraApiToken: z.string().min(1),
  anthropicApiKey: z.string().min(1),
});

export type Config = z.infer<typeof ConfigSchema>;

export interface JiraBug {
  key: string;
  id: string;
  summary: string;
  description: string | null;
  status: string;
  priority: string | null;
  components: string[];
  labels: string[];
  created: string;
  updated: string;
  reporter: string | null;
  assignee: string | null;
  comments: JiraComment[];
  customFields: Record<string, unknown>;
}

export interface JiraComment {
  id: string;
  author: string;
  body: string;
  created: string;
}

export interface BugCluster {
  id: string;
  name: string;
  description: string;
  rootCause: string;
  bugs: JiraBug[];
  affectedComponents: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestedFix: string;
}

export interface PatternAnalysis {
  rootCauseClusters: BugCluster[];
  recurringIssues: RecurringIssue[];
  componentHotspots: ComponentHotspot[];
  summary: string;
  recommendations: string[];
  escapePatterns: EscapePattern[];
  suggestedTestScenarios: TestScenario[];
  testingGaps: TestingGap[];
}

export interface RecurringIssue {
  pattern: string;
  occurrences: number;
  bugs: string[]; // bug keys
  timespan: string;
}

export interface ComponentHotspot {
  component: string;
  bugCount: number;
  severity: string;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface EscapePattern {
  category: 'edge-case' | 'environment' | 'timing' | 'data-driven' | 'integration' | 'configuration' | 'race-condition' | 'hardware-specific';
  description: string;
  bugKeys: string[];
  frequency: number;
}

export interface TestScenario {
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'stress' | 'environment';
  targetBugs: string[];
  preconditions: string[];
  steps: string[];
  expectedOutcome: string;
  priority: 'critical' | 'high' | 'medium';
}

export interface TestingGap {
  area: string;
  description: string;
  currentCoverage: string;
  suggestedImprovement: string;
  impactedBugCount: number;
}

export interface FetchOptions {
  project?: string;
  jql?: string;
  filterId?: string;
  maxResults?: number;
  outputFile?: string;
  listFilters?: boolean;
}

export interface AnalyzeOptions {
  inputFile: string;
  outputFormat?: 'terminal' | 'json' | 'markdown' | 'html';
  outputFile?: string;
}

export interface RunOptions {
  project?: string;
  jql?: string;
  filterId?: string;
  maxResults?: number;
  outputFormat?: 'terminal' | 'json' | 'markdown' | 'html';
  outputFile?: string;
}
