import { useMemo, useState } from 'react';
import { generateAgenda, type Agenda, type AgendaEntry } from '../agenda/generator';
import { nextThirdTuesday, toIsoDate } from '../agenda/nextMeeting';
import { useStore } from '../store/useStore';

interface SectionProps {
  title: string;
  entries: AgendaEntry[];
  emptyHint: string;
}

function Section({ title, entries, emptyHint }: SectionProps) {
  return (
    <section className="agenda-section">
      <h2>
        {title} <span className="count">({entries.length})</span>
      </h2>
      {entries.length === 0 ? (
        <p className="empty">{emptyHint}</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={entry.item.id} className="agenda-row">
              <div className="row-head">
                <span className="title">{entry.item.title}</span>
                {entry.item.assignedTo && (
                  <span className="assigned">{entry.item.assignedTo}</span>
                )}
              </div>
              <div className="row-meta">
                {entry.item.tags.length > 0 && (
                  <span className="tags">
                    {entry.item.tags.map((t) => (
                      <span key={t} className="tag">
                        {t}
                      </span>
                    ))}
                  </span>
                )}
                {entry.lastDiscussedDate ? (
                  <span className="last">Last: {entry.lastDiscussedDate}</span>
                ) : entry.item.firstRaisedDate ? (
                  <span className="last">Raised: {entry.item.firstRaisedDate}</span>
                ) : null}
                {entry.item.onHoldReason && (
                  <span className="hold">On hold: {entry.item.onHoldReason}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AgendaView() {
  const [targetDate, setTargetDate] = useState<string>(() =>
    toIsoDate(nextThirdTuesday(new Date())),
  );
  const items = useStore((s) => s.items);
  const meetingEntries = useStore((s) => s.meetingEntries);

  const agenda: Agenda = useMemo(
    () => generateAgenda(items, meetingEntries, targetDate),
    [items, meetingEntries, targetDate],
  );

  return (
    <div className="agenda">
      <header className="agenda-header">
        <h1>Trustees Agenda</h1>
        <label>
          Meeting date{' '}
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </label>
      </header>
      <Section title="Updates" entries={agenda.updates} emptyHint="No standing updates." />
      <Section
        title="Old Business"
        entries={agenda.oldBusiness}
        emptyHint="Nothing carried forward."
      />
      <Section
        title="New Business"
        entries={agenda.newBusiness}
        emptyHint="No new items raised."
      />
      <Section
        title="Tabled"
        entries={agenda.tabled}
        emptyHint="No tabled items."
      />
    </div>
  );
}
