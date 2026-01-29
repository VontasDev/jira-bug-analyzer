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
