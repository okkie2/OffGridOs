import inquirer from 'inquirer';
import chalk from 'chalk';
import Database from 'better-sqlite3';
import { listMpptTypes, getMpptType, insertMpptType, updateMpptType, deleteMpptType } from '../../db/queries.js';
import type { MpptType } from '../../domain/types.js';
import { generateUniqueCatalogId } from '../../domain/panel-type-id.js';

async function promptMppt(existing?: MpptType, existingIds: string[] = []): Promise<Omit<MpptType, 'id'>> {
  const ans = await inquirer.prompt([
    {
      type: 'input',
      name: 'model',
      message: 'Model name:',
      default: existing?.model,
      validate: (v: string) => v.trim().length > 0 || 'Required',
    },
    {
      type: 'input',
      name: 'tracker_count',
      message: 'MPPT tracker count:',
      default: existing?.tracker_count?.toString() ?? '1',
      validate: (v: string) => (!isNaN(parseFloat(v)) && parseInt(v, 10) > 0) || 'Must be > 0',
      filter: (v: string) => parseInt(v, 10),
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
      name: 'max_pv_input_current_a',
      message: 'Max PV input current per tracker (A, optional):',
      default: existing?.max_pv_input_current_a?.toString() ?? '',
      validate: (v: string) => v.trim() === '' || (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0',
      filter: (v: string) => (v.trim() === '' ? null : parseFloat(v)),
    },
    {
      type: 'input',
      name: 'max_pv_short_circuit_current_a',
      message: 'Max PV short-circuit current per tracker (A, optional):',
      default: existing?.max_pv_short_circuit_current_a?.toString() ?? '',
      validate: (v: string) => v.trim() === '' || (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0',
      filter: (v: string) => (v.trim() === '' ? null : parseFloat(v)),
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
    mppt_type_id: existing?.mppt_type_id ?? generateUniqueCatalogId(ans.model, existingIds),
    model: ans.model,
    tracker_count: ans.tracker_count,
    max_voc: ans.max_voc,
    max_pv_power: ans.max_pv_power,
    max_pv_input_current_a: ans.max_pv_input_current_a,
    max_pv_short_circuit_current_a: ans.max_pv_short_circuit_current_a,
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
        const perTrackerPower = m.tracker_count > 0 ? Math.round(m.max_pv_power / m.tracker_count) : m.max_pv_power;
        console.log(
          chalk.cyan(`  ${m.mppt_type_id}`) +
          `  ${m.model}  |  ${m.tracker_count} tracker(s)  ${m.max_voc}V Voc  ${perTrackerPower}W/tracker  ${m.max_charge_current}A charge`
        );
      }
      continue;
    }

    if (action === 'add') {
      const data = await promptMppt(undefined, controllers.map((mppt) => mppt.mppt_type_id));
      insertMpptType(db, data);
      console.log(chalk.green(`MPPT saved as "${data.mppt_type_id}".`));
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
