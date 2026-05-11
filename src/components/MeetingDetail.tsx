import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ActionCard } from './ActionsDashboard';
import { itemHref, meetingsHref } from '../routing/hashRoute';
import {
  useStore,
  type ActionItemDraft,
  type DecisionDraft,
  type MeetingDraft,
} from '../store/useStore';
import type {
  ActionItem,
  Decision,
  DecisionType,
  EntrySection,
  Item,
  ItemStatus,
  Meeting,
  MeetingEntry,
  MeetingType,
} from '../types';

const STATUS_OPTIONS: ItemStatus[] = ['Open', 'Tabled', 'Closed', 'Declined'];
const SECTION_OPTIONS: EntrySection[] = ['Update', 'OldBusiness', 'NewBusiness', 'OtherBusiness'];
const DECISION_TYPES: DecisionType[] = ['Approval', 'Denial', 'Authorization', 'Procedural'];
const MEETING_TYPES: MeetingType[] = ['Regular', 'Special'];

const SECTION_LABEL: Record<EntrySection, string> = {
  Update: 'Updates',
  OldBusiness: 'Old business',
  NewBusiness: 'New business',
  OtherBusiness: 'Other business',
};

interface MeetingDetailProps {
  meetingId: string;
}

export function MeetingDetail({ meetingId }: MeetingDetailProps) {
  const meeting = useStore((s) => s.meetings.find((m) => m.id === meetingId));
  const items = useStore((s) => s.items);
  const allEntries = useStore((s) => s.meetingEntries);
  const allActions = useStore((s) => s.actionItems);
  const allDecisions = useStore((s) => s.decisions);

  const entries = useMemo(
    () =>
      allEntries
        .filter((e) => e.meetingId === meetingId)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [allEntries, meetingId],
  );

  const grouped = useMemo(() => {
    const out: Record<EntrySection, MeetingEntry[]> = {
      Update: [],
      OldBusiness: [],
      NewBusiness: [],
      OtherBusiness: [],
    };
    for (const e of entries) out[e.section].push(e);
    return out;
  }, [entries]);

  const usedItemIds = useMemo(() => new Set(entries.map((e) => e.itemId)), [entries]);
  const itemsById = useMemo(() => {
    const m = new Map<string, Item>();
    for (const i of items) m.set(i.id, i);
    return m;
  }, [items]);

  if (!meeting) {
    return (
      <div className="detail">
        <p>
          <a href={meetingsHref} className="back">
            ← Meetings
          </a>
        </p>
        <p className="empty">Meeting not found.</p>
      </div>
    );
  }

  return (
    <div className="detail">
      <p>
        <a href={meetingsHref} className="back">
          ← Meetings
        </a>
      </p>

      <MeetingHeader meeting={meeting} />

      <AddEntry meeting={meeting} items={items} usedItemIds={usedItemIds} entries={entries} />

      {SECTION_OPTIONS.map((section) => (
        <SectionBlock
          key={section}
          section={section}
          entries={grouped[section]}
          itemsById={itemsById}
          actions={allActions}
          decisions={allDecisions}
          meeting={meeting}
        />
      ))}
    </div>
  );
}

function MeetingHeader({ meeting }: { meeting: Meeting }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return <MeetingEdit meeting={meeting} onClose={() => setEditing(false)} />;
  }
  const factRows: Array<[string, string]> = [];
  if (meeting.location) factRows.push(['Location', meeting.location]);
  if (meeting.openingPrayerBy) factRows.push(['Opening prayer', meeting.openingPrayerBy]);
  if (meeting.adjournedAt) factRows.push(['Adjourned', meeting.adjournedAt]);
  if (meeting.nextMeetingDate) factRows.push(['Next meeting', meeting.nextMeetingDate]);
  if (meeting.openCloseThisMonth) factRows.push(['Open/close (this mo.)', meeting.openCloseThisMonth]);
  if (meeting.openCloseNextMonth) factRows.push(['Open/close (next mo.)', meeting.openCloseNextMonth]);

  return (
    <header className="detail-header">
      <div className="detail-header-row">
        <h1>{meeting.title}</h1>
        <button type="button" className="button-link" onClick={() => setEditing(true)}>
          Edit
        </button>
      </div>
      <div className="detail-badges">
        <span className="badge">{meeting.meetingType}</span>
        <span className="badge">{meeting.meetingDate}</span>
      </div>
      {factRows.length > 0 && (
        <dl className="facts">
          {factRows.map(([k, v]) => (
            <div key={k} className="fact">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {(meeting.membersPresent || meeting.membersAbsent || meeting.guests) && (
        <dl className="facts">
          {meeting.membersPresent && (
            <div className="fact">
              <dt>Present</dt>
              <dd style={{ whiteSpace: 'pre-wrap' }}>{meeting.membersPresent}</dd>
            </div>
          )}
          {meeting.membersAbsent && (
            <div className="fact">
              <dt>Absent</dt>
              <dd style={{ whiteSpace: 'pre-wrap' }}>{meeting.membersAbsent}</dd>
            </div>
          )}
          {meeting.guests && (
            <div className="fact">
              <dt>Guests</dt>
              <dd style={{ whiteSpace: 'pre-wrap' }}>{meeting.guests}</dd>
            </div>
          )}
        </dl>
      )}
    </header>
  );
}

function meetingToDraft(m: Meeting): MeetingDraft {
  const suffixMatch = m.title.match(/ — (.+)$/);
  return {
    meetingDate: m.meetingDate,
    meetingType: m.meetingType,
    titleSuffix: suffixMatch ? suffixMatch[1] : '',
    location: m.location ?? '',
    membersPresent: m.membersPresent ?? '',
    membersAbsent: m.membersAbsent ?? '',
    guests: m.guests ?? '',
    openingPrayerBy: m.openingPrayerBy ?? '',
    adjournedAt: m.adjournedAt ?? '',
    nextMeetingDate: m.nextMeetingDate ?? '',
    openCloseThisMonth: m.openCloseThisMonth ?? '',
    openCloseNextMonth: m.openCloseNextMonth ?? '',
  };
}

function MeetingEdit({ meeting, onClose }: { meeting: Meeting; onClose: () => void }) {
  const updateMeeting = useStore((s) => s.updateMeeting);
  const [draft, setDraft] = useState<MeetingDraft>(() => meetingToDraft(meeting));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await updateMeeting(meeting.id, draft);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="add-update-form" onSubmit={submit}>
      <div className="form-row">
        <label className="form-field">
          <span>Date</span>
          <input
            type="date"
            value={draft.meetingDate}
            onChange={(e) => setDraft({ ...draft, meetingDate: e.target.value })}
          />
        </label>
        <label className="form-field">
          <span>Type</span>
          <select
            value={draft.meetingType}
            onChange={(e) => setDraft({ ...draft, meetingType: e.target.value as MeetingType })}
          >
            {MEETING_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="form-field">
        <span>Title suffix</span>
        <input
          type="text"
          value={draft.titleSuffix ?? ''}
          onChange={(e) => setDraft({ ...draft, titleSuffix: e.target.value })}
        />
      </label>
      <label className="form-field">
        <span>Location</span>
        <input
          type="text"
          value={draft.location ?? ''}
          onChange={(e) => setDraft({ ...draft, location: e.target.value })}
        />
      </label>
      <div className="form-row">
        <label className="form-field">
          <span>Opening prayer by</span>
          <input
            type="text"
            value={draft.openingPrayerBy ?? ''}
            onChange={(e) => setDraft({ ...draft, openingPrayerBy: e.target.value })}
          />
        </label>
        <label className="form-field">
          <span>Adjourned at</span>
          <input
            type="text"
            value={draft.adjournedAt ?? ''}
            onChange={(e) => setDraft({ ...draft, adjournedAt: e.target.value })}
            placeholder="8:42 PM"
          />
        </label>
      </div>
      <label className="form-field">
        <span>Members present (one per line)</span>
        <textarea
          rows={4}
          value={draft.membersPresent ?? ''}
          onChange={(e) => setDraft({ ...draft, membersPresent: e.target.value })}
        />
      </label>
      <label className="form-field">
        <span>Members absent</span>
        <textarea
          rows={2}
          value={draft.membersAbsent ?? ''}
          onChange={(e) => setDraft({ ...draft, membersAbsent: e.target.value })}
        />
      </label>
      <label className="form-field">
        <span>Guests</span>
        <textarea
          rows={2}
          value={draft.guests ?? ''}
          onChange={(e) => setDraft({ ...draft, guests: e.target.value })}
        />
      </label>
      <div className="form-row">
        <label className="form-field">
          <span>Next meeting date</span>
          <input
            type="date"
            value={draft.nextMeetingDate ?? ''}
            onChange={(e) => setDraft({ ...draft, nextMeetingDate: e.target.value })}
          />
        </label>
        <label className="form-field">
          <span>Open/close this month</span>
          <input
            type="text"
            value={draft.openCloseThisMonth ?? ''}
            onChange={(e) => setDraft({ ...draft, openCloseThisMonth: e.target.value })}
          />
        </label>
      </div>
      <label className="form-field">
        <span>Open/close next month</span>
        <input
          type="text"
          value={draft.openCloseNextMonth ?? ''}
          onChange={(e) => setDraft({ ...draft, openCloseNextMonth: e.target.value })}
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save meeting'}
        </button>
        <button type="button" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function AddEntry({
  meeting,
  items,
  usedItemIds,
  entries,
}: {
  meeting: Meeting;
  items: Item[];
  usedItemIds: Set<string>;
  entries: MeetingEntry[];
}) {
  const createMeetingEntry = useStore((s) => s.createMeetingEntry);
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState('');
  const [section, setSection] = useState<EntrySection>('OldBusiness');
  const [narrative, setNarrative] = useState('');
  const [statusChangeTo, setStatusChangeTo] = useState<ItemStatus | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidateItems = useMemo(() => {
    return items
      .slice()
      .sort((a, b) => {
        const au = usedItemIds.has(a.id) ? 1 : 0;
        const bu = usedItemIds.has(b.id) ? 1 : 0;
        if (au !== bu) return au - bu;
        return a.title.localeCompare(b.title);
      });
  }, [items, usedItemIds]);

  const reset = () => {
    setItemId('');
    setSection('OldBusiness');
    setNarrative('');
    setStatusChangeTo('');
    setError(null);
    setOpen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) {
      setError('Pick an item.');
      return;
    }
    if (!narrative.trim()) {
      setError('Narrative is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createMeetingEntry({
        itemId,
        meetingId: meeting.id,
        section,
        narrative: narrative.trim(),
        statusChangeTo: statusChangeTo || undefined,
      });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <div className="add-update">
        <button onClick={() => setOpen(true)} className="primary">
          Add entry
        </button>
        <span className="meta" style={{ marginLeft: 12 }}>
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'} so far
        </span>
      </div>
    );
  }

  return (
    <form className="add-update-form" onSubmit={submit}>
      <div className="form-target">
        Recording entry for <strong>{meeting.title}</strong>
      </div>
      <label className="form-field">
        <span>Item</span>
        <select value={itemId} onChange={(e) => setItemId(e.target.value)} autoFocus>
          <option value="">— Pick an item —</option>
          {candidateItems.map((i) => (
            <option key={i.id} value={i.id}>
              {usedItemIds.has(i.id) ? '✓ ' : ''}
              {i.title}
              {i.status !== 'Open' ? ` (${i.status})` : ''}
            </option>
          ))}
        </select>
      </label>
      <div className="form-row">
        <label className="form-field">
          <span>Section</span>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as EntrySection)}
          >
            {SECTION_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {SECTION_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Status change</span>
          <select
            value={statusChangeTo}
            onChange={(e) => setStatusChangeTo(e.target.value as ItemStatus | '')}
          >
            <option value="">No change</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="form-field">
        <span>Narrative (markdown)</span>
        <textarea
          rows={5}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="What was discussed and decided…"
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save entry'}
        </button>
        <button type="button" onClick={reset} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function SectionBlock({
  section,
  entries,
  itemsById,
  actions,
  decisions,
  meeting,
}: {
  section: EntrySection;
  entries: MeetingEntry[];
  itemsById: Map<string, Item>;
  actions: ActionItem[];
  decisions: Decision[];
  meeting: Meeting;
}) {
  return (
    <section className="agenda-section">
      <h2>
        {SECTION_LABEL[section]} <span className="count">({entries.length})</span>
      </h2>
      {entries.length === 0 ? (
        <p className="empty">No entries.</p>
      ) : (
        <ol className="timeline">
          {entries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              item={itemsById.get(entry.itemId)}
              actions={actions.filter((a) => a.meetingEntryId === entry.id)}
              decisions={decisions.filter((d) => d.meetingEntryId === entry.id)}
              meeting={meeting}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function EntryRow({
  entry,
  item,
  actions,
  decisions,
  meeting,
}: {
  entry: MeetingEntry;
  item?: Item;
  actions: ActionItem[];
  decisions: Decision[];
  meeting: Meeting;
}) {
  return (
    <li className="timeline-row">
      <div className="timeline-head">
        {item ? (
          <a href={itemHref(item.id)} className="title">
            {item.title}
          </a>
        ) : (
          <span className="title">[unknown item {entry.itemId}]</span>
        )}
        {entry.statusChangeTo && (
          <span className={`status status-${entry.statusChangeTo.toLowerCase()}`}>
            → {entry.statusChangeTo}
          </span>
        )}
        <span className="meta">#{entry.sortOrder}</span>
      </div>
      {entry.narrative ? (
        <div className="prose">
          <ReactMarkdown>{entry.narrative}</ReactMarkdown>
        </div>
      ) : (
        <p className="empty">No narrative recorded.</p>
      )}

      {actions.length > 0 && (
        <ul className="actions">
          {actions.map((a) => (
            <ActionCard key={a.id} action={a} />
          ))}
        </ul>
      )}

      {decisions.length > 0 && (
        <ul className="decisions">
          {decisions.map((d) => (
            <li key={d.id} className="decision-row">
              <div className="decision-head">
                <span className="badge">{d.decisionType}</span>
              </div>
              <div className="decision-summary">{d.summary}</div>
              <div className="decision-meta">
                {d.motionBy && <span>Motion: {d.motionBy}</span>}
                {d.secondBy && <span>Second: {d.secondBy}</span>}
                {d.vote && <span>Vote: {d.vote}</span>}
                {typeof d.amount === 'number' && (
                  <span>
                    $
                    {d.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                )}
                {d.vendor && <span>Vendor: {d.vendor}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <EntryAddons entry={entry} item={item} meeting={meeting} />
    </li>
  );
}

function EntryAddons({
  entry,
  item,
  meeting,
}: {
  entry: MeetingEntry;
  item?: Item;
  meeting: Meeting;
}) {
  const [mode, setMode] = useState<'idle' | 'action' | 'decision'>('idle');
  if (!item) return null;
  return (
    <div className="entry-addons">
      {mode === 'idle' && (
        <div className="form-actions">
          <button type="button" onClick={() => setMode('action')}>
            + Action item
          </button>
          <button type="button" onClick={() => setMode('decision')}>
            + Decision
          </button>
        </div>
      )}
      {mode === 'action' && (
        <ActionForm
          entry={entry}
          item={item}
          meeting={meeting}
          onClose={() => setMode('idle')}
        />
      )}
      {mode === 'decision' && (
        <DecisionForm
          entry={entry}
          item={item}
          meeting={meeting}
          onClose={() => setMode('idle')}
        />
      )}
    </div>
  );
}

function ActionForm({
  entry,
  item,
  meeting,
  onClose,
}: {
  entry: MeetingEntry;
  item: Item;
  meeting: Meeting;
  onClose: () => void;
}) {
  const createActionItem = useStore((s) => s.createActionItem);
  const [draft, setDraft] = useState<ActionItemDraft>({
    meetingEntryId: entry.id,
    itemId: item.id,
    meetingId: meeting.id,
    description: '',
    assignee: item.assignedTo ?? '',
    dueHint: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createActionItem(draft);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="add-update-form" onSubmit={submit}>
      <label className="form-field">
        <span>What needs to happen</span>
        <textarea
          rows={2}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          autoFocus
        />
      </label>
      <div className="form-row">
        <label className="form-field">
          <span>Assignee</span>
          <input
            type="text"
            value={draft.assignee}
            onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
          />
        </label>
        <label className="form-field">
          <span>Due hint</span>
          <input
            type="text"
            value={draft.dueHint ?? ''}
            onChange={(e) => setDraft({ ...draft, dueHint: e.target.value })}
            placeholder="next meeting"
          />
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Add action'}
        </button>
        <button type="button" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function DecisionForm({
  entry,
  item,
  meeting,
  onClose,
}: {
  entry: MeetingEntry;
  item: Item;
  meeting: Meeting;
  onClose: () => void;
}) {
  const createDecision = useStore((s) => s.createDecision);
  const [draft, setDraft] = useState<DecisionDraft>({
    meetingEntryId: entry.id,
    itemId: item.id,
    meetingId: meeting.id,
    summary: '',
    decisionType: 'Approval',
    motionBy: '',
    secondBy: '',
    vote: '',
    amount: undefined,
    vendor: '',
  });
  const [amountStr, setAmountStr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    let amount: number | undefined;
    if (amountStr.trim()) {
      const cleaned = amountStr.replace(/[^0-9.]/g, '');
      const parsed = Number.parseFloat(cleaned);
      if (Number.isNaN(parsed)) {
        setError('Amount must be a number.');
        setSubmitting(false);
        return;
      }
      amount = parsed;
    }
    try {
      await createDecision({ ...draft, amount });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="add-update-form" onSubmit={submit}>
      <label className="form-field">
        <span>Summary</span>
        <input
          type="text"
          value={draft.summary}
          onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
          autoFocus
        />
      </label>
      <div className="form-row">
        <label className="form-field">
          <span>Type</span>
          <select
            value={draft.decisionType}
            onChange={(e) =>
              setDraft({ ...draft, decisionType: e.target.value as DecisionType })
            }
          >
            {DECISION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field">
          <span>Vote</span>
          <input
            type="text"
            value={draft.vote ?? ''}
            onChange={(e) => setDraft({ ...draft, vote: e.target.value })}
            placeholder="Unanimous or 6-2-1"
          />
        </label>
      </div>
      <div className="form-row">
        <label className="form-field">
          <span>Motion by</span>
          <input
            type="text"
            value={draft.motionBy ?? ''}
            onChange={(e) => setDraft({ ...draft, motionBy: e.target.value })}
          />
        </label>
        <label className="form-field">
          <span>Second by</span>
          <input
            type="text"
            value={draft.secondBy ?? ''}
            onChange={(e) => setDraft({ ...draft, secondBy: e.target.value })}
          />
        </label>
      </div>
      <div className="form-row">
        <label className="form-field">
          <span>Amount (USD)</span>
          <input
            type="text"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="1500"
            inputMode="decimal"
          />
        </label>
        <label className="form-field">
          <span>Vendor</span>
          <input
            type="text"
            value={draft.vendor ?? ''}
            onChange={(e) => setDraft({ ...draft, vendor: e.target.value })}
          />
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Add decision'}
        </button>
        <button type="button" onClick={onClose} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
