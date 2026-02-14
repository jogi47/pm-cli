// src/client.ts

import { Client } from '@notionhq/client';
import { authManager } from '@pm-cli/core';
import type {
  PageObjectResponse,
  QueryDatabaseResponse,
  QueryDatabaseParameters,
} from '@notionhq/client/build/src/api-endpoints.js';

export type NotionPage = PageObjectResponse;

export class NotionClient {
  private client: Client | null = null;
  private databaseId: string | null = null;
  private userName: string | null = null;
  private userEmail: string | null = null;
  private userId: string | null = null;

  /**
   * Initialize the client with stored credentials
   */
  async initialize(): Promise<boolean> {
    const credentials = authManager.getCredentials('notion');
    if (!credentials || !credentials.databaseId) return false;

    try {
      this.client = new Client({ auth: credentials.token });
      this.databaseId = credentials.databaseId;
      await this.loadUserInfo();
      return true;
    } catch {
      this.client = null;
      this.databaseId = null;
      return false;
    }
  }

  /**
   * Connect with a new token and database ID
   */
  async connect(token: string, databaseId: string): Promise<void> {
    this.client = new Client({ auth: token });
    this.databaseId = databaseId;
    await this.loadUserInfo();

    // Verify database access
    await this.client.databases.retrieve({ database_id: databaseId });

    authManager.setCredentials('notion', { token, databaseId });
  }

  /**
   * Disconnect and clear credentials
   */
  disconnect(): void {
    this.client = null;
    this.databaseId = null;
    this.userName = null;
    this.userEmail = null;
    this.userId = null;
    authManager.removeCredentials('notion');
  }

  /**
   * Load current user info from the bot user
   */
  private async loadUserInfo(): Promise<void> {
    if (!this.client) throw new Error('Client not initialized');

    const me = await this.client.users.me({});
    this.userId = me.id;
    this.userName = me.name || 'Notion Integration';
    if (me.type === 'person' && me.person?.email) {
      this.userEmail = me.person.email;
    }
  }

  /**
   * Get current user info
   */
  getUser(): { id: string; name: string; email?: string } | null {
    if (!this.userId) return null;
    return {
      id: this.userId,
      name: this.userName || 'Notion Integration',
      email: this.userEmail || undefined,
    };
  }

  /**
   * Get the database ID
   */
  getDatabaseId(): string | null {
    return this.databaseId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.client !== null && this.databaseId !== null;
  }

  /**
   * Query the database with optional filters and sorts
   */
  async queryDatabase(options?: {
    filter?: QueryDatabaseParameters['filter'];
    sorts?: QueryDatabaseParameters['sorts'];
    pageSize?: number;
    startCursor?: string;
  }): Promise<NotionPage[]> {
    if (!this.client || !this.databaseId) throw new Error('Not connected');

    const pages: NotionPage[] = [];
    let cursor: string | undefined = options?.startCursor;
    let hasMore = true;

    while (hasMore) {
      const params: QueryDatabaseParameters = {
        database_id: this.databaseId,
      };

      if (options?.filter) params.filter = options.filter;
      if (options?.sorts) params.sorts = options.sorts;
      if (options?.pageSize) params.page_size = options.pageSize;
      if (cursor) params.start_cursor = cursor;

      const response: QueryDatabaseResponse = await this.client.databases.query(params);

      for (const result of response.results) {
        if ('properties' in result) {
          pages.push(result as NotionPage);
        }
      }

      hasMore = response.has_more;
      cursor = response.next_cursor ?? undefined;

      // If a page size limit was set, stop after the first page
      if (options?.pageSize) break;
    }

    return pages;
  }

  /**
   * Get a single page by ID
   */
  async getPage(pageId: string): Promise<NotionPage | null> {
    if (!this.client) throw new Error('Not connected');

    try {
      const response = await this.client.pages.retrieve({ page_id: pageId });
      if ('properties' in response) {
        return response as NotionPage;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Create a page in the database
   */
  async createPage(properties: Record<string, unknown>): Promise<NotionPage> {
    if (!this.client || !this.databaseId) throw new Error('Not connected');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await this.client.pages.create({
      parent: { database_id: this.databaseId },
      properties,
    } as any);

    // Retrieve the full page to get all properties
    const page = await this.getPage(response.id);
    if (!page) throw new Error('Failed to retrieve created page');
    return page;
  }

  /**
   * Update a page's properties
   */
  async updatePage(pageId: string, properties: Record<string, unknown>): Promise<NotionPage> {
    if (!this.client) throw new Error('Not connected');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.client.pages.update({
      page_id: pageId,
      properties,
    } as any);

    // Retrieve the full page to get all properties
    const page = await this.getPage(pageId);
    if (!page) throw new Error('Failed to retrieve updated page');
    return page;
  }

  /**
   * Search pages in the database by text
   */
  async searchPages(query: string, options?: { pageSize?: number }): Promise<NotionPage[]> {
    if (!this.client || !this.databaseId) throw new Error('Not connected');

    // Use database query with title filter for search
    const response = await this.client.databases.query({
      database_id: this.databaseId,
      filter: {
        property: 'title',
        title: {
          contains: query,
        },
      },
      page_size: options?.pageSize ?? 20,
    });

    const pages: NotionPage[] = [];
    for (const result of response.results) {
      if ('properties' in result) {
        pages.push(result as NotionPage);
      }
    }
    return pages;
  }

  /**
   * Get the database schema (property definitions)
   */
  async getDatabaseSchema(): Promise<Record<string, { type: string; name: string }>> {
    if (!this.client || !this.databaseId) throw new Error('Not connected');

    const db = await this.client.databases.retrieve({ database_id: this.databaseId });
    const schema: Record<string, { type: string; name: string }> = {};

    for (const [name, prop] of Object.entries(db.properties)) {
      schema[name] = { type: prop.type, name };
    }

    return schema;
  }
}

// Export singleton
export const notionClient = new NotionClient();
