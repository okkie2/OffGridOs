import Database from 'better-sqlite3';

const BATTERY_TYPES: Array<{
  battery_type_id: string;
  brand: string;
  model: string;
  chemistry: string;
  nominal_voltage: number;
  capacity_ah: number;
  capacity_kwh: number;
  max_charge_rate?: number | null;
  max_discharge_rate?: number | null;
  victron_can: number;
  cooling: 'active' | 'passive';
  price?: number | null;
  price_per_kwh?: number | null;
  price_source_url?: string | null;
  source?: string | null;
  url?: string | null;
  notes: string;
}> = [
  {
    battery_type_id: 'pylontech-us5000-1c',
    brand: 'Pylontech',
    model: 'US5000-1C',
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
    brand: 'BYD',
    model: 'B-Box LV (per module)',
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
    brand: 'Dyness',
    model: 'B4850 (per module)',
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
    brand: 'Pylontech',
    model: 'Pelio-L (per module)',
    chemistry: 'LiFePO4',
    nominal_voltage: 51.2,
    capacity_ah: 100,
    capacity_kwh: 5.12,
    max_discharge_rate: 100,
    victron_can: 1,
    cooling: 'passive',
    price: 862,
    price_per_kwh: 168.36,
    source: 'https://www.itstechnologies.shop/products/pylontech-pelio-l-5-12-lv-battery-module',
    url: 'https://www.itstechnologies.shop/products/pylontech-pelio-l-5-12-lv-battery-module',
    notes: 'Victron CAN gecertificeerd, cheapest found via Google search: ITS Technologies. Price shown as GBP + VAT.',
  },
  {
    battery_type_id: 'mg-lfp-25-6v-230ah-5800wh',
    brand: 'MG',
    model: 'LFP Battery 25.6V/230Ah/5800Wh',
    chemistry: 'LiFePO4',
    nominal_voltage: 25.6,
    capacity_ah: 230,
    capacity_kwh: 5.8,
    victron_can: 1,
    cooling: 'passive',
    price: 1769.6,
    price_per_kwh: 305.1,
    source: 'https://www.dynastart.nl/mg-lfp-battery-25-6v-230ah-5800wh',
    url: 'https://www.dynastart.nl/mg-lfp-battery-25-6v-230ah-5800wh',
    notes: 'Dynastart product page. Article number MGLFP240230. LiFePO4 module with integrated slave BMS, CAN-Bus communication and Victron compatibility; 25.6 V, 230 Ah, 5.8 kWh, approx. 41 kg, modular stackable system.',
  },
  {
    battery_type_id: 'pytes-ebox-48100r',
    brand: 'Pytes',
    model: 'E-BOX-48100R (per module)',
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
    brand: 'BSLBATT',
    model: 'B-LFP48-100E',
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
    brand: 'ZYC',
    model: 'SIMPO 5000 LiFePO4 51.2V/100Ah 5.12kWh',
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
    notes: 'ZYC Energy SIMPO 5000 brochure: LiFePO4 module, 51.2 V, 100 Ah, 5.12 kWh usable, CAN/RS485 or self-managed communication, charging to -10 C, discharging to -20 C, hot-swappable, auto-setup, up to 80 units in parallel, and pre-wired cabinets for 6 or 10 batteries.',
  },
  {
    battery_type_id: 'voltsmile-v10-5120wh',
    brand: 'Voltsmile',
    model: 'V10 5.12kWh 100A 6000 cycli',
    chemistry: 'LiFePO4',
    nominal_voltage: 51.2,
    capacity_ah: 100,
    capacity_kwh: 5.12,
    max_discharge_rate: 100,
    victron_can: 1,
    cooling: 'passive',
    price: 1097.36,
    price_per_kwh: 214.33,
    price_source_url: 'https://www.accutotaal.com/voltsmile-v10-5-12kwh-100a-6000-cycli.html',
    source: 'https://www.accutotaal.com/voltsmile-v10-5-12kwh-100a-6000-cycli.html',
    url: 'https://www.accutotaal.com/voltsmile-v10-5-12kwh-100a-6000-cycli.html',
    notes: 'AccuTotaal.com artikel BAT406410028. LiFePO4, 51.2 V, 100 Ah, 5.12 kWh, 42 kg, 130×470×440 mm. Spec: 6000 cycli, 6DIP. Speciale prijs €1097,36 (adviesprijs €1276,00).',
  },
  {
    battery_type_id: 'rs-series-rs230',
    brand: 'RS',
    model: 'RS230',
    chemistry: 'LiFePO4',
    nominal_voltage: 51.2,
    capacity_ah: 230,
    capacity_kwh: 11.78,
    victron_can: 0,
    cooling: 'passive',
    price: null,
    price_per_kwh: null,
    source: null,
    url: null,
    notes: 'Industrial modular battery system. User brief: 51.2 V, 230 Ah, approx. 11.8 kWh per module, about 95 kg, stackable to larger high-voltage systems.',
  },
];

const VICTRON_PRICE_LIST_URL = 'https://www.victronenergy.nl/media/pricelist/Pricelist_Victron_EUR_C_2026-Q1_Web.pdf';
const VICTRON_PRICE_LIST_Q2_2026_URL = 'https://www.victronenergy.com/media/pricelist/Pricelist_Victron_EUR_C_2026-Q2_web.pdf';

const INVERTER_TYPES: Array<{
  inverter_id: string;
  brand?: string;
  model: string;
  input_voltage_v: number;
  output_voltage_v: number;
  continuous_power_w: number;
  peak_power_va: number;
  max_charge_current_a: number;
  efficiency_pct?: number | null;
  price?: number | null;
  price_source_url?: string | null;
  notes?: string | null;
}> = [
  {
    inverter_id: 'victron-mp2-48-3000',
    model: 'Multiplus-II 48/3000/35-32',
    input_voltage_v: 48,
    output_voltage_v: 230,
    continuous_power_w: 2400,
    peak_power_va: 3000,
    max_charge_current_a: 35,
    efficiency_pct: 96,
    price: 1007,
    price_source_url: 'https://stroomwinkel.nl/victron-multiplus-ii-48-3000-35-32-5096.html',
    notes: 'Single AC input',
  },
  {
    inverter_id: 'victron-mp2-48-5000',
    model: 'Multiplus-II 48/5000/70-50',
    input_voltage_v: 48,
    output_voltage_v: 230,
    continuous_power_w: 4000,
    peak_power_va: 5000,
    max_charge_current_a: 70,
    efficiency_pct: 96,
    price: 1701.45,
    price_source_url: 'https://stroomwinkel.nl/victron-multiplus-ii-48-5000-70-50-230v.html',
    notes: 'Single AC input',
  },
  {
    inverter_id: 'victron-mp2-48-8000',
    model: 'Multiplus-II 48/8000/110-100',
    input_voltage_v: 48,
    output_voltage_v: 230,
    continuous_power_w: 6400,
    peak_power_va: 8000,
    max_charge_current_a: 110,
    efficiency_pct: 96,
    price: 1473.45,
    price_source_url: 'https://stroomwinkel.nl/omv-la/omv-la-combis/victron-multiplus-ii-48-8000-110-100-100-230v.html',
    notes: 'Single AC input',
  },
  {
    inverter_id: 'victron-mrs-48-6000-100-450-100',
    model: 'Multi RS Solar 48/6000/100-450/100',
    input_voltage_v: 48,
    output_voltage_v: 230,
    continuous_power_w: 4800,
    peak_power_va: 6000,
    max_charge_current_a: 100,
    efficiency_pct: 96.5,
    price: 2367.4,
    price_source_url: 'https://stroomwinkel.nl/victron-multi-rs-solar-48-6000-230v.html',
    notes: 'Victron Multi RS Solar. Official specs: DC input 38-62 V, AC output 230 VAC, max continuous inverter current 25 A AC, peak 9 kW for 3 s / 7 kW for 4 min, solar: 450 V max, MPPT range 65-450 V, 2 x 3000 W trackers, 12 A max PV input current, 100 A combined charge current, 50 A transfer switch.',
  },
  {
    inverter_id: 'victron-mp2-48-10000',
    model: 'Multiplus-II 48/10000/140-100',
    input_voltage_v: 48,
    output_voltage_v: 230,
    continuous_power_w: 8000,
    peak_power_va: 10000,
    max_charge_current_a: 140,
    efficiency_pct: 96,
    price: 1760.35,
    price_source_url: 'https://stroomwinkel.nl/victron-multiplus-ii-48-10000-140-100-100-230v-4237.html',
    notes: 'Single AC input',
  },
  {
    inverter_id: 'victron-mp2-48-15000',
    model: 'Multiplus-II 48/15000/200-100',
    input_voltage_v: 48,
    output_voltage_v: 230,
    continuous_power_w: 12000,
    peak_power_va: 15000,
    max_charge_current_a: 200,
    efficiency_pct: 96,
    price: 2455.75,
    price_source_url: 'https://stroomwinkel.nl/omv-la/omv-la-combis/victron-multiplus-ii-48-15000-200-100-100-230v.html',
    notes: 'Single AC input',
  },
];

const ORION_CONVERSION_DEVICES: Array<{
  converter_type_id: string;
  title: string;
  description: string;
  device_type: 'dc_dc_converter';
  input_voltage_v: number;
  output_voltage_v: number;
  continuous_power_w: number;
  peak_power_va: number;
  max_charge_current_a: number;
  efficiency_pct: number;
  output_ac_voltage_v: number | null;
  frequency_hz: number | null;
  surge_power_w: number | null;
  output_dc_voltage_v: number;
  max_output_current_a: number;
  price: number;
  price_source_url: string;
  notes: string;
}> = [
  {
    converter_type_id: 'victron-orion-tr-48-12-20',
    title: 'Orion-Tr 48/12-20A',
    description: 'Victron Orion-Tr Smart isolated DC-DC converter for a 48 V battery stack feeding 12 V loads.',
    device_type: 'dc_dc_converter',
    input_voltage_v: 48,
    output_voltage_v: 12.2,
    continuous_power_w: 240,
    peak_power_va: 240,
    max_charge_current_a: 20,
    efficiency_pct: 87,
    output_ac_voltage_v: null,
    frequency_hz: null,
    surge_power_w: null,
    output_dc_voltage_v: 12.2,
    max_output_current_a: 25,
    price: 171,
    price_source_url: VICTRON_PRICE_LIST_Q2_2026_URL,
    notes: 'Good fit for lighter 12 V loads from a 48 V battery stack, such as a pump and a smaller fridge duty cycle.',
  },
  {
    converter_type_id: 'victron-orion-tr-48-12-9',
    title: 'Orion-Tr 48/12-9A',
    description: 'Victron Orion-Tr isolated DC-DC converter for a 48 V battery stack feeding lighter 12 V loads.',
    device_type: 'dc_dc_converter',
    input_voltage_v: 48,
    output_voltage_v: 12.5,
    continuous_power_w: 110,
    peak_power_va: 110,
    max_charge_current_a: 9,
    efficiency_pct: 87,
    output_ac_voltage_v: null,
    frequency_hz: null,
    surge_power_w: null,
    output_dc_voltage_v: 12.5,
    max_output_current_a: 9,
    price: 68,
    price_source_url: VICTRON_PRICE_LIST_Q2_2026_URL,
    notes: 'Smallest Orion option in the catalog. Good for a 12 V pump and lighter auxiliary loads from a 48 V battery stack.',
  },
  {
    converter_type_id: 'victron-orion-tr-48-12-30',
    title: 'Orion-Tr 48/12-30A',
    description: 'Victron Orion-Tr Smart isolated DC-DC converter for a 48 V battery stack feeding 12 V loads.',
    device_type: 'dc_dc_converter',
    input_voltage_v: 48,
    output_voltage_v: 12.2,
    continuous_power_w: 360,
    peak_power_va: 360,
    max_charge_current_a: 30,
    efficiency_pct: 87,
    output_ac_voltage_v: null,
    frequency_hz: null,
    surge_power_w: null,
    output_dc_voltage_v: 12.2,
    max_output_current_a: 30,
    price: 261,
    price_source_url: VICTRON_PRICE_LIST_Q2_2026_URL,
    notes: 'More headroom for a 12 V pump and fridge from a 48 V battery stack, especially if both can run together.',
  },
];

const BASELINE_LOCATION = {
  title: '18Mad Boerderij',
  country: 'NL',
  place_name: 'Warten',
  latitude: 53.126579,
  longitude: 5.899564,
  northing: null,
  easting: null,
};

const BASELINE_SURFACES: Array<{
  surface_id: string;
  name: string;
  sort_order: number;
  orientation_deg: number;
  tilt_deg: number;
  usable_area_m2: number | null;
  notes: string | null;
}> = [
  {
    surface_id: 'dakkapellen',
    name: 'Dakkapellen',
    sort_order: 1,
    orientation_deg: 231,
    tilt_deg: 15,
    usable_area_m2: null,
    notes: null,
  },
  {
    surface_id: 'flat-ne',
    name: 'Flat NE',
    sort_order: 2,
    orientation_deg: 51,
    tilt_deg: 15,
    usable_area_m2: null,
    notes: null,
  },
  {
    surface_id: 'ne',
    name: 'North-East',
    sort_order: 3,
    orientation_deg: 51,
    tilt_deg: 60,
    usable_area_m2: null,
    notes: null,
  },
  {
    surface_id: 'nw',
    name: 'North-West',
    sort_order: 4,
    orientation_deg: 321,
    tilt_deg: 45,
    usable_area_m2: null,
    notes: null,
  },
  {
    surface_id: 'se',
    name: 'South-East',
    sort_order: 5,
    orientation_deg: 141,
    tilt_deg: 45,
    usable_area_m2: null,
    notes: null,
  },
  {
    surface_id: 'sw',
    name: 'South-West',
    sort_order: 6,
    orientation_deg: 231,
    tilt_deg: 60,
    usable_area_m2: null,
    notes: null,
  },
];

const BASELINE_PANEL_TYPES: Array<{
  panel_type_id: string;
  brand: string;
  model: string;
  wp: number;
  voc: number;
  vmp: number;
  isc: number;
  imp: number;
  length_mm: number;
  width_mm: number;
  temp_coefficient_voc_pct_per_c: number;
  notes: string | null;
  price: number | null;
  price_source_url?: string | null;
}> = [
  {
    panel_type_id: 'aiko-475-all-black',
    brand: 'Aiko',
    model: 'Aiko 475Wp All Black Glas-Glas',
    wp: 475,
    voc: 45,
    vmp: 38,
    isc: 13.2,
    imp: 12.5,
    length_mm: 1762,
    width_mm: 1134,
    temp_coefficient_voc_pct_per_c: -0.24,
    notes: 'ABC technology; Voc/Vmp/Isc/Imp estimated — verify datasheet; ref: 2393526667917',
    price: 107.94,
    price_source_url: 'https://www.solardeals.nl/product/aiko-475wp-glas-glas-all-black/',
  },
  {
    panel_type_id: 'BISOL-rood',
    brand: 'BISOL',
    model: 'BISOL BDO Spectrum 400 Wp N-type TOPCon Red',
    wp: 400,
    voc: 40,
    vmp: 34,
    isc: 14,
    imp: 13,
    length_mm: 1722,
    width_mm: 1134,
    temp_coefficient_voc_pct_per_c: -0.26,
    notes: 'Deep red BISOL Spectrum panel; 400 Wp, 20.48% efficiency, N-type TOPCon, 20-year product warranty and 25-year linear performance guarantee, 1722 x 1134 x 30 mm, based on Planet Soar Shop.',
    price: 290,
    price_source_url: 'https://www.planetsoarshop.com/en/products/bisol-bdo-spectrum-400-wp-n-type-topcon-red-solar-panel',
  },
  {
    panel_type_id: 'canadian-bihiku6-rood',
    brand: 'Canadian Solar',
    model: 'Canadian Solar BiHiKu6 (Rood)',
    wp: 390,
    voc: 41,
    vmp: 34.3,
    isc: 12,
    imp: 11.37,
    length_mm: 1765,
    width_mm: 1048,
    temp_coefficient_voc_pct_per_c: -0.27,
    notes: 'Bifacial rood; Voc/Vmp/Isc/Imp estimated; €220-320/panel',
    price: 270,
    price_source_url: 'https://www.solargarant.nl/zonnepanelen/canadian-solar/',
  },
  {
    panel_type_id: 'canadian-hiku6',
    brand: 'Canadian Solar',
    model: 'Canadian Solar HiKu6',
    wp: 400,
    voc: 41.1,
    vmp: 34.4,
    isc: 12.2,
    imp: 11.63,
    length_mm: 1765,
    width_mm: 1048,
    temp_coefficient_voc_pct_per_c: -0.27,
    notes: 'Voc/Vmp/Isc/Imp estimated; €180-280/panel',
    price: 230,
    price_source_url: 'https://www.solargarant.nl/zonnepanelen/canadian-solar/',
  },
  {
    panel_type_id: 'eurener-280',
    brand: 'Eurener',
    model: 'Eurener 280W',
    wp: 280,
    voc: 38,
    vmp: 31,
    isc: 9.5,
    imp: 9.03,
    length_mm: 1650,
    width_mm: 992,
    temp_coefficient_voc_pct_per_c: -0.30,
    notes: 'Isc/dims estimated — verify against datasheet',
    price: null,
  },
  {
    panel_type_id: 'ja-deepblue-3-rood',
    brand: 'JA Solar',
    model: 'JA Solar DeepBlue 3.0 (Rood)',
    wp: 390,
    voc: 41.4,
    vmp: 34.6,
    isc: 12,
    imp: 11.27,
    length_mm: 1755,
    width_mm: 1038,
    temp_coefficient_voc_pct_per_c: -0.27,
    notes: 'Rood; Voc/Vmp/Isc/Imp estimated; €230-330/panel',
    price: 280,
    price_source_url: 'https://www.jenm-zonnepanelen.nl/nl/ja-solar-deepblue-4-0-pro.html',
  },
  {
    panel_type_id: 'ja-deepblue-4',
    brand: 'JA Solar',
    model: 'JA Solar DeepBlue 4.0',
    wp: 410,
    voc: 41.6,
    vmp: 34.8,
    isc: 12.5,
    imp: 11.78,
    length_mm: 1755,
    width_mm: 1038,
    temp_coefficient_voc_pct_per_c: -0.27,
    notes: 'Voc/Vmp/Isc/Imp estimated; €200-300/panel',
    price: 250,
    price_source_url: 'https://www.stralendgroen.nl/product/trina-solar-vertex-s-dual-glass-transparent-430wp/',
  },
  {
    panel_type_id: 'jinko-tiger-neo',
    brand: 'Jinko',
    model: 'Jinko Solar Tiger Neo N-Type',
    wp: 420,
    voc: 42.6,
    vmp: 35.7,
    isc: 12.47,
    imp: 11.77,
    length_mm: 1765,
    width_mm: 1134,
    temp_coefficient_voc_pct_per_c: -0.26,
    notes: 'N-Type; Voc/Vmp/Isc/Imp estimated; €220-320/panel',
    price: 270,
  },
  {
    panel_type_id: 'longi-hi-mo-6',
    brand: 'LONGi',
    model: 'LONGi Hi-MO 6',
    wp: 410,
    voc: 41.5,
    vmp: 34.7,
    isc: 12.5,
    imp: 11.82,
    length_mm: 1755,
    width_mm: 1038,
    temp_coefficient_voc_pct_per_c: -0.27,
    notes: 'Voc/Vmp/Isc/Imp estimated; €200-300/panel',
    price: 250,
  },
  {
    panel_type_id: 'longi-lr7-54hvb-475wp',
    brand: 'LONGi',
    model: 'LR7-54HVB-475WP',
    wp: 475,
    voc: 40.18,
    vmp: 33.16,
    isc: 15.03,
    imp: 14.33,
    length_mm: 1800,
    width_mm: 1134,
    temp_coefficient_voc_pct_per_c: -0.2,
    notes: 'Technische Unie 6021041 / LR7-54HVB-475WP full black. Price is net €84,31 excl. btw; official LONGi datasheet values used for Voc/Vmp/Isc/Imp and dimensions.',
    price: 84.31,
    price_source_url: 'https://www.technischeunie.nl/product/prd1892930474',
  },
  {
    panel_type_id: 'qcells-qpeak-duo-g10',
    brand: 'Qcells',
    model: 'Qcells Q.Peak Duo G10+',
    wp: 390,
    voc: 41.8,
    vmp: 35,
    isc: 11.5,
    imp: 11.14,
    length_mm: 1755,
    width_mm: 1038,
    temp_coefficient_voc_pct_per_c: -0.27,
    notes: 'Voc/Vmp/Isc/Imp estimated; €250-350/panel',
    price: 300,
  },
  {
    panel_type_id: 'rec-alpha-pure-r',
    brand: 'REC',
    model: 'REC Alpha Pure-R',
    wp: 410,
    voc: 42.4,
    vmp: 35.5,
    isc: 12.1,
    imp: 11.55,
    length_mm: 1754,
    width_mm: 1038,
    temp_coefficient_voc_pct_per_c: -0.24,
    notes: 'Voc/Vmp/Isc/Imp estimated; €300-400/panel',
    price: 350,
  },
  {
    panel_type_id: 'sunpower-maxeon6',
    brand: 'SunPower',
    model: 'SunPower Maxeon 6',
    wp: 430,
    voc: 43.4,
    vmp: 36.4,
    isc: 12.75,
    imp: 11.81,
    length_mm: 1722,
    width_mm: 1134,
    temp_coefficient_voc_pct_per_c: -0.27,
    notes: 'IBC; Voc/Vmp/Isc/Imp estimated; €350-450/panel',
    price: 400,
  },
  {
    panel_type_id: 'trina-vertex-s-plus',
    brand: 'Trina Solar',
    model: 'Trina Solar Vertex S+',
    wp: 410,
    voc: 41.8,
    vmp: 34.9,
    isc: 12.5,
    imp: 11.75,
    length_mm: 1754,
    width_mm: 1134,
    temp_coefficient_voc_pct_per_c: -0.26,
    notes: 'Voc/Vmp/Isc/Imp estimated; €220-320/panel',
    price: 270,
  },
  {
    panel_type_id: 'trina-vertex-s-plus-rood',
    brand: 'Trina Solar',
    model: 'Trina Solar Vertex S+ (Rood)',
    wp: 400,
    voc: 41.8,
    vmp: 34.9,
    isc: 12.2,
    imp: 11.46,
    length_mm: 1754,
    width_mm: 1134,
    temp_coefficient_voc_pct_per_c: -0.26,
    notes: 'Rood; Voc/Vmp/Isc/Imp estimated; €240-340/panel',
    price: 290,
  },
];

const BASELINE_SURFACE_PANEL_ASSIGNMENTS: Array<{
  surface_id: string;
  panel_type_id: string;
  count: number;
}> = [
  { surface_id: 'flat-ne', panel_type_id: 'aiko-475-all-black', count: 4 },
  { surface_id: 'ne', panel_type_id: 'aiko-475-all-black', count: 2 },
  { surface_id: 'nw', panel_type_id: 'canadian-bihiku6-rood', count: 7 },
  { surface_id: 'se', panel_type_id: 'canadian-bihiku6-rood', count: 4 },
  { surface_id: 'sw', panel_type_id: 'canadian-bihiku6-rood', count: 2 },
];

/**
 * Built-in Victron SmartSolar MPPT controller reference data.
 * max_pv_power is derived as max_charge_current × 48V (highest supported battery voltage).
 * nominal_battery_voltage is stored as 48 (the highest supported); the tool uses this
 * for sizing at 12/24/48 by checking all supported voltages.
 */
const VICTRON_MPPT: Array<{
  mppt_type_id: string;
  brand?: string;
  model: string;
  tracker_count: number;
  max_voc: number;
  max_pv_power: number;
  max_pv_input_current_a?: number | null;
  max_pv_short_circuit_current_a?: number | null;
  max_charge_current: number;
  nominal_battery_voltage: number;
  price?: number | null;
  price_source_url?: string | null;
  notes?: string;
}> = [
  { mppt_type_id: 'victron-75-10',   model: 'SmartSolar 75/10',   tracker_count: 1, max_voc: 75,  max_charge_current: 10,  nominal_battery_voltage: 48, max_pv_power: 10  * 48, price: 59.85, price_source_url: 'https://stroomwinkel.nl/zonnestroom-1/zonnestroom-omv-zonnepanelen/smartsolar-mppt-75-10.html' },
  { mppt_type_id: 'victron-75-15',   model: 'SmartSolar 75/15',   tracker_count: 1, max_voc: 75,  max_charge_current: 15,  nominal_battery_voltage: 48, max_pv_power: 15  * 48, price: 64.6, price_source_url: 'https://stroomwinkel.nl/smartsolar-mppt-75-15.html' },
  { mppt_type_id: 'victron-100-15',  model: 'SmartSolar 100/15',  tracker_count: 1, max_voc: 100, max_charge_current: 15,  nominal_battery_voltage: 48, max_pv_power: 15  * 48, price: 79.8, price_source_url: 'https://stroomwinkel.nl/smartsolar-mppt-100-15.html' },
  { mppt_type_id: 'victron-100-20',  model: 'SmartSolar 100/20',  tracker_count: 1, max_voc: 100, max_charge_current: 20,  nominal_battery_voltage: 48, max_pv_power: 20  * 48, price: 91.2, price_source_url: 'https://stroomwinkel.nl/victron-smartsolar-mppt-100-20-48v.html' },
  { mppt_type_id: 'victron-150-35',  model: 'SmartSolar 150/35',  tracker_count: 1, max_voc: 150, max_charge_current: 35,  nominal_battery_voltage: 48, max_pv_power: 35  * 48, price: 187.15, price_source_url: 'https://stroomwinkel.nl/smartsolar-mppt-150-35.html' },
  { mppt_type_id: 'victron-150-45',  model: 'SmartSolar 150/45',  tracker_count: 1, max_voc: 150, max_charge_current: 45,  nominal_battery_voltage: 48, max_pv_power: 45  * 48, price: 427.5, price_source_url: 'https://stroomwinkel.nl/victron-smartsolar-mppt-150-45-tr.html' },
  { mppt_type_id: 'victron-150-60',  model: 'SmartSolar 150/60',  tracker_count: 1, max_voc: 150, max_charge_current: 60,  nominal_battery_voltage: 48, max_pv_power: 60  * 48, price: 522.5, price_source_url: 'https://stroomwinkel.nl/victron-smartsolar-mppt-150-60-tr-4410.html' },
  { mppt_type_id: 'victron-150-70',  model: 'SmartSolar 150/70',  tracker_count: 1, max_voc: 150, max_charge_current: 70,  nominal_battery_voltage: 48, max_pv_power: 70  * 48, price: 522.5, price_source_url: 'https://stroomwinkel.nl/victron-smartsolar-mppt-150-70-tr-4041.html' },
  { mppt_type_id: 'victron-150-85',  model: 'SmartSolar 150/85',  tracker_count: 1, max_voc: 150, max_charge_current: 85,  nominal_battery_voltage: 48, max_pv_power: 85  * 48, price: 469.3, price_source_url: 'https://stroomwinkel.nl/victron-smartsolar-mppt-150-85-mc4-ve-can.html' },
  { mppt_type_id: 'victron-150-100', model: 'SmartSolar 150/100', tracker_count: 1, max_voc: 150, max_charge_current: 100, nominal_battery_voltage: 48, max_pv_power: 100 * 48, price: 524.4, price_source_url: 'https://stroomwinkel.nl/victron-smartsolar-mppt-150-100-tr-12-24-48v.html' },
  { mppt_type_id: 'victron-250-60',  model: 'SmartSolar 250/60',  tracker_count: 1, max_voc: 250, max_charge_current: 60,  nominal_battery_voltage: 48, max_pv_power: 60  * 48, price: 420.85, price_source_url: 'https://stroomwinkel.nl/victron-smartsolar-mppt-250-60-mc4.html' },
  { mppt_type_id: 'victron-250-70',  model: 'SmartSolar 250/70',  tracker_count: 1, max_voc: 250, max_charge_current: 70,  nominal_battery_voltage: 48, max_pv_power: 70  * 48, price: 509.23, price_source_url: 'https://stroomwinkel.nl/victron-smartsolar-mppt-250-70-tr.html' },
  { mppt_type_id: 'victron-250-85',  model: 'SmartSolar 250/85',  tracker_count: 1, max_voc: 250, max_charge_current: 85,  nominal_battery_voltage: 48, max_pv_power: 85  * 48, price: 556.7, price_source_url: 'https://stroomwinkel.nl/victron-smartsolar-mppt-250-85-tr-ve-can.html' },
  { mppt_type_id: 'victron-250-100', model: 'SmartSolar 250/100', tracker_count: 1, max_voc: 250, max_charge_current: 100, nominal_battery_voltage: 48, max_pv_power: 100 * 48, price: 902.5, price_source_url: 'https://stroomwinkel.nl/victron-smartsolar-mppt-250-100-mc4-4335.html' },
  {
    mppt_type_id: 'victron-mrs-48-6000-100-450-100',
    model: 'Multi RS Solar 48/6000/100-450/100',
    tracker_count: 2,
    max_voc: 450,
    max_charge_current: 100,
    nominal_battery_voltage: 48,
    max_pv_power: 6000,
    max_pv_input_current_a: 13,
    max_pv_short_circuit_current_a: 16,
    price: 2367.4,
    price_source_url: 'https://stroomwinkel.nl/victron-multi-rs-solar-48-6000-230v.html',
  },
];

export function seedMpptTypes(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO mppt_types
      (mppt_type_id, brand, model, tracker_count, max_voc, max_pv_power, max_pv_input_current_a, max_pv_short_circuit_current_a, max_charge_current, nominal_battery_voltage, price, price_source_url, notes)
    VALUES
      (@mppt_type_id, @brand, @model, @tracker_count, @max_voc, @max_pv_power, @max_pv_input_current_a, @max_pv_short_circuit_current_a, @max_charge_current, @nominal_battery_voltage, @price, @price_source_url, @notes)
  `);
  const insertAllWithDefaults = db.transaction((rows: typeof VICTRON_MPPT) => {
    for (const row of rows) {
      insert.run({
        ...row,
        brand: row.brand ?? 'Victron',
        max_pv_input_current_a: row.max_pv_input_current_a ?? null,
        max_pv_short_circuit_current_a: row.max_pv_short_circuit_current_a ?? null,
        price: row.price ?? null,
        price_source_url: row.price_source_url ?? null,
        notes: row.notes ?? null,
      });
    }
  });
  insertAllWithDefaults(VICTRON_MPPT);

  db.prepare(`
    UPDATE mppt_types
    SET tracker_count = 2,
        max_pv_input_current_a = 13,
        max_pv_short_circuit_current_a = 16,
        notes = COALESCE(notes, 'Victron Multi RS Solar. Official specs: 2 independent MPPT trackers; 6000 W total / 3000 W per tracker; 450 V max PV voltage; 65-450 V MPPT range; 13 A max operational PV input current per tracker; 16 A max PV short-circuit current per tracker; 100 A combined charge current; 50 A transfer switch.')
    WHERE mppt_type_id = 'victron-mrs-48-6000-100-450-100'
  `).run();
}

export function seedBatteryTypes(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO battery_types
      (battery_type_id, brand, model, chemistry, nominal_voltage, capacity_ah, capacity_kwh, victron_can, cooling, price, price_per_kwh, price_source_url, source, url, notes)
    VALUES
      (@battery_type_id, @brand, @model, @chemistry, @nominal_voltage, @capacity_ah, @capacity_kwh, @victron_can, @cooling, @price, @price_per_kwh, @price_source_url, @source, @url, @notes)
  `);
  const insertAll = db.transaction((rows: typeof BATTERY_TYPES) => {
    for (const row of rows) insert.run({
      ...row,
      cooling: row.cooling,
      price: row.price ?? null,
      price_per_kwh: row.price_per_kwh ?? null,
      price_source_url: row.price_source_url ?? row.source ?? row.url ?? null,
      source: row.source ?? row.price_source_url ?? row.url ?? null,
      url: row.url ?? row.price_source_url ?? row.source ?? null,
    });
  });
  insertAll(BATTERY_TYPES);
}

export function seedInverterTypes(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO inverter_types
      (inverter_id, brand, model, input_voltage_v, output_voltage_v, continuous_power_w, peak_power_va, max_charge_current_a, efficiency_pct, price, price_source_url, notes)
    VALUES
      (@inverter_id, @brand, @model, @input_voltage_v, @output_voltage_v, @continuous_power_w, @peak_power_va, @max_charge_current_a, @efficiency_pct, @price, @price_source_url, @notes)
  `);
  const insertAll = db.transaction((rows: typeof INVERTER_TYPES) => {
    for (const row of rows) {
      insert.run({
        ...row,
        brand: row.brand ?? 'Victron',
        efficiency_pct: row.efficiency_pct ?? null,
        price: row.price ?? null,
        price_source_url: row.price_source_url ?? null,
        notes: row.notes ?? null,
      });
    }
  });
  insertAll(INVERTER_TYPES);
}

export function seedConversionDevices(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO converter_types
      (converter_type_id, title, description, device_type, input_voltage_v, output_voltage_v, continuous_power_w, peak_power_va, max_charge_current_a, efficiency_pct, output_ac_voltage_v, frequency_hz, surge_power_w, output_dc_voltage_v, max_output_current_a, price, price_source_url, notes)
    VALUES
      (@converter_type_id, @title, @description, @device_type, @input_voltage_v, @output_voltage_v, @continuous_power_w, @peak_power_va, @max_charge_current_a, @efficiency_pct, @output_ac_voltage_v, @frequency_hz, @surge_power_w, @output_dc_voltage_v, @max_output_current_a, @price, @price_source_url, @notes)
  `);

  const update = db.prepare(`
    UPDATE converter_types
    SET
      title = COALESCE(title, @title),
      description = COALESCE(description, @description),
      device_type = COALESCE(device_type, @device_type),
      input_voltage_v = COALESCE(input_voltage_v, @input_voltage_v),
      output_voltage_v = COALESCE(output_voltage_v, @output_voltage_v),
      continuous_power_w = COALESCE(continuous_power_w, @continuous_power_w),
      peak_power_va = COALESCE(peak_power_va, @peak_power_va),
      max_charge_current_a = COALESCE(max_charge_current_a, @max_charge_current_a),
      efficiency_pct = COALESCE(efficiency_pct, @efficiency_pct),
      output_ac_voltage_v = COALESCE(output_ac_voltage_v, @output_ac_voltage_v),
      frequency_hz = COALESCE(frequency_hz, @frequency_hz),
      surge_power_w = COALESCE(surge_power_w, @surge_power_w),
      output_dc_voltage_v = COALESCE(output_dc_voltage_v, @output_dc_voltage_v),
      max_output_current_a = COALESCE(max_output_current_a, @max_output_current_a),
      price = COALESCE(price, @price),
      price_source_url = COALESCE(price_source_url, @price_source_url),
      notes = COALESCE(notes, @notes)
    WHERE converter_type_id = @converter_type_id
  `);

  const insertAll = db.transaction((rows: typeof INVERTER_TYPES) => {
    for (const row of rows) {
      const payload = {
        converter_type_id: row.inverter_id,
        title: row.model,
        description: row.notes ?? null,
        device_type: 'inverter',
        input_voltage_v: row.input_voltage_v,
        output_voltage_v: row.output_voltage_v,
        continuous_power_w: row.continuous_power_w,
        peak_power_va: row.peak_power_va,
        max_charge_current_a: row.max_charge_current_a,
        efficiency_pct: row.efficiency_pct ?? null,
        output_ac_voltage_v: null,
        frequency_hz: null,
        surge_power_w: null,
        output_dc_voltage_v: null,
        max_output_current_a: null,
        price: row.price ?? null,
        price_source_url: row.price_source_url ?? null,
        notes: row.notes ?? null,
      };
      insert.run(payload);
      update.run(payload);
    }
  });

  insertAll(INVERTER_TYPES);

  const insertOrionAll = db.transaction((rows: typeof ORION_CONVERSION_DEVICES) => {
    for (const row of rows) {
      const payload = {
        ...row,
        description: row.description ?? null,
        output_ac_voltage_v: row.output_ac_voltage_v ?? null,
        frequency_hz: row.frequency_hz ?? null,
        surge_power_w: row.surge_power_w ?? null,
      };
      insert.run(payload);
      update.run(payload);
    }
  });

  insertOrionAll(ORION_CONVERSION_DEVICES);
}

export function seedInverterConfigurations(db: Database.Database): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM inverter_configurations').get() as { count: number } | undefined;
  if (!existing || existing.count === 0) {
    const preferredRow = db.prepare("SELECT value FROM project_preferences WHERE key = 'preferred_inverter_type_id'").get() as { value?: string } | undefined;
    const preferredInverterId = typeof preferredRow?.value === 'string' && preferredRow.value.trim() ? preferredRow.value.trim() : null;
    const preferredInverter = preferredInverterId
      ? db.prepare('SELECT inverter_id FROM inverter_types WHERE inverter_id = ?').get(preferredInverterId) as { inverter_id?: string } | undefined
      : null;
    const fallbackInverter = db.prepare('SELECT inverter_id FROM inverter_types ORDER BY continuous_power_w, peak_power_va LIMIT 1').get() as { inverter_id?: string } | undefined;

    db.prepare(`
      INSERT INTO inverter_configurations (inverter_configuration_id, selected_inverter_type_id)
      VALUES (@inverter_configuration_id, @selected_inverter_type_id)
    `).run({
      inverter_configuration_id: 'inverter-configuration-main',
      selected_inverter_type_id: preferredInverter?.inverter_id ?? fallbackInverter?.inverter_id ?? null,
    });
  }
}

export function seedLocation(db: Database.Database): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM locations').get() as { count: number } | undefined;
  if (!existing || existing.count === 0) {
    db.prepare('INSERT INTO locations (project_id, location_id, title, country, place_name, latitude, longitude, northing, easting) VALUES (@project_id, @location_id, @title, @country, @place_name, @latitude, @longitude, @northing, @easting)')
      .run({
        ...BASELINE_LOCATION,
        project_id: '1',
        location_id: 'location-main',
      });
  }
}

export function seedSurfaces(db: Database.Database): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM surfaces').get() as { count: number } | undefined;
  if (!existing || existing.count === 0) {
    const insert = db.prepare(`
      INSERT INTO surfaces (project_id, location_id, surface_id, name, sort_order, orientation_deg, tilt_deg, usable_area_m2, notes)
      VALUES (@project_id, @location_id, @surface_id, @name, @sort_order, @orientation_deg, @tilt_deg, @usable_area_m2, @notes)
    `);
    const insertAll = db.transaction((rows: typeof BASELINE_SURFACES) => {
      for (const row of rows) {
        insert.run({
          ...row,
          project_id: '1',
          location_id: 'location-main',
        });
      }
    });
    insertAll(BASELINE_SURFACES);
  }
}

export function seedPanelTypes(db: Database.Database): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM panel_types').get() as { count: number } | undefined;
  if (!existing || existing.count === 0) {
    const seededAt = new Date().toISOString();
    const insert = db.prepare(`
      INSERT INTO panel_types (panel_type_id, brand, model, wp, voc, vmp, isc, imp, length_mm, width_mm, temp_coefficient_voc_pct_per_c, notes, price, price_source_url, last_upsert_date)
      VALUES (@panel_type_id, @brand, @model, @wp, @voc, @vmp, @isc, @imp, @length_mm, @width_mm, @temp_coefficient_voc_pct_per_c, @notes, @price, @price_source_url, @last_upsert_date)
    `);
    const insertAll = db.transaction((rows: typeof BASELINE_PANEL_TYPES) => {
      for (const row of rows) {
        insert.run({
          ...row,
          notes: row.notes ?? null,
          price: row.price ?? null,
          price_source_url: row.price_source_url ?? null,
          last_upsert_date: seededAt,
        });
      }
    });
    insertAll(BASELINE_PANEL_TYPES);
  } else {
    const upsertCoeff = db.prepare(`
      UPDATE panel_types SET temp_coefficient_voc_pct_per_c = @coeff
      WHERE panel_type_id = @panel_type_id AND temp_coefficient_voc_pct_per_c IS NULL
    `);
    const updateAll = db.transaction(() => {
      for (const row of BASELINE_PANEL_TYPES) {
        upsertCoeff.run({ panel_type_id: row.panel_type_id, coeff: row.temp_coefficient_voc_pct_per_c });
      }
    });
    updateAll();
  }
}

export function seedSurfacePanelAssignments(db: Database.Database): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM surface_panel_assignments').get() as { count: number } | undefined;
  if (!existing || existing.count === 0) {
    const insert = db.prepare(`
      INSERT INTO surface_panel_assignments (surface_id, panel_type_id, count)
      VALUES (@surface_id, @panel_type_id, @count)
    `);
    const insertAll = db.transaction((rows: typeof BASELINE_SURFACE_PANEL_ASSIGNMENTS) => {
      for (const row of rows) insert.run(row);
    });
    insertAll(BASELINE_SURFACE_PANEL_ASSIGNMENTS);
  }
}
