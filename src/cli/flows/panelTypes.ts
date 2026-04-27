import inquirer from 'inquirer';
import chalk from 'chalk';
import Database from 'better-sqlite3';
import { listPanelTypes, getPanelType, insertPanelType, updatePanelType, deletePanelType } from '../../db/queries.js';
import type { PanelType } from '../../domain/types.js';
import { generateUniqueCatalogId } from '../../domain/panel-type-id.js';

async function promptPanel(existing?: PanelType, existingIds: string[] = []): Promise<Omit<PanelType, 'id'>> {
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
      type: 'input',
      name: 'wp',
      message: 'Watt-peak (Wp):',
      default: existing?.wp?.toString(),
      validate: (v: string) => {
        const n = parseFloat(v);
        if (isNaN(n) || n <= 0) return 'Must be > 0';
        return true;
      },
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'voc',
      message: 'Open-circuit voltage Voc (V):',
      default: existing?.voc?.toString(),
      validate: (v: string) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0',
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'vmp',
      message: 'Max power voltage Vmp (V):',
      default: existing?.vmp?.toString(),
      validate: (v: string) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0',
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'isc',
      message: 'Short-circuit current Isc (A):',
      default: existing?.isc?.toString(),
      validate: (v: string) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0',
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'imp',
      message: 'Max power current Imp (A):',
      default: existing?.imp?.toString(),
      validate: (v: string) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0',
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'length_mm',
      message: 'Length (mm):',
      default: existing?.length_mm?.toString(),
      validate: (v: string) => (!isNaN(parseFloat(v)) && parseFloat(v) > 0) || 'Must be > 0',
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'width_mm',
      message: 'Width (mm):',
      default: existing?.width_mm?.toString(),
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
    panel_type_id: existing?.panel_type_id ?? generateUniqueCatalogId(ans.model, existingIds),
    brand: ans.brand,
    model: ans.model,
    wp: ans.wp,
    voc: ans.voc,
    vmp: ans.vmp,
    isc: ans.isc,
    imp: ans.imp,
    length_mm: ans.length_mm,
    width_mm: ans.width_mm,
    temp_coefficient_voc_pct_per_c: existing?.temp_coefficient_voc_pct_per_c ?? null,
    notes: ans.notes || null,
  };
}

export async function panelTypesFlow(db: Database.Database): Promise<void> {
  while (true) {
    const panels = listPanelTypes(db);
    const choices = [
      { name: 'Add panel type', value: 'add' },
      ...(panels.length > 0 ? [
        { name: 'Edit panel type', value: 'edit' },
        { name: 'Delete panel type', value: 'delete' },
        { name: 'List panel types', value: 'list' },
      ] : []),
      new inquirer.Separator(),
      { name: '← Back', value: 'back' },
    ];

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Panel type',
      choices,
    }]);

    if (action === 'back') break;

    if (action === 'list') {
      console.log('');
      for (const p of panels) {
        console.log(chalk.cyan(`  ${p.panel_type_id}`) + `  ${p.model}  |  ${p.wp} Wp  Voc ${p.voc}V  Vmp ${p.vmp}V`);
      }
      continue;
    }

    if (action === 'add') {
      const data = await promptPanel(undefined, panels.map((panel) => panel.panel_type_id));
      if (getPanelType(db, data.panel_type_id)) {
        console.log(chalk.red(`Panel type ID "${data.panel_type_id}" already exists.`));
      } else {
        insertPanelType(db, data);
        console.log(chalk.green(`Panel type saved as "${data.panel_type_id}".`));
      }
      continue;
    }

    if (action === 'edit' || action === 'delete') {
      const { id } = await inquirer.prompt([{
        type: 'list',
        name: 'id',
        message: action === 'edit' ? 'Select panel type to edit:' : 'Select panel type to delete:',
        choices: panels.map((p) => ({ name: `${p.panel_type_id}  —  ${p.model}  ${p.wp} Wp`, value: p.panel_type_id })),
      }]);

      if (action === 'delete') {
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Delete panel type "${id}" and all its panel count assignments?`,
          default: false,
        }]);
        if (confirm) {
          deletePanelType(db, id);
          console.log(chalk.green('Panel type deleted.'));
        }
      } else {
        const existing = getPanelType(db, id)!;
        const data = await promptPanel(existing);
        updatePanelType(db, data);
        console.log(chalk.green('Panel type updated.'));
      }
    }
  }
}
