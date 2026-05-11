import type { PublicClientApplication } from '@azure/msal-browser';
import { getAccessToken } from '../auth/msal';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export class GraphError extends Error {
  status: number;
  graphCode?: string;

  constructor(message: string, status: number, graphCode?: string) {
    super(message);
    this.name = 'GraphError';
    this.status = status;
    this.graphCode = graphCode;
  }

  isNotFound(): boolean {
    return this.status === 404 || this.graphCode === 'itemNotFound';
  }

  isForbidden(): boolean {
    return this.status === 403;
  }
}

export interface GraphPage<T> {
  value: T[];
  '@odata.nextLink'?: string;
}

export interface GraphClient {
  fetchJson<T>(path: string, init?: RequestInit): Promise<T>;
  fetchAll<T>(path: string): Promise<T[]>;
}

export function createGraphClient(instance: PublicClientApplication): GraphClient {
  async function call<T>(pathOrUrl: string, init?: RequestInit): Promise<T> {
    const token = await getAccessToken(instance);
    const url = pathOrUrl.startsWith('https://')
      ? pathOrUrl
      : `${GRAPH_BASE}${pathOrUrl}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      let graphCode: string | undefined;
      let message = `Graph request failed: ${response.status} ${response.statusText}`;
      let rawBody: unknown;
      try {
        rawBody = await response.json();
        const body = rawBody as { error?: { code?: string; message?: string } };
        graphCode = body.error?.code;
        if (body.error?.message) message = body.error.message;
      } catch {
        /* ignore parse failure */
      }
      console.error('Graph request failed', {
        method: init?.method ?? 'GET',
        url,
        status: response.status,
        body: rawBody,
        sentBody: init?.body,
      });
      throw new GraphError(message, response.status, graphCode);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async function fetchAll<T>(path: string): Promise<T[]> {
    const collected: T[] = [];
    let next: string | undefined = path;
    while (next) {
      const page: GraphPage<T> = await call<GraphPage<T>>(next);
      collected.push(...page.value);
      next = page['@odata.nextLink'];
    }
    return collected;
  }

  return {
    fetchJson: call,
    fetchAll,
  };
}
