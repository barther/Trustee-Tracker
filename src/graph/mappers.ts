import type {
  ActionItem,
  ActionStatus,
  DefaultSection,
  EntrySection,
  Item,
  ItemStatus,
  MeetingEntry,
  Tag,
} from '../types';

export interface GraphListItem<F = Record<string, unknown>> {
  id: string;
  fields: F;
}

const ITEM_STATUSES: readonly ItemStatus[] = ['Open', 'Tabled', 'Closed', 'Declined'];
const DEFAULT_SECTIONS: readonly DefaultSection[] = [
  'Auto',
  'Update',
  'OldBusiness',
  'NewBusiness',
];
const ENTRY_SECTIONS: readonly EntrySection[] = [
  'Update',
  'OldBusiness',
  'NewBusiness',
  'OtherBusiness',
];
const ACTION_STATUSES: readonly ActionStatus[] = ['Open', 'Done', 'Dropped'];

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asBool(value: unknown): boolean {
  return value === true;
}

function asDate(value: unknown): string | undefined {
  const s = asString(value);
  if (!s) return undefined;
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function asLookupId(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value);
}

function asTags(value: unknown): Tag[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is Tag => typeof v === 'string' && v.length > 0) as Tag[];
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value as Tag];
  }
  return [];
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length > 0) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

interface ItemFields {
  Title?: string;
  Status?: string;
  Standing?: boolean;
  DefaultSection?: string;
  Tags?: unknown;
  AssignedTo?: string;
  FirstRaisedDate?: string;
  FirstRaisedMeetingIdLookupId?: number | string;
  ClosedDate?: string;
  ClosedReason?: string;
  OnHoldReason?: string;
  DeferredUntil?: string;
  Notes?: string;
}

export function mapItem(row: GraphListItem<ItemFields>): Item {
  const f = row.fields ?? {};
  return {
    id: row.id,
    title: asString(f.Title) ?? '(untitled)',
    status: oneOf(f.Status, ITEM_STATUSES, 'Open'),
    standing: asBool(f.Standing),
    defaultSection: oneOf(f.DefaultSection, DEFAULT_SECTIONS, 'Auto'),
    tags: asTags(f.Tags),
    assignedTo: asString(f.AssignedTo),
    firstRaisedDate: asDate(f.FirstRaisedDate),
    firstRaisedMeetingId: asLookupId(f.FirstRaisedMeetingIdLookupId),
    closedDate: asDate(f.ClosedDate),
    closedReason: asString(f.ClosedReason),
    onHoldReason: asString(f.OnHoldReason),
    deferredUntil: asDate(f.DeferredUntil),
    notes: asString(f.Notes),
  };
}

interface MeetingEntryFields {
  Title?: string;
  MeetingIdLookupId?: number | string;
  MeetingDate?: string;
  ItemIdLookupId?: number | string;
  Section?: string;
  SortOrder?: number | string;
  Narrative?: string;
  StatusChangeTo?: string;
}

export function mapMeetingEntry(row: GraphListItem<MeetingEntryFields>): MeetingEntry {
  const f = row.fields ?? {};
  const statusChangeTo = asString(f.StatusChangeTo);
  return {
    id: row.id,
    title: asString(f.Title) ?? '(untitled)',
    meetingId: asLookupId(f.MeetingIdLookupId) ?? '',
    meetingDate: asDate(f.MeetingDate) ?? '',
    itemId: asLookupId(f.ItemIdLookupId) ?? '',
    section: oneOf(f.Section, ENTRY_SECTIONS, 'OldBusiness'),
    sortOrder: asNumber(f.SortOrder, 100),
    narrative: asString(f.Narrative),
    statusChangeTo: statusChangeTo
      ? oneOf(statusChangeTo, ITEM_STATUSES, 'Open')
      : undefined,
  };
}

interface ActionItemFields {
  Title?: string;
  Description?: string;
  Assignee?: string;
  MeetingEntryIdLookupId?: number | string;
  ItemIdLookupId?: number | string;
  AssignedAtMeetingIdLookupId?: number | string;
  DueHint?: string;
  Status?: string;
  CompletedAtMeetingIdLookupId?: number | string;
  CompletedNote?: string;
}

export function mapActionItem(row: GraphListItem<ActionItemFields>): ActionItem {
  const f = row.fields ?? {};
  return {
    id: row.id,
    title: asString(f.Title) ?? '(untitled)',
    description: asString(f.Description) ?? '',
    assignee: asString(f.Assignee) ?? '',
    meetingEntryId: asLookupId(f.MeetingEntryIdLookupId) ?? '',
    itemId: asLookupId(f.ItemIdLookupId) ?? '',
    assignedAtMeetingId: asLookupId(f.AssignedAtMeetingIdLookupId) ?? '',
    dueHint: asString(f.DueHint),
    status: oneOf(f.Status, ACTION_STATUSES, 'Open'),
    completedAtMeetingId: asLookupId(f.CompletedAtMeetingIdLookupId),
    completedNote: asString(f.CompletedNote),
  };
}
