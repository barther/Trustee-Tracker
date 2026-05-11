import { useMemo, useState } from 'react';
import { nextThirdTuesday, toIsoDate } from '../agenda/nextMeeting';
import { meetingHref } from '../routing/hashRoute';
import { useStore, type MeetingDraft } from '../store/useStore';
import type { Meeting, MeetingType } from '../types';

const MEETING_TYPES: MeetingType[] = ['Regular', 'Special'];

function emptyDraft(): MeetingDraft {
  return {
    meetingDate: toIsoDate(nextThirdTuesday(new Date())),
    meetingType: 'Regular',
    titleSuffix: '',
  };
}

function entryCountFor(meetingId: string, entries: { meetingId: string }[]): number {
  return entries.filter((e) => e.meetingId === meetingId).length;
}

export function MeetingsList() {
  const meetings = useStore((s) => s.meetings);
  const meetingEntries = useStore((s) => s.meetingEntries);
  const createMeetingFromDraft = useStore((s) => s.createMeetingFromDraft);

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<MeetingDraft>(emptyDraft);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => meetings.slice().sort((a, b) => b.meetingDate.localeCompare(a.meetingDate)),
    [meetings],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.meetingDate) {
      setError('Meeting date is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await createMeetingFromDraft(draft);
      window.location.hash = meetingHref(created.id).slice(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="meetings">
      <header className="agenda-header">
        <h1>Meetings</h1>
        <div className="agenda-controls">
          <a href="#" className="back">
            ← Agenda
          </a>
          <button className="primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ New meeting'}
          </button>
        </div>
      </header>

      {showForm && (
        <form className="add-update-form" onSubmit={submit}>
          <div className="form-row">
            <label className="form-field">
              <span>Date</span>
              <input
                type="date"
                value={draft.meetingDate}
                onChange={(e) => setDraft({ ...draft, meetingDate: e.target.value })}
                autoFocus
              />
            </label>
            <label className="form-field">
              <span>Type</span>
              <select
                value={draft.meetingType}
                onChange={(e) =>
                  setDraft({ ...draft, meetingType: e.target.value as MeetingType })
                }
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
            <span>Title suffix (optional)</span>
            <input
              type="text"
              value={draft.titleSuffix ?? ''}
              onChange={(e) => setDraft({ ...draft, titleSuffix: e.target.value })}
              placeholder="Budget"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create meeting'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setDraft(emptyDraft());
                setError(null);
              }}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <p className="empty">No meetings yet.</p>
      ) : (
        <ul className="meeting-list">
          {sorted.map((m) => (
            <MeetingRow key={m.id} meeting={m} entryCount={entryCountFor(m.id, meetingEntries)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function MeetingRow({ meeting, entryCount }: { meeting: Meeting; entryCount: number }) {
  return (
    <li className="agenda-row">
      <a href={meetingHref(meeting.id)} className="row-link">
        <div className="row-head">
          <span className="title">{meeting.title}</span>
          <span className="assigned">{meeting.meetingType}</span>
        </div>
        <div className="row-meta">
          <span className="last">{meeting.meetingDate}</span>
          <span className="last">
            {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
          </span>
          {meeting.location && <span className="last">{meeting.location}</span>}
        </div>
      </a>
    </li>
  );
}
