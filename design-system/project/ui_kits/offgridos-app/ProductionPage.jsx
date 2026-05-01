// ProductionPage.jsx — OffGridOS Production + Surface Detail screens

const MOCK_SURFACES = [
  { id: 'flat-ne', name: 'Flat NE',  panels: 4, wp: 1900, orient: 45,  tilt: 10, mppt: 'SmartSolar 100/20',  status: 'within_limits', fit: 'clipping_expected' },
  { id: 'ne',      name: 'NE face',  panels: 2, wp: 950,  orient: 45,  tilt: 35, mppt: 'SmartSolar 75/15',   status: 'within_limits', fit: 'underutilized' },
  { id: 'nw',      name: 'NW face',  panels: 7, wp: 3325, orient: 315, tilt: 35, mppt: 'SmartSolar 250/100', status: 'within_limits', fit: 'optimal' },
  { id: 'se',      name: 'SE face',  panels: 4, wp: 1900, orient: 135, tilt: 30, mppt: 'SmartSolar 150/35',  status: 'within_limits', fit: 'optimal' },
  { id: 'sw',      name: 'SW face',  panels: 2, wp: 950,  orient: 225, tilt: 30, mppt: 'SmartSolar 75/15',   status: 'within_limits', fit: 'underutilized' },
];

const MONTHLY_YIELD = [
  { month: 'Jan', daily: 2.1,  monthly: 65 },
  { month: 'Feb', daily: 4.2,  monthly: 118 },
  { month: 'Mar', daily: 8.3,  monthly: 257 },
  { month: 'Apr', daily: 13.1, monthly: 393 },
  { month: 'May', daily: 18.4, monthly: 570 },
  { month: 'Jun', daily: 21.2, monthly: 636 },
  { month: 'Jul', daily: 20.1, monthly: 623 },
  { month: 'Aug', daily: 16.8, monthly: 521 },
  { month: 'Sep', daily: 11.4, monthly: 342 },
  { month: 'Oct', daily: 7.1,  monthly: 220 },
  { month: 'Nov', daily: 3.4,  monthly: 102 },
  { month: 'Dec', daily: 1.8,  monthly: 56 },
];

const TOTAL_WP = MOCK_SURFACES.reduce((s, f) => s + f.wp, 0);
const BEST_MONTH = MONTHLY_YIELD.reduce((a, b) => b.daily > a.daily ? b : a);
const WORST_MONTH = MONTHLY_YIELD.reduce((a, b) => b.daily < a.daily ? b : a);

function SurfaceRow({ surface, onOpen }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderTop: '1px solid #e2e6ee', fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <div style={{ flex: '1 1 100px', minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{surface.name}</div>
        <div style={{ fontSize: '0.75rem', color: '#5a6a7a' }}>{surface.panels} panels · {surface.wp.toLocaleString('en-US')} Wp</div>
      </div>
      <div style={{ fontSize: '0.78rem', color: '#5a6a7a', minWidth: '80px' }}>{surface.orient}° / {surface.tilt}°</div>
      <div style={{ fontSize: '0.78rem', color: '#5a6a7a', minWidth: '120px' }}>{surface.mppt}</div>
      <StatusBadge status={surface.status} fit={surface.fit} />
      <Btn size="sm" onClick={() => onOpen(surface.id)}>Open</Btn>
    </div>
  );
}

function MonthBar({ month, daily, maxDaily, isBest, isWorst }) {
  const pct = (daily / maxDaily) * 100;
  const barColor = isBest ? '#00c9a0' : isWorst ? '#e07b20' : '#3b7dd8';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#0f1623', fontVariantNumeric: 'tabular-nums' }}>{daily.toFixed(1)}</div>
      <div style={{ width: '28px', background: '#e2e6ee', borderRadius: '3px', height: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ width: '100%', borderRadius: '3px 3px 0 0', background: barColor, height: `${pct}%`, transition: 'height 300ms ease' }} />
      </div>
      <div style={{ fontSize: '0.65rem', color: '#5a6a7a', letterSpacing: '0.04em' }}>{month}</div>
    </div>
  );
}

function ProductionPage({ onNavigate }) {
  const maxDaily = Math.max(...MONTHLY_YIELD.map(m => m.daily));

  return (
    <div style={{ fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <PageHeader
        title="Production"
        breadcrumbs={[{ label: '18Mad Boerderij', onClick: () => onNavigate('location') }, { label: 'Production' }]}
        action={<LanguageSwitcher />}
      />

      {/* Summary strip */}
      <HeroStrip>
        <SummaryCard label="Total installed" value={`${TOTAL_WP.toLocaleString('en-US')} Wp`} detail="5 surfaces" tone="good" />
        <SummaryCard label="Best month" value={BEST_MONTH.month} detail={`${BEST_MONTH.daily.toFixed(1)} kWh/day avg`} tone="cool" />
        <SummaryCard label="Weakest month" value={WORST_MONTH.month} detail={`${WORST_MONTH.daily.toFixed(1)} kWh/day avg`} tone="warn" />
        <SummaryCard label="Annual yield" value="3,903 kWh" detail="estimated" />
      </HeroStrip>

      {/* Monthly yield chart */}
      <Panel style={{ marginTop: '12px' }}>
        <SectionHead title="Monthly Yield Estimate" />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', overflowX: 'auto', padding: '0 0 4px' }}>
          {MONTHLY_YIELD.map(m => (
            <MonthBar
              key={m.month}
              {...m}
              maxDaily={maxDaily}
              isBest={m.month === BEST_MONTH.month}
              isWorst={m.month === WORST_MONTH.month}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#5a6a7a' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#00c9a0' }}></div>Best month
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#5a6a7a' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#e07b20' }}></div>Weakest month
          </div>
        </div>
      </Panel>

      {/* Surface list */}
      <Panel style={{ marginTop: '12px' }}>
        <SectionHead
          title="Surfaces"
          action={<Btn size="sm">Add surface</Btn>}
        />
        <div>
          {MOCK_SURFACES.map(s => (
            <SurfaceRow key={s.id} surface={s} onOpen={(id) => onNavigate(`surface:${id}`)} />
          ))}
        </div>
      </Panel>

      {/* Chain overview */}
      <Panel style={{ marginTop: '12px' }}>
        <SectionHead title="System Chain" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, alignItems: 'center' }}>
          {[
            { label: 'Surfaces', metric: '5 faces' },
            { label: 'Arrays', metric: '9,025 Wp' },
            { label: 'MPPTs', metric: '5 units' },
            { label: 'Battery bank', metric: '20.5 kWh' },
            { label: 'Inverter', metric: '5,000 W' },
            { label: 'Loads', metric: '3 circuits' },
          ].map((node, i, arr) => (
            <React.Fragment key={node.label}>
              <div style={{ background: '#f0f2f6', padding: '10px 16px', fontFamily: 'Inter, Segoe UI, sans-serif', borderRadius: '8px', border: '1px solid #e2e6ee' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#5a6a7a' }}>{node.label}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f1623', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>{node.metric}</div>
              </div>
              {i < arr.length - 1 && <span style={{ padding: '10px 8px', color: '#5a6a7a', fontSize: '0.9rem' }}>→</span>}
            </React.Fragment>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ── Surface Detail ────────────────────────────────

function SurfaceDetailPage({ surfaceId, onNavigate }) {
  const surface = MOCK_SURFACES.find(s => s.id === surfaceId) || MOCK_SURFACES[0];
  const [panelCount, setPanelCount] = React.useState(surface.panels);
  const [panelsPerString, setPanelsPerString] = React.useState(surface.panels);
  const [parallelStrings, setParallelStrings] = React.useState(1);
  const [saved, setSaved] = React.useState(false);

  const voc = 40.0;
  const vmp = 33.6;
  const isc = 13.5;
  const imp = 12.8;
  const stringVoc = (panelsPerString * voc).toFixed(1);
  const stringVmp = (panelsPerString * vmp).toFixed(1);
  const arrayCurrent = (imp * parallelStrings).toFixed(2);
  const arrayIsc = (isc * parallelStrings).toFixed(2);
  const arrayPower = panelCount * 475;

  return (
    <div style={{ fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <PageHeader
        title={surface.name}
        context="Surface configuration, panel array and MPPT"
        breadcrumbs={[
          { label: '18Mad Boerderij', onClick: () => onNavigate('location') },
          { label: 'Production', onClick: () => onNavigate('production') },
          { label: surface.name },
        ]}
        action={<LanguageSwitcher />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '12px' }}>
        {/* Surface info */}
        <Panel>
          <SectionHead title="Surface" />
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', margin: 0 }}>
            {[
              ['Orientation', `${surface.orient}°`],
              ['Tilt', `${surface.tilt}°`],
              ['Azimuth label', surface.orient < 45 ? 'N' : surface.orient < 135 ? 'E' : surface.orient < 225 ? 'S' : surface.orient < 315 ? 'W' : 'N'],
              ['Panel type', 'Canadian BiHiKu6'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5a6a7a' }}>{label}</dt>
                <dd style={{ fontWeight: 600, marginTop: '2px', fontSize: '0.92rem' }}>{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        {/* Panel config */}
        <Panel>
          <SectionHead title="Array Configuration" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {[
              { label: 'Panel count', value: panelCount, onChange: setPanelCount },
              { label: 'Per string', value: panelsPerString, onChange: setPanelsPerString },
              { label: 'Strings', value: parallelStrings, onChange: setParallelStrings },
            ].map(field => (
              <div key={field.label} style={{ display: 'grid', gap: '4px' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5a6a7a' }}>{field.label}</span>
                <input
                  type="number" value={field.value}
                  onChange={e => { field.onChange(parseInt(e.target.value) || 0); setSaved(false); }}
                  style={{ width: '100%', height: '40px', padding: '8px 12px', border: '1px solid #e2e6ee', background: '#f0f2f6', color: '#0f1623', fontFamily: 'Inter, Segoe UI, sans-serif', fontSize: '0.88rem', borderRadius: '8px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
            ))}
          </div>
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', margin: 0 }}>
            {[
              ['String Voc', `${stringVoc} V`],
              ['String Vmp', `${stringVmp} V`],
              ['Array Isc', `${arrayIsc} A`],
              ['Array Imp', `${arrayCurrent} A`],
              ['Array Wp', `${arrayPower.toLocaleString('en-US')} Wp`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5a6a7a' }}>{label}</dt>
                <dd style={{ fontWeight: 700, fontSize: '0.88rem', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>{value}</dd>
              </div>
            ))}
          </dl>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #e2e6ee' }}>
            {saved && <span style={{ fontSize: '0.82rem', color: '#007255', alignSelf: 'center' }}>Saved.</span>}
            <Btn size="sm" variant="primary" onClick={() => setSaved(true)}>Save</Btn>
          </div>
        </Panel>
      </div>

      {/* MPPT evaluation */}
      <Panel style={{ marginTop: '12px' }}>
        <SectionHead title="MPPT Evaluation" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <StatusBadge status={surface.status} fit={surface.fit} />
            <span style={{ fontSize: '0.72rem', color: '#5a6a7a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Array → MPPT · {surface.mppt}</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#5a6a7a', lineHeight: 1.45 }}>
            {surface.fit === 'optimal' && 'This array is closely matched to the selected MPPT.'}
            {surface.fit === 'underutilized' && 'The selected MPPT has significant unused PV capacity relative to this array.'}
            {surface.fit === 'clipping_expected' && 'This array is intentionally large relative to the selected MPPT, so clipping is expected in stronger conditions.'}
            {surface.fit === 'fully_utilized' && 'This array uses the full available MPPT PV capacity.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e2e6ee' }}>
            {[
              ['MPPT', surface.mppt],
              ['Max Voc', '250 V'],
              ['Max charge', '100 A'],
              ['String Voc (cold)', `${(parseFloat(stringVoc) * 0.9).toFixed(1)} V`],
              ['Utilization', surface.fit === 'underutilized' ? '~62%' : surface.fit === 'optimal' ? '~88%' : '~102%'],
              ['Verdict', surface.fit?.replace('_', ' ') || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5a6a7a', fontFamily: 'Inter, Segoe UI, sans-serif' }}>{label}</dt>
                <dd style={{ fontWeight: 700, fontSize: '0.88rem', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>{value}</dd>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      {/* Monthly yield for this surface */}
      <Panel style={{ marginTop: '12px' }}>
        <SectionHead title="Surface Yield Estimate" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                {['Month','Avg kWh/day','Monthly kWh'].map(h => (
                  <th key={h} style={{ border: '1px solid #e2e6ee', padding: '8px 7px', textAlign: 'left', background: '#f0f2f6', fontFamily: 'Inter, Segoe UI, sans-serif', fontSize: '0.76rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONTHLY_YIELD.map(m => (
                <tr key={m.month}>
                  <td style={{ border: '1px solid #e2e6ee', padding: '8px 7px', fontWeight: 600 }}>{m.month}</td>
                  <td style={{ border: '1px solid #e2e6ee', padding: '8px 7px', fontVariantNumeric: 'tabular-nums' }}>{(m.daily * surface.wp / 9025).toFixed(1)}</td>
                  <td style={{ border: '1px solid #e2e6ee', padding: '8px 7px', fontVariantNumeric: 'tabular-nums' }}>{(m.monthly * surface.wp / 9025).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { ProductionPage, SurfaceDetailPage });
