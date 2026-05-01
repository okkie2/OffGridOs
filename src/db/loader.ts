import Database from 'better-sqlite3';
import type { ProjectInput } from '../domain/types.js';
import { DEFAULT_PROJECT_ID } from '../config/project.js';
import {
  getLocation,
  listSurfaces,
  listPanelTypes,
  listSurfacePanelAssignments,
  listMpptTypes,
  listBatteryTypes,
  getProjectPreferences,
} from './queries.js';

export function loadProjectInput(db: Database.Database, projectId = DEFAULT_PROJECT_ID): ProjectInput {
  return {
    location: getLocation(db, projectId)!,
    surfaces: listSurfaces(db, projectId),
    panelTypes: listPanelTypes(db),
    surfacePanelAssignments: listSurfacePanelAssignments(db),
    mpptTypes: listMpptTypes(db),
    batteryTypes: listBatteryTypes(db),
    projectPreferences: getProjectPreferences(db, projectId),
  };
}
