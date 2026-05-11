import { useMemo, useState } from 'react';
import { itemHref } from '../routing/hashRoute';
import { useStore } from '../store/useStore';
import type { ActionItem, ActionStatus, Meeting } from '../types';

const STATUS_FILTERS: Array<ActionStatus | 'All'> = ['Open', 'Done', 'Dropped', 'All'];

export function ActionsDashboard() {
  const actions = useStore((s) => s.actionItems);
  const meetings = useStore((s) => s.meetings);

  const [filter, setFilter] = useState<ActionStatus | 'All'>('Open');

  const meetingById = useMemo(() => {
    const m = new Map<string, Meeting>();
    for (const meeting of meetings) m.set(meeting.id, meeting);
    return m;
  }, [meetings]);

  const filtered = useMemo(() => {
    return actions.filter((a) => filter === 'All' || a.status === filter);
  }, [actions, filter]);

  const byAssignee = useMemo(() => {
    const groups = new Map<string, ActionItem[]>();
    for (const a of filtered) {
      const key = a.assignee || '(unassigned)';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
    for (const [, list] of groups) {
      list.sort((x, y) => {
        const xDate = meetingById.get(x.assignedAtMeetingId)?.meetingDate ?? '';
        const yDate = meetingById.get(y.assignedAtMeetingId)?.meetingDate ?? '';
        return xDate.localeCompare(yDate);
      });
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, meetingById]);

  const counts = useMemo(() => {
    const c = { Open: 0, Done: 0, Dropped: 0, All: 0 };
    for (const a of actions) {
      c.All += 1;
      c[a.status] += 1;
    }
    return c;
  }, [actions]);

  return (
    <div className="meetings">
      <header className="agenda-header">
        <h1>Action items</h1>
        <div className="agenda-controls">
          <a href="#" className="back">
            ← Agenda
          </a>
        </div>
      </header>

      <div className="filter-chips">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip ${filter === s ? 'chip-active' : ''}`}
            onClick={() => setFilter(s)}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {byAssignee.length === 0 ? (
        <p className="empty">No action items match this filter.</p>
      ) : (
        byAssignee.map(([assignee, list]) => (
          <section key={assignee} className="agenda-section">
            <h2>
              {assignee} <span className="count">({list.length})</span>
            </h2>
            <ul className="actions">
              {list.map((action) => (
                <ActionCard key={action.id} action={action} showItemLink />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

export function ActionCard({
  action,
  showItemLink = false,
}: {
  action: ActionItem;
  showItemLink?: boolean;
}) {
  const completeActionItem = useStore((s) => s.completeActionItem);
  const dropActionItem = useStore((s) => s.dropActionItem);
  const reopenActionItem = useStore((s) => s.reopenActionItem);
  const meetings = useStore((s) => s.meetings);
  const items = useStore((s) => s.items);

  const assignedAt = meetings.find((m) => m.id === action.assignedAtMeetingId);
  const completedAt = action.completedAtMeetingId
    ? meetings.find((m) => m.id === action.completedAtMeetingId)
    : undefined;
  const itemTitle = items.find((i) => i.id === action.itemId)?.title;

  const [mode, setMode] = useState<'idle' | 'complete' | 'drop'>('idle');
  const [note, setNote] = useState('');
  const [completedAtMeetingId, setCompletedAtMeetingId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setMode('idle');
    setNote('');
    setCompletedAtMeetingId('');
    setError(null);
  };

  const submitComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await completeActionItem({
        actionId: action.id,
        completedAtMeetingId: completedAtMeetingId || undefined,
        completedNote: note,
      });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const submitDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await dropActionItem({ actionId: action.id, completedNote: note });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const reopen = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await reopenActionItem({ actionId: action.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const sortedMeetings = useMemo(
    () => meetings.slice().sort((a, b) => b.meetingDate.localeCompare(a.meetingDate)),
    [meetings],
  );

  return (
    <li className={`action-row action-${action.status.toLowerCase()}`}>
      <div className="action-head">
        <span className="badge">{action.status}</span>
        <span className="action-assignee">{action.assignee}</span>
        {action.dueHint && <span className="action-due">Due: {action.dueHint}</span>}
        {assignedAt && (
          <span className="meta">Assigned {assignedAt.meetingDate}</span>
        )}
      </div>
      <div className="action-desc">{action.description}</div>
      {showItemLink && itemTitle && (
        <div className="action-context">
          Item:{' '}
          <a href={itemHref(action.itemId)} className="row-link" style={{ display: 'inline' }}>
            {itemTitle}
          </a>
        </div>
      )}
      {action.completedNote && (
        <div className="action-note">
          {completedAt && `Completed ${completedAt.meetingDate}: `}
          {action.completedNote}
        </div>
      )}
      {action.status !== 'Open' && !action.completedNote && completedAt && (
        <div className="action-note">Completed {completedAt.meetingDate}</div>
      )}

      {mode === 'idle' && (
        <div className="form-actions">
          {action.status === 'Open' ? (
            <>
              <button type="button" onClick={() => setMode('complete')} disabled={submitting}>
                Mark done
              </button>
              <button type="button" onClick={() => setMode('drop')} disabled={submitting}>
                Drop
              </button>
            </>
          ) : (
            <button type="button" onClick={reopen} disabled={submitting}>
              Reopen
            </button>
          )}
        </div>
      )}

      {mode === 'complete' && (
        <form className="add-update-form" onSubmit={submitComplete}>
          <label className="form-field">
            <span>Completed at meeting (optional)</span>
            <select
              value={completedAtMeetingId}
              onChange={(e) => setCompletedAtMeetingId(e.target.value)}
            >
              <option value="">— Between meetings —</option>
              {sortedMeetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Note (optional)</span>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Mark done'}
            </button>
            <button type="button" onClick={reset} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === 'drop' && (
        <form className="add-update-form" onSubmit={submitDrop}>
          <label className="form-field">
            <span>Reason (optional)</span>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Drop'}
            </button>
            <button type="button" onClick={reset} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
