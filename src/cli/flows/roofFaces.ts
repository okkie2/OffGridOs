import inquirer from 'inquirer';
import chalk from 'chalk';
import Database from 'better-sqlite3';
import { listSurfaces, getSurface, insertSurface, updateSurface, deleteSurface } from '../../db/queries.js';
import type { Surface } from '../../domain/types.js';

async function promptSurface(existing?: Surface): Promise<Omit<Surface, 'id'>> {
  const ans = await inquirer.prompt([
    {
      type: 'input',
      name: 'surface_id',
      message: 'Surface ID (unique key, e.g. south-1):',
      default: existing?.surface_id,
      when: !existing,
      validate: (v: string) => v.trim().length > 0 || 'Required',
    },
    {
      type: 'input',
      name: 'name',
      message: 'Name:',
      default: existing?.name,
      validate: (v: string) => v.trim().length > 0 || 'Required',
    },
    {
      type: 'input',
      name: 'orientation_deg',
      message: 'Orientation — azimuth (°): 0=N  90=E  140=SE  180=S  270=W',
      default: existing?.orientation_deg?.toString(),
      validate: (v: string) => {
        const n = parseFloat(v);
        if (isNaN(n)) return 'Must be a number';
        if (n < 0 || n > 360) return 'Must be 0–360';
        return true;
      },
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'tilt_deg',
      message: 'Tilt (°, 0=flat – 90=vertical):',
      default: existing?.tilt_deg?.toString(),
      validate: (v: string) => {
        const n = parseFloat(v);
        if (isNaN(n)) return 'Must be a number';
        if (n < 0 || n > 90) return 'Must be 0–90';
        return true;
      },
      filter: (v: string) => parseFloat(v),
    },
    {
      type: 'input',
      name: 'usable_area_m2',
      message: 'Usable area (m², optional — leave blank to skip):',
      default: existing?.usable_area_m2?.toString() ?? '',
      validate: (v: string) => {
        if (v.trim() === '') return true;
        const n = parseFloat(v);
        return (isNaN(n) || n <= 0) ? 'Must be > 0' : true;
      },
      filter: (v: string) => v.trim() === '' ? null : parseFloat(v),
    },
    {
      type: 'input',
      name: 'notes',
      message: 'Notes (optional):',
      default: existing?.notes ?? '',
    },
  ]);

  return {
    surface_id: existing?.surface_id ?? ans.surface_id,
    name: ans.name,
    orientation_deg: ans.orientation_deg,
    tilt_deg: ans.tilt_deg,
    usable_area_m2: ans.usable_area_m2,
    notes: ans.notes || null,
  };
}

export async function surfacesFlow(db: Database.Database): Promise<void> {
  while (true) {
    const surfaces = listSurfaces(db);
    const choices = [
      { name: 'Add surface', value: 'add' },
      ...(surfaces.length > 0 ? [
        { name: 'Edit surface', value: 'edit' },
        { name: 'Delete surface', value: 'delete' },
        { name: 'List surfaces', value: 'list' },
      ] : []),
      new inquirer.Separator(),
      { name: '← Back', value: 'back' },
    ];

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Surface',
      choices,
    }]);

    if (action === 'back') break;

    if (action === 'list') {
      console.log('');
      for (const surface of surfaces) {
        const area = surface.usable_area_m2 != null ? `  ${surface.usable_area_m2} m²` : '';
        console.log(chalk.cyan(`  ${surface.surface_id}`) + `  ${surface.name}  |  ${surface.orientation_deg}°  tilt ${surface.tilt_deg}°${area}`);
      }
      continue;
    }

    if (action === 'add') {
      const data = await promptSurface();
      if (getSurface(db, data.surface_id)) {
        console.log(chalk.red(`Surface ID "${data.surface_id}" already exists.`));
      } else {
        insertSurface(db, data);
        console.log(chalk.green('Surface saved.'));
      }
      continue;
    }

    if (action === 'edit' || action === 'delete') {
      const { id } = await inquirer.prompt([{
        type: 'list',
        name: 'id',
        message: action === 'edit' ? 'Select surface to edit:' : 'Select surface to delete:',
        choices: surfaces.map((surface) => ({ name: `${surface.surface_id}  —  ${surface.name}`, value: surface.surface_id })),
      }]);

      if (action === 'delete') {
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Delete surface "${id}" and all its panel count assignments?`,
          default: false,
        }]);
        if (confirm) {
          deleteSurface(db, id);
          console.log(chalk.green('Surface deleted.'));
        }
      } else {
        const existing = getSurface(db, id)!;
        const data = await promptSurface(existing);
        updateSurface(db, data);
        console.log(chalk.green('Surface updated.'));
      }
    }
  }
}
