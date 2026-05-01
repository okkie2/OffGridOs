// Panel.jsx — OffGridOS panel, card, section head, summary card components

function Panel({ children, style }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e6ee',
      padding: '24px', borderRadius: '10px',
      fontFamily: 'Inter, Segoe UI, sans-serif',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionHead({ title, action }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      gap: '16px', alignItems: 'baseline', marginBottom: '12px',
    }}>
      <h2 style={{
        margin: 0, fontFamily: 'Inter, Segoe UI, sans-serif',
        fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: '#5a6a7a',
      }}>{title}</h2>
      {action}
    </div>
  );
}

function SummaryCard({ label, value, detail, tone }) {
  const toneColors = {
    good:   '#007255',
    ok:     '#7a4e00',
    warn:   '#e07b20',
    cool:   '#3b7dd8',
    danger: '#c0392b',
    muted:  '#5a6a7a',
  };

  return (
    <article style={{
      background: '#f0f2f6', padding: '14px 16px',
      borderRadius: '8px', fontFamily: 'Inter, Segoe UI, sans-serif',
    }}>
      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#5a6a7a', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '1.3rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        color: tone ? toneColors[tone] : '#0f1623',
      }}>
        {value}
      </div>
      {detail && <div style={{ marginTop: '4px', color: '#5a6a7a', fontSize: '0.82rem' }}>{detail}</div>}
    </article>
  );
}

function HeroStrip({ children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(130px, 1fr))`,
      gap: '12px', marginTop: '16px',
    }}>
      {children}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{
      padding: '16px', border: '1px dashed #e2e6ee',
      background: '#f0f2f6', color: '#5a6a7a',
      borderRadius: '10px', fontSize: '0.84rem',
      fontFamily: 'Inter, Segoe UI, sans-serif',
    }}>
      {message}
    </div>
  );
}

function Btn({ children, variant = 'secondary', size = 'sm', block, onClick, disabled }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    minHeight: size === 'sm' ? '32px' : '38px',
    padding: size === 'sm' ? '7px 12px' : '10px 14px',
    border: '1px solid #e2e6ee',
    background: '#f0f2f6', color: '#0f1623',
    fontFamily: 'Inter, Segoe UI, sans-serif',
    fontSize: size === 'sm' ? '0.78rem' : '0.88rem',
    fontWeight: 600, borderRadius: '8px', cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
    width: block ? '100%' : undefined,
    transition: 'background 120ms ease',
  };

  const variants = {
    primary: { background: '#00c9a0', borderColor: '#00a885', color: '#fff', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' },
    danger:  { background: '#fdecea', borderColor: 'rgba(192,57,43,0.25)', color: '#c0392b', boxShadow: 'none' },
  };

  return (
    <button
      style={{ ...base, ...(variants[variant] || {}) }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function ButtonToolbar({ children, align = 'start' }) {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      alignItems: 'center',
      justifyContent: align === 'end' ? 'flex-end' : 'flex-start',
      marginTop: '4px',
    }}>
      {children}
    </div>
  );
}

function MiniStats({ items }) {
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: '10px', margin: 0 }}>
      {items.map(({ label, value }) => (
        <div key={label}>
          <dt style={{ color: '#5a6a7a', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Inter, Segoe UI, sans-serif' }}>{label}</dt>
          <dd style={{ fontWeight: 700, fontSize: '0.88rem', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PageHeader({ title, context, breadcrumbs, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '3px', minWidth: 0 }}>
        {breadcrumbs && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ color: '#c0ccd8', fontSize: '0.8rem' }}>/</span>}
                {crumb.onClick ? (
                  <button onClick={crumb.onClick} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#00a885', fontFamily: 'Inter, Segoe UI, sans-serif', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.045em' }}>
                    {crumb.label}
                  </button>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#0f1623', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.045em', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h2 style={{ margin: 0, fontFamily: 'Inter, Segoe UI, sans-serif', fontSize: 'clamp(1.2rem, 2.2vw, 1.75rem)', fontWeight: 700, letterSpacing: '0.02em', color: '#0f1623' }}>
          {title}
        </h2>
        {context && <p style={{ margin: 0, color: '#5a6a7a', fontSize: '0.84rem', lineHeight: 1.45 }}>{context}</p>}
      </div>
      {action}
    </div>
  );
}

function LanguageSwitcher() {
  const [lang, setLang] = React.useState('en');
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'linear-gradient(180deg,#fff,#f0f2f6)', border: '1px solid #e2e6ee', borderRadius: '12px', padding: '2px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)' }}>
      {['en','nl','fy'].map(l => (
        <button key={l} onClick={() => setLang(l)} style={{
          border: 0, background: lang === l ? 'linear-gradient(180deg,#0f1623,#1e2b3f)' : 'transparent',
          color: lang === l ? '#fff' : '#5a6a7a',
          minWidth: '38px', height: '30px', padding: '0 8px', borderRadius: '8px',
          fontFamily: 'Inter, Segoe UI, sans-serif', fontSize: '0.7rem', fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
          boxShadow: lang === l ? '0 1px 2px rgba(15,22,35,0.18)' : 'none',
          transition: 'background 160ms ease, color 160ms ease',
        }}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { Panel, SectionHead, SummaryCard, HeroStrip, EmptyState, Btn, ButtonToolbar, MiniStats, PageHeader, LanguageSwitcher });
