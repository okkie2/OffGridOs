// StoragePage.jsx — OffGridOS Storage (Battery bank) + Reports screens

const MOCK_BATTERY = {
  brand: 'Pylontech',
  model: 'US5000',
  chemistry: 'LiFePO4',
  nominal_voltage: 48,
  capacity_kwh: 5.12,
  max_charge_rate: 74,
  max_discharge_rate: 74,
  victron_can: true,
};

const MOCK_MONTHLY_BALANCE = [
  { month: 'Jan', solar: 65,  load: 210, surplus: 0,   deficit: 145 },
  { month: 'Feb', solar: 118, load: 190, surplus: 0,   deficit: 72 },
  { month: 'Mar', solar: 257, load: 180, surplus: 77,  deficit: 0 },
  { month: 'Apr', solar: 393, load: 165, surplus: 228, deficit: 0 },
  { month: 'May', solar: 570, load: 155, surplus: 415, deficit: 0 },
  { month: 'Jun', solar: 636, load: 148, surplus: 488, deficit: 0 },
  { month: 'Jul', solar: 623, load: 152, surplus: 471, deficit: 0 },
  { month: 'Aug', solar: 521, load: 158, surplus: 363, deficit: 0 },
  { month: 'Sep', solar: 342, load: 168, surplus: 174, deficit: 0 },
  { month: 'Oct', solar: 220, load: 185, surplus: 35,  deficit: 0 },
  { month: 'Nov', solar: 102, load: 200, surplus: 0,   deficit: 98 },
  { month: 'Dec', solar: 56,  load: 215, surplus: 0,   deficit: 159 },
];

function StoragePage({ onNavigate }) {
  const [batteryCount, setBatteryCount] = React.useState(4);
  const [batteriesPerString, setBatteriesPerString] = React.useState(4);
  const [parallelStrings, setParallelStrings] = React.useState(1);
  const [saved, setSaved] = React.useState(false);

  const stringVoltage = batteriesPerString * MOCK_BATTERY.nominal_voltage;
  const totalCapacityKwh = batteryCount * MOCK_BATTERY.capacity_kwh;
  const maxChargeA = MOCK_BATTERY.max_charge_rate * parallelStrings;
  const estimatedChargeA = (9025 / stringVoltage).toFixed(1);

  const refillNeeded = (totalCapacityKwh * 0.6).toFixed(1);
  const bestDailyYield = 21.2;
  const refillRatio = (bestDailyYield / parseFloat(refillNeeded)).toFixed(2);
  const refillOk = parseFloat(refillRatio) >= 0.9;

  return (
    <div style={{ fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <PageHeader
        title="Battery bank"
        context="Battery bank details and array configuration"
        breadcrumbs={[{ label: '18Mad Boerderij', onClick: () => onNavigate('location') }, { label: 'Storage' }]}
        action={<LanguageSwitcher />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,0.95fr)', gap: '12px' }}>
        {/* Left: Config */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Panel>
            <SectionHead title="Battery Type" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 14px' }}>
              {[
                ['Brand', MOCK_BATTERY.brand],
                ['Model', MOCK_BATTERY.model],
                ['Chemistry', MOCK_BATTERY.chemistry],
                ['Nominal V', `${MOCK_BATTERY.nominal_voltage} V`],
                ['Capacity', `${MOCK_BATTERY.capacity_kwh} kWh`],
                ['Max charge', `${MOCK_BATTERY.max_charge_rate} A`],
                ['Victron CAN', 'Yes'],
                ['Cooling', 'Passive'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5a6a7a' }}>{label}</dt>
                  <dd style={{ fontWeight: 600, marginTop: '2px', fontSize: '0.88rem', margin: 0 }}>{value}</dd>
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionHead title="Battery Array Configuration" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {[
                { label: 'Battery count', value: batteryCount, onChange: setBatteryCount },
                { label: 'Per string', value: batteriesPerString, onChange: setBatteriesPerString },
                { label: 'Strings', value: parallelStrings, onChange: setParallelStrings },
              ].map(field => (
                <div key={field.label} style={{ display: 'grid', gap: '4px' }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5a6a7a' }}>{field.label}</span>
                  <input
                    type="number" value={field.value}
                    onChange={e => { field.onChange(parseInt(e.target.value) || 1); setSaved(false); }}
                    style={{ width: '100%', height: '40px', padding: '8px 12px', border: '1px solid #e2e6ee', background: '#f0f2f6', color: '#0f1623', fontFamily: 'Inter, Segoe UI, sans-serif', fontSize: '0.88rem', borderRadius: '8px', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              ))}
            </div>
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', margin: 0, paddingTop: '10px', borderTop: '1px solid #e2e6ee' }}>
              {[
                ['System voltage', `${stringVoltage} V`],
                ['Total capacity', `${totalCapacityKwh.toFixed(2)} kWh`],
                ['Max charge', `${maxChargeA} A`],
                ['Est. charge current', `${estimatedChargeA} A`],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#5a6a7a' }}>{label}</dt>
                  <dd style={{ fontWeight: 700, fontSize: '0.88rem', marginTop: '2px', fontVariantNumeric: 'tabular-nums', margin: 0 }}>{value}</dd>
                </div>
              ))}
            </dl>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #e2e6ee' }}>
              {saved && <span style={{ fontSize: '0.82rem', color: '#007255', alignSelf: 'center' }}>Saved.</span>}
              <Btn size="sm" variant="primary" onClick={() => setSaved(true)}>Save</Btn>
            </div>
          </Panel>
        </div>

        {/* Right: Evaluation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Panel>
            <SectionHead title="Battery sizing" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <StatusBadge status="within_limits" fit={refillOk ? 'optimal' : 'underutilized'} />
                <span style={{ fontSize: '0.72rem', color: '#5a6a7a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>MPPT → Battery bank</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: '#5a6a7a', lineHeight: 1.45 }}>
                {refillOk
                  ? 'The battery array can be refilled from 20% to 80% in about one best-month day.'
                  : 'The battery array is too large to refill from 20% to 80% in one best-month day.'}
              </p>
              <div style={{ padding: '10px 12px', fontSize: '0.82rem', color: '#5a6a7a', background: '#f0f2f6', borderLeft: '3px solid #e6f4ef', borderRadius: '8px' }}>
                20%→80% refill needs {refillNeeded} kWh · Best-month daily: {bestDailyYield} kWh/day
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionHead title="Summary" />
            <div style={{ display: 'grid', gap: '8px' }}>
              <SummaryCard label="System voltage" value={`${stringVoltage} V`} />
              <SummaryCard label="Total capacity" value={`${totalCapacityKwh.toFixed(1)} kWh`} tone="good" />
              <SummaryCard label="Max charge" value={`${maxChargeA} A`} />
              <SummaryCard label="Days to full (best month)" value={`${(totalCapacityKwh * 0.6 / bestDailyYield).toFixed(1)} days`} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ReportsPage({ onNavigate }) {
  const maxSolar = Math.max(...MOCK_MONTHLY_BALANCE.map(m => m.solar));

  return (
    <div style={{ fontFamily: 'Inter, Segoe UI, sans-serif' }}>
      <PageHeader
        title="Reports"
        context="Technical verdicts and cost summaries"
        breadcrumbs={[{ label: '18Mad Boerderij', onClick: () => onNavigate('location') }, { label: 'Reports' }]}
        action={<LanguageSwitcher />}
      />

      <Panel>
        <SectionHead title="Monthly Balance" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr>
                {['Month','Solar kWh','Load kWh','Surplus kWh','Deficit kWh'].map(h => (
                  <th key={h} style={{ border: '1px solid #e2e6ee', padding: '8px 7px', textAlign: 'left', background: '#f0f2f6', fontFamily: 'Inter, Segoe UI, sans-serif', fontSize: '0.76rem', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_MONTHLY_BALANCE.map(m => (
                <tr key={m.month}>
                  <th style={{ border: '1px solid #e2e6ee', padding: '8px 7px', textAlign: 'left', fontWeight: 600, background: '#f0f2f6' }}>{m.month}</th>
                  <td style={{ border: '1px solid #e2e6ee', padding: '8px 7px', fontVariantNumeric: 'tabular-nums' }}>{m.solar}</td>
                  <td style={{ border: '1px solid #e2e6ee', padding: '8px 7px', fontVariantNumeric: 'tabular-nums' }}>{m.load}</td>
                  <td style={{ border: '1px solid #e2e6ee', padding: '8px 7px', fontVariantNumeric: 'tabular-nums', color: m.surplus > 0 ? '#007255' : '#5a6a7a' }}>{m.surplus > 0 ? `+${m.surplus}` : '—'}</td>
                  <td style={{ border: '1px solid #e2e6ee', padding: '8px 7px', fontVariantNumeric: 'tabular-nums', color: m.deficit > 0 ? '#c0392b' : '#5a6a7a', fontWeight: m.deficit > 0 ? 700 : 400 }}>{m.deficit > 0 ? `-${m.deficit}` : '—'}</td>
                </tr>
              ))}
              <tr>
                <th style={{ border: '1px solid #e2e6ee', padding: '8px 7px', background: '#e8ecf3', fontWeight: 700 }}>Total</th>
                <td style={{ border: '1px solid #e2e6ee', padding: '8px 7px', fontWeight: 700, background: '#e8ecf3', fontVariantNumeric: 'tabular-nums' }}>3,903</td>
                <td style={{ border: '1px solid #e2e6ee', padding: '8px 7px', fontWeight: 700, background: '#e8ecf3', fontVariantNumeric: 'tabular-nums' }}>2,126</td>
                <td style={{ border: '1px solid #e2e6ee', padding: '8px 7px', fontWeight: 700, background: '#e8ecf3', color: '#007255', fontVariantNumeric: 'tabular-nums' }}>+2,251</td>
                <td style={{ border: '1px solid #e2e6ee', padding: '8px 7px', fontWeight: 700, background: '#e8ecf3', color: '#c0392b', fontVariantNumeric: 'tabular-nums' }}>-474</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Warnings */}
        <div style={{ display: 'grid', gap: '8px', marginTop: '16px' }}>
          <WarningPill severity="info" message="December through February show a deficit. Generator backup is expected during winter months." />
          <WarningPill severity="warning" message="May through August have significant surplus — consider expanding load circuits or adding storage." />
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { StoragePage, ReportsPage });
