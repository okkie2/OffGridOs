// StatusBadge.jsx — OffGridOS status/fit badges and verdict cards

const STATUS_TONES = {
  within_limits: 'warn',
  outside_limits: 'danger',
  unknown: 'danger',
  optimal: 'good',
  fully_utilized: 'warn',
  clipping_expected: 'warn',
  underutilized: 'cool',
};

const STATUS_LABELS = {
  within_limits: 'within limits',
  outside_limits: 'outside limits',
  unknown: 'unknown',
  optimal: 'optimal',
  fully_utilized: 'fully utilized',
  clipping_expected: 'clipping expected',
  underutilized: 'underutilized',
};

const TONE_STYLES = {
  good:   { background: '#e6f4ef', color: '#007255' },
  ok:     { background: '#fef3e6', color: '#7a4e00' },
  warn:   { background: '#fdecd8', color: '#8c4e00' },
  cool:   { background: '#e8f0fb', color: '#1a4a8a' },
  danger: { background: '#fdecea', color: '#c0392b' },
};

function StatusBadge({ status, fit }) {
  const key = fit || status;
  if (!key) return null;
  const tone = STATUS_TONES[key] || 'cool';
  const label = STATUS_LABELS[key] || key;
  const style = TONE_STYLES[tone];

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '4px 8px',
      fontFamily: 'Inter, Segoe UI, sans-serif',
      fontSize: '0.68rem', fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      whiteSpace: 'nowrap', borderRadius: 0,
      ...style,
    }}>
      {label}
    </span>
  );
}

function VerdictCard({ relationshipLabel, status, fit, summary, reasons }) {
  const key = fit || status;
  const tone = STATUS_TONES[key] || 'cool';
  const toneStyle = TONE_STYLES[tone];

  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e6ee',
      borderRadius: '10px', padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: '8px',
      fontFamily: 'Inter, Segoe UI, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <StatusBadge status={status} fit={fit} />
        {relationshipLabel && (
          <span style={{ fontSize: '0.72rem', color: '#5a6a7a', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {relationshipLabel}
          </span>
        )}
      </div>
      {summary && (
        <p style={{ margin: 0, fontSize: '0.84rem', color: '#5a6a7a', lineHeight: 1.45 }}>{summary}</p>
      )}
      {reasons && reasons.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: '18px', color: '#5a6a7a', fontSize: '0.82rem', display: 'grid', gap: '2px' }}>
          {reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
      {/* Fit note accent */}
      {fit && fit !== 'outside_limits' && summary && (
        <div style={{
          padding: '8px 12px', fontSize: '0.82rem', color: '#5a6a7a',
          background: '#f0f2f6', borderLeft: `3px solid ${toneStyle.background}`,
          borderRadius: '8px',
        }}>
          {summary}
        </div>
      )}
    </div>
  );
}

function WarningPill({ severity, message }) {
  const style = severity === 'warning'
    ? { background: '#fdecd8', color: '#8c4e00' }
    : { background: '#e8f0fb', color: '#1a4a8a' };

  return (
    <div style={{
      display: 'flex', gap: '12px', alignItems: 'start',
      background: '#f0f2f6', border: '1px solid #e2e6ee',
      borderRadius: '10px', padding: '14px 16px',
      fontFamily: 'Inter, Segoe UI, sans-serif',
    }}>
      <span style={{
        padding: '4px 8px', fontSize: '0.68rem', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0,
        ...style,
      }}>
        {severity === 'warning' ? 'Warning' : 'Info'}
      </span>
      <span style={{ fontSize: '0.84rem', color: '#5a6a7a', lineHeight: 1.45 }}>{message}</span>
    </div>
  );
}

Object.assign(window, { StatusBadge, VerdictCard, WarningPill, TONE_STYLES });
