import type { AgendaSection, Item, MeetingEntry } from '../types';

export interface AgendaEntry {
  item: Item;
  section: AgendaSection;
  sortOrder: number;
  lastDiscussedDate?: string;
  priorEntryCount: number;
}

export interface Agenda {
  targetDate: string;
  updates: AgendaEntry[];
  oldBusiness: AgendaEntry[];
  newBusiness: AgendaEntry[];
  tabled: AgendaEntry[];
}

const SECTION_BUCKETS: Record<AgendaSection, keyof Omit<Agenda, 'targetDate'>> = {
  Update: 'updates',
  OldBusiness: 'oldBusiness',
  NewBusiness: 'newBusiness',
  Tabled: 'tabled',
};

interface PriorEntryStats {
  mostRecentBefore?: MeetingEntry;
  count: number;
}

function isMoreRecent(a: MeetingEntry, b: MeetingEntry): boolean {
  if (a.meetingDate !== b.meetingDate) return a.meetingDate > b.meetingDate;
  return a.sortOrder > b.sortOrder;
}

function indexEntriesByItem(
  entries: MeetingEntry[],
  targetDate: string,
): Map<string, PriorEntryStats> {
  const byItem = new Map<string, PriorEntryStats>();
  for (const entry of entries) {
    if (entry.meetingDate >= targetDate) continue;
    const stats = byItem.get(entry.itemId) ?? { count: 0 };
    stats.count += 1;
    if (!stats.mostRecentBefore || isMoreRecent(entry, stats.mostRecentBefore)) {
      stats.mostRecentBefore = entry;
    }
    byItem.set(entry.itemId, stats);
  }
  return byItem;
}

function classify(item: Item, hasPriorEntries: boolean): AgendaSection | null {
  if (item.status === 'Closed' || item.status === 'Declined') return null;
  if (item.status === 'Tabled' || item.onHoldReason) return 'Tabled';
  if (item.defaultSection !== 'Auto') {
    return item.defaultSection;
  }
  if (item.standing) return 'Update';
  if (!hasPriorEntries) return 'NewBusiness';
  return 'OldBusiness';
}

function compareEntries(a: AgendaEntry, b: AgendaEntry): number {
  const aHas = a.priorEntryCount > 0;
  const bHas = b.priorEntryCount > 0;
  if (aHas && bHas) {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.item.title.localeCompare(b.item.title);
  }
  if (aHas) return -1;
  if (bHas) return 1;
  return a.item.title.localeCompare(b.item.title);
}

export function generateAgenda(
  items: Item[],
  entries: MeetingEntry[],
  targetDate: string,
): Agenda {
  const priorByItem = indexEntriesByItem(entries, targetDate);
  const agenda: Agenda = {
    targetDate,
    updates: [],
    oldBusiness: [],
    newBusiness: [],
    tabled: [],
  };

  for (const item of items) {
    if (item.deferredUntil && item.deferredUntil > targetDate) continue;

    const stats = priorByItem.get(item.id);
    const hasPriorEntries = !!stats && stats.count > 0;
    const section = classify(item, hasPriorEntries);
    if (!section) continue;

    const sortOrder = stats?.mostRecentBefore?.sortOrder ?? Number.POSITIVE_INFINITY;
    const lastDiscussedDate = stats?.mostRecentBefore?.meetingDate;

    const entry: AgendaEntry = {
      item,
      section,
      sortOrder,
      lastDiscussedDate,
      priorEntryCount: stats?.count ?? 0,
    };
    agenda[SECTION_BUCKETS[section]].push(entry);
  }

  agenda.updates.sort(compareEntries);
  agenda.oldBusiness.sort(compareEntries);
  agenda.newBusiness.sort(compareEntries);
  agenda.tabled.sort(compareEntries);

  return agenda;
}
