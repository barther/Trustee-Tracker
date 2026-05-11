import { useMemo, useState } from 'react';
import { avatarBg, initials, shortDate } from '../design/tokens';
import { itemHref } from '../routing/hashRoute';
import { useStore } from '../store/useStore';
import type { ActionItem, ActionStatus, Meeting } from '../types';

const STATUS_FILTERS: Array<{ key: ActionStatus | 'All'; label: string }> = [
  { key: 'Open', label: 'Open' },
  { key: 'Done', label: 'Done' },
  { key: 'Dropped', label: 'Dropped' },
  { key: 'All', label: 'All' },
];

export function ActionsDashboard() {
  const actions = useStore((s) => s.actionItems);
  const meetings = useStore((s) => s.meetings);

  const [filter, setFilter] = useState<ActionStatus | 'All'>('Open');

  const meetingById = useMemo(() => {
    const m = new Map<string, Meeting>();
    for (const meeting of meetings) m.set(meeting.id, meeting);
    return m;
  }, [meetings]);

  const filtered = useMemo(
    () => actions.filter((a) => filter === 'All' || a.status === filter),
    [actions, filter],
  );

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
    <main className="page">
      <header className="page-header">
        <div>
          <div className="eyebrow">Between meetings</div>
          <h1>Action items</h1>
        </div>
      </header>

      <div className="chip-row">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label} <span style={{ opacity: 0.7 }}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {byAssignee.length === 0 ? (
        <p className="empty">No action items match this filter.</p>
      ) : (
        byAssignee.map(([assignee, list]) => (
          <section key={assignee} className="section">
            <div className="section-head">
              <span
                className="avatar"
                style={{
                  width: 24,
                  height: 24,
                  background: avatarBg(assignee),
                  border: 'none',
                  fontSize: 10,
                }}
              >
                {initials(assignee)}
              </span>
              <h2 style={{ textTransform: 'none', letterSpacing: 0, fontSize: 14 }}>
                {assignee}
              </h2>
              <span className="count">{list.length}</span>
            </div>
            <ul className="action-list">
              {list.map((action) => (
                <ActionCard key={action.id} action={action} showItemLink />
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
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

  const checkboxGlyph =
    action.status === 'Done' ? '✓' : action.status === 'Dropped' ? '—' : '';

  return (
    <li className={`action-card ${action.status.toLowerCase()}`}>
      <span className="action-checkbox">{checkboxGlyph}</span>
      <div className="action-body">
        <div className="action-top-line">
          <span className="action-assignee">{action.assignee}</span>
          {action.dueHint && <span>· due {action.dueHint}</span>}
          {assignedAt && <span>· assigned {shortDate(assignedAt.meetingDate)}</span>}
        </div>
        <div className="action-desc">{action.description}</div>
        {showItemLink && itemTitle && (
          <div className="action-meta">
            <a href={itemHref(action.itemId)}>{itemTitle}</a>
          </div>
        )}
        {action.completedNote && (
          <div className="action-note">
            {completedAt && (
              <strong>Completed {shortDate(completedAt.meetingDate)}: </strong>
            )}
            {action.completedNote}
          </div>
        )}
        {action.status !== 'Open' && !action.completedNote && completedAt && (
          <div className="action-meta">
            Completed {shortDate(completedAt.meetingDate)}
          </div>
        )}

        {mode === 'idle' && (
          <div className="action-row-actions">
            {action.status === 'Open' ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setMode('complete')}
                  disabled={submitting}
                >
                  Mark done
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setMode('drop')}
                  disabled={submitting}
                >
                  Drop
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={reopen}
                disabled={submitting}
              >
                Reopen
              </button>
            )}
          </div>
        )}

        {mode === 'complete' && (
          <form className="form" onSubmit={submitComplete} style={{ marginTop: 10 }}>
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
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Mark done'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={reset} disabled={submitting}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {mode === 'drop' && (
          <form className="form" onSubmit={submitDrop} style={{ marginTop: 10 }}>
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
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Drop'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={reset} disabled={submitting}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </li>
  );
}
