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
  resolution: string | null;
  priority: string | null;
  components: string[];
  labels: string[];
  created: string;
  updated: string;
  reporter: string | null;
  assignee: string | null;
  comments: JiraComment[];
  // Extracted custom fields
  failureType: 'Positive Failure' | 'Negative Failure' | null;
  isEscapeBug: boolean;
  customerImpact: string | null;
  customer: string | null;
  severity: string | null;
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
  recommendations: Recommendation[];
  escapePatterns: EscapePattern[];
  suggestedTestScenarios: TestScenario[];
  testingGaps: TestingGap[];
  defectInjectionPoints: DefectInjectionPoint[];
  componentRiskScores: ComponentRiskScore[];
  regressionAnalysis: RegressionAnalysis[];
  customerImpacts: CustomerImpact[];
  testDataRecommendations: TestDataRecommendation[];
  processImprovements: ProcessImprovement[];
  trendMetrics: TrendMetrics;
  automationOpportunities: AutomationOpportunity[];
  linuxPortAnalysis: LinuxPortAnalysis;
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

export interface DefectInjectionPoint {
  phase: 'requirements' | 'design' | 'coding' | 'integration' | 'deployment';
  description: string;
  bugKeys: string[];
  frequency: number;
  preventionStrategy: string;
}

export interface ComponentRiskScore {
  component: string;
  riskScore: number;  // 1-10
  escapeHistory: number;
  complexityFactor: 'low' | 'medium' | 'high';
  changeFrequency: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface RegressionAnalysis {
  isRegression: boolean;
  bugKey: string;
  relatedBugKeys: string[];
  regressionType: 'exact' | 'similar' | 'related-area';
  likelyCause: string;
}

export interface CustomerImpact {
  bugKey: string;
  impactLevel: 'critical' | 'high' | 'medium' | 'low';
  affectedUsers: 'all' | 'many' | 'some' | 'few';
  businessFunction: string;
  workaroundAvailable: boolean;
  estimatedCost: 'high' | 'medium' | 'low';
}

export interface TestDataRecommendation {
  category: string;
  description: string;
  dataPatterns: string[];
  edgeCases: string[];
  targetBugs: string[];
  priority: 'critical' | 'high' | 'medium';
}

export interface ProcessImprovement {
  area: 'code-review' | 'testing' | 'deployment' | 'requirements' | 'environment';
  suggestion: string;
  rationale: string;
  targetBugs: string[];
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

export interface TrendMetrics {
  period: string;
  totalBugs: number;
  escapesByCategory: Record<string, number>;
  topComponents: string[];
  riskTrend: 'improving' | 'stable' | 'worsening';
  comparisonToPrevious: string;
}

export interface Recommendation {
  text: string;
  reasoning: string;
  targetBugs: string[];
  priority: 'critical' | 'high' | 'medium';
}

export interface AutomationOpportunity {
  testType: 'unit' | 'integration' | 'hardware-simulation' | 'protocol' | 'regression' | 'stress' | 'config-validation';
  description: string;
  targetArea: string;
  automationApproach: string;
  toolsSuggested: string[];
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  targetBugs: string[];
}

export interface LinuxPortAnalysis {
  isLinuxRelated: boolean;
  bugKeys: string[];
  portingChallenges: string[];
  platformSpecificIssues: string[];
  recommendations: string[];
}

export interface FetchOptions {
  project?: string;
  jql?: string;
  filterId?: string;
  maxResults?: number;
  outputFile?: string;
  listFilters?: boolean;
}

export type AnalysisMode = 'escape' | 'all';

export interface AnalyzeOptions {
  inputFile: string;
  outputFormat?: 'terminal' | 'json' | 'markdown' | 'html';
  outputFile?: string;
  mode?: AnalysisMode;
}

export interface RunOptions {
  project?: string;
  jql?: string;
  filterId?: string;
  maxResults?: number;
  outputFormat?: 'terminal' | 'json' | 'markdown' | 'html';
  outputFile?: string;
}
