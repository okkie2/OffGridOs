import { useEffect, useState } from 'react';

type Status = 'within_limits' | 'outside_limits';
type FitStatus = 'optimal' | 'acceptable' | 'clipping_expected' | 'underutilized';

interface RoofFace {
  roof_face_id: string;
  name: string;
  orientation_deg: number;
  tilt_deg: number;
}

interface ArrayState {
  array_id: string;
  installed_wp: number;
  roof_face_id: string;
  panel_count: number;
}

interface ArrayEntity {
  array_id: string;
  roof_face_id: string;
  name: string;
}

interface ProjectMppt {
  project_mppt_id: string;
  roof_face_id: string;
  array_id: string;
  name: string;
  provisional: boolean;
}

interface ArrayToMpptRelationship {
  relationship_id: string;
  from_array_id: string;
  to_project_mppt_id: string;
  evaluation: {
    electrical_status: Status;
    fit_status?: FitStatus;
    reasons: string[];
    notes?: string;
  };
}

interface MonthlyBalanceRow {
  month: string;
  solar_kwh: number | null;
  consumer_kwh: number | null;
  surplus_kwh: number | null;
  deficit_kwh: number | null;
  notes?: string;
}

interface DigitalTwinExport {
  project: {
    name: string;
    location: {
      country: string;
      place_name: string;
    } | null;
  };
  entities: {
    roof_faces: RoofFace[];
    arrays: ArrayEntity[];
    project_mppts: ProjectMppt[];
  };
  relationships: {
    array_to_mppt: ArrayToMpptRelationship[];
  };
  derived: {
    array_states: ArrayState[];
    monthly_balance: MonthlyBalanceRow[];
    warnings: Array<{
      severity: 'info' | 'warning';
      scope: string;
      message: string;
    }>;
    summary: {
      total_installed_wp: number;
      roof_face_count: number;
      array_count: number;
      project_mppt_count: number;
      battery_type_count: number;
      inverter_type_count: number;
      has_outside_limits: boolean;
    };
  };
}

type Route =
  | { kind: 'overview' }
  | { kind: 'roof-face'; roofFaceId: string };

const MONTH_LABELS: Record<string, string> = {
  january: 'Jan',
  february: 'Feb',
  march: 'Mar',
  april: 'Apr',
  may: 'May',
  june: 'Jun',
  july: 'Jul',
  august: 'Aug',
  september: 'Sep',
  october: 'Oct',
  november: 'Nov',
  december: 'Dec',
};

function formatWp(wp: number): string {
  return `${wp.toLocaleString('en-US')} Wp`;
}

function statusTone(status: Status, fit?: FitStatus): string {
  if (status === 'outside_limits') return 'danger';
  if (fit === 'clipping_expected') return 'warn';
  if (fit === 'underutilized') return 'cool';
  if (fit === 'acceptable') return 'ok';
  return 'good';
}

function StatusBadge({ status, fit }: { status: Status; fit?: FitStatus }) {
  const tone = statusTone(status, fit);
  const text = status === 'outside_limits'
    ? 'Outside limits'
    : fit
      ? fit.replaceAll('_', ' ')
      : 'Within limits';
  return <span className={`status status-${tone}`}>{text}</span>;
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="summary-card">
      <div className="summary-label">{label}</div>
      <div className="summary-value">{value}</div>
      {detail ? <div className="summary-detail">{detail}</div> : null}
    </article>
  );
}

function findWeakestMonth(rows: MonthlyBalanceRow[]): MonthlyBalanceRow | null {
  return rows[0] ?? null;
}

function getRoute(): Route {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash.startsWith('/roof-faces/')) {
    const roofFaceId = hash.slice('/roof-faces/'.length);
    if (roofFaceId) return { kind: 'roof-face', roofFaceId };
  }
  return { kind: 'overview' };
}

function navigateTo(route: Route): void {
  if (route.kind === 'overview') {
    window.location.hash = '/';
    return;
  }
  window.location.hash = `/roof-faces/${route.roofFaceId}`;
}

function Breadcrumbs({ route, roofFaceName }: { route: Route; roofFaceName?: string }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <button type="button" className="crumb crumb-link" onClick={() => navigateTo({ kind: 'overview' })}>
        Overview
      </button>
      {route.kind === 'roof-face' ? (
        <>
          <span className="crumb-sep">/</span>
          <span className="crumb">Roof faces</span>
          <span className="crumb-sep">/</span>
          <span className="crumb crumb-current">{roofFaceName ?? route.roofFaceId}</span>
        </>
      ) : null}
    </nav>
  );
}

function RoofFaceDetail({
  data,
  roofFaceId,
}: {
  data: DigitalTwinExport;
  roofFaceId: string;
}) {
  const roofFace = data.entities.roof_faces.find((item) => item.roof_face_id === roofFaceId);
  const array = data.entities.arrays.find((item) => item.roof_face_id === roofFaceId);
  const arrayState = data.derived.array_states.find((item) => item.roof_face_id === roofFaceId);
  const projectMppt = array ? data.entities.project_mppts.find((item) => item.array_id === array.array_id) : null;
  const relation = array ? data.relationships.array_to_mppt.find((item) => item.from_array_id === array.array_id) : null;

  if (!roofFace || !array) {
    return (
      <section className="panel error-panel">
        <Breadcrumbs route={{ kind: 'roof-face', roofFaceId }} roofFaceName={roofFaceId} />
        <h1>Roof face not found</h1>
        <p>No roof-face detail is available for `{roofFaceId}` in the current export.</p>
      </section>
    );
  }

  return (
    <section className="detail-shell">
      <section className="panel detail-hero">
        <Breadcrumbs route={{ kind: 'roof-face', roofFaceId }} roofFaceName={roofFace.name} />
        <div className="detail-hero-grid">
          <div>
            <div className="eyebrow">Roof face detail</div>
            <h1>{roofFace.name}</h1>
            <p>
              {roofFace.orientation_deg} deg azimuth · {roofFace.tilt_deg} deg tilt
            </p>
          </div>
          <div className="hero-grid">
            <SummaryCard label="Array" value={array.array_id} />
            <SummaryCard label="Installed PV" value={arrayState ? formatWp(arrayState.installed_wp) : 'n/a'} />
            <SummaryCard label="Panel count" value={String(arrayState?.panel_count ?? 0)} />
            <SummaryCard label="Selected MPPT" value={projectMppt?.name ?? 'Pending'} detail="Currently provisional" />
          </div>
        </div>
      </section>

      <section className="detail-grid">
        <section className="panel">
          <div className="section-head">
            <h2>Array summary</h2>
            <p>First-slice derived array based on the current roof-face panel assignment.</p>
          </div>
          <dl className="detail-stats">
            <div>
              <dt>Roof face</dt>
              <dd>{roofFace.roof_face_id}</dd>
            </div>
            <div>
              <dt>Array ID</dt>
              <dd>{array.array_id}</dd>
            </div>
            <div>
              <dt>Panel assignments</dt>
              <dd>{array.panel_assignment_ids.length}</dd>
            </div>
            <div>
              <dt>Installed Wp</dt>
              <dd>{arrayState ? formatWp(arrayState.installed_wp) : 'n/a'}</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>MPPT fit</h2>
            <p>This relationship is still structural and provisional, but the route is now in place for real fit evaluation.</p>
          </div>
          {relation ? (
            <div className="fit-card">
              <div className="fit-head">
                <div>
                  <strong>{projectMppt?.name ?? relation.to_project_mppt_id}</strong>
                  <p>{relation.relationship_id}</p>
                </div>
                <StatusBadge status={relation.evaluation.electrical_status} fit={relation.evaluation.fit_status} />
              </div>
              <ul className="reason-list">
                {relation.evaluation.reasons.map((reason) => (
                  <li key={reason}>{reason.replaceAll('_', ' ')}</li>
                ))}
              </ul>
              {relation.evaluation.notes ? <p className="fit-note">{relation.evaluation.notes}</p> : null}
            </div>
          ) : (
            <p>No array-to-MPPT relationship is available yet.</p>
          )}
        </section>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Monthly preview</h2>
          <p>This is still a placeholder until the first calculation pipeline emits real month-by-month values.</p>
        </div>
        <div className="month-list">
          {data.derived.monthly_balance.map((row) => (
            <div key={row.month} className="month-row">
              <span>{MONTH_LABELS[row.month] ?? row.month}</span>
              <span>{row.notes ?? 'No note'}</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

export function App() {
  const [data, setData] = useState<DigitalTwinExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(() => getRoute());

  useEffect(() => {
    let cancelled = false;

    fetch('/digital-twin.json')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load digital-twin.json (${response.status})`);
        }
        return response.json() as Promise<DigitalTwinExport>;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (error) {
    return (
      <main className="app-shell">
        <section className="panel error-panel">
          <h1>OffGridOS Twin</h1>
          <p>{error}</p>
          <p>Run `ogos export --db project.db --out public/digital-twin.json` and reload.</p>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="app-shell">
        <section className="panel">
          <h1>OffGridOS Twin</h1>
          <p>Loading digital twin export...</p>
        </section>
      </main>
    );
  }

  const weakestMonth = findWeakestMonth(data.derived.monthly_balance);
  const arrayStateByRoofFace = new Map(data.derived.array_states.map((state) => [state.roof_face_id, state]));
  const mpptByArray = new Map(data.entities.project_mppts.map((item) => [item.array_id, item]));
  const relationByArray = new Map(data.relationships.array_to_mppt.map((item) => [item.from_array_id, item]));

  if (route.kind === 'roof-face') {
    return (
      <main className="app-shell">
        <RoofFaceDetail data={data} roofFaceId={route.roofFaceId} />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="hero panel">
        <div className="hero-copy">
          <div className="eyebrow">Digital Twin Overview</div>
          <h1>{data.project.name}</h1>
          <p>
            {data.project.location
              ? `${data.project.location.place_name}, ${data.project.location.country}`
              : 'Project location not set'}
          </p>
        </div>
        <div className="hero-grid">
          <SummaryCard label="Installed PV" value={formatWp(data.derived.summary.total_installed_wp)} />
          <SummaryCard label="Roof faces" value={String(data.derived.summary.roof_face_count)} />
          <SummaryCard label="Arrays" value={String(data.derived.summary.array_count)} />
          <SummaryCard label="Project MPPTs" value={String(data.derived.summary.project_mppt_count)} detail="Provisional for now" />
        </div>
      </header>

      <section className="chain panel">
        <div className="section-head">
          <h2>System chain</h2>
          <p>Current first-slice overview from roof faces through provisional MPPT structure.</p>
        </div>
        <div className="chain-row">
          <div className="chain-node">Roof faces</div>
          <div className="chain-arrow">→</div>
          <div className="chain-node">Arrays</div>
          <div className="chain-arrow">→</div>
          <div className="chain-node">MPPTs</div>
          <div className="chain-arrow">→</div>
          <div className="chain-node muted">Battery bank</div>
          <div className="chain-arrow muted">→</div>
          <div className="chain-node muted">Inverter</div>
        </div>
      </section>

      <section className="status-strip panel">
        <div className="section-head">
          <h2>Relationship status</h2>
          <p>The first export slice emits structural array-to-MPPT relationships and marks them as provisional.</p>
        </div>
        <div className="status-list">
          {data.relationships.array_to_mppt.map((relation) => (
            <article key={relation.relationship_id} className="status-card">
              <div className="status-card-top">
                <span className="status-title">{relation.from_array_id}</span>
                <StatusBadge status={relation.evaluation.electrical_status} fit={relation.evaluation.fit_status} />
              </div>
              <p>{relation.evaluation.notes ?? relation.evaluation.reasons.join(', ')}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="overview-grid">
        <section className="panel">
        <div className="section-head">
          <h2>Roof-face cards</h2>
          <p>Each roof face currently derives one array and one provisional MPPT. Click a card to open the first drill-down screen.</p>
        </div>
        <div className="roof-grid">
          {data.entities.roof_faces.map((roofFace) => {
              const arrayState = arrayStateByRoofFace.get(roofFace.roof_face_id);
              const array = data.entities.arrays.find((item) => item.roof_face_id === roofFace.roof_face_id);
              const projectMppt = array ? mpptByArray.get(array.array_id) : null;
              const relation = array ? relationByArray.get(array.array_id) : null;

              return (
                <button
                  key={roofFace.roof_face_id}
                  type="button"
                  className="roof-card roof-card-button"
                  onClick={() => navigateTo({ kind: 'roof-face', roofFaceId: roofFace.roof_face_id })}
                >
                  <div className="roof-card-top">
                    <div>
                      <h3>{roofFace.name}</h3>
                      <p>{roofFace.orientation_deg} deg · {roofFace.tilt_deg} deg tilt</p>
                    </div>
                    {relation ? (
                      <StatusBadge status={relation.evaluation.electrical_status} fit={relation.evaluation.fit_status} />
                    ) : null}
                  </div>
                  <dl className="mini-stats">
                    <div>
                      <dt>Array</dt>
                      <dd>{array?.array_id ?? 'Not derived'}</dd>
                    </div>
                    <div>
                      <dt>Panels</dt>
                      <dd>{arrayState?.panel_count ?? 0}</dd>
                    </div>
                    <div>
                      <dt>Installed</dt>
                      <dd>{arrayState ? formatWp(arrayState.installed_wp) : 'n/a'}</dd>
                    </div>
                    <div>
                      <dt>MPPT</dt>
                      <dd>{projectMppt?.name ?? 'Pending'}</dd>
                    </div>
                  </dl>
                </button>
              );
            })}
        </div>
        </section>

        <section className="panel">
          <div className="section-head">
            <h2>Monthly balance preview</h2>
            <p>The current export provides placeholder monthly rows, ready for the first calculation pipeline.</p>
          </div>
          <div className="month-list">
            {data.derived.monthly_balance.map((row) => (
              <div key={row.month} className={`month-row ${weakestMonth?.month === row.month ? 'month-row-active' : ''}`}>
                <span>{MONTH_LABELS[row.month] ?? row.month}</span>
                <span>{row.notes ?? 'No note'}</span>
              </div>
            ))}
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Warnings and next steps</h2>
          <p>The export is intentionally honest about what is provisional in this first implementation slice.</p>
        </div>
        <div className="warning-list">
          {data.derived.warnings.map((warning, index) => (
            <article key={`${warning.scope}-${index}`} className="warning-card">
              <span className={`warning-pill warning-${warning.severity}`}>{warning.severity}</span>
              <div>
                <strong>{warning.scope}</strong>
                <p>{warning.message}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
