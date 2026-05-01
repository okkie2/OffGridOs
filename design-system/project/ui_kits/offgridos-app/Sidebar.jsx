// Sidebar.jsx — OffGridOS sidebar navigation
// Exports: Sidebar, sidebarIcon

const ICON_BASE = '../../assets/icons/';

function sidebarIcon(name) {
  return (
    <img
      src={`${ICON_BASE}${name}.svg`}
      alt=""
      aria-hidden="true"
      style={{ width: '1em', height: '1em', display: 'block', flexShrink: 0,
        filter: 'invert(90%) sepia(8%) saturate(450%) hue-rotate(185deg) brightness(92%) contrast(92%)' }}
    />
  );
}

function sidebarIconActive(name) {
  return (
    <img
      src={`${ICON_BASE}${name}.svg`}
      alt=""
      aria-hidden="true"
      style={{ width: '1em', height: '1em', display: 'block', flexShrink: 0,
        filter: 'invert(85%) sepia(30%) saturate(600%) hue-rotate(120deg) brightness(105%) contrast(105%)' }}
    />
  );
}

const NAV_ITEMS = [
  { id: 'location',    label: 'Location',    icon: 'house' },
  { id: 'production',  label: 'Production',  icon: 'bolt-lightning',  hasChildren: true },
  { id: 'storage',     label: 'Storage',     icon: 'server' },
  { id: 'consumption', label: 'Consumption', icon: 'plug',            hasChildren: true },
  { id: 'reports',     label: 'Reports',     icon: 'book-open',       hasChildren: true },
  { id: 'catalogs',    label: 'Catalogs',    icon: 'table-list',      hasChildren: true },
];

const SURFACES = [
  { id: 'flat-ne', label: 'Flat NE' },
  { id: 'ne',      label: 'NE face' },
  { id: 'nw',      label: 'NW face' },
  { id: 'se',      label: 'SE face' },
  { id: 'sw',      label: 'SW face' },
];

function Sidebar({ route, onNavigate }) {
  const [openSections, setOpenSections] = React.useState({
    production: route === 'production' || (route && route.startsWith('surface:')),
    consumption: route === 'consumption',
    reports: route === 'reports',
    catalogs: route === 'catalogs',
  });
  const [collapsed, setCollapsed] = React.useState(false);

  const toggle = (section) =>
    setOpenSections(s => ({ ...s, [section]: !s[section] }));

  const go = (id) => (e) => { e.preventDefault(); onNavigate(id); };
  const isActive = (id) => route === id || (id === 'production' && route && route.startsWith('surface:'));
  const activeSurfaceId = route && route.startsWith('surface:') ? route.slice(8) : null;

  const sidebarStyle = {
    width: collapsed ? '72px' : '240px',
    minWidth: collapsed ? '72px' : '220px',
    maxWidth: collapsed ? '72px' : '320px',
    minHeight: '100vh',
    background: '#0b1326',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflow: 'hidden',
    transition: 'width 180ms ease',
  };

  const navItemStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 18px', fontSize: '0.82rem', fontWeight: 500,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    color: active ? '#00ffc2' : '#83958c',
    background: active ? '#171f33' : 'transparent',
    textDecoration: 'none', cursor: 'pointer',
    border: 'none', width: '100%', textAlign: 'left',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    fontFamily: 'Inter, Segoe UI, sans-serif',
  });

  const subItemStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '7px 16px', fontSize: '0.73rem', fontWeight: 500,
    letterSpacing: '0.04em', textTransform: 'uppercase',
    color: active ? '#00ffc2' : '#83958c',
    background: active ? 'rgba(0,255,194,0.12)' : 'transparent',
    textDecoration: 'none', cursor: 'pointer',
    fontFamily: 'Inter, Segoe UI, sans-serif',
  });

  const iconStyle = (active) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: collapsed ? '20px' : '1.62rem', flexShrink: 0, fontSize: '1rem', lineHeight: 1,
  });

  const collapseBtn = {
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
    color: '#dae2fd', borderRadius: '12px', width: '28px', height: '28px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', lineHeight: 1,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
  };

  return (
    <aside style={sidebarStyle}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '12px' }}>
        {!collapsed && (
          <div>
            <div style={{ fontFamily: 'Inter, Segoe UI, sans-serif', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#00ffc2' }}>OffGridOS</div>
            <div style={{ fontSize: '0.68rem', color: '#83958c', marginTop: '2px', letterSpacing: '0.04em' }}>Digital Twin</div>
          </div>
        )}
        <button style={collapseBtn} onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
          <span aria-hidden="true">{collapsed ? '▸' : '◂'}</span>
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0' }}>
        {NAV_ITEMS.map(item => (
          <React.Fragment key={item.id}>
            <button
              onClick={(e) => {
                if (item.hasChildren) toggle(item.id);
                go(item.id)(e);
              }}
              style={navItemStyle(isActive(item.id))}
            >
              <span style={iconStyle(isActive(item.id))}>
                {isActive(item.id) ? sidebarIconActive(item.icon) : sidebarIcon(item.icon)}
              </span>
              {!collapsed && <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
              {!collapsed && item.hasChildren && (
                <span style={{ marginLeft: 'auto', flexShrink: 0, fontSize: '0.8rem', opacity: 0.7 }}>
                  {openSections[item.id] ? '▾' : '▸'}
                </span>
              )}
            </button>

            {/* Production sub-items */}
            {item.id === 'production' && openSections.production && !collapsed && (
              <div style={{ padding: '0 0 8px 12px', margin: '0 0 4px 18px', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                {SURFACES.map(s => (
                  <button key={s.id} onClick={go(`surface:${s.id}`)} style={subItemStyle(activeSurfaceId === s.id)}>
                    <span style={{ width: '14px', flexShrink: 0 }}>{sidebarIcon('solar-panel')}</span>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Consumption sub-items */}
            {item.id === 'consumption' && openSections.consumption && !collapsed && (
              <div style={{ padding: '0 0 8px 12px', margin: '0 0 4px 18px', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { id: 'battery-bank', label: 'Battery bank', icon: 'server' },
                  { id: 'converters',   label: 'Converters',   icon: 'wave-square' },
                  { id: 'load-circuits',label: 'Load circuits', icon: 'sitemap' },
                  { id: 'loads',        label: 'Loads',        icon: 'plug-circle-bolt' },
                ].map(sub => (
                  <button key={sub.id} onClick={go(sub.id)} style={subItemStyle(route === sub.id)}>
                    <span style={{ width: '14px', flexShrink: 0 }}>{sidebarIcon(sub.icon)}</span>
                    <span>{sub.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Reports sub-items */}
            {item.id === 'reports' && openSections.reports && !collapsed && (
              <div style={{ padding: '0 0 8px 12px', margin: '0 0 4px 18px', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { id: 'monthly-balance', label: 'Monthly balance', icon: 'balance-scale' },
                  { id: 'verdict-summary', label: 'Evaluation',      icon: 'balance-scale' },
                  { id: 'cost-summary',    label: 'Calculation',     icon: 'eur' },
                ].map(sub => (
                  <button key={sub.id} onClick={go(sub.id)} style={subItemStyle(route === sub.id)}>
                    <span style={{ width: '14px', flexShrink: 0 }}>{sidebarIcon(sub.icon)}</span>
                    <span>{sub.label}</span>
                  </button>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <button style={{ ...navItemStyle(route === 'about'), opacity: 0.35, fontSize: '0.75rem', padding: '8px 0' }} onClick={go('about')}>
          <span style={iconStyle(false)}>{sidebarIcon('square-plus')}</span>
          {!collapsed && <span>New project</span>}
        </button>
        <button style={{ ...navItemStyle(route === 'about'), padding: '8px 0' }} onClick={go('about')}>
          <span style={iconStyle(false)}>{sidebarIcon('circle-info')}</span>
          {!collapsed && <span>About</span>}
        </button>
        {!collapsed && <div style={{ fontSize: '0.65rem', color: '#83958c', letterSpacing: '0.04em', marginTop: '2px' }}>OffGridOS · build 2026</div>}
      </div>
    </aside>
  );
}

Object.assign(window, { Sidebar, sidebarIcon, sidebarIconActive });
