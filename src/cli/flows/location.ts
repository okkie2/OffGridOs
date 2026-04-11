import inquirer from 'inquirer';
import chalk from 'chalk';
import Database from 'better-sqlite3';
import { getLocation, upsertLocation } from '../../db/queries.js';

export async function locationFlow(db: Database.Database): Promise<void> {
  const existing = getLocation(db);

  if (existing) {
    console.log(chalk.cyan('\nCurrent location:'));
    console.log(`  Country:    ${existing.country}`);
    console.log(`  Place:      ${existing.place_name}`);
    console.log(`  Latitude:   ${existing.latitude}`);
    console.log(`  Longitude:  ${existing.longitude}`);
    console.log('');

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Location',
      choices: [
        { name: 'Edit', value: 'edit' },
        { name: '← Back', value: 'back' },
      ],
    }]);
    if (action === 'back') return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'country',
      message: 'Country:',
      default: existing?.country,
      validate: (v: string) => v.trim().length > 0 || 'Required',
    },
    {
      type: 'input',
      name: 'place_name',
      message: 'Place name:',
      default: existing?.place_name,
      validate: (v: string) => v.trim().length > 0 || 'Required',
    },
    {
      type: 'input',
      name: 'latitude',
      message: 'Latitude (-90 to 90):',
      default: existing?.latitude?.toString(),
      validate: (v: string) => {
        const n = parseFloat(v);
        if (isNaN(n)) return 'Must be a number';
        if (n < -90 || n > 90) return 'Must be between -90 and 90';
        return true;
      },
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'longitude',
      message: 'Longitude (-180 to 180):',
      default: existing?.longitude?.toString(),
      validate: (v: string) => {
        const n = parseFloat(v);
        if (isNaN(n)) return 'Must be a number';
        if (n < -180 || n > 180) return 'Must be between -180 and 180';
        return true;
      },
      filter: (v: string) => parseFloat(v),
    },
  ]);

  upsertLocation(db, answers);
  console.log(chalk.green('Location saved.'));
}
