# Persistence Field Coverage Matrix

This document turns the [persistence-testing-strategy.md](./persistence-testing-strategy.md) into a concrete field inventory.

Use it as the coverage contract for save reliability.

Legend for `Primary automated coverage`:

- `integration`: route and persistence integration test
- `bdd`: user-facing workflow scenario
- `rule`: focused validation or dependency test
- `audit`: full page reload audit scenario

## How to use this matrix

For each field:

1. write or identify the primary automated test
2. make sure the field is verified after reload or fresh readback
3. add clear-value coverage where allowed
4. add invalid-value coverage where meaningful

## Location

Route:

- `PUT /api/location`

| Page | Save box | Field label | Persisted property | Clear allowed | Valid example | Invalid example | Primary automated coverage | Notes |
|---|---|---|---|---|---|---|---|---|
| Location | Location information | Location title | `title` | yes | `Farmhouse project` | numeric payload | integration + bdd + audit | Optional text field |
| Location | Location information | Country | `country` | no | `Netherlands` | empty string | integration + bdd + audit | Required |
| Location | Location information | Location name | `place_name` | no | `Warten` | empty string | integration + bdd + audit | Required |
| Location | Location information | Description | `description` | yes | `Primary site context` | numeric payload | integration + bdd + audit | Optional text field |
| Location | Location information | Notes | `notes` | yes | `Check winter shading later` | numeric payload | integration + bdd + audit | Optional text field |
| Location | Location information | Latitude | `latitude` | no | `53.1504` | `120` | integration + bdd + rule + audit | Must be in `-90..90` |
| Location | Location information | Longitude | `longitude` | no | `5.9007` | `200` | integration + bdd + rule + audit | Must be in `-180..180` |
| Location | Location photo | Site photo | `site_photo_data_url` | yes | `data:image/png;base64,...` | non-string payload | integration + bdd + audit | Verify stored photo survives reload |

## Surface details

Route:

- `PUT /api/surfaces/:surfaceId`

| Page | Save box | Field label | Persisted property | Clear allowed | Valid example | Invalid example | Primary automated coverage | Notes |
|---|---|---|---|---|---|---|---|---|
| Surface | Surface details | Surface name | `name` | no | `South-East` | empty string | integration + bdd + audit | Required |
| Surface | Surface details | Description | `description` | yes | `Main morning roof` | numeric payload | integration + bdd + audit | Optional text field |
| Surface | Surface details | Orientation | `orientation_deg` | no | `140` | `361` | integration + bdd + rule + audit | Must be in `0..360` |
| Surface | Surface details | Tilt | `tilt_deg` | no | `35` | `91` | integration + bdd + rule + audit | Must be in `0..90` |
| Surface | Surface details | Height (m) | `area_height_m` | yes | `4.2` | non-numeric payload | integration + bdd + audit | Drives derived area |
| Surface | Surface details | Width (m) | `area_width_m` | yes | `2.8` | non-numeric payload | integration + bdd + audit | Drives derived area |
| Surface | Surface details | Derived usable area | `usable_area_m2` | derived | `11.76` | n/a | integration + bdd + audit | Verify through persisted readback, not direct input |
| Surface | Surface details | Notes | `notes` | yes | `Keep chimney clearance` | numeric payload | integration + bdd + audit | Optional text field |
| Surface | Surface details | Photo | `photo_data_url` | yes | `data:image/jpeg;base64,...` | non-string payload | integration + bdd + audit | Verify upload and removal |

## Panel setup

Route:

- `PUT /api/surface-panel-assignments/:surfaceId`

| Page | Save box | Field label | Persisted property | Clear allowed | Valid example | Invalid example | Primary automated coverage | Notes |
|---|---|---|---|---|---|---|---|---|
| Surface | Panel setup | Selected panel type | `panel_type_id` | yes when count is `0` | `victron-215w` | unknown id | integration + bdd + rule + audit | Required when count is greater than `0` |
| Surface | Panel setup | Panel count | `count` | yes via `0` | `12` | `-1` | integration + bdd + rule + audit | Must be integer `>= 0` |

## Surface configuration

Route:

- `PUT /api/surface-configurations/:surfaceId`

| Page | Save box | Field label | Persisted property | Clear allowed | Valid example | Invalid example | Primary automated coverage | Notes |
|---|---|---|---|---|---|---|---|---|
| Surface | Panel array and MPPT | Panels per string | `panels_per_string` | yes via `0` when no persisted panels | `3` | `-1` | integration + bdd + rule + audit | Must match persisted panel count with parallel strings |
| Surface | Panel array and MPPT | Parallel strings | `parallel_strings` | yes via `0` when no persisted panels | `4` | `-1` | integration + bdd + rule + audit | Must match persisted panel count with panels per string |
| Surface | Panel array and MPPT | Selected MPPT type | `selected_mppt_type_id` | yes | `smartsolar-150-45` | unknown id | integration + bdd + rule + audit | Validate existence and reload persistence |

## Battery bank

Route:

- `PUT /api/battery-bank-configuration`

| Page | Save box | Field label | Persisted property | Clear allowed | Valid example | Invalid example | Primary automated coverage | Notes |
|---|---|---|---|---|---|---|---|---|
| Battery bank | About and configuration | Title | `title` | yes | `Main battery bank` | numeric payload | integration + bdd + audit | Optional text field |
| Battery bank | About and configuration | Description | `description` | yes | `LiFePO4 bank for daily cycling` | numeric payload | integration + bdd + audit | Optional text field |
| Battery bank | About and configuration | Image | `image_data_url` | yes | `data:image/png;base64,...` | non-string payload | integration + bdd + audit | Verify upload and removal |
| Battery bank | About and configuration | Notes | `notes` | yes | `Leave room for expansion` | numeric payload | integration + bdd + audit | Optional text field |
| Battery bank | Battery selection | Selected battery type | `selected_battery_type_id` | yes | `pylontech-us5000` | unknown id | integration + bdd + rule + audit | Validate existence |
| Battery bank | Battery array | Configured battery count | `configured_battery_count` | no | `4` | `0` | integration + bdd + rule + audit | Must be integer `>= 1` |
| Battery bank | Battery array | Batteries per string | `batteries_per_string` | no | `2` | `0` | integration + bdd + rule + audit | Must be integer `>= 1` |
| Battery bank | Battery array | Parallel strings | `parallel_strings` | no | `2` | `0` | integration + bdd + rule + audit | Must be integer `>= 1` |

## Inverter configuration

Route:

- `PUT /api/inverter-configuration`

| Page | Save box | Field label | Persisted property | Clear allowed | Valid example | Invalid example | Primary automated coverage | Notes |
|---|---|---|---|---|---|---|---|---|
| Inverter | About and configuration | Selected inverter type | `selected_inverter_type_id` | no | `multiplus-ii-48-3000` | empty string or unknown id | integration + bdd + rule + audit | Required |
| Inverter | About and configuration | Title | `title` | yes | `Main inverter` | numeric payload | integration + bdd + audit | Optional text field |
| Inverter | About and configuration | Description | `description` | yes | `Primary AC conversion unit` | numeric payload | integration + bdd + audit | Optional text field |
| Inverter | About and configuration | Image | `image_data_url` | yes | `data:image/png;base64,...` | non-string payload | integration + bdd + audit | Verify upload and removal |
| Inverter | About and configuration | Notes | `notes` | yes | `Check peak loads against pump startup` | numeric payload | integration + bdd + audit | Optional text field |

## Panel type catalog

Routes:

- `POST /api/panel-types`
- `PUT /api/panel-types/:panelTypeId`
- `DELETE /api/panel-types/:panelTypeId`

| Page | Save box | Field label | Persisted property | Clear allowed | Valid example | Invalid example | Primary automated coverage | Notes |
|---|---|---|---|---|---|---|---|---|
| Catalogs / Panel types | Panel type editor | Catalog id | `panel_type_id` | generated on create | `ja-solar-435w` | conflicting id | integration + bdd | Generated when omitted on create |
| Catalogs / Panel types | Panel type editor | Model | `model` | no | `JA Solar 435W` | empty string | integration + bdd + audit | Required |
| Catalogs / Panel types | Panel type editor | Wp | `wp` | no | `435` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / Panel types | Panel type editor | Voc | `voc` | no | `39.5` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / Panel types | Panel type editor | Vmp | `vmp` | no | `32.8` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / Panel types | Panel type editor | Isc | `isc` | no | `13.9` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / Panel types | Panel type editor | Imp | `imp` | no | `13.3` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / Panel types | Panel type editor | Length (mm) | `length_mm` | no | `2094` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / Panel types | Panel type editor | Width (mm) | `width_mm` | no | `1038` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / Panel types | Panel type editor | Notes | `notes` | yes | `Verify framed dimensions` | numeric payload | integration + bdd + audit | Optional text field |

## MPPT type catalog

Routes:

- `POST /api/mppt-types`
- `PUT /api/mppt-types/:mpptTypeId`
- `DELETE /api/mppt-types/:mpptTypeId`

| Page | Save box | Field label | Persisted property | Clear allowed | Valid example | Invalid example | Primary automated coverage | Notes |
|---|---|---|---|---|---|---|---|---|
| Catalogs / MPPT types | MPPT type editor | Catalog id | `mppt_type_id` | generated on create | `smartsolar-150-45` | conflicting id | integration + bdd | Generated when omitted on create |
| Catalogs / MPPT types | MPPT type editor | Model | `model` | no | `SmartSolar 150/45` | empty string | integration + bdd + audit | Required |
| Catalogs / MPPT types | MPPT type editor | Tracker count | `tracker_count` | no | `1` | `0` | integration + bdd + rule | Must be integer `>= 1` |
| Catalogs / MPPT types | MPPT type editor | Max Voc | `max_voc` | no | `150` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / MPPT types | MPPT type editor | Max PV power | `max_pv_power` | no | `2600` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / MPPT types | MPPT type editor | Max PV input current | `max_pv_input_current_a` | yes | `35` | non-numeric payload | integration + bdd + rule | Optional number |
| Catalogs / MPPT types | MPPT type editor | Max PV short-circuit current | `max_pv_short_circuit_current_a` | yes | `40` | non-numeric payload | integration + bdd + rule | Optional number |
| Catalogs / MPPT types | MPPT type editor | Max charge current | `max_charge_current` | no | `45` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / MPPT types | MPPT type editor | Nominal battery voltage | `nominal_battery_voltage` | no | `48` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / MPPT types | MPPT type editor | Notes | `notes` | yes | `Use for 48V bank only` | numeric payload | integration + bdd + audit | Optional text field |

## Battery type catalog

Routes:

- `POST /api/battery-types`
- `PUT /api/battery-types/:batteryTypeId`
- `DELETE /api/battery-types/:batteryTypeId`

| Page | Save box | Field label | Persisted property | Clear allowed | Valid example | Invalid example | Primary automated coverage | Notes |
|---|---|---|---|---|---|---|---|---|
| Catalogs / Battery types | Battery type editor | Catalog id | `battery_type_id` | generated on create | `pylontech-us5000` | conflicting id | integration + bdd | Generated when omitted on create |
| Catalogs / Battery types | Battery type editor | Model | `model` | no | `Pylontech US5000` | empty string | integration + bdd + audit | Required |
| Catalogs / Battery types | Battery type editor | Chemistry | `chemistry` | no | `LiFePO4` | empty string | integration + bdd + audit | Required |
| Catalogs / Battery types | Battery type editor | Nominal voltage | `nominal_voltage` | no | `48` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / Battery types | Battery type editor | Capacity Ah | `capacity_ah` | no | `100` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / Battery types | Battery type editor | Capacity kWh | `capacity_kwh` | no | `4.8` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / Battery types | Battery type editor | Max charge rate | `max_charge_rate` | yes | `50` | non-numeric payload | integration + bdd + rule | Optional number |
| Catalogs / Battery types | Battery type editor | Max discharge rate | `max_discharge_rate` | yes | `80` | non-numeric payload | integration + bdd + rule | Optional number |
| Catalogs / Battery types | Battery type editor | Victron CAN | `victron_can` | no | `true` | malformed payload | integration + bdd + audit | Boolean field |
| Catalogs / Battery types | Battery type editor | Cooling | `cooling` | no | `passive` | unsupported enum | integration + bdd + audit | Enum field |
| Catalogs / Battery types | Battery type editor | Price | `price` | yes | `1495` | non-numeric payload | integration + bdd + rule | Optional number |
| Catalogs / Battery types | Battery type editor | Source | `source` | yes | `https://example.com/spec` | numeric payload | integration + bdd + audit | Stored as source and url |
| Catalogs / Battery types | Battery type editor | Notes | `notes` | yes | `Check rack compatibility` | numeric payload | integration + bdd + audit | Optional text field |

## Inverter type catalog

Routes:

- `POST /api/inverter-types`
- `PUT /api/inverter-types/:inverterId`
- `DELETE /api/inverter-types/:inverterId`

| Page | Save box | Field label | Persisted property | Clear allowed | Valid example | Invalid example | Primary automated coverage | Notes |
|---|---|---|---|---|---|---|---|---|
| Catalogs / Inverter types | Inverter type editor | Catalog id | `inverter_id` | generated on create | `multiplus-ii-48-3000` | conflicting id | integration + bdd | Generated when omitted on create |
| Catalogs / Inverter types | Inverter type editor | Model | `model` | no | `MultiPlus-II 48/3000` | empty string | integration + bdd + audit | Required |
| Catalogs / Inverter types | Inverter type editor | Input voltage | `input_voltage_v` | no | `48` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / Inverter types | Inverter type editor | Output voltage | `output_voltage_v` | no | `230` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / Inverter types | Inverter type editor | Continuous power | `continuous_power_w` | no | `3000` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / Inverter types | Inverter type editor | Peak power | `peak_power_va` | no | `5500` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / Inverter types | Inverter type editor | Max charge current | `max_charge_current_a` | no | `35` | `0` | integration + bdd + rule | Must be positive |
| Catalogs / Inverter types | Inverter type editor | Efficiency % | `efficiency_pct` | yes | `93` | non-numeric payload | integration + bdd + rule | Optional number |
| Catalogs / Inverter types | Inverter type editor | Price | `price` | yes | `1299` | non-numeric payload | integration + bdd + rule | Optional number |
| Catalogs / Inverter types | Inverter type editor | Notes | `notes` | yes | `Check charger profile support` | numeric payload | integration + bdd + audit | Optional text field |

## Cross-box dependency scenarios

These scenarios are required in addition to field-by-field coverage.

| Page | Dependency chain | Scenario | Primary automated coverage |
|---|---|---|---|
| Surface | Panel setup -> Surface configuration | Save panel count `12`, save layout `3 x 4`, reload, confirm persisted coherence | integration + bdd + audit |
| Surface | Panel setup -> Surface configuration | Save panel count `12`, attempt layout `5 x 2`, confirm rejection | integration + rule |
| Surface | Unsaved draft vs persisted state | Change on-screen panel count without saving, attempt layout matching only the draft value, confirm validation follows persisted state | integration + bdd + rule |
| Surface | Zero-panel state | Save panel count `0`, save layout `0 x 0`, reload, confirm cleared state | integration + bdd + audit |
| Battery bank | Battery array invariants | Save count `4`, save `2 x 2`, reload, confirm persisted coherence | integration + bdd + audit |
| Battery bank | Battery array invariants | Attempt count `4` with `3 x 1`, confirm rejection | integration + rule |

## Suggested implementation order

Start with the highest-risk persisted flows:

1. `Location`
2. `Surface details`
3. `Panel setup`
4. `Surface configuration`
5. `Battery bank`
6. `Inverter configuration`
7. catalog editors
8. full page audit scenarios

## Completion rule

This matrix is complete enough for a release only when every row has at least one named automated test that verifies the persisted value through reload or fresh readback.
