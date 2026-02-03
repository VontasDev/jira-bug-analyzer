import { Version3Client } from 'jira.js';
import type { JiraBug, JiraComment, Config } from '../types/index.js';

export interface JiraFilter {
  id: string;
  name: string;
  jql?: string;
}

export class JiraService {
  private client: Version3Client;
  private config: Pick<Config, 'jiraHost' | 'jiraEmail' | 'jiraApiToken'>;

  constructor(config: Pick<Config, 'jiraHost' | 'jiraEmail' | 'jiraApiToken'>) {
    this.config = config;
    this.client = new Version3Client({
      host: config.jiraHost,
      authentication: {
        basic: {
          email: config.jiraEmail,
          apiToken: config.jiraApiToken,
        },
      },
    });
  }

  private getAuthHeader(): string {
    const credentials = `${this.config.jiraEmail}:${this.config.jiraApiToken}`;
    return 'Basic ' + Buffer.from(credentials).toString('base64');
  }

  async listBugFilters(): Promise<JiraFilter[]> {
    const response = await fetch(
      `${this.config.jiraHost}/rest/api/3/filter/search?filterName=bug&maxResults=100`,
      {
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list filters: ${response.status}`);
    }

    const data = await response.json() as any;
    return (data.values || []).map((f: any) => ({
      id: f.id,
      name: f.name,
    }));
  }

  async fetchBugsByFilter(filterId: string, maxResults: number = 100): Promise<JiraBug[]> {
    // First get the filter to get its JQL
    const filterResponse = await fetch(
      `${this.config.jiraHost}/rest/api/3/filter/${filterId}?expand=jql`,
      {
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      }
    );

    if (!filterResponse.ok) {
      throw new Error(`Failed to get filter: ${filterResponse.status}`);
    }

    const filter = await filterResponse.json() as any;
    const jql = filter.jql;

    // Use the JQL search endpoint
    return this.fetchBugsWithJqlEndpoint(jql, maxResults);
  }

  async fetchBugs(options: {
    project?: string;
    jql?: string;
    filterId?: string;
    maxResults?: number;
  }): Promise<JiraBug[]> {
    const maxResults = options.maxResults || 100;

    // If filter ID is provided, use filter-based fetch
    if (options.filterId) {
      return this.fetchBugsByFilter(options.filterId, maxResults);
    }

    // Build JQL and use the JQL endpoint
    const jql = options.jql || this.buildJql(options.project);
    return this.fetchBugsWithJqlEndpoint(jql, maxResults);
  }

  private async fetchBugsWithJqlEndpoint(jql: string, maxResults: number): Promise<JiraBug[]> {
    // Use /rest/api/3/search/jql endpoint (GET) which works when POST /search is blocked
    const encodedJql = encodeURIComponent(jql);
    const bugs: JiraBug[] = [];
    let nextPageToken: string | null = null;

    do {
      let url = `${this.config.jiraHost}/rest/api/3/search/jql?jql=${encodedJql}&maxResults=${Math.min(50, maxResults - bugs.length)}`;
      if (nextPageToken) {
        url += `&nextPageToken=${encodeURIComponent(nextPageToken)}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json() as any;

      // The JQL endpoint returns only issue IDs, so we need to fetch each issue
      const issueIds = (data.issues || []).map((i: any) => i.id);

      // Fetch full issue details in batches
      for (const issueId of issueIds) {
        if (bugs.length >= maxResults) break;

        const issue = await this.fetchIssueById(issueId);
        if (issue) {
          bugs.push(issue);
        }
      }

      nextPageToken = data.nextPageToken || null;

      if (data.isLast || bugs.length >= maxResults) {
        break;
      }
    } while (nextPageToken);

    return bugs;
  }

  private async fetchIssueById(issueId: string): Promise<JiraBug | null> {
    try {
      const response = await fetch(
        `${this.config.jiraHost}/rest/api/3/issue/${issueId}?fields=*all`,
        {
          headers: {
            Authorization: this.getAuthHeader(),
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.warn(`Failed to fetch issue ${issueId}: ${response.status}`);
        return null;
      }

      const issue = await response.json() as any;
      return this.mapIssueToBug(issue);
    } catch (error) {
      console.warn(`Error fetching issue ${issueId}:`, error);
      return null;
    }
  }

  private buildJql(project?: string): string {
    const conditions: string[] = ['type = Bug'];
    if (project) {
      conditions.push(`project = "${project}"`);
    }
    return conditions.join(' AND ') + ' ORDER BY created DESC';
  }

  private mapIssueToBug(issue: any): JiraBug {
    const fields = issue.fields || {};

    const comments: JiraComment[] = (fields.comment?.comments || []).map(
      (c: any) => ({
        id: c.id,
        author: c.author?.displayName || 'Unknown',
        body: typeof c.body === 'string' ? c.body : this.extractTextFromADF(c.body),
        created: c.created,
      })
    );

    // Handle description which might be in Atlassian Document Format
    let description = fields.description;
    if (description && typeof description === 'object') {
      description = this.extractTextFromADF(description);
    }

    // Extract specific custom fields
    const failureTypeField = fields.customfield_10165;
    const isEscapeField = fields.customfield_10164;
    const customerImpactField = fields.customfield_10066;
    const customerField = fields.customfield_10049;
    const severityField = fields.customfield_10268;

    return {
      key: issue.key,
      id: issue.id,
      summary: fields.summary || '',
      description: description || null,
      status: fields.status?.name || 'Unknown',
      resolution: fields.resolution?.name || null,
      priority: fields.priority?.name || null,
      components: (fields.components || []).map((c: any) => c.name),
      labels: fields.labels || [],
      created: fields.created,
      updated: fields.updated,
      reporter: fields.reporter?.displayName || null,
      assignee: fields.assignee?.displayName || null,
      comments,
      failureType: failureTypeField?.value || null,
      isEscapeBug: isEscapeField?.value === 'Yes',
      customerImpact: customerImpactField?.value || null,
      customer: customerField?.value || null,
      severity: severityField?.value || null,
      customFields: this.extractCustomFields(fields),
    };
  }

  private extractTextFromADF(adf: any): string {
    // Extract plain text from Atlassian Document Format
    if (!adf || !adf.content) return '';

    const extractText = (node: any): string => {
      if (node.type === 'text') {
        return node.text || '';
      }
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join('');
      }
      return '';
    };

    return adf.content.map(extractText).join('\n');
  }

  private extractCustomFields(fields: any): Record<string, unknown> {
    const customFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (key.startsWith('customfield_') && value !== null) {
        customFields[key] = value;
      }
    }
    return customFields;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.myself.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }
}
