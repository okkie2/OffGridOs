#!/usr/bin/env node
import { Command } from 'commander';
import { openDb } from '../db/connection.js';
import { initSchema } from '../db/schema.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { writeDigitalTwinExport } from '../output/index.js';

const program = new Command();

program
  .name('ogos')
  .description('OffGridOS — off-grid solar configuration tool')
  .version('0.1.0');

program
  .command('init')
  .description('Create a new project.db with the full schema')
  .option('--db <path>', 'Path to database file', 'project.db')
  .action((opts) => {
    const dbPath = path.resolve(opts.db);
    const exists = fs.existsSync(dbPath);
    const db = openDb(dbPath);
    initSchema(db);
    db.close();
    if (exists) {
      console.log(chalk.yellow(`Schema verified in existing database: ${dbPath}`));
    } else {
      console.log(chalk.green(`Project database created: ${dbPath}`));
    }
  });

program
  .command('run')
  .description('Validate input, run calculations, and print results')
  .option('--db <path>', 'Path to database file', 'project.db')
  .action(async (opts) => {
    const dbPath = path.resolve(opts.db);
    if (!fs.existsSync(dbPath)) {
      console.error(chalk.red(`No database found at ${dbPath}. Run \`ogos init\` first.`));
      process.exit(1);
    }
    // Deferred to Step 3–5
    const { runCalculations } = await import('../calc/runner.js');
    runCalculations(dbPath);
  });

program
  .command('export')
  .description('Export the current project as digital-twin JSON')
  .option('--db <path>', 'Path to database file', 'project.db')
  .option('--out <path>', 'Path to output JSON file', 'public/digital-twin.json')
  .action((opts) => {
    const dbPath = path.resolve(opts.db);
    if (!fs.existsSync(dbPath)) {
      console.error(chalk.red(`No database found at ${dbPath}. Run \`ogos init\` first.`));
      process.exit(1);
    }

    const db = openDb(dbPath);
    try {
      const outPath = writeDigitalTwinExport(db, dbPath, opts.out);
      console.log(chalk.green(`Digital twin export written: ${outPath}`));
    } finally {
      db.close();
    }
  });

program.parse();
