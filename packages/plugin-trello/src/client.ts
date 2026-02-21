import { authManager, ProviderError } from '@jogi47/pm-cli-core';

export interface TrelloMember {
  id: string;
  fullName: string;
  username?: string;
}

export interface TrelloLabel {
  id: string;
  name: string;
}

export interface TrelloBoard {
  id: string;
  name: string;
}

export interface TrelloList {
  id: string;
  name: string;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  idMembers: string[];
  labels: TrelloLabel[];
  shortUrl: string;
  dateLastActivity: string;
  idBoard?: string;
  board?: TrelloBoard;
  list?: TrelloList;
  closed?: boolean;
}

type TrelloRequestInit = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined>;
};

class TrelloClient {
  private apiKey: string | null = null;
  private token: string | null = null;
  private me: TrelloMember | null = null;

  async initialize(): Promise<boolean> {
    const credentials = authManager.getCredentials('trello');
    if (!credentials?.apiKey || !credentials.token) return false;

    try {
      await this.connect(credentials.apiKey, credentials.token);
      return true;
    } catch {
      this.disconnect();
      return false;
    }
  }

  async connect(apiKey: string, token: string): Promise<void> {
    this.apiKey = apiKey;
    this.token = token;
    this.me = await this.request<TrelloMember>('/members/me');

    authManager.setCredentials('trello', { token, apiKey });
  }

  disconnect(): void {
    this.apiKey = null;
    this.token = null;
    this.me = null;
    authManager.removeCredentials('trello');
  }

  isConnected(): boolean {
    return Boolean(this.apiKey && this.token && this.me);
  }

  getCurrentUser(): TrelloMember | null {
    return this.me;
  }

  async getMyCards(limit = 50): Promise<TrelloCard[]> {
    const cards = await this.request<TrelloCard[]>('/members/me/cards', {
      query: {
        fields: 'id,name,desc,due,idMembers,labels,shortUrl,dateLastActivity,idBoard,idList,closed',
        members: 'true',
        member_fields: 'fullName,username',
        list: 'true',
        board: 'true',
      },
    });

    return cards.filter((card) => !card.closed).slice(0, limit);
  }

  async searchCards(query: string, limit = 25): Promise<TrelloCard[]> {
    const response = await this.request<{ cards: TrelloCard[] }>('/search', {
      query: {
        query,
        modelTypes: 'cards',
        card_fields: 'id,name,desc,due,idMembers,labels,shortUrl,dateLastActivity,idBoard,idList,closed',
        cards_limit: limit,
        cards_page: 0,
      },
    });

    return response.cards.filter((card) => !card.closed);
  }

  async getCard(cardId: string): Promise<TrelloCard | null> {
    try {
      return await this.request<TrelloCard>(`/cards/${cardId}`, {
        query: {
          fields: 'id,name,desc,due,idMembers,labels,shortUrl,dateLastActivity,idBoard,idList,closed',
          members: 'true',
          member_fields: 'fullName,username',
          list: 'true',
          board: 'true',
        },
      });
    } catch (error) {
      if (error instanceof ProviderError && /404/.test(error.message)) {
        return null;
      }
      throw error;
    }
  }

  async createCard(input: { name: string; desc?: string; due?: string; idList?: string }): Promise<TrelloCard> {
    return this.request<TrelloCard>('/cards', {
      method: 'POST',
      query: {
        name: input.name,
        desc: input.desc,
        due: input.due,
        idList: input.idList,
      },
    });
  }

  async updateCard(cardId: string, updates: { name?: string; desc?: string; due?: string | null; closed?: boolean }): Promise<TrelloCard> {
    return this.request<TrelloCard>(`/cards/${cardId}`, {
      method: 'PUT',
      query: {
        name: updates.name,
        desc: updates.desc,
        due: updates.due === null ? '' : updates.due,
        closed: updates.closed,
      },
    });
  }

  async deleteCard(cardId: string): Promise<void> {
    await this.request(`/cards/${cardId}`, { method: 'DELETE' });
  }

  async addComment(cardId: string, text: string): Promise<void> {
    await this.request(`/cards/${cardId}/actions/comments`, {
      method: 'POST',
      query: { text },
    });
  }

  private async request<T>(path: string, init: TrelloRequestInit = {}): Promise<T> {
    if (!this.apiKey || !this.token) {
      throw new ProviderError('trello', 'Not authenticated', undefined, {
        reason: 'Missing Trello API key or token.',
        suggestion: 'Run `pm connect trello` or set TRELLO_API_KEY and TRELLO_TOKEN.',
      });
    }

    const query = new URLSearchParams({
      key: this.apiKey,
      token: this.token,
    });

    for (const [key, value] of Object.entries(init.query || {})) {
      if (value !== undefined) query.set(key, String(value));
    }

    const url = `https://api.trello.com/1${path}?${query.toString()}`;
    const response = await fetch(url, { method: init.method ?? 'GET' });

    if (!response.ok) {
      const body = await response.text();
      throw new ProviderError('trello', `Trello API request failed (${response.status})`, undefined, {
        reason: body || `HTTP ${response.status}`,
        suggestion: 'Check your Trello credentials and permissions.',
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}

export const trelloClient = new TrelloClient();
