// Mobile-first Direction B — "Operations Desk"
// iPhone-width agenda, item detail, and add-update sheet.
// Same B palette/system as the desktop direction, adapted for touch.

const MD = window.TT_DATA;

const MB = {
  bg:        '#faf8f5',
  surface:   '#ffffff',
  surface2:  '#f3eee5',
  ink:       '#1d1d1f',
  ink2:      '#4a4742',
  ink3:      '#8a8276',
  hairline:  '#ece6d8',
  hairline2: '#d9d2c4',
  sage:      '#4a6b54',
  sageSoft:  '#e6ede4',
  amber:     '#b87333',
  amberSoft: '#f3e6d4',
  rose:      '#a44a4a',
  roseSoft:  '#f1dcdc',
};

const MBF = '"Inter", -apple-system, "SF Pro Text", system-ui, sans-serif';

// ─── shared bits ────────────────────────────────────────────
function MInitials(name) {
  return String(name).split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function mAvatarBg(name) {
  const palette = [MB.sage, MB.amber, '#4a5d7a', '#7a4a6b', '#6b5a3a', '#3a6a6a'];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return palette[Math.abs(h) % palette.length];
}
function mHex(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${a})`;
}
function mFmt(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function MTopBar({ title, sub, accent, right }) {
  return (
    <div style={{
      padding: '8px 16px 14px',
      background: MB.bg,
      borderBottom: `1px solid ${MB.hairline}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: MB.ink3, fontWeight: 500,
          }}>{sub}</div>
          <h1 style={{
            margin: '2px 0 0', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em',
            color: MB.ink, fontFamily: MBF,
          }}>{title}</h1>
        </div>
        {right}
      </div>
    </div>
  );
}

function MStatChip({ n, label, color, active }) {
  return (
    <div style={{
      flex: '0 0 auto',
      padding: '10px 14px',
      background: active ? mHex(color, 0.12) : MB.surface,
      border: `1px solid ${active ? mHex(color, 0.3) : MB.hairline}`,
      borderRadius: 12,
      minWidth: 88,
    }}>
      <div style={{
        fontSize: 22, fontWeight: 700, color: color,
        letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
      }}>{n}</div>
      <div style={{
        fontSize: 11, color: MB.ink2, marginTop: 4, fontWeight: 500,
      }}>{label}</div>
    </div>
  );
}

function MTag({ t }) {
  return (
    <span style={{
      fontSize: 10.5, padding: '2px 7px', borderRadius: 999,
      background: mHex(MD.tagColors[t] || MB.ink3, 0.10),
      color: MD.tagColors[t] || MB.ink3,
      fontWeight: 600, letterSpacing: '0.01em',
    }}>{t}</span>
  );
}

function MFlag({ flag }) {
  if (flag === 'urgent') {
    return <span style={{
      fontSize: 9.5, padding: '2px 6px', borderRadius: 4,
      background: MB.roseSoft, color: MB.rose, fontWeight: 700,
      letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>Urgent</span>;
  }
  if (flag === 'dispute') {
    return <span style={{
      fontSize: 9.5, padding: '2px 6px', borderRadius: 4,
      background: MB.amberSoft, color: MB.amber, fontWeight: 700,
      letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>Dispute</span>;
  }
  return null;
}

// ─── Screen 1: Agenda ────────────────────────────────────────
function MAgenda({ accent = MB.sage, density = 'comfortable', onOpenItem }) {
  const [tab, setTab] = React.useState('all'); // all|updates|old|new|tabled
  const sections = [
    { key: 'updates', title: 'Updates',      sub: 'Standing reports',  items: MD.agenda.updates,     dot: accent },
    { key: 'old',     title: 'Old business', sub: 'Carried forward',   items: MD.agenda.oldBusiness, dot: MB.amber },
    { key: 'new',     title: 'New business', sub: 'Raised Apr 21',     items: MD.agenda.newBusiness, dot: MB.rose },
    { key: 'tabled',  title: 'Tabled',       sub: 'On hold',           items: MD.agenda.tabled,      dot: MB.ink3, muted: true },
  ];
  const visible = tab === 'all' ? sections : sections.filter(s => s.key === tab);
  const padY = density === 'compact' ? 12 : 14;

  return (
    <div style={{
      fontFamily: MBF, color: MB.ink, background: MB.bg,
      minHeight: '100%', display: 'flex', flexDirection: 'column',
    }}>
      <MTopBar
        title="May 19 agenda"
        sub="Tue · 19 May · 7:00 PM · Fellowship Hall"
        accent={accent}
        right={
          <button style={{
            width: 38, height: 38, borderRadius: 999,
            background: accent, color: '#fff', border: 'none',
            fontSize: 22, fontWeight: 400, cursor: 'pointer', lineHeight: 1,
            display: 'grid', placeItems: 'center', paddingBottom: 2,
          }}>+</button>
        }
      />

      {/* horizontal stat strip */}
      <div style={{
        display: 'flex', gap: 8, padding: '14px 16px 6px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        <MStatChip n={MD.agenda.updates.length}     label="Updates"      color={accent}    active={tab === 'all' || tab === 'updates'} />
        <MStatChip n={MD.agenda.oldBusiness.length} label="Old business" color={MB.amber}  active={tab === 'all' || tab === 'old'} />
        <MStatChip n={MD.agenda.newBusiness.length} label="New business" color={MB.rose}   active={tab === 'all' || tab === 'new'} />
        <MStatChip n={MD.agenda.tabled.length}      label="Tabled"       color={MB.ink3}   active={tab === 'all' || tab === 'tabled'} />
      </div>

      {/* filter tabs */}
      <div style={{
        display: 'flex', gap: 6, padding: '8px 16px 4px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {[
          { k: 'all',     l: 'All' },
          { k: 'updates', l: 'Updates' },
          { k: 'old',     l: 'Old' },
          { k: 'new',     l: 'New' },
          { k: 'tabled',  l: 'Tabled' },
        ].map(({ k, l }) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: '0 0 auto', padding: '6px 12px', borderRadius: 999,
            background: tab === k ? MB.ink : MB.surface,
            color: tab === k ? '#fff' : MB.ink2,
            border: `1px solid ${tab === k ? MB.ink : MB.hairline2}`,
            fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
            fontFamily: MBF,
          }}>{l}</button>
        ))}
      </div>

      <div style={{ flex: 1, padding: '8px 16px 100px', overflow: 'auto' }}>
        {visible.map(s => (
          <section key={s.key} style={{ marginTop: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 8px',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.dot }} />
              <h2 style={{
                margin: 0, fontSize: 12, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>{s.title}</h2>
              <span style={{ fontSize: 12, color: MB.ink3 }}>{s.items.length}</span>
            </div>
            <div style={{
              background: MB.surface, border: `1px solid ${MB.hairline}`,
              borderRadius: 14, overflow: 'hidden',
            }}>
              {s.items.map((it, i) => (
                <MAgendaRow
                  key={it.id} item={it}
                  isLast={i === s.items.length - 1}
                  muted={s.muted}
                  accent={accent}
                  padY={padY}
                  onTap={onOpenItem}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* bottom tab bar */}
      <MTabBar active="agenda" accent={accent} />
    </div>
  );
}

function MAgendaRow({ item, isLast, muted, accent, padY, onTap }) {
  return (
    <div
      onClick={() => onTap && onTap(item)}
      style={{
        padding: `${padY}px 14px`,
        borderBottom: isLast ? 'none' : `1px solid ${MB.hairline}`,
        opacity: muted ? 0.78 : 1,
        cursor: 'pointer',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
      <Avatars names={item.assigned} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: 14.5, fontWeight: 600, color: MB.ink,
            letterSpacing: '-0.005em', lineHeight: 1.3, textWrap: 'pretty',
          }}>{item.title}</span>
          <MFlag flag={item.flag} />
        </div>
        {item.note && (
          <div style={{
            fontSize: 12.5, color: MB.ink2, marginTop: 4, lineHeight: 1.45,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>{item.note}</div>
        )}
        {item.onHold && (
          <div style={{
            fontSize: 11.5, color: MB.amber, marginTop: 5,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: MB.amber }} />
            On hold — {item.onHold}
          </div>
        )}
        <div style={{
          display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap', alignItems: 'center',
        }}>
          {item.tags.slice(0, 3).map(t => <MTag key={t} t={t} />)}
          {item.money && (
            <span style={{
              fontSize: 11, color: accent, fontWeight: 600,
              padding: '2px 6px', background: mHex(accent, 0.1), borderRadius: 999,
            }}>${item.money.toLocaleString()}</span>
          )}
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: MB.ink3, whiteSpace: 'nowrap' }}>
            {item.lastDiscussed ? mFmt(item.lastDiscussed) : item.firstRaised ? `raised ${mFmt(item.firstRaised)}` : ''}
            {item.actions > 0 && <> · {item.actions}↻</>}
          </span>
        </div>
      </div>
    </div>
  );
}

function Avatars({ names }) {
  const list = String(names || '').split(/,\s*/).filter(Boolean).slice(0, 2);
  return (
    <div style={{ display: 'flex', flexShrink: 0, paddingTop: 1 }}>
      {list.map((n, i) => (
        <span key={i} style={{
          width: 28, height: 28, borderRadius: 999, marginLeft: i ? -8 : 0,
          background: mAvatarBg(n), color: '#fff', fontSize: 11, fontWeight: 700,
          display: 'grid', placeItems: 'center', border: `2px solid ${MB.surface}`,
        }}>{MInitials(n)}</span>
      ))}
    </div>
  );
}

function MTabBar({ active, accent }) {
  const items = [
    { k: 'agenda',  l: 'Agenda',  i: '☰' },
    { k: 'items',   l: 'Items',   i: '◧' },
    { k: 'actions', l: 'Actions', i: '✓' },
    { k: 'people',  l: 'People',  i: '⌬' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderTop: `1px solid ${MB.hairline}`,
      padding: '8px 8px 26px',
      display: 'flex', justifyContent: 'space-around',
    }}>
      {items.map(it => (
        <button key={it.k} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 12px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 2,
          color: active === it.k ? accent : MB.ink3,
          fontFamily: MBF,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{it.i}</span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.03em' }}>{it.l}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Screen 2: Item Detail ──────────────────────────────────
function MItemDetail({ item, accent = MB.sage, onBack }) {
  item = item || MD.agenda.oldBusiness.find(x => x.id === 'kmac') || MD.agenda.oldBusiness[0];
  return (
    <div style={{
      fontFamily: MBF, color: MB.ink, background: MB.bg,
      minHeight: '100%', display: 'flex', flexDirection: 'column',
    }}>
      {/* nav */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '6px 8px',
        borderBottom: `1px solid ${MB.hairline}`,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px',
          color: accent, fontSize: 15, fontWeight: 500, fontFamily: MBF,
        }}>‹ Agenda</button>
        <span style={{ flex: 1 }} />
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px',
          color: accent, fontSize: 15, fontWeight: 500, fontFamily: MBF,
        }}>Edit</button>
      </div>

      <div style={{ padding: '16px 18px 100px', overflow: 'auto', flex: 1 }}>
        {/* title + status */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
            <span style={{
              fontSize: 10.5, padding: '3px 8px', borderRadius: 4,
              background: MB.sageSoft, color: MB.sage, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>Open · Old business</span>
            <MFlag flag={item.flag} />
          </div>
          <h1 style={{
            margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.022em',
            lineHeight: 1.15, textWrap: 'pretty',
          }}>{item.title}</h1>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10,
          }}>
            {item.tags.map(t => <MTag key={t} t={t} />)}
          </div>
        </div>

        {/* facts card */}
        <div style={{
          background: MB.surface, border: `1px solid ${MB.hairline}`,
          borderRadius: 14, padding: '4px 0', marginBottom: 18,
        }}>
          <Fact k="Assigned" v={item.assigned} />
          <Fact k="First raised" v={mFmt(item.firstRaised)} />
          {item.lastDiscussed && <Fact k="Last discussed" v={mFmt(item.lastDiscussed)} />}
          {item.money && <Fact k="Amount" v={`$${item.money.toLocaleString()}`} accent={MB.amber} />}
          {item.onHold && <Fact k="On hold" v={item.onHold} />}
        </div>

        {/* primary action */}
        <button style={{
          width: '100%', padding: '14px', borderRadius: 12, border: 'none',
          background: accent, color: '#fff', fontSize: 15, fontWeight: 600,
          fontFamily: MBF, cursor: 'pointer', marginBottom: 22,
          letterSpacing: '-0.005em',
        }}>+ Add update for May 19 meeting</button>

        {/* timeline */}
        <h2 style={{
          margin: '0 0 10px', fontSize: 12, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', color: MB.ink3,
        }}>History</h2>
        <Timeline accent={accent} item={item} />

        {/* action items */}
        <h2 style={{
          margin: '24px 0 10px', fontSize: 12, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', color: MB.ink3,
        }}>Action items · 1 open</h2>
        <div style={{
          background: MB.surface, border: `1px solid ${MB.hairline}`,
          borderRadius: 14, padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: 6,
            border: `1.5px solid ${MB.hairline2}`,
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: MB.ink }}>
              {item.id === 'kmac' ? 'Bill to prepare itemized change-order request' : 'Follow up before next meeting'}
            </div>
            <div style={{ fontSize: 11.5, color: MB.ink3, marginTop: 2 }}>
              Assigned to Bill Camp · due before May 19
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({ k, v, accent }) {
  return (
    <div style={{
      display: 'flex', padding: '10px 14px',
      borderTop: `1px solid ${MB.hairline}`,
      fontSize: 13.5,
    }}>
      <span style={{
        color: MB.ink3, fontWeight: 500, minWidth: 110, flexShrink: 0,
      }}>{k}</span>
      <span style={{
        color: accent || MB.ink, fontWeight: accent ? 600 : 400, flex: 1, textAlign: 'right',
      }}>{v}</span>
    </div>
  );
}

function Timeline({ accent, item }) {
  // Simulated history per item
  const entries = item.id === 'kmac' ? [
    { date: '2026-04-21', section: 'Old', text: 'Bill reported balance ~$7K remains in dispute. Requested itemized change-order descriptions from K-Mac. Offered split-the-difference.' },
    { date: '2026-03-17', section: 'Old', text: 'K-Mac resubmitted at $19K; paid $12K; ~$7K still contested. Glen did initial work without invoicing.' },
    { date: '2026-02-17', section: 'Old', text: 'Original invoice ~$22K from K-Mac. Bill to review.' },
    { date: '2026-01-20', section: 'New', text: 'Item raised: K-Mac electrical invoice discrepancy.', status: 'Open' },
  ] : [
    { date: '2026-04-21', section: 'Old', text: 'No material update; carry forward.' },
    { date: '2026-03-17', section: 'Old', text: 'Initial conversation with vendor / men’s group.' },
  ];

  return (
    <div style={{ position: 'relative', paddingLeft: 18 }}>
      <div style={{
        position: 'absolute', left: 5, top: 6, bottom: 6, width: 2,
        background: MB.hairline,
      }} />
      {entries.map((e, i) => (
        <div key={i} style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{
            position: 'absolute', left: -18, top: 4,
            width: 12, height: 12, borderRadius: 999,
            background: i === 0 ? accent : MB.surface,
            border: `2px solid ${i === 0 ? accent : MB.hairline2}`,
          }} />
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: MB.ink, whiteSpace: 'nowrap' }}>{mFmt(e.date)}</span>
            <span style={{
              fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: MB.ink3, background: MB.surface2, padding: '1px 6px', borderRadius: 3, fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>{e.section} business</span>
            {e.status && <span style={{
              fontSize: 9.5, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: MB.sage, background: MB.sageSoft, padding: '1px 6px', borderRadius: 3, fontWeight: 700,
              whiteSpace: 'nowrap',
            }}>→ {e.status}</span>}
          </div>
          <div style={{
            fontSize: 13, color: MB.ink2, marginTop: 4, lineHeight: 1.5,
          }}>{e.text}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Screen 3: Add update sheet ─────────────────────────────
function MAddUpdate({ accent = MB.sage, onBack }) {
  const item = MD.agenda.newBusiness.find(x => x.id === 'heat') || MD.agenda.newBusiness[0];
  return (
    <div style={{
      fontFamily: MBF, color: MB.ink,
      background: MB.bg, minHeight: '100%', position: 'relative',
    }}>
      {/* dim backdrop emulating modal */}
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(2px)',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: MB.surface, borderRadius: '20px 20px 0 0',
        padding: '12px 18px 28px',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
        maxHeight: '86%', overflow: 'auto',
      }}>
        <div style={{
          width: 38, height: 4, background: MB.hairline2, borderRadius: 2,
          margin: '4px auto 14px',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: MB.ink3, fontSize: 15, fontFamily: MBF, padding: 0,
          }}>Cancel</button>
          <h2 style={{
            margin: 0, flex: 1, textAlign: 'center', fontSize: 15.5, fontWeight: 700,
          }}>Add update</h2>
          <button style={{
            background: accent, color: '#fff', border: 'none', borderRadius: 999,
            padding: '6px 14px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: MBF,
          }}>Save</button>
        </div>

        <div style={{
          background: MB.surface2, borderRadius: 10, padding: '10px 12px',
          marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: 2, background: MB.rose,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: MB.ink3, fontWeight: 600 }}>
              Attaching to · May 19 (regular)
            </div>
            <div style={{
              fontSize: 13.5, fontWeight: 600, color: MB.ink, marginTop: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{item.title}</div>
          </div>
        </div>

        <Label>What happened</Label>
        <div style={{
          background: MB.surface2, borderRadius: 10, padding: '12px 14px',
          fontSize: 14, color: MB.ink, lineHeight: 1.45, minHeight: 110,
          border: `1px solid ${MB.hairline}`, marginBottom: 14,
        }}>
          Boiler is drained and offline. Karl will isolate the 3rd-floor return loop before next winter; space heaters available as winter backup if needed. Will fold into HVAC replacement project under Harness fundraising.
          <span style={{
            display: 'inline-block', width: 2, height: 16, background: accent,
            verticalAlign: 'text-bottom', marginLeft: 2, animation: 'mb-caret 1s steps(2) infinite',
          }} />
        </div>

        <Label>Status change</Label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {['No change', 'Open', 'Tabled', 'Closed', 'Declined'].map((s, i) => (
            <button key={s} style={{
              flex: 1, padding: '9px 0', borderRadius: 8,
              background: i === 0 ? MB.ink : MB.surface,
              color: i === 0 ? '#fff' : MB.ink2,
              border: `1px solid ${i === 0 ? MB.ink : MB.hairline2}`,
              fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: MBF,
            }}>{s}</button>
          ))}
        </div>

        <Label>Add action item <span style={{ color: MB.ink3, fontWeight: 400 }}>(optional)</span></Label>
        <button style={{
          width: '100%', padding: '12px 14px', borderRadius: 10,
          background: MB.surface2, border: `1px dashed ${MB.hairline2}`,
          color: MB.ink3, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          textAlign: 'left', fontFamily: MBF,
        }}>+ Assign to someone…</button>
      </div>
      <style>{`@keyframes mb-caret { to { opacity: 0; } }`}</style>
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: MB.ink3, marginBottom: 6, fontWeight: 700,
    }}>{children}</div>
  );
}

Object.assign(window, { MAgenda, MItemDetail, MAddUpdate });
