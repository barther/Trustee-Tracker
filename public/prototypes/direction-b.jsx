// Direction B — "Operations Desk"
// Modern utility tool, warm. Inter + sage accent. Tag color-coding,
// status pills, assignee chips, left-rail meeting nav, card grid.

const DB = window.TT_DATA;

const B_COLORS = {
  bg:        '#faf8f5',
  surface:   '#ffffff',
  surface2:  '#f3eee5',
  rail:      '#262320',
  railText:  '#d9d2c4',
  railMuted: '#8a8276',
  ink:       '#1d1d1f',
  ink2:      '#4a4742',
  ink3:      '#8a8276',
  hairline:  '#e8e2d4',
  hairline2: '#d9d2c4',
  sage:      '#4a6b54',
  sageSoft:  '#e6ede4',
  amber:     '#b87333',
  amberSoft: '#f3e6d4',
  rose:      '#a44a4a',
  roseSoft:  '#f1dcdc',
};

const B_FONT = '"Inter", "Helvetica Neue", Arial, sans-serif';

function BOperations({ density = 'comfortable', accent = B_COLORS.sage }) {
  const sections = [
    { key: 'updates',     title: 'Updates',      sub: 'Standing reports',     items: DB.agenda.updates,     dotColor: accent },
    { key: 'old',         title: 'Old Business', sub: 'Carried forward',      items: DB.agenda.oldBusiness, dotColor: B_COLORS.amber },
    { key: 'new',         title: 'New Business', sub: 'Raised Apr 21',        items: DB.agenda.newBusiness, dotColor: B_COLORS.rose },
    { key: 'tabled',      title: 'Tabled',       sub: 'On hold',              items: DB.agenda.tabled,      dotColor: B_COLORS.ink3, tabled: true },
  ];

  const rowGap = density === 'compact' ? 8 : 12;
  const rowPadY = density === 'compact' ? 12 : 16;

  return (
    <div style={{
      fontFamily: B_FONT, color: B_COLORS.ink,
      background: B_COLORS.bg, minHeight: '100%',
      display: 'grid', gridTemplateColumns: '220px 1fr',
    }}>
      {/* LEFT RAIL */}
      <aside style={{
        background: B_COLORS.rail, color: B_COLORS.railText,
        padding: '24px 18px', position: 'sticky', top: 0,
        minHeight: '100%',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9, marginBottom: 28,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6, background: accent,
            display: 'grid', placeItems: 'center',
            fontWeight: 700, fontSize: 13, color: '#fff',
          }}>LS</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Trustees</div>
            <div style={{ fontSize: 10.5, color: B_COLORS.railMuted, letterSpacing: '0.04em' }}>Lithia Springs UMC</div>
          </div>
        </div>

        <RailLabel>Meeting</RailLabel>
        <RailItem active>Agenda · May 19</RailItem>
        <RailItem>Apr 21 — recorded</RailItem>
        <RailItem>Mar 17 — recorded</RailItem>
        <RailItem muted>+ 4 earlier</RailItem>

        <RailLabel style={{ marginTop: 22 }}>Workspace</RailLabel>
        <RailItem>Items <Pill>{DB.openItemsCount}</Pill></RailItem>
        <RailItem>Action items <Pill>{DB.openActions}</Pill></RailItem>
        <RailItem>Decisions <Pill subtle>56</Pill></RailItem>
        <RailItem>Vendors <Pill subtle>11</Pill></RailItem>

        <div style={{
          marginTop: 'auto', position: 'absolute', bottom: 22, left: 18, right: 18,
          padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.05)',
          fontSize: 11, color: B_COLORS.railMuted, lineHeight: 1.5,
        }}>
          <div style={{ color: '#fff', fontWeight: 600, marginBottom: 3 }}>8 days to meeting</div>
          Open/close this Sun · <span style={{ color: '#fff' }}>Bill Camp</span>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ padding: '28px 36px 48px', minWidth: 0 }}>
        {/* Header strip */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          marginBottom: 22, gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{
              fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: B_COLORS.ink3, marginBottom: 4,
            }}>
              Tuesday 19 May 2026 · Regular meeting
            </div>
            <h1 style={{
              margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.018em',
            }}>
              Auto-generated agenda
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <BtnGhost>Print agenda</BtnGhost>
            <BtnGhost>Export PDF</BtnGhost>
            <BtnPrimary accent={accent}>+ New item</BtnPrimary>
          </div>
        </div>

        {/* Stat strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22,
        }}>
          <Stat label="Updates"      n={DB.agenda.updates.length}      accent={accent} />
          <Stat label="Old business" n={DB.agenda.oldBusiness.length}  accent={B_COLORS.amber} />
          <Stat label="New business" n={DB.agenda.newBusiness.length}  accent={B_COLORS.rose} />
          <Stat label="Tabled"       n={DB.agenda.tabled.length}       accent={B_COLORS.ink3} muted />
        </div>

        {sections.map(s => (
          <section key={s.key} style={{ marginBottom: 26 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: 2, background: s.dotColor,
              }} />
              <h2 style={{
                margin: 0, fontSize: 13, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {s.title}
              </h2>
              <span style={{
                fontSize: 12, color: B_COLORS.ink3,
              }}>
                {s.items.length} · {s.sub}
              </span>
            </div>

            <div style={{
              background: B_COLORS.surface,
              border: `1px solid ${B_COLORS.hairline}`,
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              {s.items.map((it, i) => (
                <BRow
                  key={it.id}
                  item={it}
                  tabled={s.tabled}
                  accent={accent}
                  isLast={i === s.items.length - 1}
                  padY={rowPadY}
                  gap={rowGap}
                />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function RailLabel({ children, style }) {
  return (
    <div style={{
      fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
      color: B_COLORS.railMuted, marginBottom: 6, ...style,
    }}>{children}</div>
  );
}
function RailItem({ children, active, muted }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 10px', borderRadius: 6,
      background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
      color: active ? '#fff' : (muted ? B_COLORS.railMuted : B_COLORS.railText),
      fontSize: 13, marginBottom: 2, cursor: 'pointer',
      fontWeight: active ? 500 : 400,
    }}>{children}</div>
  );
}
function Pill({ children, subtle }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 7px', borderRadius: 999,
      background: subtle ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.14)',
      color: subtle ? B_COLORS.railMuted : '#fff',
      fontWeight: 500,
    }}>{children}</span>
  );
}

function BtnGhost({ children }) {
  return (
    <button style={{
      font: 'inherit', fontSize: 13, padding: '8px 14px',
      background: B_COLORS.surface, color: B_COLORS.ink,
      border: `1px solid ${B_COLORS.hairline2}`, borderRadius: 7, cursor: 'pointer',
    }}>{children}</button>
  );
}
function BtnPrimary({ children, accent }) {
  return (
    <button style={{
      font: 'inherit', fontSize: 13, padding: '8px 14px',
      background: accent, color: '#fff', fontWeight: 500,
      border: 'none', borderRadius: 7, cursor: 'pointer',
    }}>{children}</button>
  );
}

function Stat({ label, n, accent, muted }) {
  return (
    <div style={{
      background: B_COLORS.surface, border: `1px solid ${B_COLORS.hairline}`,
      borderRadius: 10, padding: '14px 16px',
      opacity: muted ? 0.78 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{
          fontSize: 28, fontWeight: 600, color: accent, letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}>{n}</span>
        <span style={{ fontSize: 12, color: B_COLORS.ink3 }}>{label}</span>
      </div>
    </div>
  );
}

function BRow({ item, tabled, accent, isLast, padY, gap }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 200px',
      gap: 20, padding: `${padY}px 18px`,
      borderBottom: isLast ? 'none' : `1px solid ${B_COLORS.hairline}`,
      opacity: tabled ? 0.78 : 1,
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 15, fontWeight: 600, color: B_COLORS.ink, letterSpacing: '-0.005em',
          }}>{item.title}</span>
          {item.flag === 'urgent' && <Tag bg={B_COLORS.roseSoft} fg={B_COLORS.rose}>Urgent</Tag>}
          {item.flag === 'dispute' && <Tag bg={B_COLORS.amberSoft} fg={B_COLORS.amber}>Dispute</Tag>}
          {item.money && <Tag bg={B_COLORS.sageSoft} fg={B_COLORS.sage}>${item.money.toLocaleString()}</Tag>}
        </div>
        {item.note && (
          <div style={{
            fontSize: 13, color: B_COLORS.ink2, marginTop: gap === 8 ? 4 : 6,
            lineHeight: 1.5, maxWidth: '70ch',
          }}>{item.note}</div>
        )}
        {item.onHold && (
          <div style={{
            fontSize: 12.5, color: B_COLORS.amber, marginTop: 6,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: B_COLORS.amber }} />
            On hold — {item.onHold}
            {item.deferred && <span style={{ color: B_COLORS.ink3 }}>· revisit {fmtMo(item.deferred)}</span>}
          </div>
        )}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center',
        }}>
          {item.tags.map(t => (
            <span key={t} style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 999,
              background: hexA(DB.tagColors[t], 0.10),
              color: DB.tagColors[t],
              fontWeight: 500,
            }}>{t}</span>
          ))}
          {item.actions > 0 && (
            <span style={{
              fontSize: 11, color: B_COLORS.ink3, marginLeft: 4,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: B_COLORS.ink3 }} />
              {item.actions} action{item.actions > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Assignees names={item.assigned} accent={accent} />
        <div style={{ fontSize: 11, color: B_COLORS.ink3, marginTop: 6 }}>
          {item.lastDiscussed
            ? <>Last <span style={{ color: B_COLORS.ink2, fontWeight: 500 }}>{fmtSh(item.lastDiscussed)}</span></>
            : item.firstRaised
              ? <>Raised <span style={{ color: B_COLORS.ink2, fontWeight: 500 }}>{fmtSh(item.firstRaised)}</span></>
              : null}
        </div>
      </div>
    </div>
  );
}

function Tag({ bg, fg, children }) {
  return (
    <span style={{
      fontSize: 10.5, padding: '2px 7px', borderRadius: 4,
      background: bg, color: fg, fontWeight: 600,
      letterSpacing: '0.04em', textTransform: 'uppercase',
    }}>{children}</span>
  );
}

function Assignees({ names, accent }) {
  const list = String(names || '').split(/,\s*/).filter(Boolean);
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <div style={{ display: 'flex' }}>
        {list.slice(0, 3).map((n, i) => (
          <span key={i} style={{
            width: 22, height: 22, borderRadius: 999, marginLeft: i ? -7 : 0,
            background: avatarBg(n), color: '#fff', fontSize: 9.5, fontWeight: 600,
            display: 'grid', placeItems: 'center', border: `2px solid ${B_COLORS.surface}`,
            letterSpacing: '0.02em',
          }}>{initials(n)}</span>
        ))}
      </div>
      <span style={{ fontSize: 12, color: B_COLORS.ink2, maxWidth: 130, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {list[0]}{list.length > 1 ? ` +${list.length - 1}` : ''}
      </span>
    </div>
  );
}

function initials(name) {
  return String(name).split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function avatarBg(name) {
  const palette = [B_COLORS.sage, B_COLORS.amber, '#4a5d7a', '#7a4a6b', '#6b5a3a', '#3a6a6a'];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return palette[Math.abs(h) % palette.length];
}
function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
function fmtSh(iso) { if (!iso) return ''; const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function fmtMo(iso) { if (!iso) return ''; const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('en-US', { month: 'short' }); }

Object.assign(window, { BOperations });
