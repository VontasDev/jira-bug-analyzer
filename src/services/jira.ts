import { Version3Client } from 'jira.js';
import type { JiraBug, JiraComment, Config } from '../types/index.js';

export class JiraService {
  private client: Version3Client;

  constructor(config: Pick<Config, 'jiraHost' | 'jiraEmail' | 'jiraApiToken'>) {
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

  async fetchBugs(options: {
    project?: string;
    jql?: string;
    maxResults?: number;
  }): Promise<JiraBug[]> {
    const jql = options.jql || this.buildJql(options.project);
    const maxResults = options.maxResults || 100;

    const bugs: JiraBug[] = [];
    let startAt = 0;
    let total = 0;

    do {
      const response = await this.client.issueSearch.searchForIssuesUsingJql({
        jql,
        startAt,
        maxResults: Math.min(50, maxResults - bugs.length),
        fields: [
          'summary',
          'description',
          'status',
          'priority',
          'components',
          'labels',
          'created',
          'updated',
          'reporter',
          'assignee',
          'comment',
        ],
        expand: ['changelog'],
      });

      total = response.total || 0;

      for (const issue of response.issues || []) {
        const bug = this.mapIssueToBug(issue);
        bugs.push(bug);
      }

      startAt += response.issues?.length || 0;
    } while (startAt < total && bugs.length < maxResults);

    return bugs;
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
        body: c.body || '',
        created: c.created,
      })
    );

    return {
      key: issue.key,
      id: issue.id,
      summary: fields.summary || '',
      description: fields.description || null,
      status: fields.status?.name || 'Unknown',
      priority: fields.priority?.name || null,
      components: (fields.components || []).map((c: any) => c.name),
      labels: fields.labels || [],
      created: fields.created,
      updated: fields.updated,
      reporter: fields.reporter?.displayName || null,
      assignee: fields.assignee?.displayName || null,
      comments,
      customFields: this.extractCustomFields(fields),
    };
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
