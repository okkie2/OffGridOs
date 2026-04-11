import inquirer from 'inquirer';
import chalk from 'chalk';
import Database from 'better-sqlite3';
import { listMpptTypes, getMpptType, insertMpptType, updateMpptType, deleteMpptType } from '../../db/queries.js';
import type { MpptType } from '../../domain/types.js';

async function promptMppt(existing?: MpptType): Promise<Omit<MpptType, 'id'>> {
  const ans = await inquirer.prompt([
    {
      type: 'input',
      name: 'mppt_type_id',
      message: 'MPPT ID (unique key, e.g. my-mppt-150-60):',
      when: !existing,
      validate: (v: string) => v.trim().length > 0 || 'Required',
    },
    {
      type: 'input',
      name: 'model',
      message: 'Model name:',
      default: existing?.model,
      validate: (v: string) => v.trim().length > 0 || 'Required',
    },
    {
      type: 'input',
      name: 'max_voc',
      message: 'Max PV Voc (V):',
      default: existing?.max_voc?.toString(),
      validate: (v: string) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0',
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'max_pv_power',
      message: 'Max PV power (W):',
      default: existing?.max_pv_power?.toString(),
      validate: (v: string) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0',
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'max_charge_current',
      message: 'Max charge current (A):',
      default: existing?.max_charge_current?.toString(),
      validate: (v: string) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0',
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'nominal_battery_voltage',
      message: 'Nominal battery voltage (V):',
      default: existing?.nominal_battery_voltage?.toString(),
      validate: (v: string) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0',
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'notes',
      message: 'Notes (optional):',
      default: existing?.notes ?? '',
    },
  ]);

  return {
    mppt_type_id: existing?.mppt_type_id ?? ans.mppt_type_id,
    model: ans.model,
    max_voc: ans.max_voc,
    max_pv_power: ans.max_pv_power,
    max_charge_current: ans.max_charge_current,
    nominal_battery_voltage: ans.nominal_battery_voltage,
    notes: ans.notes || null,
  };
}

export async function mpptTypesFlow(db: Database.Database): Promise<void> {
  while (true) {
    const controllers = listMpptTypes(db);
    const choices = [
      { name: 'Add MPPT', value: 'add' },
      ...(controllers.length > 0 ? [
        { name: 'Edit MPPT', value: 'edit' },
        { name: 'Delete MPPT', value: 'delete' },
        { name: 'List MPPTs', value: 'list' },
      ] : []),
      new inquirer.Separator(),
      { name: '← Back', value: 'back' },
    ];

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'MPPT',
      choices,
    }]);

    if (action === 'back') break;

    if (action === 'list') {
      console.log('');
      for (const m of controllers) {
        console.log(
          chalk.cyan(`  ${m.mppt_type_id}`) +
          `  ${m.model}  |  Voc ${m.max_voc}V  ${m.max_charge_current}A  ${m.nominal_battery_voltage}V battery`
        );
      }
      continue;
    }

    if (action === 'add') {
      const data = await promptMppt();
      if (getMpptType(db, data.mppt_type_id)) {
        console.log(chalk.red(`MPPT ID "${data.mppt_type_id}" already exists.`));
      } else {
        insertMpptType(db, data);
        console.log(chalk.green('MPPT saved.'));
      }
      continue;
    }

    if (action === 'edit' || action === 'delete') {
      const { id } = await inquirer.prompt([{
        type: 'list',
        name: 'id',
        message: action === 'edit' ? 'Select MPPT to edit:' : 'Select MPPT to delete:',
        choices: controllers.map((m) => ({
          name: `${m.mppt_type_id}  —  ${m.model}`,
          value: m.mppt_type_id,
        })),
      }]);

      if (action === 'delete') {
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Delete MPPT "${id}"?`,
          default: false,
        }]);
        if (confirm) {
          deleteMpptType(db, id);
          console.log(chalk.green('MPPT deleted.'));
        }
      } else {
        const existing = getMpptType(db, id)!;
        const data = await promptMppt(existing);
        updateMpptType(db, data);
        console.log(chalk.green('MPPT updated.'));
      }
    }
  }
}
