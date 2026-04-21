import fs from 'fs';
import path from 'path';
import type { ValidationMessage } from '../domain/types.js';
import { buildDigitalTwinExport } from './exportDigitalTwin.js';

type DigitalTwinExport = ReturnType<typeof buildDigitalTwinExport>;

export interface ReportInput {
  exportData: DigitalTwinExport;
  validationMessages: ValidationMessage[];
  dbPath: string;
  generatedAt?: string;
  calculationStatus: 'ready' | 'blocked';
}

function escapeCell(value: unknown): string {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');
}

function markdownTable(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const lines = [
    `| ${headers.map(escapeCell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
  ];

  for (const row of rows) {
    lines.push(`| ${row.map(escapeCell).join(' | ')} |`);
  }

  return lines.join('\n');
}

function formatStatus(value?: string | null): string {
  if (!value) return 'n/a';
  return value.replaceAll('_', ' ');
}

function monthLabel(month: string): string {
  return month.charAt(0).toUpperCase() + month.slice(1);
}

function buildValidationSection(messages: ValidationMessage[]): string {
  const errors = messages.filter((message) => message.level === 'error');
  const warnings = messages.filter((message) => message.level === 'warning');
  const infos = messages.filter((message) => message.level === 'info');

  const lines = ['## Validation', '', `- Errors: ${errors.length}`, `- Warnings: ${warnings.length}`, `- Info: ${infos.length}`, ''];

  if (messages.length === 0) {
    lines.push('- No validation messages.');
    return lines.join('\n');
  }

  lines.push('### Messages', '');

  for (const message of messages) {
    lines.push(`- [${message.level}] ${message.message}`);
  }

  return lines.join('\n');
}

function buildSummarySection(exportData: DigitalTwinExport): string {
  const { summary } = exportData.derived;
  const monthlyOutput = exportData.derived.project_monthly_solar_output;
  const strongestMonth = monthlyOutput.reduce((best, current) => (current.monthly_kwh > best.monthly_kwh ? current : best), monthlyOutput[0] ?? null);
  const weakestMonth = monthlyOutput.reduce((worst, current) => (current.monthly_kwh < worst.monthly_kwh ? current : worst), monthlyOutput[0] ?? null);

  return [
    '## Project Summary',
    '',
    markdownTable(
      ['Metric', 'Value'],
      [
        ['Project', exportData.project.name],
        ['Location', exportData.project.location ? `${exportData.project.location.place_name}, ${exportData.project.location.country}` : 'n/a'],
        ['Surfaces', summary.surface_count],
        ['Arrays', summary.array_count],
        ['MPPT configurations', summary.mppt_configuration_count],
        ['Battery types', summary.battery_type_count],
        ['Inverter types', summary.inverter_type_count],
        ['Installed PV', `${summary.total_installed_wp.toLocaleString('en-US')} W`],
        ['Outside limits', summary.has_outside_limits ? 'yes' : 'no'],
        ['Strongest month', strongestMonth ? `${monthLabel(strongestMonth.month)} (${strongestMonth.monthly_kwh.toLocaleString('en-US')} kWh)` : 'n/a'],
        ['Weakest month', weakestMonth ? `${monthLabel(weakestMonth.month)} (${weakestMonth.monthly_kwh.toLocaleString('en-US')} kWh)` : 'n/a'],
      ],
    ),
  ].join('\n');
}

function buildLocationSection(exportData: DigitalTwinExport): string {
  const location = exportData.project.location;
  if (!location) {
    return ['## Location', '', 'No location is configured yet.'].join('\n');
  }

  return [
    '## Location',
    '',
    markdownTable(
      ['Field', 'Value'],
      [
        ['Country', location.country],
        ['Place', location.place_name],
        ['Latitude', location.latitude.toFixed(6)],
        ['Longitude', location.longitude.toFixed(6)],
        ['Northing', location.northing ?? 'n/a'],
        ['Easting', location.easting ?? 'n/a'],
      ],
    ),
  ].join('\n');
}

function buildSurfacesSection(exportData: DigitalTwinExport): string {
  const arraysBySurface = new Map(exportData.entities.pv_arrays.map((pvArray) => [pvArray.surface_id, pvArray]));
  const configsBySurface = new Map(exportData.entities.surface_configurations.map((configuration) => [configuration.surface_id, configuration]));
  const mpptByArray = new Map(exportData.entities.mppt_configurations.map((mppt) => [mppt.array_id, mppt]));
  const relationByArray = new Map(exportData.relationships.array_to_mppt.map((relation) => [relation.from_array_id, relation]));

  const rows = exportData.entities.surfaces.map((surface) => {
    const pvArray = arraysBySurface.get(surface.surface_id);
    const configuration = configsBySurface.get(surface.surface_id);
    const mppt = pvArray ? mpptByArray.get(pvArray.array_id) : null;
    const relation = pvArray ? relationByArray.get(pvArray.array_id) : null;
    return [
      surface.name,
      pvArray?.panel_type_id ?? 'n/a',
      pvArray?.panel_count ?? 0,
      pvArray?.installed_wp != null ? `${pvArray.installed_wp.toLocaleString('en-US')} W` : 'n/a',
      configuration?.panels_per_string ?? 'n/a',
      configuration?.parallel_strings ?? 'n/a',
      mppt?.name ?? 'n/a',
      formatStatus(relation?.evaluation.electrical_status),
      formatStatus(relation?.evaluation.fit_status ?? null),
    ];
  });

  return [
    '## Surfaces',
    '',
    markdownTable(
      ['Surface', 'Panel type', 'Panels', 'Installed PV', 'Panels/string', 'Parallel strings', 'MPPT', 'Electrical status', 'Fit status'],
      rows,
    ),
  ].join('\n');
}

function buildMonthlyOutputSection(exportData: DigitalTwinExport): string {
  return [
    '## Monthly Solar Output',
    '',
    markdownTable(
      ['Month', 'kWh/day', 'kWh/month', 'Notes'],
      exportData.derived.project_monthly_solar_output.map((row) => [
        monthLabel(row.month),
        row.average_daily_kwh.toFixed(2),
        row.monthly_kwh.toFixed(1),
        row.notes,
      ]),
    ),
  ].join('\n');
}

function buildBatteryAndInverterSection(exportData: DigitalTwinExport): string {
  const batteryBank = exportData.entities.battery_banks[0];
  const batteryState = exportData.derived.battery_bank_states[0];
  const batteryRelation = exportData.relationships.mppt_to_battery_bank[0];
  const inverter = exportData.entities.inverter_configurations[0];
  const inverterRelation = exportData.relationships.battery_bank_to_inverter[0];

  return [
    '## Battery and Inverter',
    '',
    markdownTable(
      ['Component', 'Value'],
      [
        ['Battery bank', batteryBank?.name ?? 'n/a'],
        ['Battery type', batteryBank?.battery_type_id ?? 'n/a'],
        ['Battery modules', batteryState?.module_count ?? batteryBank?.module_count ?? 'n/a'],
        ['Nominal voltage', batteryState?.nominal_voltage_v != null ? `${batteryState.nominal_voltage_v} V` : 'n/a'],
        ['Capacity', batteryState?.capacity_kwh != null ? `${batteryState.capacity_kwh} kWh` : 'n/a'],
        ['MPPT -> battery bank fit', batteryRelation ? `${formatStatus(batteryRelation.evaluation.electrical_status)} / ${batteryRelation.evaluation.notes}` : 'n/a'],
        ['Inverter', inverter?.name ?? 'n/a'],
        ['Inverter type', inverter?.inverter_id ?? 'n/a'],
        ['Battery bank -> inverter fit', inverterRelation ? `${formatStatus(inverterRelation.evaluation.electrical_status)} / ${inverterRelation.evaluation.notes}` : 'n/a'],
      ],
    ),
  ].join('\n');
}

function buildWarningsSection(exportData: DigitalTwinExport): string {
  if (exportData.derived.warnings.length === 0) {
    return ['## Warnings', '', 'No warnings were generated.'].join('\n');
  }

  return [
    '## Warnings',
    '',
    ...exportData.derived.warnings.map((warning) => `- [${warning.severity}] ${warning.scope}: ${warning.message}`),
  ].join('\n');
}

export function buildReportMarkdown(report: ReportInput): string {
  const lines = [
    '# OffGridOS Report',
    '',
    `Generated at: ${report.generatedAt ?? new Date().toISOString()}`,
    `Database: ${report.dbPath}`,
    `Calculation status: ${report.calculationStatus === 'ready' ? 'ready' : 'blocked by validation errors'}`,
    '',
    buildValidationSection(report.validationMessages),
    '',
    buildSummarySection(report.exportData),
    '',
    buildLocationSection(report.exportData),
    '',
    buildSurfacesSection(report.exportData),
    '',
    buildMonthlyOutputSection(report.exportData),
    '',
    buildBatteryAndInverterSection(report.exportData),
    '',
    buildWarningsSection(report.exportData),
    '',
  ];

  return lines.join('\n');
}

export function writeReportMarkdown(report: ReportInput, outPath: string): string {
  const resolvedOutPath = path.resolve(outPath);
  fs.writeFileSync(resolvedOutPath, `${buildReportMarkdown(report)}\n`, 'utf-8');
  return resolvedOutPath;
}
