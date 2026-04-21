import Database from 'better-sqlite3';
import type { ProjectInput } from '../domain/types.js';
import {
  getLocation,
  listSurfaces,
  listPanelTypes,
  listSurfacePanelAssignments,
  listMpptTypes,
  listBatteryTypes,
  getProjectPreferences,
} from './queries.js';

export function loadProjectInput(db: Database.Database): ProjectInput {
  return {
    location: getLocation(db)!,
    surfaces: listSurfaces(db),
    panelTypes: listPanelTypes(db),
    surfacePanelAssignments: listSurfacePanelAssignments(db),
    mpptTypes: listMpptTypes(db),
    batteryTypes: listBatteryTypes(db),
    projectPreferences: getProjectPreferences(db),
  };
}
