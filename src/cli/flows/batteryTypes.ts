import inquirer from 'inquirer';
import chalk from 'chalk';
import Database from 'better-sqlite3';
import { listBatteryTypes, getBatteryType, insertBatteryType, updateBatteryType, deleteBatteryType } from '../../db/queries.js';
import type { BatteryType } from '../../domain/types.js';
import { generateUniqueCatalogId } from '../../domain/panel-type-id.js';

const CHEMISTRIES = ['LiFePO4', 'Li-ion', 'AGM', 'GEL', 'FLA'];
const COOLING = ['passive', 'active'] as const;

async function promptBattery(existing?: BatteryType, existingIds: string[] = []): Promise<Omit<BatteryType, 'id'>> {
  const ans = await inquirer.prompt([
    {
      type: 'input',
      name: 'brand',
      message: 'Brand name:',
      default: existing?.brand ?? '',
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
      type: 'list',
      name: 'chemistry',
      message: 'Chemistry:',
      choices: CHEMISTRIES,
      default: existing?.chemistry,
    },
    {
      type: 'input',
      name: 'nominal_voltage',
      message: 'Nominal voltage (V):',
      default: existing?.nominal_voltage?.toString(),
      validate: (v: string) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0',
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'capacity_ah',
      message: 'Capacity (Ah):',
      default: existing?.capacity_ah?.toString(),
      validate: (v: string) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0',
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'capacity_kwh',
      message: 'Capacity (kWh):',
      default: existing?.capacity_kwh?.toString(),
      validate: (v: string) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0',
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'max_charge_rate',
      message: 'Max charge rate (A, optional — leave blank to skip):',
      default: existing?.max_charge_rate?.toString() ?? '',
      filter: (v: string) => (v.trim() === '' ? null : parseFloat(v)),
    },
    {
      type: 'input',
      name: 'max_discharge_rate',
      message: 'Max discharge rate (A, optional — leave blank to skip):',
      default: existing?.max_discharge_rate?.toString() ?? '',
      filter: (v: string) => (v.trim() === '' ? null : parseFloat(v)),
    },
    {
      type: 'confirm',
      name: 'victron_can',
      message: 'Victron CAN compatibel (DVCC via BMS-Can)?',
      default: existing?.victron_can ?? false,
    },
    {
      type: 'list',
      name: 'cooling',
      message: 'Cooling:',
      choices: COOLING,
      default: existing?.cooling ?? 'passive',
    },
    {
      type: 'input',
      name: 'price',
      message: 'Price (EUR, optional — leave blank to skip):',
      default: existing?.price?.toString() ?? '',
      filter: (v: string) => (v.trim() === '' ? null : parseFloat(v)),
    },
    {
      type: 'input',
      name: 'source',
      message: 'Source URL (optional — leave blank to skip):',
      default: existing?.source ?? existing?.url ?? '',
      filter: (v: string) => (v.trim() === '' ? null : v.trim()),
    },
    {
      type: 'input',
      name: 'notes',
      message: 'Notes (optional):',
      default: existing?.notes ?? '',
    },
  ]);

  return {
    battery_type_id: existing?.battery_type_id ?? generateUniqueCatalogId(ans.model, existingIds),
    brand: ans.brand,
    model: ans.model,
    chemistry: ans.chemistry,
    nominal_voltage: ans.nominal_voltage,
    capacity_ah: ans.capacity_ah,
    capacity_kwh: ans.capacity_kwh,
    max_charge_rate: ans.max_charge_rate,
    max_discharge_rate: ans.max_discharge_rate,
    victron_can: ans.victron_can,
    cooling: ans.cooling,
    price: ans.price,
    price_per_kwh: ans.price && ans.capacity_kwh ? Math.round((ans.price / ans.capacity_kwh) * 100) / 100 : null,
    source: ans.source,
    url: ans.source,
    notes: ans.notes || null,
  };
}

export async function batteryTypesFlow(db: Database.Database): Promise<void> {
  while (true) {
    const batteries = listBatteryTypes(db);
    const choices = [
      { name: 'Add battery', value: 'add' },
      ...(batteries.length > 0 ? [
        { name: 'Edit battery', value: 'edit' },
        { name: 'Delete battery', value: 'delete' },
        { name: 'List batteries', value: 'list' },
      ] : []),
      new inquirer.Separator(),
      { name: '← Back', value: 'back' },
    ];

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Battery',
      choices,
    }]);

    if (action === 'back') break;

    if (action === 'list') {
      console.log('');
      for (const b of batteries) {
        console.log(
          chalk.cyan(`  ${b.battery_type_id}`) +
          `  ${b.model}  |  ${b.chemistry}  ${b.capacity_kwh} kWh  ${b.nominal_voltage}V  ${b.cooling}` +
          (b.price != null ? `  €${b.price} (${b.price_per_kwh ?? '?'} €/kWh)` : '')
        );
      }
      continue;
    }

    if (action === 'add') {
      const data = await promptBattery(undefined, batteries.map((battery) => battery.battery_type_id));
      insertBatteryType(db, data);
      console.log(chalk.green(`Battery saved as "${data.battery_type_id}".`));
      continue;
    }

    if (action === 'edit' || action === 'delete') {
      const { id } = await inquirer.prompt([{
        type: 'list',
        name: 'id',
        message: action === 'edit' ? 'Select battery to edit:' : 'Select battery to delete:',
        choices: batteries.map((b) => ({
          name: `${b.battery_type_id}  —  ${b.model}  ${b.capacity_kwh} kWh`,
          value: b.battery_type_id,
        })),
      }]);

      if (action === 'delete') {
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Delete battery "${id}"?`,
          default: false,
        }]);
        if (confirm) {
          deleteBatteryType(db, id);
          console.log(chalk.green('Battery deleted.'));
        }
      } else {
        const existing = getBatteryType(db, id)!;
        const data = await promptBattery(existing);
        updateBatteryType(db, data);
        console.log(chalk.green('Battery updated.'));
      }
    }
  }
}
