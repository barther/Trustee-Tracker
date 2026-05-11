import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { nextThirdTuesday, toIsoDate } from '../agenda/nextMeeting';
import { itemEditHref } from '../routing/hashRoute';
import { useStore } from '../store/useStore';
import type {
  ActionItem,
  Decision,
  EntrySection,
  Item,
  ItemStatus,
  Meeting,
  MeetingEntry,
} from '../types';

const STATUS_OPTIONS: ItemStatus[] = ['Open', 'Tabled', 'Closed', 'Declined'];

const SECTION_LABEL: Record<EntrySection, string> = {
  Update: 'Updates',
  OldBusiness: 'Old Business',
  NewBusiness: 'New Business',
  OtherBusiness: 'Other Business',
};

function statusClass(status: ItemStatus): string {
  return `status status-${status.toLowerCase()}`;
}

interface ItemDetailProps {
  itemId: string;
}

export function ItemDetail({ itemId }: ItemDetailProps) {
  const item = useStore((s) => s.items.find((i) => i.id === itemId));
  const allEntries = useStore((s) => s.meetingEntries);
  const allDecisions = useStore((s) => s.decisions);
  const allActions = useStore((s) => s.actionItems);

  const entries = useMemo(
    () =>
      allEntries
        .filter((e) => e.itemId === itemId)
        .slice()
        .sort((a, b) => {
          if (a.meetingDate !== b.meetingDate) {
            return b.meetingDate.localeCompare(a.meetingDate);
          }
          return a.sortOrder - b.sortOrder;
        }),
    [allEntries, itemId],
  );

  const decisions = useMemo(
    () =>
      allDecisions
        .filter((d) => d.itemId === itemId)
        .slice()
        .sort((a, b) => b.decisionDate.localeCompare(a.decisionDate)),
    [allDecisions, itemId],
  );

  const actions = useMemo(
    () =>
      allActions
        .filter((a) => a.itemId === itemId)
        .slice()
        .sort((a, b) => {
          const aOpen = a.status === 'Open' ? 0 : 1;
          const bOpen = b.status === 'Open' ? 0 : 1;
          if (aOpen !== bOpen) return aOpen - bOpen;
          return a.title.localeCompare(b.title);
        }),
    [allActions, itemId],
  );

  if (!item) {
    return (
      <div className="detail">
        <p>
          <a href="#" className="back">
            ← Agenda
          </a>
        </p>
        <p className="empty">Item not found.</p>
      </div>
    );
  }

  return (
    <div className="detail">
      <p>
        <a href="#" className="back">
          ← Agenda
        </a>
      </p>

      <Header item={item} />
      <Facts item={item} />
      <AddUpdate item={item} />

      <History entries={entries} />
      <Decisions decisions={decisions} />
      <Actions actions={actions} />

      {item.notes && (
        <section className="detail-section">
          <h2>Background</h2>
          <div className="prose">
            <ReactMarkdown>{item.notes}</ReactMarkdown>
          </div>
        </section>
      )}
    </div>
  );
}

interface TargetMeeting {
  meeting?: Meeting;
  pendingDate: string;
}

function resolveTarget(meetings: Meeting[]): TargetMeeting {
  const today = toIsoDate(new Date());
  const upcoming = meetings
    .filter((m) => m.meetingDate >= today)
    .sort((a, b) => a.meetingDate.localeCompare(b.meetingDate));
  if (upcoming.length > 0) {
    return { meeting: upcoming[0], pendingDate: upcoming[0].meetingDate };
  }
  return { pendingDate: toIsoDate(nextThirdTuesday(new Date())) };
}

function AddUpdate({ item }: { item: Item }) {
  const meetings = useStore((s) => s.meetings);
  const createMeeting = useStore((s) => s.createMeeting);
  const addInterimUpdate = useStore((s) => s.addInterimUpdate);

  const [open, setOpen] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [statusChangeTo, setStatusChangeTo] = useState<ItemStatus | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const target = useMemo(() => resolveTarget(meetings), [meetings]);
  const meetingExists = !!target.meeting;

  if (!open) {
    return (
      <div className="add-update">
        <button onClick={() => setOpen(true)} className="primary">
          Add update
        </button>
      </div>
    );
  }

  const reset = () => {
    setNarrative('');
    setStatusChangeTo('');
    setError(null);
    setOpen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!narrative.trim()) {
      setError('Narrative is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let meetingId = target.meeting?.id;
      if (!meetingId) {
        const confirmed = window.confirm(
          `No future meeting exists. Create ${target.pendingDate} (Regular) and attach this update?`,
        );
        if (!confirmed) {
          setSubmitting(false);
          return;
        }
        const created = await createMeeting({ meetingDate: target.pendingDate });
        meetingId = created.id;
      }
      await addInterimUpdate({
        itemId: item.id,
        meetingId,
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

  return (
    <form className="add-update-form" onSubmit={submit}>
      <div className="form-target">
        {meetingExists ? (
          <>
            Attaching to <strong>{target.meeting!.title}</strong>
          </>
        ) : (
          <>
            No future meeting yet — will create <strong>{target.pendingDate} Regular</strong> on submit
          </>
        )}
      </div>
      <label className="form-field">
        <span>What happened</span>
        <textarea
          rows={4}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder="Elevator phone installed today."
          autoFocus
        />
      </label>
      <label className="form-field">
        <span>Status change (optional)</span>
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
      {error && <p className="form-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save update'}
        </button>
        <button type="button" onClick={reset} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Header({ item }: { item: Item }) {
  return (
    <header className="detail-header">
      <div className="detail-header-row">
        <h1>{item.title}</h1>
        <a href={itemEditHref(item.id)} className="button-link">
          Edit
        </a>
      </div>
      <div className="detail-badges">
        <span className={statusClass(item.status)}>{item.status}</span>
        {item.standing && <span className="badge">Standing</span>}
        {item.tags.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>
    </header>
  );
}

function Facts({ item }: { item: Item }) {
  const rows: Array<[string, React.ReactNode]> = [];
  if (item.assignedTo) rows.push(['Assigned', item.assignedTo]);
  if (item.firstRaisedDate) rows.push(['First raised', item.firstRaisedDate]);
  if (item.defaultSection !== 'Auto') {
    rows.push(['Default section', item.defaultSection]);
  }
  if (item.onHoldReason) rows.push(['On hold', item.onHoldReason]);
  if (item.deferredUntil) rows.push(['Deferred until', item.deferredUntil]);
  if (item.closedDate) rows.push(['Closed', item.closedDate]);
  if (item.closedReason) rows.push(['Closed reason', item.closedReason]);
  if (rows.length === 0) return null;
  return (
    <dl className="facts">
      {rows.map(([k, v]) => (
        <div key={k} className="fact">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function History({ entries }: { entries: MeetingEntry[] }) {
  return (
    <section className="detail-section">
      <h2>
        History <span className="count">({entries.length})</span>
      </h2>
      {entries.length === 0 ? (
        <p className="empty">No prior meeting entries.</p>
      ) : (
        <ol className="timeline">
          {entries.map((entry) => (
            <li key={entry.id} className="timeline-row">
              <div className="timeline-head">
                <span className="timeline-date">{entry.meetingDate}</span>
                <span className="timeline-section">
                  {SECTION_LABEL[entry.section]}
                </span>
                {entry.statusChangeTo && (
                  <span className={statusClass(entry.statusChangeTo)}>
                    → {entry.statusChangeTo}
                  </span>
                )}
              </div>
              {entry.narrative ? (
                <div className="prose">
                  <ReactMarkdown>{entry.narrative}</ReactMarkdown>
                </div>
              ) : (
                <p className="empty">No narrative recorded.</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Decisions({ decisions }: { decisions: Decision[] }) {
  if (decisions.length === 0) return null;
  return (
    <section className="detail-section">
      <h2>
        Decisions <span className="count">({decisions.length})</span>
      </h2>
      <ul className="decisions">
        {decisions.map((d) => (
          <li key={d.id} className="decision-row">
            <div className="decision-head">
              <span className="timeline-date">{d.decisionDate}</span>
              <span className="badge">{d.decisionType}</span>
            </div>
            <div className="decision-summary">{d.summary}</div>
            <div className="decision-meta">
              {d.motionBy && <span>Motion: {d.motionBy}</span>}
              {d.secondBy && <span>Second: {d.secondBy}</span>}
              {d.vote && <span>Vote: {d.vote}</span>}
              {d.amount !== undefined && (
                <span>
                  Amount: $
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
    </section>
  );
}

function Actions({ actions }: { actions: ActionItem[] }) {
  if (actions.length === 0) return null;
  return (
    <section className="detail-section">
      <h2>
        Action items <span className="count">({actions.length})</span>
      </h2>
      <ul className="actions">
        {actions.map((a) => (
          <li key={a.id} className={`action-row action-${a.status.toLowerCase()}`}>
            <div className="action-head">
              <span className="badge">{a.status}</span>
              <span className="action-assignee">{a.assignee}</span>
              {a.dueHint && <span className="action-due">Due: {a.dueHint}</span>}
            </div>
            <div className="action-desc">{a.description}</div>
            {a.completedNote && (
              <div className="action-note">{a.completedNote}</div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
