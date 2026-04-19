import chalk from 'chalk';
import path from 'path';
import { openDb } from '../db/connection.js';
import { loadProjectInput } from '../db/loader.js';
import { validate, hasErrors } from '../validation/index.js';
import { evaluateArrayToMpptFit, pickDerivedMpptType } from './arrayToMppt.js';
import type { ValidationMessage } from '../domain/types.js';
import { buildDigitalTwinExport } from '../output/exportDigitalTwin.js';
import { writeReportMarkdown } from '../output/report.js';

function printMessages(msgs: ValidationMessage[]): void {
  for (const m of msgs) {
    if (m.level === 'error')   console.log(chalk.red(`  ✖ ${m.message}`));
    if (m.level === 'warning') console.log(chalk.yellow(`  ⚠ ${m.message}`));
    if (m.level === 'info')    console.log(chalk.blue(`  ℹ ${m.message}`));
  }
}

function formatFitLabel(fitStatus?: string): string {
  return fitStatus ? fitStatus.replaceAll('_', ' ') : 'outside limits';
}

function printArrayToMpptPass(input: ReturnType<typeof loadProjectInput>): void {
  const panelTypeById = new Map(input.panelTypes.map((panelType) => [panelType.panel_type_id, panelType]));
  const roofFaceById = new Map(input.roofFaces.map((roofFace) => [roofFace.roof_face_id, roofFace]));

  console.log(chalk.cyan.bold('\nPV → MPPT first pass\n'));

  for (const assignment of input.roofPanels) {
    const roofFace = roofFaceById.get(assignment.roof_face_id);
    const panelType = panelTypeById.get(assignment.panel_type_id);

    if (!roofFace || !panelType) {
      console.log(chalk.yellow(`  ⚠ Skipping ${assignment.roof_face_id}: incomplete roof-face or panel-type data.`));
      continue;
    }

    const installedWp = panelType.wp * assignment.count;
    const derivedMppt = pickDerivedMpptType(panelType, assignment.count, installedWp, input.mpptTypes);

    if (!derivedMppt) {
      console.log(chalk.red(`  ✖ ${roofFace.name}: no provisional MPPT candidate found for ${assignment.count} × ${panelType.model}.`));
      continue;
    }

    const fit = evaluateArrayToMpptFit({
      panelType,
      panelCount: assignment.count,
      installedWp,
      mpptType: derivedMppt,
    });

    const statusColor = fit.electrical_status === 'outside_limits'
      ? chalk.red
      : fit.fit_status === 'optimal'
        ? chalk.green
        : fit.fit_status === 'acceptable'
          ? chalk.yellow
          : chalk.blue;

    console.log(
      `  ${statusColor('•')} ${chalk.bold(roofFace.name)} -> ${derivedMppt.model} `
      + `(${formatFitLabel(fit.fit_status)})`,
    );
    console.log(
      `    PV input ${fit.input_vmp_v} Vmp / ${fit.input_current_a} A / ${fit.input_power_w} W `
      + `| charge current ${fit.charge_current_a} A`,
    );
    console.log(`    Reasons: ${fit.reasons.join(', ')}`);
  }
}

export function runCalculations(dbPath: string): void {
  const db = openDb(dbPath);
  let input!: ReturnType<typeof loadProjectInput>;
  let exportData!: ReturnType<typeof buildDigitalTwinExport>;

  try {
    input = loadProjectInput(db);
    exportData = buildDigitalTwinExport(db, dbPath);
  } finally {
    db.close();
  }

  const msgs = validate(input);
  const errors = msgs.filter((m) => m.level === 'error');
  const warnings = msgs.filter((m) => m.level === 'warning');
  const infos = msgs.filter((m) => m.level === 'info');
  const reportPath = path.join(process.cwd(), 'report.md');
  const calculationStatus = errors.length > 0 ? 'blocked' : 'ready';

  if (errors.length > 0) {
    console.log(chalk.red.bold(`\n✖ Validation failed — ${errors.length} error(s)\n`));
    printMessages(errors);
  }
  if (warnings.length > 0) {
    console.log(chalk.yellow.bold(`\n⚠ ${warnings.length} warning(s)\n`));
    printMessages(warnings);
  }
  if (infos.length > 0) {
    console.log('');
    printMessages(infos);
  }

  if (hasErrors(msgs)) {
    console.log(chalk.red('\nFix the errors above before running calculations.'));
  }

  if (!hasErrors(msgs)) {
    console.log(chalk.green('\n✔ Validation passed.'));
  } else {
    console.log(chalk.yellow('\nValidation completed with blocking errors.'));
  }
  printArrayToMpptPass(input);
  if (hasErrors(msgs)) {
    console.log(chalk.yellow('\nBattery-bank, inverter, and monthly balance calculations are still to come.'));
  } else {
    console.log(chalk.green('\nReport data is ready.'));
  }

  const writtenPath = writeReportMarkdown(
    {
      exportData,
      validationMessages: msgs,
      dbPath,
      generatedAt: new Date().toISOString(),
      calculationStatus,
    },
    reportPath,
  );

  console.log(chalk.green(`\nReport written: ${writtenPath}`));
}
