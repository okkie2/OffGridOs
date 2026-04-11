import chalk from 'chalk';
import { openDb } from '../db/connection.js';
import { loadProjectInput } from '../db/loader.js';
import { validate, hasErrors } from '../validation/index.js';
import type { ValidationMessage } from '../domain/types.js';

function printMessages(msgs: ValidationMessage[]): void {
  for (const m of msgs) {
    if (m.level === 'error')   console.log(chalk.red(`  ✖ ${m.message}`));
    if (m.level === 'warning') console.log(chalk.yellow(`  ⚠ ${m.message}`));
    if (m.level === 'info')    console.log(chalk.blue(`  ℹ ${m.message}`));
  }
}

export function runCalculations(dbPath: string): void {
  const db = openDb(dbPath);
  const input = loadProjectInput(db);
  db.close();

  const msgs = validate(input);
  const errors = msgs.filter((m) => m.level === 'error');
  const warnings = msgs.filter((m) => m.level === 'warning');
  const infos = msgs.filter((m) => m.level === 'info');

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
    return;
  }

  console.log(chalk.green('\n✔ Validation passed.'));
  console.log(chalk.yellow('Calculations coming in Step 4.'));
}
