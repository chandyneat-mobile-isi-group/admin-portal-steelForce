import { makeRng } from '@/lib/utilities/random';
import { isoDate } from '@/lib/utilities/demo-clock';

/**
 * The SAP side of the materials module, for the static prototype.
 *
 * Stands in for what the syncs copy out of SAP: the material master, the five
 * reference catalogues and the batch-level stock positions. Plants map one-to-one onto
 * the depots in `catalog.ts` (`plant.warehouseId`) so the Materials screen and the
 * Inventory screen describe the same network.
 *
 * "SAP" always holds slightly more than the platform's copy — a handful of new
 * materials and one new plant only appear after the matching sync is run — so the sync
 * buttons have something real to report.
 */

export interface MaterialRecord {
  id: string;
  material: string;
  name: string;
  materialName: string | null;
  materialKhName: string | null;
  materialType: string;
  materialTypeName: string;
  materialGroup: string;
  materialGroupName: string;
  baseUnit: string;
  brand: string | null;
  isBlocked: boolean;
  priceGroup: string;
  division: string;
  grossWeightKg: number | null;
  createdOn: string;
  changedOn: string;
  synchronisedAt: string;
}

export interface ReferenceRecord {
  code: string;
  name: string | null;
  category: string | null;
  plant: string | null;
}

// ── Reference catalogues ────────────────────────────────────────────────────

export const MATERIAL_TYPES: ReferenceRecord[] = [
  { code: 'FERT', name: 'Finished product', category: 'Manufactured', plant: null },
  { code: 'HAWA', name: 'Trading goods', category: 'Purchased for resale', plant: null },
  { code: 'HALB', name: 'Semi-finished product', category: 'Manufactured', plant: null },
  { code: 'ROH', name: 'Raw material', category: 'Purchased', plant: null },
  { code: 'VERP', name: 'Packaging', category: 'Purchased', plant: null },
  { code: 'DIEN', name: 'Service', category: 'Non-stock', plant: null },
];

export const MATERIAL_GROUPS: ReferenceRecord[] = [
  { code: 'RB01', name: 'Deformed bar', category: 'Long products', plant: null },
  { code: 'RB02', name: 'Round bar', category: 'Long products', plant: null },
  { code: 'WR01', name: 'Wire rod', category: 'Long products', plant: null },
  { code: 'ST01', name: 'Equal angle', category: 'Structural', plant: null },
  { code: 'ST02', name: 'C-channel', category: 'Structural', plant: null },
  { code: 'ST03', name: 'H-beam', category: 'Structural', plant: null },
  { code: 'ST04', name: 'MS plate', category: 'Flat products', plant: null },
  { code: 'PI01', name: 'Black pipe', category: 'Tubular', plant: null },
  { code: 'PI02', name: 'GI pipe', category: 'Tubular', plant: null },
  { code: 'PI03', name: 'Square tube', category: 'Tubular', plant: null },
  { code: 'PI04', name: 'Rectangular tube', category: 'Tubular', plant: null },
  { code: 'RF01', name: 'Zinc roofing sheet', category: 'Roofing', plant: null },
  { code: 'RF02', name: 'Colour roofing sheet', category: 'Roofing', plant: null },
  { code: 'RF03', name: 'Roofing accessories', category: 'Roofing', plant: null },
  { code: 'ME01', name: 'Welded wire mesh', category: 'Fabrication', plant: null },
  { code: 'WI01', name: 'Binding & barbed wire', category: 'Wire products', plant: null },
  { code: 'NL01', name: 'Nails', category: 'Wire products', plant: null },
  { code: 'FX01', name: 'Bolts & anchors', category: 'Hardware', plant: null },
  { code: 'CE01', name: 'Cement', category: 'Building materials', plant: null },
  { code: 'BL01', name: 'Billet', category: 'Semi-finished', plant: null },
  { code: 'CL01', name: 'Hot-rolled coil', category: 'Raw material', plant: null },
  { code: 'CL02', name: 'GI / PPGI coil', category: 'Raw material', plant: null },
  { code: 'PK01', name: 'Packaging & strapping', category: 'Packaging', plant: null },
  { code: 'SV01', name: 'Value-added services', category: 'Services', plant: null },
];

export const PRICE_GROUPS: ReferenceRecord[] = [
  { code: '01', name: 'Retail list', category: null, plant: null },
  { code: '02', name: 'Dealer', category: null, plant: null },
  { code: '03', name: 'Project / contractor', category: null, plant: null },
  { code: '04', name: 'Key account', category: null, plant: null },
  { code: '05', name: 'Export', category: null, plant: null },
  { code: '06', name: 'Inter-company', category: null, plant: null },
];

export interface PlantRecord extends ReferenceRecord {
  /** The depot in `catalog.ts` this plant is, or null for the mill. */
  warehouseId: string | null;
}

export const PLANTS: PlantRecord[] = [
  { code: '1000', name: 'ISI Steel Mill — Pou Senchey', category: 'Production', plant: null, warehouseId: null },
  { code: '1010', name: 'Phnom Penh Central', category: 'Distribution', plant: null, warehouseId: 'WH-PP' },
  { code: '1020', name: 'Chroy Changvar Yard', category: 'Distribution', plant: null, warehouseId: 'WH-CCV' },
  { code: '1030', name: 'Ta Khmau Depot', category: 'Distribution', plant: null, warehouseId: 'WH-TKM' },
  { code: '2010', name: 'Battambang Depot', category: 'Distribution', plant: null, warehouseId: 'WH-BB' },
  { code: '2020', name: 'Siem Reap Depot', category: 'Distribution', plant: null, warehouseId: 'WH-SR' },
  // Opened in SAP but not yet copied — the first reference sync brings it across.
  { code: '3010', name: 'Kampong Cham Depot', category: 'Distribution', plant: null, warehouseId: null },
];

const LOCATION_NAMES: Record<string, string> = {
  '0001': 'Finished goods yard',
  '0002': 'Covered warehouse',
  '0003': 'Sheet & coil store',
  '0004': 'QC hold',
  '0009': 'In transit',
};

function locationsFor(plant: string): ReferenceRecord[] {
  const codes = plant === '1000' ? ['0001', '0003', '0004', '0009'] : ['0001', '0002', '0003', '0009'];
  return codes.map((code) => ({ code, name: LOCATION_NAMES[code], category: null, plant }));
}

export const STORAGE_LOCATIONS: ReferenceRecord[] = PLANTS.flatMap((p) => locationsFor(p.code));

/** The plant SAP holds that the platform does not, until references are synced. */
export const PENDING_PLANT = '3010';

// ── Material master ─────────────────────────────────────────────────────────

interface Family {
  type: string;
  group: string;
  unit: string;
  brand: string | null;
  division: string;
  priceGroup: string;
  /** English description, Khmer description and an optional unit weight in kg. */
  items: Array<[string, string, number | null]>;
}

const cross = <A, B>(as: readonly A[], bs: readonly B[]) => as.flatMap((a) => bs.map((b) => [a, b] as const));

const FAMILIES: Family[] = [
  {
    type: 'FERT', group: 'RB01', unit: 'TO', brand: 'ISI Steel', division: '10', priceGroup: '02',
    items: cross(['D10', 'D12', 'D16', 'D20', 'D25', 'D28', 'D32'], ['SD295', 'SD390', 'SD490']).flatMap(
      ([d, g]) => (['10M', '12M'] as const).map((l) => [`DEFORMED BAR ${g} ${d} x ${l}`, `ដែកសរសៃ ${d} ${g} ប្រវែង ${l}`, null] as [string, string, null])
    ),
  },
  {
    type: 'FERT', group: 'RB02', unit: 'TO', brand: 'ISI Steel', division: '10', priceGroup: '02',
    items: cross(['R6', 'R8', 'R9', 'R10', 'R12'], ['6M', '12M']).map(([d, l]) => [`ROUND BAR SR24 ${d} x ${l}`, `ដែករលោង ${d} ប្រវែង ${l}`, null]),
  },
  {
    type: 'FERT', group: 'WR01', unit: 'TO', brand: 'Mekong Mills', division: '10', priceGroup: '02',
    items: cross(['5.5MM', '6.5MM', '8MM', '10MM'], ['SAE1006', 'SAE1008']).map(([d, g]) => [`WIRE ROD ${g} ${d} COIL`, `ដែកខ្សែ ${d} ${g}`, null]),
  },
  {
    type: 'FERT', group: 'ST01', unit: 'PC', brand: 'Angkor Metal', division: '10', priceGroup: '03',
    items: (
      [['25x25x3', 6.8], ['30x30x3', 8.2], ['40x40x4', 14.5], ['50x50x5', 22.6], ['63x63x6', 34.3], ['75x75x7', 47.8], ['100x100x10', 90.6]] as const
    ).map(([s, w]) => [`EQUAL ANGLE SS400 L${s} x 6M`, `ដែកកែង L${s} ប្រវែង 6M`, w]),
  },
  {
    type: 'FERT', group: 'ST02', unit: 'PC', brand: 'Angkor Metal', division: '10', priceGroup: '03',
    items: ([['75', 41.4], ['100', 56.2], ['125', 79.8], ['150', 111.6], ['180', 128.4], ['200', 147.6]] as const).map(
      ([s, w]) => [`C-CHANNEL SS400 C${s} x 6M`, `ដែក C${s} ប្រវែង 6M`, w]
    ),
  },
  {
    type: 'FERT', group: 'ST03', unit: 'PC', brand: 'Angkor Metal', division: '10', priceGroup: '03',
    items: ([['100x100', 206.4], ['125x125', 284.4], ['150x150', 378.0], ['200x200', 598.8], ['250x250', 868.8], ['300x300', 1128.0]] as const).map(
      ([s, w]) => [`H-BEAM SS400 H${s} x 12M`, `ដែក H${s} ប្រវែង 12M`, w]
    ),
  },
  {
    type: 'FERT', group: 'ST04', unit: 'PC', brand: 'ISI Steel', division: '10', priceGroup: '03',
    items: cross(['2', '3', '4', '5', '6', '8', '10', '12'], ['1220x2440', '1500x6000']).map(([t, s]) => [
      `MS PLATE SS400 ${t}MM ${s}`,
      `បន្ទះដែក ${t}MM ${s}`,
      Number((Number(t) * 7.85 * (s === '1220x2440' ? 2.977 : 9)).toFixed(1)),
    ]),
  },
  {
    type: 'FERT', group: 'PI01', unit: 'PC', brand: 'ISI Pipe', division: '20', priceGroup: '01',
    items: cross(['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '3"', '4"'], ['1.6MM', '2.0MM', '2.5MM']).map(([d, t]) => [
      `BLACK PIPE ${d} x ${t} x 6M`, `បំពង់ដែកខ្មៅ ${d} កម្រាស់ ${t}`, null,
    ]),
  },
  {
    type: 'FERT', group: 'PI02', unit: 'PC', brand: 'ISI Pipe', division: '20', priceGroup: '01',
    items: cross(['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '3"', '4"'], ['1.8MM', '2.3MM']).map(([d, t]) => [
      `GI PIPE ${d} x ${t} x 6M`, `បំពង់ស័ង្កសី ${d} កម្រាស់ ${t}`, null,
    ]),
  },
  {
    type: 'FERT', group: 'PI03', unit: 'PC', brand: 'ISI Pipe', division: '20', priceGroup: '01',
    items: cross(['20x20', '25x25', '30x30', '40x40', '50x50', '60x60', '75x75', '100x100'], ['1.2MM', '1.4MM', '2.0MM']).map(([s, t]) => [
      `SQUARE TUBE ${s} x ${t} x 6M`, `ដែកប្រអប់ការ៉េ ${s} កម្រាស់ ${t}`, null,
    ]),
  },
  {
    type: 'FERT', group: 'PI04', unit: 'PC', brand: 'ISI Pipe', division: '20', priceGroup: '01',
    items: cross(['40x20', '50x25', '60x40', '75x45', '80x40', '100x50'], ['1.4MM', '2.0MM']).map(([s, t]) => [
      `RECT TUBE ${s} x ${t} x 6M`, `ដែកប្រអប់ចតុកោណ ${s} កម្រាស់ ${t}`, null,
    ]),
  },
  {
    type: 'FERT', group: 'RF01', unit: 'SHT', brand: 'ISI Roofing', division: '30', priceGroup: '01',
    items: cross(['0.25', '0.30', '0.35', '0.40', '0.45'], ['1.8M', '2.4M', '3.0M']).map(([t, l]) => [
      `ZINC SHEET CORRUGATED ${t}MM x ${l}`, `ស័ង្កសីរលក ${t}MM ប្រវែង ${l}`, null,
    ]),
  },
  {
    type: 'FERT', group: 'RF02', unit: 'M', brand: 'ISI Roofing', division: '30', priceGroup: '01',
    items: cross(['BLUE', 'RED', 'GREEN', 'GREY', 'WHITE'], ['0.35', '0.42']).map(([c, t]) => [
      `COLOUR ROOF 5-RIB ${c} ${t}MM`, `ស័ង្កសីពណ៌ ${c} ${t}MM`, null,
    ]),
  },
  {
    type: 'HAWA', group: 'RF03', unit: 'PC', brand: 'ISI Roofing', division: '30', priceGroup: '01',
    items: [
      ['RIDGE CAP 0.35MM x 2.4M', 'ក្បាលដំបូល 0.35MM', null],
      ['TRANSLUCENT SHEET 5-RIB 2.4M', 'ស័ង្កសីថ្លា 5-RIB', null],
      ['ROOFING SCREW 65MM (BOX 250)', 'វីសដំបូល 65MM', null],
      ['FOAM CLOSURE STRIP 5-RIB', 'ជ័របិទរន្ធដំបូល', null],
      ['SILICONE SEALANT 300ML CLEAR', 'កាវស៊ីលីកូន 300ML', null],
    ],
  },
  {
    type: 'FERT', group: 'ME01', unit: 'SHT', brand: 'ISI Steel', division: '10', priceGroup: '03',
    items: cross(['4MM', '5MM', '6MM', '8MM'], ['150x150', '200x200']).map(([d, a]) => [
      `WELDED MESH ${d} ${a} 2.4 x 6M`, `សំណាញ់ដែក ${d} ក្រឡា ${a}`, null,
    ]),
  },
  {
    type: 'FERT', group: 'WI01', unit: 'ROL', brand: 'Mekong Mills', division: '10', priceGroup: '01',
    items: [
      ['BINDING WIRE BWG18 20KG', 'លួសចង BWG18 20KG', 20],
      ['BINDING WIRE BWG16 20KG', 'លួសចង BWG16 20KG', 20],
      ['BARBED WIRE 2.0MM 200M', 'លួសបន្លា 2.0MM 200M', 14],
      ['GI WIRE 2.5MM 25KG', 'លួសស័ង្កសី 2.5MM 25KG', 25],
    ],
  },
  {
    type: 'HAWA', group: 'NL01', unit: 'BOX', brand: 'Mekong Mills', division: '10', priceGroup: '01',
    items: ['1"', '1-1/2"', '2"', '2-1/2"', '3"', '4"', '5"'].map((s) => [`COMMON NAIL ${s} (25KG)`, `ដែកគោល ${s} 25KG`, 25]),
  },
  {
    type: 'HAWA', group: 'FX01', unit: 'PC', brand: null, division: '20', priceGroup: '01',
    items: [
      ...['M10', 'M12', 'M16', 'M20', 'M24'].map((s): [string, string, null] => [`ANCHOR BOLT ${s} x 300 HDG`, `បូឡុងចាក់ក្បាល ${s}`, null]),
      ...['M8', 'M10', 'M12', 'M16', 'M20'].map((s): [string, string, null] => [`HEX BOLT & NUT ${s} x 50 GR8.8`, `បូឡុង និងក្បាល ${s}`, null]),
      ['CHEMICAL ANCHOR 300ML', 'កាវចាក់ដែក 300ML', null],
    ],
  },
  {
    type: 'HAWA', group: 'CE01', unit: 'BAG', brand: 'ISI Trading', division: '40', priceGroup: '01',
    items: [
      ['OPC CEMENT TYPE I 50KG', 'ស៊ីម៉ងត៍ OPC 50KG', 50],
      ['PCB40 BLENDED CEMENT 50KG', 'ស៊ីម៉ងត៍ PCB40 50KG', 50],
      ['MASONRY CEMENT 40KG', 'ស៊ីម៉ងត៍សំណង់ 40KG', 40],
      ['RAPID SET CEMENT 25KG', 'ស៊ីម៉ងត៍ស្ងួតរហ័ស 25KG', 25],
    ],
  },
  {
    type: 'HALB', group: 'BL01', unit: 'TO', brand: null, division: '10', priceGroup: '06',
    items: cross(['120x120', '130x130', '150x150'], ['SD390', 'SD490', 'Q235']).map(([s, g]) => [`BILLET ${g} ${s} x 12M`, `ដែកដុំ ${g} ${s}`, null]),
  },
  {
    type: 'ROH', group: 'CL01', unit: 'TO', brand: null, division: '10', priceGroup: '06',
    items: ['1.5', '2.0', '2.5', '3.0', '4.0', '5.0', '6.0'].map((t) => [`HR COIL SS400 ${t}MM x 1219`, `ដែករមូរ HR ${t}MM`, null]),
  },
  {
    type: 'ROH', group: 'CL02', unit: 'TO', brand: null, division: '30', priceGroup: '06',
    items: [
      ...['0.25', '0.30', '0.35', '0.40'].map((t): [string, string, null] => [`GI COIL Z80 ${t}MM x 914`, `ដែករមូរស័ង្កសី ${t}MM`, null]),
      ...['BLUE', 'RED', 'GREY'].map((c): [string, string, null] => [`PPGI COIL ${c} 0.35MM x 1219`, `ដែករមូរពណ៌ ${c}`, null]),
    ],
  },
  {
    type: 'VERP', group: 'PK01', unit: 'PC', brand: null, division: '10', priceGroup: '06',
    items: [
      ['STEEL STRAPPING 32MM x 0.8MM', 'ខ្សែរុំដែក 32MM', null],
      ['BUNDLE TAG PRINTED', 'ស្លាកបាច់', null],
      ['TIMBER DUNNAGE 100x100x1200', 'ឈើទ្រ 100x100', null],
      ['PE WRAP FILM 500MM', 'ជ័ររុំ 500MM', null],
      ['COIL EYE PROTECTOR', 'គម្របការពាររមូរ', null],
    ],
  },
  {
    type: 'DIEN', group: 'SV01', unit: 'EA', brand: null, division: '10', priceGroup: '01',
    items: [
      ['CUT & BEND SERVICE PER TON', 'សេវាកាត់ និងពត់ដែក', null],
      ['DELIVERY CHARGE PHNOM PENH', 'សេវាដឹកជញ្ជូន ភ្នំពេញ', null],
      ['DELIVERY CHARGE PROVINCE', 'សេវាដឹកជញ្ជូន ខេត្ត', null],
      ['CRANE HIRE PER HOUR', 'ជួលស្ទូច ក្នុងមួយម៉ោង', null],
    ],
  },
];

const TYPE_PREFIX: Record<string, number> = { FERT: 1, HAWA: 2, HALB: 4, ROH: 3, VERP: 5, DIEN: 9 };

/** Everything SAP holds, newest last. */
function buildSapMaster(): MaterialRecord[] {
  const rng = makeRng(602417);
  const counters: Record<string, number> = {};
  const typeName = Object.fromEntries(MATERIAL_TYPES.map((t) => [t.code, t.name ?? t.code]));
  const groupName = Object.fromEntries(MATERIAL_GROUPS.map((g) => [g.code, g.name ?? g.code]));
  const list: MaterialRecord[] = [];

  for (const family of FAMILIES) {
    for (const [name, khName, weight] of family.items) {
      counters[family.type] = (counters[family.type] ?? 0) + 1;
      const material = `${TYPE_PREFIX[family.type]}${String(1000000 + counters[family.type] * 13).padStart(7, '0')}`;
      const createdOffset = -rng.int(120, 2400);
      list.push({
        id: `MAT-${material}`,
        material,
        name,
        materialName: name,
        // A few SAP records have no Khmer text — the screen has to cope with that.
        materialKhName: rng.chance(0.93) ? khName : null,
        materialType: family.type,
        materialTypeName: typeName[family.type],
        materialGroup: family.group,
        materialGroupName: groupName[family.group],
        baseUnit: family.unit,
        brand: family.brand,
        isBlocked: rng.chance(0.035),
        priceGroup: family.priceGroup,
        division: family.division,
        grossWeightKg: weight,
        createdOn: isoDate(createdOffset),
        changedOn: isoDate(Math.min(-1, createdOffset + rng.int(0, 600))),
        synchronisedAt: `${isoDate(-1)}T02:${String(30 + rng.int(0, 4)).padStart(2, '0')}:00Z`,
      });
    }
  }
  return list;
}

export const sapMaster: MaterialRecord[] = buildSapMaster();

/** Materials created in SAP since the platform's last copy, by material number. */
export const PENDING_MATERIALS = new Set(
  sapMaster
    .filter((_, i) => i % 23 === 7)
    .slice(0, 12)
    .map((m) => m.material)
);

/** The platform's copy as of the last nightly sync. */
export function seedMaterials(): MaterialRecord[] {
  return sapMaster.filter((m) => !PENDING_MATERIALS.has(m.material)).map((m) => ({ ...m }));
}

// ── Batch stock ─────────────────────────────────────────────────────────────

export interface StockDetailRecord {
  material: string;
  materialName: string | null;
  plant: string;
  plantName: string | null;
  storageLocation: string;
  batch: string;
  quantity: number;
  unit: string;
  /** SAP stock category: unrestricted, quality inspection or blocked. */
  stockType: 'Unrestricted' | 'Quality inspection' | 'Blocked';
}

/** Typical depot holding per unit of measure — a rebar depot holds tonnes, not thousands. */
const QUANTITY_RANGE: Record<string, [number, number]> = {
  TO: [4, 160],
  PC: [20, 900],
  SHT: [40, 1400],
  M: [300, 6000],
  ROL: [10, 240],
  BOX: [8, 160],
  BAG: [120, 2400],
};

function hash(text: string): number {
  return Array.from(text).reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
}

/**
 * Batch positions as of stock snapshot `revision`. Generated rather than stored —
 * there are thousands. Which batches exist is fixed per material, so a re-sync updates
 * the same positions; the quantities are keyed on the revision, so each stock sync
 * moves the numbers (and empties the odd batch) the way a fresh snapshot would.
 */
export function buildStockDetail(materials: readonly MaterialRecord[], plants: readonly ReferenceRecord[], revision: number): StockDetailRecord[] {
  const rows: StockDetailRecord[] = [];
  const plantName = Object.fromEntries(plants.map((p) => [p.code, p.name]));
  const plantCodes = plants.map((p) => p.code);

  for (const m of materials) {
    if (m.materialType === 'DIEN') continue;
    const rng = makeRng(hash(m.material));
    const qtyRng = makeRng(hash(m.material) + revision * 7919);
    const range = QUANTITY_RANGE[m.baseUnit] ?? [10, 400];
    // The mill holds semi-finished and raw stock; depots hold what is sold.
    const candidates =
      m.materialType === 'HALB' || m.materialType === 'ROH' || m.materialType === 'VERP'
        ? plantCodes.filter((p) => p === '1000')
        : plantCodes.filter((p) => p !== '1000');

    for (const plant of candidates) {
      if (!rng.chance(plant === '1000' ? 1 : plant.startsWith('1') ? 0.78 : 0.5)) continue;
      const regional = plant.startsWith('2') || plant.startsWith('3');
      const batches = rng.int(1, regional ? 2 : 3);
      for (let b = 0; b < batches; b += 1) {
        const qty = qtyRng.float(range[0], range[1]) * (regional ? 0.55 : 1);
        const month = 6 + rng.int(0, 3);
        const position = {
          material: m.material,
          materialName: m.materialName,
          plant,
          plantName: plantName[plant] ?? null,
          storageLocation: m.baseUnit === 'SHT' || m.baseUnit === 'M' ? '0003' : rng.chance(0.08) ? '0009' : rng.pick(['0001', '0002']),
          batch: `26${String(month).padStart(2, '0')}${rng.pick(['A', 'B', 'C'])}${String(rng.int(1, 999)).padStart(4, '0')}`,
          quantity: m.baseUnit === 'TO' ? Number(qty.toFixed(3)) : Math.round(qty),
          unit: m.baseUnit,
          stockType: rng.weighted([
            ['Unrestricted', 20],
            ['Quality inspection', 1],
            ['Blocked', 0.5],
          ] as const),
        };
        // After the first snapshot, the odd batch has been sold through.
        if (revision > 0 && qtyRng.chance(0.04)) continue;
        rows.push(position);
      }
    }
  }
  return rows;
}
