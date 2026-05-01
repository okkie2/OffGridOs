import inquirer from 'inquirer';
import chalk from 'chalk';
import Database from 'better-sqlite3';
import {
  listSurfaces,
  listPanelTypes,
  listSurfacePanelAssignments,
  upsertSurfacePanelAssignment,
  deleteSurfacePanelAssignment,
} from '../../db/queries.js';
import { DEFAULT_PROJECT_ID } from '../../config/project.js';

export async function surfacePanelAssignmentsFlow(db: Database.Database): Promise<void> {
  while (true) {
    const surfaces = listSurfaces(db, DEFAULT_PROJECT_ID);
    const panelTypes = listPanelTypes(db);

    if (surfaces.length === 0) {
      console.log(chalk.yellow('No surfaces defined. Add a surface first.'));
      return;
    }
    if (panelTypes.length === 0) {
      console.log(chalk.yellow('No panel types defined. Add a panel type first.'));
      return;
    }

    const assignments = listSurfacePanelAssignments(db);

    const choices = [
      { name: 'Set panel count', value: 'set' },
      ...(assignments.length > 0 ? [
        { name: 'Remove panel count', value: 'delete' },
        { name: 'List panel counts', value: 'list' },
      ] : []),
      new inquirer.Separator(),
      { name: '← Back', value: 'back' },
    ];

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'Panel count',
      choices,
    }]);

    if (action === 'back') break;

    if (action === 'list') {
      console.log('');
      for (const a of assignments) {
        const surface = surfaces.find((item) => item.surface_id === a.surface_id);
        const panel = panelTypes.find((p) => p.panel_type_id === a.panel_type_id);
        console.log(
          chalk.cyan(`  ${a.surface_id}`) +
          `  ×${a.count}  ${panel?.model ?? a.panel_type_id}` +
          chalk.gray(`  (on ${surface?.name ?? a.surface_id})`)
        );
      }
      continue;
    }

    if (action === 'set') {
      const { surface_id } = await inquirer.prompt([{
        type: 'list',
        name: 'surface_id',
        message: 'Surface:',
        choices: surfaces.map((surface) => ({ name: `${surface.surface_id}  —  ${surface.name}`, value: surface.surface_id })),
      }]);

      const { panel_type_id } = await inquirer.prompt([{
        type: 'list',
        name: 'panel_type_id',
        message: 'Panel type:',
        choices: panelTypes.map((p) => ({ name: `${p.panel_type_id}  —  ${p.model}  ${p.wp} Wp`, value: p.panel_type_id })),
      }]);

      const existing = assignments.find(
        (assignment) => assignment.surface_id === surface_id && assignment.panel_type_id === panel_type_id
      );

      const { count } = await inquirer.prompt([{
        type: 'input',
        name: 'count',
        message: 'Panel count:',
        default: existing?.count?.toString(),
        validate: (v: string) => {
          const n = parseInt(v, 10);
          if (isNaN(n) || n <= 0) return 'Must be a positive integer';
          return true;
        },
        filter: (v: string) => parseInt(v, 10),
      }]);

      upsertSurfacePanelAssignment(db, { surface_id, panel_type_id, count });
      console.log(chalk.green('Panel count saved.'));
    }

    if (action === 'delete') {
      const { id } = await inquirer.prompt([{
        type: 'list',
        name: 'id',
        message: 'Select assignment to remove:',
        choices: assignments.map((a) => {
          const panel = panelTypes.find((p) => p.panel_type_id === a.panel_type_id);
          return {
            name: `${a.surface_id}  ×${a.count}  ${panel?.model ?? a.panel_type_id}`,
            value: a.id,
          };
        }),
      }]);
      deleteSurfacePanelAssignment(db, id);
      console.log(chalk.green('Assignment removed.'));
    }
  }
}
