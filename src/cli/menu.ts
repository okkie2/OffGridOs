import inquirer from 'inquirer';
import chalk from 'chalk';
import { openDb } from '../db/connection.js';
import { initSchema } from '../db/schema.js';
import { locationFlow } from './flows/location.js';
import { surfacesFlow } from './flows/roofFaces.js';
import { panelTypesFlow } from './flows/panelTypes.js';
import { surfacePanelAssignmentsFlow } from './flows/roofPanels.js';
import { mpptTypesFlow } from './flows/mpptTypes.js';
import { batteryTypesFlow } from './flows/batteryTypes.js';
import { preferencesFlow } from './flows/preferences.js';
import { runCalculations } from '../calc/runner.js';
import fs from 'fs';
import path from 'path';
import { resolveDatabasePath } from '../config/runtime.js';
import { formatPublishSummary, publishLocalDatabase } from './publish-database.js';

const DB_PATH = resolveDatabasePath();

function getDb() {
  if (!fs.existsSync(DB_PATH)) {
    console.log(chalk.red('No project.db found. Use Project → Init new project first.'));
    return null;
  }
  return openDb(DB_PATH);
}

async function mainMenu(): Promise<void> {
  while (true) {
    console.log('');
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: chalk.bold('OffGridOS'),
        choices: [
          { name: 'Project', value: 'project' },
          { name: 'Input', value: 'input' },
          { name: 'Calculate', value: 'calculate' },
          { name: 'Report', value: 'report' },
          new inquirer.Separator(),
          { name: 'Quit', value: 'quit' },
        ],
      },
    ]);

    if (choice === 'quit') break;
    if (choice === 'project') await projectMenu();
    if (choice === 'input') await inputMenu();
    if (choice === 'calculate') await calculateMenu();
    if (choice === 'report') await reportMenu();
  }
}

async function projectMenu(): Promise<void> {
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Project',
      choices: [
        { name: 'Init new project  (creates project.db)', value: 'init' },
        { name: 'Publish local database to Railway', value: 'publish_db' },
        new inquirer.Separator(),
        { name: '← Back', value: 'back' },
      ],
    },
  ]);
  if (choice === 'init') {
    const db = openDb(DB_PATH);
    initSchema(db);
    db.close();
    console.log(chalk.green(`project.db ready at ${DB_PATH}`));
  } else if (choice === 'publish_db') {
    try {
      const result = await publishLocalDatabase();
      console.log(chalk.green(formatPublishSummary(result)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(message));
    }
  }
}

async function inputMenu(): Promise<void> {
  while (true) {
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'Input',
        choices: [
          { name: 'Location', value: 'location' },
          { name: 'Surface', value: 'surfaces' },
          { name: 'Panel type', value: 'panel_types' },
          { name: 'Panel count', value: 'surface_panel_assignments' },
          { name: 'MPPT', value: 'mppt_types' },
          { name: 'Battery', value: 'battery_types' },
          { name: 'Preferences', value: 'preferences' },
          new inquirer.Separator(),
          { name: '← Back', value: 'back' },
        ],
      },
    ]);

    if (choice === 'back') break;

    const db = getDb();
    if (!db) break;

    try {
      if (choice === 'location') await locationFlow(db);
      if (choice === 'surfaces') await surfacesFlow(db);
      if (choice === 'panel_types') await panelTypesFlow(db);
      if (choice === 'surface_panel_assignments') await surfacePanelAssignmentsFlow(db);
      if (choice === 'mppt_types') await mpptTypesFlow(db);
      if (choice === 'battery_types') await batteryTypesFlow(db);
      if (choice === 'preferences') await preferencesFlow(db);
    } finally {
      db.close();
    }
  }
}

async function calculateMenu(): Promise<void> {
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Calculate',
      choices: [
        { name: 'Run calculations', value: 'run' },
        new inquirer.Separator(),
        { name: '← Back', value: 'back' },
      ],
    },
  ]);
  if (choice === 'run') {
    const db = getDb();
    if (!db) return;
    db.close();
    runCalculations(DB_PATH);
  }
}

async function reportMenu(): Promise<void> {
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Report',
      choices: [
        { name: 'View last report', value: 'view' },
        new inquirer.Separator(),
        { name: '← Back', value: 'back' },
      ],
    },
  ]);
  if (choice === 'view') {
    const reportPath = path.join(process.cwd(), 'report.md');
    if (!fs.existsSync(reportPath)) {
      console.log(chalk.yellow('No report.md found. Run calculations first.'));
    } else {
      console.log('\n' + fs.readFileSync(reportPath, 'utf-8'));
    }
  }
}

mainMenu().catch((err) => {
  console.error(err);
  process.exit(1);
});
