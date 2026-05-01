// LocationPage.jsx — OffGridOS Location screen

const MOCK_LOCATION = {
  title: '18Mad Boerderij',
  description: 'Off-grid farmhouse project in Friesland, Netherlands.',
  country: 'Netherlands',
  place_name: 'Fryslân, NL',
  latitude: 53.1642,
  longitude: 5.7812,
  notes: 'Main dwelling plus two outbuildings. Priority: minimize generator dependency.',
};

function ConfigField({ label, children }) {
  return (
    <div style={{ display: 'grid', gap: '4px' }}>
      <span style={{ fontSize: '0.72rem', fontFamily: 'Inter, Segoe UI, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5a6a7a' }}>{label}</span>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', height: '40px', padding: '8px 12px', border: '1px solid #e2e6ee', background: '#f0f2f6', color: '#0f1623', fontFamily: 'Inter, Segoe UI, sans-serif', fontSize: '0.88rem', borderRadius: '8px', boxSizing: 'border-box', outline: 'none' }}
    />
  );
}

function LocationPage({ onNavigate }) {
  const [loc, setLoc] = React.useState(MOCK_LOCATION);
  const [saved, setSaved] = React.useState(false);

  const update = (key) => (val) => { setLoc(l => ({ ...l, [key]: val })); setSaved(false); };
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div style={{ fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <PageHeader
        title="Location"
        context="Location details and surfaces"
        breadcrumbs={[{ label: loc.title }, { label: 'Location' }]}
        action={<LanguageSwitcher />}
      />

      {/* Hero production context */}
      <div style={{ display: 'grid', gap: '6px', padding: '14px 16px', marginBottom: '16px', borderRadius: '16px', background: 'linear-gradient(180deg, rgba(0,201,160,0.08), rgba(0,201,160,0.03))', border: '1px solid rgba(0,201,160,0.16)' }}>
        <div style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '0.01em', color: '#0f1623' }}>{loc.title}</div>
        <div style={{ fontSize: '0.84rem', color: '#5a6a7a' }}>{loc.latitude.toFixed(4)}°N, {loc.longitude.toFixed(4)}°E · {loc.place_name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '10px', marginTop: '4px' }}>
          <SummaryCard label="Total installed" value="9,025 Wp" detail="5 surfaces" />
          <SummaryCard label="Battery bank" value="20.5 kWh" detail="4 × 5.12 kWh" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '12px' }}>
        {/* Site info panel */}
        <Panel>
          <SectionHead title="Site Information" />
          <div style={{ display: 'grid', gap: '12px' }}>
            <ConfigField label="Location title">
              <TextInput value={loc.title} onChange={update('title')} />
            </ConfigField>
            <ConfigField label="Description">
              <textarea
                value={loc.description} onChange={e => update('description')(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e6ee', background: '#f0f2f6', color: '#0f1623', fontFamily: 'Inter, Segoe UI, sans-serif', fontSize: '0.88rem', borderRadius: '8px', resize: 'vertical', minHeight: '72px', boxSizing: 'border-box', outline: 'none' }}
              />
            </ConfigField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <ConfigField label="Latitude">
                <TextInput value={String(loc.latitude)} onChange={v => update('latitude')(parseFloat(v) || loc.latitude)} />
              </ConfigField>
              <ConfigField label="Longitude">
                <TextInput value={String(loc.longitude)} onChange={v => update('longitude')(parseFloat(v) || loc.longitude)} />
              </ConfigField>
            </div>
            <ConfigField label="Country">
              <TextInput value={loc.country} onChange={update('country')} />
            </ConfigField>
            <ConfigField label="Notes">
              <textarea
                value={loc.notes} onChange={e => update('notes')(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e6ee', background: '#f0f2f6', color: '#0f1623', fontFamily: 'Inter, Segoe UI, sans-serif', fontSize: '0.88rem', borderRadius: '8px', resize: 'vertical', minHeight: '60px', boxSizing: 'border-box', outline: 'none' }}
              />
            </ConfigField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
              {saved && <span style={{ fontSize: '0.82rem', color: '#007255', alignSelf: 'center' }}>Saved.</span>}
              <Btn variant="primary" size="sm" onClick={save}>Save</Btn>
            </div>
          </div>
        </Panel>

        {/* Map panel */}
        <Panel>
          <SectionHead title="Location Map" />
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e6ee', background: '#f0f2f6', minHeight: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: '#5a6a7a', fontSize: '0.84rem' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00c9a0" strokeWidth="1.5"><circle cx="12" cy="10" r="3"/><path d="M12 21c-4-4-7-7.5-7-11a7 7 0 0114 0c0 3.5-3 7-7 11z"/></svg>
            <span>{loc.latitude.toFixed(4)}°N, {loc.longitude.toFixed(4)}°E</span>
            <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>{loc.place_name}</span>
          </div>

          {/* Photo upload */}
          <div style={{ marginTop: '12px' }}>
            <SectionHead title="Site Photo" />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', minHeight: '100px', background: '#f0f2f6', cursor: 'pointer', border: '2px dashed #e2e6ee', borderRadius: '10px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5a6a7a" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              <span style={{ fontSize: '0.82rem', color: '#5a6a7a' }}>Upload site photo</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Surfaces panel */}
      <Panel style={{ marginTop: '12px' }}>
        <SectionHead
          title="Surfaces"
          action={<Btn size="sm" onClick={() => {}}>Add surface</Btn>}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {[
            { id: 'flat-ne', name: 'Flat NE', panels: 4, wp: 1900, orient: '45°', tilt: '10°' },
            { id: 'ne', name: 'NE face', panels: 2, wp: 950, orient: '45°', tilt: '35°' },
            { id: 'nw', name: 'NW face', panels: 7, wp: 3325, orient: '315°', tilt: '35°' },
            { id: 'se', name: 'SE face', panels: 4, wp: 1900, orient: '135°', tilt: '30°' },
            { id: 'sw', name: 'SW face', panels: 2, wp: 950, orient: '225°', tilt: '30°' },
          ].map(s => (
            <div key={s.id} style={{ background: '#f0f2f6', border: '1px solid #e2e6ee', borderRadius: '10px', padding: '14px' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>{s.name}</div>
              <div style={{ fontSize: '0.78rem', color: '#5a6a7a', marginBottom: '8px' }}>{s.panels} panels · {s.wp.toLocaleString('en-US')} Wp</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.72rem', color: '#5a6a7a', marginBottom: '10px' }}>
                <span>Orient: {s.orient}</span><span>Tilt: {s.tilt}</span>
              </div>
              <Btn size="sm" block onClick={() => onNavigate(`surface:${s.id}`)}>Open</Btn>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { LocationPage });
