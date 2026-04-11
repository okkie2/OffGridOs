import inquirer from 'inquirer';
import chalk from 'chalk';
import Database from 'better-sqlite3';
import { getPreferences, setPref, listMpptTypes, listBatteryTypes } from '../../db/queries.js';

export async function preferencesFlow(db: Database.Database): Promise<void> {
  while (true) {
    const prefs = getPreferences(db);

    console.log(chalk.cyan('\nCurrent preferences:'));
    console.log(`  Target battery voltage:  ${prefs.target_battery_voltage ?? chalk.gray('not set')}`);
    console.log(`  Autonomy days:           ${prefs.autonomy_days ?? chalk.gray('not set')}`);
    console.log(`  Daily consumption (kWh): ${prefs.daily_consumption_kwh ?? chalk.gray('not set')}`);
    console.log(`  Max cable length (m):    ${prefs.max_cable_length_m ?? chalk.gray('not set')}`);
    console.log(`  Preferred MPPT:          ${prefs.preferred_mppt_type_id ?? chalk.gray('not set')}`);
    console.log(`  Preferred battery:       ${prefs.preferred_battery_type_id ?? chalk.gray('not set')}`);
    console.log('');

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Preferences',
      choices: [
        { name: 'Edit preferences', value: 'edit' },
        new inquirer.Separator(),
        { name: '← Back', value: 'back' },
      ],
    }]);

    if (action === 'back') break;

    const mppts = listMpptTypes(db);
    const batteries = listBatteryTypes(db);

    const ans = await inquirer.prompt([
      {
        type: 'list',
        name: 'target_battery_voltage',
        message: 'Target battery voltage (V):',
        choices: [
          { name: '12 V', value: '12' },
          { name: '24 V', value: '24' },
          { name: '48 V', value: '48' },
        ],
        default: prefs.target_battery_voltage?.toString() ?? '48',
      },
      {
        type: 'input',
        name: 'autonomy_days',
        message: 'Autonomy days (backup without sun):',
        default: (prefs.autonomy_days ?? 2).toString(),
        validate: (v: string) => {
          const n = parseFloat(v);
          return (!isNaN(n) && n > 0) || 'Must be > 0';
        },
      },
      {
        type: 'input',
        name: 'daily_consumption_kwh',
        message: 'Daily consumption (kWh):',
        default: prefs.daily_consumption_kwh?.toString() ?? '',
        validate: (v: string) => {
          if (v.trim() === '') return true;
          return (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0';
        },
      },
      {
        type: 'input',
        name: 'max_cable_length_m',
        message: 'Max cable length, panels to MPPT (m):',
        default: prefs.max_cable_length_m?.toString() ?? '',
        validate: (v: string) => {
          if (v.trim() === '') return true;
          return (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0';
        },
      },
      ...(mppts.length > 0 ? [{
        type: 'list',
        name: 'preferred_mppt_type_id',
        message: 'Preferred MPPT (optional):',
        choices: [
          { name: '(none)', value: '' },
          ...mppts.map((m) => ({ name: `${m.model}`, value: m.mppt_type_id })),
        ],
        default: prefs.preferred_mppt_type_id ?? '',
      }] : []),
      ...(batteries.length > 0 ? [{
        type: 'list',
        name: 'preferred_battery_type_id',
        message: 'Preferred battery (optional):',
        choices: [
          { name: '(none)', value: '' },
          ...batteries.map((b) => ({ name: `${b.model}  ${b.capacity_kwh} kWh`, value: b.battery_type_id })),
        ],
        default: prefs.preferred_battery_type_id ?? '',
      }] : []),
    ]);

    const keyMap: Record<string, string> = {
      target_battery_voltage: ans.target_battery_voltage,
      autonomy_days: ans.autonomy_days,
      daily_consumption_kwh: ans.daily_consumption_kwh,
      max_cable_length_m: ans.max_cable_length_m,
      preferred_mppt_type_id: ans.preferred_mppt_type_id ?? '',
      preferred_battery_type_id: ans.preferred_battery_type_id ?? '',
    };

    for (const [key, value] of Object.entries(keyMap)) {
      if (value !== '' && value !== undefined) {
        setPref(db, key, value);
      }
    }

    console.log(chalk.green('Preferences saved.'));
  }
}
