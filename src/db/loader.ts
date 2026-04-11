import Database from 'better-sqlite3';
import type { ProjectInput } from '../domain/types.js';
import {
  getLocation,
  listRoofFaces,
  listPanelTypes,
  listRoofPanels,
  listMpptTypes,
  listBatteryTypes,
  getPreferences,
} from './queries.js';

export function loadProjectInput(db: Database.Database): ProjectInput {
  return {
    location: getLocation(db)!,
    roofFaces: listRoofFaces(db),
    panelTypes: listPanelTypes(db),
    roofPanels: listRoofPanels(db),
    mpptTypes: listMpptTypes(db),
    batteryTypes: listBatteryTypes(db),
    preferences: getPreferences(db),
  };
}
