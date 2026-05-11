import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useStore } from '../store/useStore';
import type {
  ActionItem,
  Decision,
  EntrySection,
  Item,
  ItemStatus,
  MeetingEntry,
} from '../types';

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

      {item.notes && (
        <section className="detail-section">
          <h2>Notes</h2>
          <div className="prose">
            <ReactMarkdown>{item.notes}</ReactMarkdown>
          </div>
        </section>
      )}

      <History entries={entries} />
      <Decisions decisions={decisions} />
      <Actions actions={actions} />
    </div>
  );
}

function Header({ item }: { item: Item }) {
  return (
    <header className="detail-header">
      <h1>{item.title}</h1>
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
