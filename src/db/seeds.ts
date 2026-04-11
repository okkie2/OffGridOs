import Database from 'better-sqlite3';

const BATTERY_TYPES: Array<{
  battery_type_id: string;
  model: string;
  chemistry: string;
  nominal_voltage: number;
  capacity_ah: number;
  capacity_kwh: number;
  victron_can: number;
  cooling: 'active' | 'passive';
  price?: number | null;
  price_per_kwh?: number | null;
  source?: string | null;
  url?: string | null;
  notes: string;
}> = [
  {
    battery_type_id: 'pylontech-us5000-1c',
    model: 'Pylontech US5000-1C',
    chemistry: 'LiFePO4',
    nominal_voltage: 48,
    capacity_ah: 100,
    capacity_kwh: 4.8,
    victron_can: 1,
    cooling: 'passive',
    price: 655,
    price_per_kwh: 136.46,
    source: 'https://sunnergie.com/product/pylon-us5000-4-8kwh-lithium-battery/',
    url: 'https://sunnergie.com/product/pylon-us5000-4-8kwh-lithium-battery/',
    notes: 'Reference model. Cheapest found via Google search: Sunnergie.',
  },
  {
    battery_type_id: 'byd-bbox-lv',
    model: 'BYD B-Box LV (per module)',
    chemistry: 'LiFePO4',
    nominal_voltage: 48,
    capacity_ah: 83,
    capacity_kwh: 4.0,
    victron_can: 1,
    cooling: 'passive',
    price: 1320,
    price_per_kwh: 330.0,
    source: 'https://shop-rebor.com/en/products/byd-battery-box-lvs-4-0',
    url: 'https://shop-rebor.com/en/products/byd-battery-box-lvs-4-0',
    notes: 'Modular stack, cheapest found via Google search: Rebor B.V.',
  },
  {
    battery_type_id: 'dyness-b4850',
    model: 'Dyness B4850 (per module)',
    chemistry: 'LiFePO4',
    nominal_voltage: 48,
    capacity_ah: 50,
    capacity_kwh: 2.4,
    victron_can: 1,
    cooling: 'passive',
    price: 387.5,
    price_per_kwh: 161.46,
    source: 'https://www.nrjdeals.com/produit/dyness-b4850/',
    url: 'https://www.nrjdeals.com/produit/dyness-b4850/',
    notes: 'Victron CAN compatibel, cheapest found via Google search: NRJ Deals.',
  },
  {
    battery_type_id: 'pylontech-pelio-l',
    model: 'Pylontech Pelio-L (per module)',
    chemistry: 'LiFePO4',
    nominal_voltage: 51.2,
    capacity_ah: 100,
    capacity_kwh: 5.12,
    victron_can: 1,
    cooling: 'passive',
    price: 862,
    price_per_kwh: 168.36,
    source: 'https://www.itstechnologies.shop/products/pylontech-pelio-l-5-12-lv-battery-module',
    url: 'https://www.itstechnologies.shop/products/pylontech-pelio-l-5-12-lv-battery-module',
    notes: 'Victron CAN gecertificeerd, cheapest found via Google search: ITS Technologies. Price shown as GBP + VAT.',
  },
  {
    battery_type_id: 'pytes-ebox-48100r',
    model: 'Pytes E-BOX-48100R (per module)',
    chemistry: 'LiFePO4',
    nominal_voltage: 51.2,
    capacity_ah: 100,
    capacity_kwh: 5.12,
    victron_can: 1,
    cooling: 'passive',
    price: 626,
    price_per_kwh: 122.27,
    source: 'https://www.stromzone.com/en/product/pytes-e-box-48100r',
    url: 'https://www.stromzone.com/en/product/pytes-e-box-48100r',
    notes: 'Victron CAN compatibel, cheapest found via Google search: Stromzone.',
  },
  {
    battery_type_id: 'bslbatt-b-lfp48-100e',
    model: 'BSLBATT B-LFP48-100E',
    chemistry: 'LiFePO4',
    nominal_voltage: 48,
    capacity_ah: 100,
    capacity_kwh: 5.12,
    victron_can: 1,
    cooling: 'passive',
    price: 969,
    price_per_kwh: 189.26,
    source: 'https://www.erm-energies.com/lithium/815-batterie-bslbatt-b-lfp48-100e-48-v-512-kwh.html',
    url: 'https://www.erm-energies.com/lithium/815-batterie-bslbatt-b-lfp48-100e-48-v-512-kwh.html',
    notes: 'Victron CAN compatibel, cheapest found via Google search: ERM Energies.',
  },
  {
    battery_type_id: 'zyc-simpo-5000',
    model: 'ZYC SIMPO 5000 LiFePO4 51.2V/100Ah 5.12kWh',
    chemistry: 'LiFePO4',
    nominal_voltage: 51.2,
    capacity_ah: 100,
    capacity_kwh: 5.12,
    victron_can: 1,
    cooling: 'passive',
    price: 1095.4,
    price_per_kwh: 213.95,
    source: 'https://panpower.eu/pl/systemy-magazynowania/5059-zyc-energy-simpo-5000-5kwh-512v.html',
    url: 'https://panpower.eu/pl/systemy-magazynowania/5059-zyc-energy-simpo-5000-5kwh-512v.html',
    notes: 'Victron-compatible battery module. Cheapest found via Google search: Panpower.',
  },
];

/**
 * Built-in Victron SmartSolar MPPT controller reference data.
 * max_pv_power is derived as max_charge_current × 48V (highest supported battery voltage).
 * nominal_battery_voltage is stored as 48 (the highest supported); the tool uses this
 * for sizing at 12/24/48 by checking all supported voltages.
 */
const VICTRON_MPPT: Array<{
  mppt_type_id: string;
  model: string;
  max_voc: number;
  max_pv_power: number;
  max_charge_current: number;
  nominal_battery_voltage: number;
}> = [
  { mppt_type_id: 'victron-75-10',   model: 'SmartSolar 75/10',   max_voc: 75,  max_charge_current: 10,  nominal_battery_voltage: 48, max_pv_power: 10  * 48 },
  { mppt_type_id: 'victron-75-15',   model: 'SmartSolar 75/15',   max_voc: 75,  max_charge_current: 15,  nominal_battery_voltage: 48, max_pv_power: 15  * 48 },
  { mppt_type_id: 'victron-100-15',  model: 'SmartSolar 100/15',  max_voc: 100, max_charge_current: 15,  nominal_battery_voltage: 48, max_pv_power: 15  * 48 },
  { mppt_type_id: 'victron-100-20',  model: 'SmartSolar 100/20',  max_voc: 100, max_charge_current: 20,  nominal_battery_voltage: 48, max_pv_power: 20  * 48 },
  { mppt_type_id: 'victron-150-35',  model: 'SmartSolar 150/35',  max_voc: 150, max_charge_current: 35,  nominal_battery_voltage: 48, max_pv_power: 35  * 48 },
  { mppt_type_id: 'victron-150-45',  model: 'SmartSolar 150/45',  max_voc: 150, max_charge_current: 45,  nominal_battery_voltage: 48, max_pv_power: 45  * 48 },
  { mppt_type_id: 'victron-150-60',  model: 'SmartSolar 150/60',  max_voc: 150, max_charge_current: 60,  nominal_battery_voltage: 48, max_pv_power: 60  * 48 },
  { mppt_type_id: 'victron-150-70',  model: 'SmartSolar 150/70',  max_voc: 150, max_charge_current: 70,  nominal_battery_voltage: 48, max_pv_power: 70  * 48 },
  { mppt_type_id: 'victron-150-85',  model: 'SmartSolar 150/85',  max_voc: 150, max_charge_current: 85,  nominal_battery_voltage: 48, max_pv_power: 85  * 48 },
  { mppt_type_id: 'victron-150-100', model: 'SmartSolar 150/100', max_voc: 150, max_charge_current: 100, nominal_battery_voltage: 48, max_pv_power: 100 * 48 },
  { mppt_type_id: 'victron-250-60',  model: 'SmartSolar 250/60',  max_voc: 250, max_charge_current: 60,  nominal_battery_voltage: 48, max_pv_power: 60  * 48 },
  { mppt_type_id: 'victron-250-70',  model: 'SmartSolar 250/70',  max_voc: 250, max_charge_current: 70,  nominal_battery_voltage: 48, max_pv_power: 70  * 48 },
  { mppt_type_id: 'victron-250-85',  model: 'SmartSolar 250/85',  max_voc: 250, max_charge_current: 85,  nominal_battery_voltage: 48, max_pv_power: 85  * 48 },
  { mppt_type_id: 'victron-250-100', model: 'SmartSolar 250/100', max_voc: 250, max_charge_current: 100, nominal_battery_voltage: 48, max_pv_power: 100 * 48 },
  { mppt_type_id: 'victron-mrs-48-6000-100-450-100', model: 'Multi RS Solar 48/6000/100-450/100', max_voc: 450, max_charge_current: 100, nominal_battery_voltage: 48, max_pv_power: 6000 },
];

export function seedMpptTypes(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO mppt_types
      (mppt_type_id, model, max_voc, max_pv_power, max_charge_current, nominal_battery_voltage)
    VALUES
      (@mppt_type_id, @model, @max_voc, @max_pv_power, @max_charge_current, @nominal_battery_voltage)
  `);
  const insertAll = db.transaction((rows: typeof VICTRON_MPPT) => {
    for (const row of rows) insert.run(row);
  });
  insertAll(VICTRON_MPPT);
}

export function seedBatteryTypes(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO battery_types
      (battery_type_id, model, chemistry, nominal_voltage, capacity_ah, capacity_kwh, victron_can, cooling, price, price_per_kwh, source, url, notes)
    VALUES
      (@battery_type_id, @model, @chemistry, @nominal_voltage, @capacity_ah, @capacity_kwh, @victron_can, @cooling, @price, @price_per_kwh, @source, @url, @notes)
  `);
  const insertAll = db.transaction((rows: typeof BATTERY_TYPES) => {
    for (const row of rows) insert.run({
      ...row,
      cooling: row.cooling,
      price: row.price ?? null,
      price_per_kwh: row.price_per_kwh ?? null,
      source: row.source ?? null,
      url: row.url ?? null,
    });
  });
  insertAll(BATTERY_TYPES);
}
