import type { PublicClientApplication } from '@azure/msal-browser';
import { create } from 'zustand';
import { createGraphClient, type GraphClient } from '../graph/client';
import {
  ListMissingError,
  createListItem,
  fetchActionItems,
  fetchDecisions,
  fetchItems,
  fetchMeetingEntries,
  fetchMeetings,
  patchListItemFields,
} from '../graph/api';
import type { AppEnv } from '../env';
import type {
  ActionItem,
  DefaultSection,
  Decision,
  EntrySection,
  Item,
  ItemStatus,
  Meeting,
  MeetingEntry,
  Tag,
} from '../types';

export type LoadKind = 'config' | 'auth' | 'unprovisioned' | 'graph' | 'unknown';

export interface LoadError {
  kind: LoadKind;
  message: string;
  missingList?: string;
}

export type DataStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface InterimUpdateInput {
  itemId: string;
  meetingId: string;
  narrative: string;
  section?: EntrySection;
  statusChangeTo?: ItemStatus;
}

export interface ItemDraft {
  title: string;
  standing: boolean;
  defaultSection: DefaultSection;
  tags: Tag[];
  assignedTo: string;
  firstRaisedDate: string;
  onHoldReason: string;
  deferredUntil: string;
  closedDate: string;
  closedReason: string;
  notes: string;
}

interface SessionContext {
  client: GraphClient;
  env: AppEnv;
}

interface StoreState {
  status: DataStatus;
  error?: LoadError;
  items: Item[];
  meetings: Meeting[];
  meetingEntries: MeetingEntry[];
  actionItems: ActionItem[];
  decisions: Decision[];
  hydrate: (instance: PublicClientApplication, env: AppEnv) => Promise<void>;
  setConfigError: (missing: string[]) => void;
  reset: () => void;
  createMeeting: (params: { meetingDate: string; meetingType?: 'Regular' | 'Special'; titleSuffix?: string }) => Promise<Meeting>;
  addInterimUpdate: (input: InterimUpdateInput) => Promise<void>;
  createItem: (draft: ItemDraft) => Promise<Item>;
  updateItem: (itemId: string, draft: ItemDraft) => Promise<void>;
}

function toError(err: unknown): LoadError {
  if (err instanceof ListMissingError) {
    return {
      kind: 'unprovisioned',
      message: `SharePoint list "${err.listName}" is missing. Provision it before continuing.`,
      missingList: err.listName,
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  if (/AADSTS|interaction_required|login_required/i.test(message)) {
    return { kind: 'auth', message };
  }
  return { kind: 'graph', message };
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

function entryTitle(meetingDate: string, itemTitle: string): string {
  return truncate(`${meetingDate} — ${itemTitle}`, 80);
}

function meetingTitle(meetingDate: string, meetingType: 'Regular' | 'Special', suffix?: string): string {
  const base = `${meetingDate} ${meetingType}`;
  return suffix ? `${base} — ${suffix}` : base;
}

function draftToFields(draft: ItemDraft, includeStatusForCreate: boolean): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    Title: draft.title.trim(),
    Standing: draft.standing,
    DefaultSection: draft.defaultSection,
    Tags: draft.tags,
    AssignedTo: draft.assignedTo.trim(),
    OnHoldReason: draft.onHoldReason.trim(),
    ClosedReason: draft.closedReason.trim(),
    Notes: draft.notes,
    FirstRaisedDate: draft.firstRaisedDate || null,
    DeferredUntil: draft.deferredUntil || null,
    ClosedDate: draft.closedDate || null,
  };
  if (includeStatusForCreate) {
    fields.Status = 'Open';
  }
  return fields;
}

function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function itemDraftDiff(existing: Item, next: ItemDraft): Record<string, unknown> {
  const diff: Record<string, unknown> = {};
  const nextTitle = next.title.trim();
  if (nextTitle !== existing.title) diff.Title = nextTitle;
  if (next.standing !== existing.standing) diff.Standing = next.standing;
  if (next.defaultSection !== existing.defaultSection) diff.DefaultSection = next.defaultSection;
  if (!arraysEqual(next.tags, existing.tags)) diff.Tags = next.tags;
  const nextAssigned = next.assignedTo.trim();
  if (nextAssigned !== (existing.assignedTo ?? '')) diff.AssignedTo = nextAssigned;
  const nextOnHold = next.onHoldReason.trim();
  if (nextOnHold !== (existing.onHoldReason ?? '')) diff.OnHoldReason = nextOnHold;
  const nextClosedReason = next.closedReason.trim();
  if (nextClosedReason !== (existing.closedReason ?? '')) diff.ClosedReason = nextClosedReason;
  if (next.notes !== (existing.notes ?? '')) diff.Notes = next.notes;
  if ((next.firstRaisedDate || '') !== (existing.firstRaisedDate ?? '')) {
    diff.FirstRaisedDate = next.firstRaisedDate || null;
  }
  if ((next.deferredUntil || '') !== (existing.deferredUntil ?? '')) {
    diff.DeferredUntil = next.deferredUntil || null;
  }
  if ((next.closedDate || '') !== (existing.closedDate ?? '')) {
    diff.ClosedDate = next.closedDate || null;
  }
  return diff;
}

let session: SessionContext | undefined;

function requireSession(): SessionContext {
  if (!session) {
    throw new Error('Store mutation called before hydrate completed.');
  }
  return session;
}

export const useStore = create<StoreState>((set, get) => ({
  status: 'idle',
  items: [],
  meetings: [],
  meetingEntries: [],
  actionItems: [],
  decisions: [],

  async hydrate(instance, env) {
    set({ status: 'loading', error: undefined });
    const client = createGraphClient(instance);
    try {
      const [items, meetings, meetingEntries, actionItems, decisions] = await Promise.all([
        fetchItems(client, env.siteId, env.lists.items),
        fetchMeetings(client, env.siteId, env.lists.meetings),
        fetchMeetingEntries(client, env.siteId, env.lists.meetingEntries),
        fetchActionItems(client, env.siteId, env.lists.actionItems),
        fetchDecisions(client, env.siteId, env.lists.decisions),
      ]);
      session = { client, env };
      set({
        status: 'ready',
        items,
        meetings,
        meetingEntries,
        actionItems,
        decisions,
        error: undefined,
      });
    } catch (err) {
      set({ status: 'error', error: toError(err) });
    }
  },

  setConfigError(missing) {
    set({
      status: 'error',
      error: {
        kind: 'config',
        message: `Missing required environment variables: ${missing.join(', ')}`,
      },
    });
  },

  reset() {
    session = undefined;
    set({
      status: 'idle',
      items: [],
      meetings: [],
      meetingEntries: [],
      actionItems: [],
      decisions: [],
      error: undefined,
    });
  },

  async createMeeting({ meetingDate, meetingType = 'Regular', titleSuffix }) {
    const { client, env } = requireSession();
    const title = meetingTitle(meetingDate, meetingType, titleSuffix);
    const { id } = await createListItem(client, env.siteId, env.lists.meetings, {
      Title: title,
      MeetingDate: meetingDate,
      MeetingType: meetingType,
    });
    const meetings = await fetchMeetings(client, env.siteId, env.lists.meetings);
    set({ meetings });
    const created = meetings.find((m) => m.id === id);
    if (!created) {
      throw new Error('Meeting was created but could not be located after refetch.');
    }
    return created;
  },

  async createItem(draft) {
    const { client, env } = requireSession();
    const { id } = await createListItem(
      client,
      env.siteId,
      env.lists.items,
      draftToFields(draft, true),
    );
    const items = await fetchItems(client, env.siteId, env.lists.items);
    set({ items });
    const created = items.find((i) => i.id === id);
    if (!created) {
      throw new Error('Item was created but could not be located after refetch.');
    }
    return created;
  },

  async updateItem(itemId, draft) {
    const { client, env } = requireSession();
    const state = get();
    const existing = state.items.find((i) => i.id === itemId);
    if (!existing) throw new Error(`Item ${itemId} not found.`);
    const diff = itemDraftDiff(existing, draft);
    if (Object.keys(diff).length === 0) return;
    await patchListItemFields(client, env.siteId, env.lists.items, itemId, diff);
    const items = await fetchItems(client, env.siteId, env.lists.items);
    set({ items });
  },

  async addInterimUpdate({ itemId, meetingId, narrative, section = 'Update', statusChangeTo }) {
    const { client, env } = requireSession();
    const state = get();
    const item = state.items.find((i) => i.id === itemId);
    const meeting = state.meetings.find((m) => m.id === meetingId);
    if (!item) throw new Error(`Item ${itemId} not found.`);
    if (!meeting) throw new Error(`Meeting ${meetingId} not found.`);

    const entriesForMeeting = state.meetingEntries.filter(
      (e) => e.meetingId === meetingId && e.section === section,
    );
    const maxOrder = entriesForMeeting.reduce((acc, e) => Math.max(acc, e.sortOrder), 0);
    const sortOrder = maxOrder + 10;

    const fields: Record<string, unknown> = {
      Title: entryTitle(meeting.meetingDate, item.title),
      MeetingIdLookupId: Number(meeting.id),
      MeetingDate: meeting.meetingDate,
      ItemIdLookupId: Number(item.id),
      Section: section,
      SortOrder: sortOrder,
      Narrative: narrative,
    };
    if (statusChangeTo) {
      fields.StatusChangeTo = statusChangeTo;
    }

    await createListItem(client, env.siteId, env.lists.meetingEntries, fields);

    if (statusChangeTo && statusChangeTo !== item.status) {
      await patchListItemFields(client, env.siteId, env.lists.items, item.id, {
        Status: statusChangeTo,
      });
    }

    const [meetingEntries, items] = await Promise.all([
      fetchMeetingEntries(client, env.siteId, env.lists.meetingEntries),
      statusChangeTo
        ? fetchItems(client, env.siteId, env.lists.items)
        : Promise.resolve(state.items),
    ]);
    set({ meetingEntries, items });
  },
}));
