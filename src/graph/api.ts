import type { ActionItem, Decision, Item, MeetingEntry } from '../types';
import type { GraphClient } from './client';
import { GraphError } from './client';
import {
  mapActionItem,
  mapDecision,
  mapItem,
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
