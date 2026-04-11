import inquirer from 'inquirer';
import chalk from 'chalk';
import Database from 'better-sqlite3';
import {
  listRoofFaces,
  listPanelTypes,
  listRoofPanels,
  upsertRoofPanel,
  deleteRoofPanel,
} from '../../db/queries.js';

export async function roofPanelsFlow(db: Database.Database): Promise<void> {
  while (true) {
    const faces = listRoofFaces(db);
    const panelTypes = listPanelTypes(db);

    if (faces.length === 0) {
      console.log(chalk.yellow('No faces defined. Add a face first.'));
      return;
    }
    if (panelTypes.length === 0) {
      console.log(chalk.yellow('No panel types defined. Add a panel type first.'));
      return;
    }

    const assignments = listRoofPanels(db);

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
        const face = faces.find((f) => f.roof_face_id === a.roof_face_id);
        const panel = panelTypes.find((p) => p.panel_type_id === a.panel_type_id);
        console.log(
          chalk.cyan(`  ${a.roof_face_id}`) +
          `  ×${a.count}  ${panel?.model ?? a.panel_type_id}` +
          chalk.gray(`  (on ${face?.name ?? a.roof_face_id})`)
        );
      }
      continue;
    }

    if (action === 'set') {
      const { roof_face_id } = await inquirer.prompt([{
        type: 'list',
        name: 'roof_face_id',
        message: 'Face:',
        choices: faces.map((f) => ({ name: `${f.roof_face_id}  —  ${f.name}`, value: f.roof_face_id })),
      }]);

      const { panel_type_id } = await inquirer.prompt([{
        type: 'list',
        name: 'panel_type_id',
        message: 'Panel type:',
        choices: panelTypes.map((p) => ({ name: `${p.panel_type_id}  —  ${p.model}  ${p.wp} Wp`, value: p.panel_type_id })),
      }]);

      const existing = assignments.find(
        (a) => a.roof_face_id === roof_face_id && a.panel_type_id === panel_type_id
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

      upsertRoofPanel(db, { roof_face_id, panel_type_id, count });
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
            name: `${a.roof_face_id}  ×${a.count}  ${panel?.model ?? a.panel_type_id}`,
            value: a.id,
          };
        }),
      }]);
      deleteRoofPanel(db, id);
      console.log(chalk.green('Assignment removed.'));
    }
  }
}
