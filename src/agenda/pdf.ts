import jsPDF from 'jspdf';
import type { Agenda, AgendaEntry } from './generator';
import { nextThirdTuesday, toIsoDate } from './nextMeeting';
import type { Item, Meeting, MeetingEntry } from '../types';

const FONT = 'helvetica'; // Arial-equivalent; built into every PDF reader.
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const BODY_W = PAGE_W - MARGIN * 2;
const PARA_GAP = 8;
const SECTION_GAP = 14;

const DEFAULT_TIME = '6 PM';
const DEFAULT_LOCATION = 'Living Faith Class room on 3rd floor';

export interface AgendaPdfInput {
  targetDate: string;
  meeting?: Meeting;
  prevMeeting?: Meeting;
  agenda: Agenda;
  meetingEntries: MeetingEntry[];
}

export function generateAgendaPdf(input: AgendaPdfInput): jsPDF {
  const { targetDate, meeting, prevMeeting, agenda, meetingEntries } = input;
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });

  const cursor = { y: MARGIN };
  const ensureSpace = (needed: number) => {
    if (cursor.y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      cursor.y = MARGIN;
    }
  };

  const writeLine = (
    text: string,
    opts: { size?: number; bold?: boolean; gap?: number; indent?: number } = {},
  ) => {
    const size = opts.size ?? 11;
    doc.setFont(FONT, opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, BODY_W - (opts.indent ?? 0));
    const block = lines.length * (size + 3);
    ensureSpace(block);
    doc.text(lines, MARGIN + (opts.indent ?? 0), cursor.y, { baseline: 'top' });
    cursor.y += block + (opts.gap ?? 0);
  };

  // ── Header ───────────────────────────────────────────────────
  writeLine('AGENDA', { size: 14, bold: true, gap: 6 });

  const time = DEFAULT_TIME;
  const location = meeting?.location?.trim() || DEFAULT_LOCATION;
  writeLine(`${formatHeaderDate(targetDate)} - ${time} ${location}.`, { gap: PARA_GAP });

  writeLine('Opening Prayer', { gap: PARA_GAP });

  const reviewSource = prevMeeting
    ? formatMonthYear(prevMeeting.meetingDate)
    : formatMonthYear(prevMonthIso(targetDate));
  writeLine(`Review of minutes from ${reviewSource}`, { gap: PARA_GAP });

  const openCloseLine = formatOpenClose(meeting, targetDate);
  if (openCloseLine) {
    writeLine(openCloseLine, { gap: PARA_GAP });
  }

  // ── Sections ─────────────────────────────────────────────────
  const entriesByItem = indexLatestPriorEntry(meetingEntries, targetDate);

  writeSection(doc, cursor, ensureSpace, writeLine, 'UPDATES:', agenda.updates, entriesByItem);
  writeSection(doc, cursor, ensureSpace, writeLine, 'OLD BUSINESS:', agenda.oldBusiness, entriesByItem);
  writeSection(doc, cursor, ensureSpace, writeLine, 'NEW BUSINESS:', agenda.newBusiness, entriesByItem);
  // Tabled deliberately suppressed — the chair's agendas don't list it.

  cursor.y += SECTION_GAP;
  writeLine('OPEN DISCUSSION', { bold: true, gap: PARA_GAP });

  const nextLine = meeting?.nextMeetingDate
    ? formatHeaderDate(meeting.nextMeetingDate)
    : formatHeaderDate(toIsoDate(nextThirdTuesday(parseIso(targetDate))));
  writeLine(`Next Meeting. ${nextLine}`, { bold: true });

  return doc;
}

function writeSection(
  _doc: jsPDF,
  cursor: { y: number },
  _ensureSpace: (n: number) => void,
  writeLine: (
    text: string,
    opts?: { size?: number; bold?: boolean; gap?: number; indent?: number },
  ) => void,
  heading: string,
  entries: AgendaEntry[],
  latestByItem: Map<string, MeetingEntry>,
) {
  cursor.y += SECTION_GAP;
  writeLine(heading, { bold: true, gap: PARA_GAP });
  if (entries.length === 0) {
    writeLine('(none)', { gap: PARA_GAP });
    return;
  }
  for (const entry of entries) {
    const body = composeItemLine(entry.item, latestByItem.get(entry.item.id));
    writeLine(body, { gap: PARA_GAP });
  }
}

function composeItemLine(item: Item, latest?: MeetingEntry): string {
  const status = latest?.narrative?.trim() || item.notes?.trim() || '';
  if (!status) {
    return item.title;
  }
  const cleaned = stripMarkdown(status);
  const title = item.title.replace(/[.:]$/, '');
  return `${title}. ${cleaned}`;
}

function stripMarkdown(s: string): string {
  return s
    .replace(/^[\s>*#-]+/gm, '')
    .replace(/[*_`~]{1,3}/g, '')
    .replace(/\[(.+?)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function indexLatestPriorEntry(
  entries: MeetingEntry[],
  targetDate: string,
): Map<string, MeetingEntry> {
  const m = new Map<string, MeetingEntry>();
  for (const e of entries) {
    if (e.meetingDate >= targetDate) continue;
    const prev = m.get(e.itemId);
    if (
      !prev ||
      e.meetingDate > prev.meetingDate ||
      (e.meetingDate === prev.meetingDate && e.sortOrder > prev.sortOrder)
    ) {
      m.set(e.itemId, e);
    }
  }
  return m;
}

function parseIso(iso: string): Date {
  return new Date(iso + 'T00:00:00');
}

function formatHeaderDate(iso: string): string {
  const d = parseIso(iso);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMonthYear(iso: string): string {
  const d = parseIso(iso);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function monthName(iso: string): string {
  return parseIso(iso).toLocaleDateString('en-US', { month: 'long' });
}

function prevMonthIso(iso: string): string {
  const d = parseIso(iso);
  d.setMonth(d.getMonth() - 1);
  return toIsoDate(d);
}

function nextMonthIso(iso: string): string {
  const d = parseIso(iso);
  d.setMonth(d.getMonth() + 1);
  return toIsoDate(d);
}

function formatOpenClose(meeting: Meeting | undefined, targetDate: string): string | null {
  const thisMonth = monthName(targetDate);
  const nextMonth = monthName(nextMonthIso(targetDate));
  const thisName = meeting?.openCloseThisMonth?.trim();
  const nextName = meeting?.openCloseNextMonth?.trim();
  if (!thisName && !nextName) return null;
  const left = thisName ? `${thisMonth}, ${thisName}` : thisMonth;
  const right = nextName ? `${nextMonth}, ${nextName}` : nextMonth;
  return `Open/Close: ${left} – ${right}`;
}
