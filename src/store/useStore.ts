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
  resolveListIds,
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

export interface MeetingEntryInput {
  itemId: string;
  meetingId: string;
  section: EntrySection;
  sortOrder?: number;
  narrative: string;
  statusChangeTo?: ItemStatus;
}

export interface MeetingDraft {
  meetingDate: string;
  meetingType: 'Regular' | 'Special';
  titleSuffix?: string;
  location?: string;
  membersPresent?: string;
  membersAbsent?: string;
  guests?: string;
  openingPrayerBy?: string;
  adjournedAt?: string;
  nextMeetingDate?: string;
  openCloseThisMonth?: string;
  openCloseNextMonth?: string;
}

export interface ActionItemDraft {
  meetingEntryId: string;
  itemId: string;
  meetingId: string;
  description: string;
  assignee: string;
  dueHint?: string;
}

export interface DecisionDraft {
  meetingEntryId: string;
  itemId: string;
  meetingId: string;
  summary: string;
  decisionType: 'Approval' | 'Denial' | 'Authorization' | 'Procedural';
  motionBy?: string;
  secondBy?: string;
  vote?: string;
  amount?: number;
  vendor?: string;
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
  createMeetingFromDraft: (draft: MeetingDraft) => Promise<Meeting>;
  updateMeeting: (meetingId: string, draft: MeetingDraft) => Promise<void>;
  addInterimUpdate: (input: InterimUpdateInput) => Promise<void>;
  createMeetingEntry: (input: MeetingEntryInput) => Promise<MeetingEntry>;
  createActionItem: (draft: ActionItemDraft) => Promise<ActionItem>;
  createDecision: (draft: DecisionDraft) => Promise<Decision>;
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

function actionTitle(meetingDate: string, assignee: string, description: string): string {
  return truncate(`${meetingDate} — ${assignee}: ${description}`, 80);
}

function decisionTitleString(meetingDate: string, summary: string): string {
  return truncate(`${meetingDate} — ${summary}`, 80);
}

function meetingTitle(meetingDate: string, meetingType: 'Regular' | 'Special', suffix?: string): string {
  const base = `${meetingDate} ${meetingType}`;
  return suffix ? `${base} — ${suffix}` : base;
}

function meetingDraftToFields(draft: MeetingDraft): Record<string, unknown> {
  return {
    Title: meetingTitle(draft.meetingDate, draft.meetingType, draft.titleSuffix?.trim() || undefined),
    MeetingDate: draft.meetingDate,
    MeetingType: draft.meetingType,
    Location: draft.location?.trim() || null,
    MembersPresent: draft.membersPresent ?? null,
    MembersAbsent: draft.membersAbsent ?? null,
    Guests: draft.guests ?? null,
    OpeningPrayerBy: draft.openingPrayerBy?.trim() || null,
    AdjournedAt: draft.adjournedAt?.trim() || null,
    NextMeetingDate: draft.nextMeetingDate || null,
    OpenCloseThisMonth: draft.openCloseThisMonth?.trim() || null,
    OpenCloseNextMonth: draft.openCloseNextMonth?.trim() || null,
  };
}

function meetingDraftDiff(existing: Meeting, next: MeetingDraft): Record<string, unknown> {
  const diff: Record<string, unknown> = {};
  const nextTitle = meetingTitle(next.meetingDate, next.meetingType, next.titleSuffix?.trim() || undefined);
  if (nextTitle !== existing.title) diff.Title = nextTitle;
  if (next.meetingDate !== existing.meetingDate) diff.MeetingDate = next.meetingDate;
  if (next.meetingType !== existing.meetingType) diff.MeetingType = next.meetingType;
  const nextLoc = next.location?.trim() ?? '';
  if (nextLoc !== (existing.location ?? '')) diff.Location = nextLoc || null;
  if ((next.membersPresent ?? '') !== (existing.membersPresent ?? '')) {
    diff.MembersPresent = next.membersPresent ?? null;
  }
  if ((next.membersAbsent ?? '') !== (existing.membersAbsent ?? '')) {
    diff.MembersAbsent = next.membersAbsent ?? null;
  }
  if ((next.guests ?? '') !== (existing.guests ?? '')) {
    diff.Guests = next.guests ?? null;
  }
  const nextPrayer = next.openingPrayerBy?.trim() ?? '';
  if (nextPrayer !== (existing.openingPrayerBy ?? '')) diff.OpeningPrayerBy = nextPrayer || null;
  const nextAdj = next.adjournedAt?.trim() ?? '';
  if (nextAdj !== (existing.adjournedAt ?? '')) diff.AdjournedAt = nextAdj || null;
  if ((next.nextMeetingDate || '') !== (existing.nextMeetingDate ?? '')) {
    diff.NextMeetingDate = next.nextMeetingDate || null;
  }
  const nextOcThis = next.openCloseThisMonth?.trim() ?? '';
  if (nextOcThis !== (existing.openCloseThisMonth ?? '')) diff.OpenCloseThisMonth = nextOcThis || null;
  const nextOcNext = next.openCloseNextMonth?.trim() ?? '';
  if (nextOcNext !== (existing.openCloseNextMonth ?? '')) diff.OpenCloseNextMonth = nextOcNext || null;
  return diff;
}

function nextSortOrder(entries: readonly MeetingEntry[], meetingId: string, section: EntrySection): number {
  const max = entries
    .filter((e) => e.meetingId === meetingId && e.section === section)
    .reduce((acc, e) => Math.max(acc, e.sortOrder), 0);
  return max + 10;
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
      const idMap = await resolveListIds(client, env.siteId, [
        env.lists.items,
        env.lists.meetings,
        env.lists.meetingEntries,
        env.lists.actionItems,
        env.lists.decisions,
        env.lists.vendors,
      ]);
      const resolved: AppEnv = {
        ...env,
        lists: {
          items: idMap[env.lists.items],
          meetings: idMap[env.lists.meetings],
          meetingEntries: idMap[env.lists.meetingEntries],
          actionItems: idMap[env.lists.actionItems],
          decisions: idMap[env.lists.decisions],
          vendors: idMap[env.lists.vendors],
        },
      };
      const [items, meetings, meetingEntries, actionItems, decisions] = await Promise.all([
        fetchItems(client, resolved.siteId, resolved.lists.items),
        fetchMeetings(client, resolved.siteId, resolved.lists.meetings),
        fetchMeetingEntries(client, resolved.siteId, resolved.lists.meetingEntries),
        fetchActionItems(client, resolved.siteId, resolved.lists.actionItems),
        fetchDecisions(client, resolved.siteId, resolved.lists.decisions),
      ]);
      session = { client, env: resolved };

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
    return get().createMeetingFromDraft({ meetingDate, meetingType, titleSuffix });
  },

  async createMeetingFromDraft(draft) {
    const { client, env } = requireSession();
    const { id } = await createListItem(
      client,
      env.siteId,
      env.lists.meetings,
      meetingDraftToFields(draft),
    );
    const meetings = await fetchMeetings(client, env.siteId, env.lists.meetings);
    set({ meetings });
    const created = meetings.find((m) => m.id === id);
    if (!created) {
      throw new Error('Meeting was created but could not be located after refetch.');
    }
    return created;
  },

  async updateMeeting(meetingId, draft) {
    const { client, env } = requireSession();
    const state = get();
    const existing = state.meetings.find((m) => m.id === meetingId);
    if (!existing) throw new Error(`Meeting ${meetingId} not found.`);
    const diff = meetingDraftDiff(existing, draft);
    if (Object.keys(diff).length === 0) return;
    await patchListItemFields(client, env.siteId, env.lists.meetings, meetingId, diff);
    const meetings = await fetchMeetings(client, env.siteId, env.lists.meetings);
    set({ meetings });
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
    await get().createMeetingEntry({
      itemId,
      meetingId,
      section,
      narrative,
      statusChangeTo,
    });
  },

  async createMeetingEntry({ itemId, meetingId, section, sortOrder, narrative, statusChangeTo }) {
    const { client, env } = requireSession();
    const state = get();
    const item = state.items.find((i) => i.id === itemId);
    const meeting = state.meetings.find((m) => m.id === meetingId);
    if (!item) throw new Error(`Item ${itemId} not found.`);
    if (!meeting) throw new Error(`Meeting ${meetingId} not found.`);

    const order = sortOrder ?? nextSortOrder(state.meetingEntries, meetingId, section);

    const fields: Record<string, unknown> = {
      Title: entryTitle(meeting.meetingDate, item.title),
      MeetingIdLookupId: Number(meeting.id),
      MeetingDate: meeting.meetingDate,
      ItemIdLookupId: Number(item.id),
      Section: section,
      SortOrder: order,
      Narrative: narrative,
    };
    if (statusChangeTo) {
      fields.StatusChangeTo = statusChangeTo;
    }

    const { id } = await createListItem(client, env.siteId, env.lists.meetingEntries, fields);

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
    const created = meetingEntries.find((e) => e.id === id);
    if (!created) {
      throw new Error('Meeting entry was created but could not be located after refetch.');
    }
    return created;
  },

  async createActionItem(draft) {
    const { client, env } = requireSession();
    const state = get();
    const meeting = state.meetings.find((m) => m.id === draft.meetingId);
    if (!meeting) throw new Error(`Meeting ${draft.meetingId} not found.`);

    const description = draft.description.trim();
    const assignee = draft.assignee.trim();
    if (!description) throw new Error('Description is required.');
    if (!assignee) throw new Error('Assignee is required.');

    const fields: Record<string, unknown> = {
      Title: actionTitle(meeting.meetingDate, assignee, description),
      Description: description,
      Assignee: assignee,
      MeetingEntryIdLookupId: Number(draft.meetingEntryId),
      ItemIdLookupId: Number(draft.itemId),
      AssignedAtMeetingIdLookupId: Number(draft.meetingId),
      Status: 'Open',
    };
    if (draft.dueHint?.trim()) fields.DueHint = draft.dueHint.trim();

    const { id } = await createListItem(client, env.siteId, env.lists.actionItems, fields);
    const actionItems = await fetchActionItems(client, env.siteId, env.lists.actionItems);
    set({ actionItems });
    const created = actionItems.find((a) => a.id === id);
    if (!created) throw new Error('Action item was created but could not be located after refetch.');
    return created;
  },

  async createDecision(draft) {
    const { client, env } = requireSession();
    const state = get();
    const meeting = state.meetings.find((m) => m.id === draft.meetingId);
    if (!meeting) throw new Error(`Meeting ${draft.meetingId} not found.`);

    const summary = draft.summary.trim();
    if (!summary) throw new Error('Summary is required.');

    const fields: Record<string, unknown> = {
      Title: decisionTitleString(meeting.meetingDate, summary),
      Summary: summary,
      MeetingEntryIdLookupId: Number(draft.meetingEntryId),
      MeetingIdLookupId: Number(draft.meetingId),
      ItemIdLookupId: Number(draft.itemId),
      DecisionDate: meeting.meetingDate,
      DecisionType: draft.decisionType,
    };
    if (draft.motionBy?.trim()) fields.MotionBy = draft.motionBy.trim();
    if (draft.secondBy?.trim()) fields.SecondBy = draft.secondBy.trim();
    if (draft.vote?.trim()) fields.Vote = draft.vote.trim();
    if (typeof draft.amount === 'number' && Number.isFinite(draft.amount)) fields.Amount = draft.amount;
    if (draft.vendor?.trim()) fields.Vendor = draft.vendor.trim();

    const { id } = await createListItem(client, env.siteId, env.lists.decisions, fields);
    const decisions = await fetchDecisions(client, env.siteId, env.lists.decisions);
    set({ decisions });
    const created = decisions.find((d) => d.id === id);
    if (!created) throw new Error('Decision was created but could not be located after refetch.');
    return created;
  },
}));
