import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import type { Decision, DecisionType } from '../types';
import { DecisionCard } from './ActionsDashboard';

const ALL_TYPES: DecisionType[] = ['Approval', 'Denial', 'Authorization', 'Procedural'];

export function DecisionLog() {
  const decisions = useStore((s) => s.decisions);

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<Set<DecisionType>>(() => new Set());
  const [minAmount, setMinAmount] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const counts = useMemo(() => {
    const c: Record<DecisionType, number> = {
      Approval: 0,
      Denial: 0,
      Authorization: 0,
      Procedural: 0,
    };
    for (const d of decisions) c[d.decisionType] += 1;
    return c;
  }, [decisions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minAmount.trim() ? Number.parseFloat(minAmount.replace(/[^0-9.]/g, '')) : null;
    return decisions
      .filter((d) => typeFilter.size === 0 || typeFilter.has(d.decisionType))
      .filter((d) => !from || d.decisionDate >= from)
      .filter((d) => !to || d.decisionDate <= to)
      .filter((d) => {
        if (min === null || Number.isNaN(min)) return true;
        return typeof d.amount === 'number' && d.amount >= min;
      })
      .filter((d) => {
        if (!q) return true;
        return [d.summary, d.vendor, d.motionBy, d.secondBy]
          .some((s) => s?.toLowerCase().includes(q));
      })
      .sort((a, b) => b.decisionDate.localeCompare(a.decisionDate));
  }, [decisions, typeFilter, minAmount, from, to, query]);

  const toggleType = (t: DecisionType) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const clearAll = () => {
    setQuery('');
    setTypeFilter(new Set());
    setMinAmount('');
    setFrom('');
    setTo('');
  };

  const hasFilter =
    !!query || typeFilter.size > 0 || !!minAmount || !!from || !!to;

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <div className="eyebrow">Motions on the record</div>
          <h1>Decision log</h1>
        </div>
      </header>

      <input
        type="search"
        placeholder="Search summary, vendor, motion, second…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          font: 'inherit',
          fontSize: 14,
          padding: '10px 12px',
          border: '1px solid var(--hairline-2)',
          borderRadius: 10,
          background: 'var(--surface)',
          color: 'var(--ink)',
          marginBottom: 12,
        }}
      />

      <div className="chip-row">
        {ALL_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={`chip ${typeFilter.has(t) ? 'active' : ''}`}
            onClick={() => toggleType(t)}
          >
            {t} <span style={{ opacity: 0.7 }}>{counts[t]}</span>
          </button>
        ))}
      </div>

      <div className="form-row" style={{ marginBottom: 12 }}>
        <label className="form-field">
          <span>From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="form-field">
          <span>To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>

      <label
        className="form-field"
        style={{ marginBottom: 14 }}
      >
        <span>Min amount</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="e.g. 1000"
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
        />
      </label>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <span className="meta">
          {filtered.length} {filtered.length === 1 ? 'decision' : 'decisions'}
          {decisions.length === 0 && ' yet'}
        </span>
        {hasFilter && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={clearAll}
            style={{ marginLeft: 'auto' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {decisions.length === 0 ? (
        <p className="empty">
          No decisions recorded yet. Motions you record at meetings will appear here.
        </p>
      ) : filtered.length === 0 ? (
        <p className="empty">No decisions match these filters.</p>
      ) : (
        <ul className="action-list">
          {filtered.map((decision: Decision) => (
            <DecisionCard key={decision.id} decision={decision} showItemLink />
          ))}
        </ul>
      )}
    </main>
  );
}
