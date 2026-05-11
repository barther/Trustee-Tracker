import type { ActionItem, Decision, Item, Meeting, MeetingEntry } from '../types';
import type { GraphClient } from './client';
import { GraphError } from './client';
import {
  mapActionItem,
  mapDecision,
  mapItem,
  mapMeeting,
  mapMeetingEntry,
  type GraphListItem,
} from './mappers';

const PAGE_SIZE = 200;

function listItemsPath(siteId: string, listName: string): string {
  return `/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(
    listName,
  )}/items?$expand=fields&$top=${PAGE_SIZE}`;
}

export class ListMissingError extends Error {
  listName: string;
  constructor(listName: string) {
    super(`SharePoint list not found: ${listName}`);
    this.name = 'ListMissingError';
    this.listName = listName;
  }
}

interface SharePointListSummary {
  id: string;
  displayName?: string;
  name?: string;
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveListIds(
  client: GraphClient,
  siteId: string,
  names: readonly string[],
): Promise<Record<string, string>> {
  const passthrough: Record<string, string> = {};
  const toResolve = new Set<string>();
  for (const n of names) {
    if (GUID_RE.test(n)) passthrough[n] = n;
    else toResolve.add(n);
  }
  if (toResolve.size === 0) return passthrough;

  const path = `/sites/${encodeURIComponent(
    siteId,
  )}/lists?$select=id,displayName,name`;
  const lists = await client.fetchAll<SharePointListSummary>(path);
  const out: Record<string, string> = { ...passthrough };
  for (const want of toResolve) {
    const match = lists.find(
      (l) => l.displayName === want || l.name === want,
    );
    if (!match) throw new ListMissingError(want);
    out[want] = match.id;
  }
  return out;
}

async function readList<T>(
  client: GraphClient,
  siteId: string,
  listName: string,
  map: (row: GraphListItem) => T,
): Promise<T[]> {
  try {
    const rows = await client.fetchAll<GraphListItem>(listItemsPath(siteId, listName));
    return rows.map(map);
  } catch (err) {
    if (err instanceof GraphError && err.isNotFound()) {
      throw new ListMissingError(listName);
    }
    throw err;
  }
}

export function fetchItems(
  client: GraphClient,
  siteId: string,
  listName: string,
): Promise<Item[]> {
  return readList(client, siteId, listName, (row) => mapItem(row));
}

export function fetchMeetingEntries(
  client: GraphClient,
  siteId: string,
  listName: string,
): Promise<MeetingEntry[]> {
  return readList(client, siteId, listName, (row) => mapMeetingEntry(row));
}

export function fetchActionItems(
  client: GraphClient,
  siteId: string,
  listName: string,
): Promise<ActionItem[]> {
  return readList(client, siteId, listName, (row) => mapActionItem(row));
}

export function fetchDecisions(
  client: GraphClient,
  siteId: string,
  listName: string,
): Promise<Decision[]> {
  return readList(client, siteId, listName, (row) => mapDecision(row));
}

export function fetchMeetings(
  client: GraphClient,
  siteId: string,
  listName: string,
): Promise<Meeting[]> {
  return readList(client, siteId, listName, (row) => mapMeeting(row));
}

function listItemPath(siteId: string, listName: string, itemId?: string): string {
  const base = `/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listName)}/items`;
  return itemId ? `${base}/${encodeURIComponent(itemId)}` : base;
}

function annotateArrayFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) {
      out[`${k}@odata.type`] = 'Collection(Edm.String)';
    }
    out[k] = v;
  }
  return out;
}

export async function createListItem(
  client: GraphClient,
  siteId: string,
  listName: string,
  fields: Record<string, unknown>,
): Promise<{ id: string }> {
  const created = await client.fetchJson<{ id: string }>(
    `${listItemPath(siteId, listName)}?$expand=fields`,
    {
      method: 'POST',
      body: JSON.stringify({ fields: annotateArrayFields(fields) }),
    },
  );
  return { id: created.id };
}

export async function patchListItemFields(
  client: GraphClient,
  siteId: string,
  listName: string,
  itemId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await client.fetchJson<unknown>(
    `${listItemPath(siteId, listName, itemId)}/fields`,
    {
      method: 'PATCH',
      body: JSON.stringify(annotateArrayFields(fields)),
    },
  );
}

export async function deleteListItem(
  client: GraphClient,
  siteId: string,
  listName: string,
  itemId: string,
): Promise<void> {
  await client.fetchJson<unknown>(listItemPath(siteId, listName, itemId), {
    method: 'DELETE',
  });
}
