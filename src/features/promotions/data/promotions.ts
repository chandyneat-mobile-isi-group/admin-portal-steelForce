import { products } from '@/features/materials/data/catalog';
import { crmDepots } from '@/features/depots/data/crm';
import type {
  PromotionApprovalSchema,
  PromotionConditionLeafDto,
  PromotionDetailDto,
  PromotionRuleDto,
  PromotionVersionDto,
} from '../api';
import type { z } from 'zod';
import type { ConditionDefinitionDto } from '../catalog-api';
import { seedConditionDefinitions } from './catalog';

/**
 * Seed promotions for the prototype.
 *
 * Forty-odd discounts an ISI Steel commercial team would plausibly run in 2026 — COD and
 * pickup incentives, rebar and roofing volume ladders, key-account pricing, Khmer New
 * Year and Pchum Ben campaigns — spread across every lifecycle state so each queue,
 * filter and badge has something in it. Materials and customers are real records from
 * the material and depot masters.
 */

type Approval = z.infer<typeof PromotionApprovalSchema>;

/** A promotion as the mock store keeps it. `businessTypeName` is joined on read. */
export type StoredPromotion = Omit<PromotionDetailDto, 'businessTypeName'> & { updatedAt: string };

export const AUTHORS = ['Dara Sok', 'Malis Phan', 'Piseth Ouk', 'Sreyneang Chan'] as const;
export const COMMERCIAL_SIGNERS = ['Sokunthea Chea', 'Vannak Heng'] as const;
export const FINANCE_SIGNERS = ['Rithy Lim', 'Bopha Kong'] as const;

// ── Rule shorthands ───────────────────────────────────────────────────────────

let definitions: ConditionDefinitionDto[] | null = null;
const defOf = (code: string) => (definitions ??= seedConditionDefinitions()).find((d) => d.code === code);

type Item = PromotionConditionLeafDto | PromotionRuleDto;
const isGroup = (item: Item): item is PromotionRuleDto => 'groups' in item;

export function leaf(code: string, operator: string, values: string[]): PromotionConditionLeafDto {
  const def = defOf(code);
  return {
    condition: code,
    dimension: code,
    code,
    conditionName: def?.name ?? code,
    valueType: def?.valueType ?? 'Text',
    operator,
    values,
  };
}

const group = (operator: 'And' | 'Or', items: Item[]): PromotionRuleDto => ({
  operator,
  conditions: items.filter((i): i is PromotionConditionLeafDto => !isGroup(i)),
  groups: items.filter(isGroup),
});
const and = (...items: Item[]) => group('And', items);
const or = (...items: Item[]) => group('Or', items);
const is = (code: string, ...values: string[]) => leaf(code, 'In', values);
const not = (code: string, ...values: string[]) => leaf(code, 'NotIn', values);
const atLeast = (code: string, n: number) => leaf(code, 'GreaterOrEqual', [String(n)]);
const between = (code: string, lo: number, hi: number) => leaf(code, 'Between', [String(lo), String(hi)]);

/** The flat form of a rule: root leaves in group 0, each child group numbered after. */
export function flatten(rule: PromotionRuleDto): PromotionConditionLeafDto[] {
  const out: PromotionConditionLeafDto[] = rule.conditions.map((c) => ({ ...c, group: 0 }));
  let n = 0;
  const walk = (g: PromotionRuleDto) => {
    n += 1;
    const id = n;
    g.conditions.forEach((c) => out.push({ ...c, group: id }));
    g.groups.forEach(walk);
  };
  rule.groups.forEach(walk);
  return out;
}

/** Nested means something the flat spreadsheet form cannot express. */
export const isNested = (rule: PromotionRuleDto) => rule.groups.length > 0 || rule.operator === 'Or';

const mat = (name: string) => products.find((p) => p.name === name)?.code ?? name;
const cus = (i: number) => crmDepots[i]?.code ?? `C0${10450 + i * 7}`;

// ── Spec table ────────────────────────────────────────────────────────────────

type Path = 'Draft' | 'UnderCommercialReview' | 'UnderFinanceReview' | 'Approved' | 'Active' | 'Rejected' | 'RejectedFinance' | 'Cancelled' | 'Deactivated' | 'Expired';

interface Spec {
  code: string;
  type: string;
  name: string;
  description: string;
  reward: [type: 'Percentage' | 'FixedAmount' | 'FreeItem', value: number | null];
  unit?: string;
  free?: string;
  from: string;
  to: string;
  priority: number;
  stacking?: string;
  sap: string | null;
  rule: PromotionRuleDto;
  tiers?: [from: number, to: number | null, value: number | null, free?: number][];
  path: Path;
  /** Earlier versions: their statuses, oldest first. The spec above is the newest. */
  history?: { path: Path; reward?: number; to?: string }[];
  links?: { code: string; type: string }[];
  createdDaysAgo: number;
}

const SPECS: Spec[] = [
  // Payment method
  { code: 'COD-2026-01', type: 'PAYMENT_METHOD', name: 'Cash on delivery 1%', description: 'One percent off every order paid in cash on delivery. Cuts receivable days on retail accounts.', reward: ['Percentage', 1], from: '2026-01-01', to: '2026-12-31', priority: 10, sap: 'ZD01', rule: and(is('PaymentMethod', 'TCOD')), path: 'Active', createdDaysAgo: 290 },
  { code: 'KHQR-2026', type: 'PAYMENT_METHOD', name: 'KHQR instant payment 0.75%', description: 'Encourages KHQR at the counter instead of cash handling at depots.', reward: ['Percentage', 0.75], from: '2026-03-01', to: '2026-12-31', priority: 10, sap: 'ZD01', rule: and(is('PaymentMethod', 'KHQR')), path: 'Active', createdDaysAgo: 230 },
  { code: 'TT-PROMPT-30', type: 'PAYMENT_METHOD', name: 'Bank transfer before dispatch 0.5%', description: 'Transfer received before the truck leaves the depot. Wholesale and project accounts.', reward: ['Percentage', 0.5], from: '2026-02-01', to: '2026-12-31', priority: 8, sap: 'ZD01', rule: and(is('PaymentMethod', 'TT'), is('CustomerType', 'DISTRIBUTOR', 'CONTRACTOR', 'DEPOT')), path: 'Active', history: [{ path: 'Active', reward: 0.3 }], createdDaysAgo: 260 },
  { code: 'COD-PROV-2026', type: 'PAYMENT_METHOD', name: 'Provincial COD 1.5%', description: 'Higher COD incentive for Battambang and Siem Reap where collections run late.', reward: ['Percentage', 1.5], from: '2026-09-01', to: '2027-03-31', priority: 12, sap: 'ZD01', rule: and(is('PaymentMethod', 'TCOD'), is('Province', 'BTB', 'SRP')), path: 'UnderCommercialReview', links: [{ code: 'COD-2026-01', type: 'Excludes' }], createdDaysAgo: 9 },
  { code: 'CR30-EARLY', type: 'PAYMENT_METHOD', name: 'Net 30 early settlement 0.8%', description: 'Credit accounts settling within 10 days of invoice.', reward: ['Percentage', 0.8], from: '2026-10-01', to: '2027-06-30', priority: 6, sap: 'ZD01', rule: and(is('PaymentMethod', 'CR30'), not('CustomerTier', 'BRONZE')), path: 'Draft', createdDaysAgo: 3 },

  // Pickup
  { code: 'PICKUP-PP-USD5', type: 'SELF_PICKUP', name: 'Phnom Penh self-pickup USD 5 / t', description: 'Customer collects rebar from Phnom Penh Central or Chroy Changvar with their own truck.', reward: ['FixedAmount', 5], unit: 'tonne', from: '2026-01-15', to: '2026-12-31', priority: 20, sap: 'ZD02', rule: and(is('DeliveryMode', 'PICKUP'), is('Plant', 'WH-PP', 'WH-CCV'), is('MaterialGroup', 'CAT-STL-RB', 'CAT-STL-WR')), path: 'Active', createdDaysAgo: 275 },
  { code: 'PICKUP-BB-USD7', type: 'SELF_PICKUP', name: 'Battambang depot pickup USD 7 / t', description: 'Saves a 290 km haul. Steel long products only.', reward: ['FixedAmount', 7], unit: 'tonne', from: '2026-04-01', to: '2026-12-31', priority: 20, sap: 'ZD02', rule: and(is('DeliveryMode', 'PICKUP'), is('Plant', 'WH-BB'), is('MaterialGroup', 'CAT-STL-RB', 'CAT-STL-ST')), path: 'Active', createdDaysAgo: 200 },
  { code: 'PICKUP-SR-USD6', type: 'SELF_PICKUP', name: 'Siem Reap depot pickup USD 6 / t', description: 'Pickup from the Siem Reap depot ahead of the dry-season building rush.', reward: ['FixedAmount', 6], unit: 'tonne', from: '2026-11-01', to: '2027-04-30', priority: 20, sap: 'ZD02', rule: and(is('DeliveryMode', 'PICKUP'), is('Plant', 'WH-SR')), path: 'UnderFinanceReview', createdDaysAgo: 14 },
  { code: 'PICKUP-TKM-ROOF', type: 'SELF_PICKUP', name: 'Ta Khmau roofing pickup USD 0.20 / sheet', description: 'Roofing sheet collected from Ta Khmau.', reward: ['FixedAmount', 0.2], unit: 'sheet', from: '2026-05-01', to: '2026-08-31', priority: 15, sap: 'ZD02', rule: and(is('DeliveryMode', 'PICKUP'), is('Plant', 'WH-TKM'), is('MaterialGroup', 'CAT-CON-RF')), path: 'Expired', createdDaysAgo: 170 },

  // Product
  { code: 'RB-D12-Q4', type: 'PRODUCT_SKU', name: 'Deformed Bar D12 — Q4 price cut 3%', description: 'Clears D12 stock built up at Chroy Changvar after the rainy season slowdown.', reward: ['Percentage', 3], unit: 'tonne', from: '2026-10-01', to: '2026-12-31', priority: 30, sap: 'ZD03', rule: and(is('Material', mat('Deformed Bar D12'))), path: 'Active', createdDaysAgo: 24 },
  { code: 'RB-D16-D20-2026', type: 'PRODUCT_SKU', name: 'D16 / D20 rebar USD 12 / t', description: 'Large-diameter rebar for high-rise projects in Phnom Penh.', reward: ['FixedAmount', 12], unit: 'tonne', from: '2026-03-01', to: '2026-12-31', priority: 30, sap: 'ZD03', rule: and(is('Material', mat('Deformed Bar D16'), mat('Deformed Bar D20')), is('Province', 'PP', 'KDL')), path: 'Active', history: [{ path: 'Active', reward: 10 }, { path: 'Active', reward: 11 }], createdDaysAgo: 230 },
  { code: 'GI-PIPE-SALE', type: 'PRODUCT_SKU', name: 'GI pipe 5% off', description: 'Galvanised pipe 1" and 2" for plumbing contractors.', reward: ['Percentage', 5], unit: 'length', from: '2026-06-01', to: '2026-11-30', priority: 25, sap: 'ZD03', rule: and(is('Material', mat('GI Pipe 1"'), mat('GI Pipe 2"'))), path: 'UnderCommercialReview', history: [{ path: 'Active', reward: 4 }], createdDaysAgo: 140 },
  { code: 'COLOUR-ROOF-4', type: 'PRODUCT_SKU', name: 'Colour roof 0.35mm 4% off', description: 'Blue and red colour-coated roofing sheet.', reward: ['Percentage', 4], unit: 'sheet', from: '2026-09-15', to: '2027-01-31', priority: 25, sap: 'ZD03', rule: and(is('Material', mat('Colour Roof Blue 0.35mm'), mat('Colour Roof Red 0.35mm'))), path: 'Approved', createdDaysAgo: 20 },
  { code: 'ANGLE-BAR-2026', type: 'PRODUCT_SKU', name: 'Equal angle bars USD 15 / t', description: 'Equal angle 40, 50 and 75 for fabricators.', reward: ['FixedAmount', 15], unit: 'tonne', from: '2026-07-01', to: '2026-12-31', priority: 28, sap: 'ZD03', rule: and(is('Material', mat('Equal Angle 40×40'), mat('Equal Angle 50×50'), mat('Equal Angle 75×75')), is('CustomerType', 'STEEL_SHOP', 'CONTRACTOR')), path: 'Deactivated', createdDaysAgo: 110 },
  { code: 'MESH-6MM-Q4', type: 'PRODUCT_SKU', name: 'Welded mesh 6mm 6% off', description: 'Slab mesh for residential projects.', reward: ['Percentage', 6], unit: 'sheet', from: '2026-10-15', to: '2026-12-31', priority: 26, sap: 'ZD03', rule: and(is('Material', mat('Welded Mesh 6mm'))), path: 'UnderCommercialReview', createdDaysAgo: 6 },
  { code: 'CEMENT-BUNDLE', type: 'PRODUCT_SKU', name: 'OPC cement with rebar USD 0.30 / bag', description: 'Cement discount when the same order carries rebar.', reward: ['FixedAmount', 0.3], unit: 'bag', from: '2026-11-01', to: '2027-02-28', priority: 22, sap: 'ZD03', rule: and(is('Material', mat('OPC Cement 50kg')), is('MaterialGroup', 'CAT-STL-RB')), path: 'Rejected', createdDaysAgo: 18 },

  // Customer-specific
  { code: 'KA-LUCKY-RB', type: 'CUSTOMER_PRODUCT', name: 'Lucky Hardware — rebar key-account price', description: 'Negotiated USD 18 / t on all rebar for Lucky Hardware, Toul Kork.', reward: ['FixedAmount', 18], unit: 'tonne', from: '2026-01-01', to: '2026-12-31', priority: 40, stacking: 'Exclusive', sap: 'ZK00', rule: and(is('Customer', cus(0)), is('MaterialGroup', 'CAT-STL-RB')), path: 'Active', createdDaysAgo: 300 },
  { code: 'KA-KIMSTEEL-ST', type: 'CUSTOMER_PRODUCT', name: 'Kim Steel — structural 2.5%', description: 'Structural steel sections for Kim Steel’s fabrication shop.', reward: ['Percentage', 2.5], unit: 'tonne', from: '2026-02-01', to: '2027-01-31', priority: 40, stacking: 'Exclusive', sap: 'ZK00', rule: and(is('Customer', cus(1)), is('MaterialGroup', 'CAT-STL-ST')), path: 'Active', createdDaysAgo: 250 },
  { code: 'KA-DARA-PROJECT', type: 'CUSTOMER_PRODUCT', name: 'Dara Construction — site price', description: 'Borey project in Chroy Changvar. Rebar and mesh at agreed price.', reward: ['FixedAmount', 22], unit: 'tonne', from: '2026-05-01', to: '2027-04-30', priority: 45, stacking: 'Exclusive', sap: 'ZK00', rule: and(is('Customer', cus(2)), is('MaterialGroup', 'CAT-STL-RB', 'CAT-FAB-ME')), path: 'Active', history: [{ path: 'Active', reward: 20 }], createdDaysAgo: 160 },
  { code: 'KA-MENG-DIST', type: 'CUSTOMER_PRODUCT', name: 'Meng Distributor — roofing 3%', description: 'Distributor margin support on roofing sheet.', reward: ['Percentage', 3], unit: 'sheet', from: '2026-08-01', to: '2027-07-31', priority: 40, sap: 'ZK00', rule: and(is('Customer', cus(3)), is('MaterialGroup', 'CAT-CON-RF')), path: 'UnderFinanceReview', createdDaysAgo: 30 },
  { code: 'KA-ANGKOR-ROOF', type: 'CUSTOMER_PRODUCT', name: 'Angkor Roofing Outlet — accessories 8%', description: 'Screws, ridge caps and sealant for the outlet’s installation crews.', reward: ['Percentage', 8], unit: 'piece', from: '2026-09-01', to: '2027-08-31', priority: 38, sap: 'ZK00', rule: and(is('Customer', cus(6)), is('MaterialGroup', 'CAT-CON-AC')), path: 'Draft', createdDaysAgo: 5 },
  { code: 'KA-SOKHA-PIPE', type: 'CUSTOMER_PRODUCT', name: 'Sokha Hardware — pipe USD 0.80 / length', description: 'Black and GI pipe for Sokha Hardware, Sen Sok.', reward: ['FixedAmount', 0.8], unit: 'length', from: '2026-06-01', to: '2027-05-31', priority: 38, sap: 'ZK00', rule: and(is('Customer', cus(5)), is('MaterialGroup', 'CAT-STL-PI')), path: 'Active', createdDaysAgo: 130 },
  { code: 'KA-HENG-RETAIL', type: 'CUSTOMER_PRODUCT', name: 'Heng Retail — cement USD 0.25 / bag', description: 'Retail cement price match against the Chbar Ampov competitor.', reward: ['FixedAmount', 0.25], unit: 'bag', from: '2026-07-15', to: '2026-12-31', priority: 35, sap: 'ZK00', rule: and(is('Customer', cus(4)), is('MaterialGroup', 'CAT-CON-CE')), path: 'Cancelled', createdDaysAgo: 75 },

  // Volume
  { code: 'VOL-REBAR-2026', type: 'VOLUME_TIER', name: 'Rebar volume ladder', description: 'Steps from 1% at 10 t to 3% above 100 t per order.', reward: ['Percentage', null], unit: 'tonne', from: '2026-01-01', to: '2026-12-31', priority: 50, sap: 'ZV01', rule: and(is('MaterialGroup', 'CAT-STL-RB')), tiers: [[10, 30, 1], [30, 60, 1.5], [60, 100, 2], [100, null, 3]], path: 'Active', createdDaysAgo: 295 },
  { code: 'VOL-ROOF-SHEET', type: 'VOLUME_TIER', name: 'Roofing sheet volume ladder', description: 'Per-sheet discount for shops buying by the bundle.', reward: ['FixedAmount', null], unit: 'sheet', from: '2026-03-01', to: '2026-12-31', priority: 50, sap: 'ZV01', rule: and(is('MaterialGroup', 'CAT-CON-RF'), is('CustomerType', 'HARDWARE_SHOP', 'RETAIL_SHOP', 'OUTLET')), tiers: [[200, 500, 0.15], [500, 1000, 0.25], [1000, null, 0.4]], path: 'Draft', history: [{ path: 'Active' }], createdDaysAgo: 220 },
  { code: 'VOL-TONNAGE-PROV', type: 'VOLUME_TIER', name: 'Provincial full-truck tonnage', description: 'Full 25 t trucks to Battambang and Siem Reap.', reward: ['FixedAmount', null], unit: 'tonne', from: '2026-10-01', to: '2027-03-31', priority: 52, sap: 'ZV01', rule: and(is('Province', 'BTB', 'SRP'), atLeast('OrderTonnage', 25)), tiers: [[25, 50, 4], [50, null, 6]], path: 'UnderCommercialReview', createdDaysAgo: 11 },
  { code: 'VOL-PIPE-Q3', type: 'VOLUME_TIER', name: 'Pipe volume Q3', description: 'Quarterly volume push on black pipe.', reward: ['Percentage', null], unit: 'length', from: '2026-07-01', to: '2026-09-30', priority: 48, sap: 'ZV01', rule: and(is('MaterialGroup', 'CAT-STL-PI'), between('LineQuantity', 100, 5000)), tiers: [[100, 500, 2], [500, null, 3.5]], path: 'Expired', createdDaysAgo: 120 },
  { code: 'VOL-ORDERVALUE', type: 'VOLUME_TIER', name: 'Big basket — order value ladder', description: 'Mixed orders above USD 5,000 net.', reward: ['Percentage', null], from: '2026-11-01', to: '2027-04-30', priority: 5, sap: 'ZV01', rule: and(atLeast('OrderValue', 5000), not('CustomerTier', 'PLATINUM')), tiers: [[5000, 15000, 0.5], [15000, 40000, 1], [40000, null, 1.5]], path: 'Draft', createdDaysAgo: 2 },

  // Buy X get Y
  { code: 'BXGY-SCREW-ROOF', type: 'BUY_X_GET_Y', name: 'Free roofing screws with zinc sheet', description: 'One box of 65mm roofing screws free per 100 zinc sheets.', reward: ['FreeItem', null], unit: 'sheet', free: mat('Roofing Screw 65mm'), from: '2026-04-13', to: '2026-12-31', priority: 60, sap: 'ZF00', rule: and(is('Material', mat('Zinc Sheet 0.30mm'), mat('Zinc Sheet 0.40mm'))), tiers: [[100, 300, null, 1], [300, null, null, 4]], path: 'Active', createdDaysAgo: 185 },
  { code: 'BXGY-WIRETIE', type: 'BUY_X_GET_Y', name: 'Free wire tie with 5 t rebar', description: 'A 1 kg wire tie coil free for every 5 tonnes of rebar.', reward: ['FreeItem', null], unit: 'tonne', free: mat('Wire Tie 1kg'), from: '2026-08-01', to: '2027-01-31', priority: 60, sap: 'ZF00', rule: and(is('MaterialGroup', 'CAT-STL-RB')), tiers: [[5, 10, null, 1], [10, 25, null, 3], [25, null, null, 8]], path: 'Active', createdDaysAgo: 70 },
  { code: 'BXGY-RIDGE-CAP', type: 'BUY_X_GET_Y', name: 'Ridge cap free with colour roof', description: 'Two ridge caps free per 50 colour roof sheets.', reward: ['FreeItem', null], unit: 'sheet', free: mat('Ridge Cap'), from: '2026-10-20', to: '2027-02-28', priority: 58, sap: 'ZF00', rule: and(is('MaterialGroup', 'CAT-CON-RF'), not('Material', mat('Translucent Sheet'))), tiers: [[50, null, null, 2]], path: 'Approved', links: [{ code: 'COLOUR-ROOF-4', type: 'CombinesWith' }], createdDaysAgo: 16 },

  // Seasonal
  { code: 'KNY-2026', type: 'SEASONAL', name: 'Khmer New Year 2026 — 2% storewide', description: 'Choul Chnam Thmey campaign across all depots.', reward: ['Percentage', 2], from: '2026-04-01', to: '2026-04-20', priority: 15, sap: 'ZS01', rule: and(not('CustomerTier', 'PLATINUM')), path: 'Expired', createdDaysAgo: 210 },
  { code: 'PCHUM-BEN-2026', type: 'SEASONAL', name: 'Pchum Ben 2026 — roofing & cement', description: 'Two weeks around Pchum Ben for home repair purchases.', reward: ['Percentage', 2.5], from: '2026-09-28', to: '2026-10-25', priority: 15, sap: 'ZS01', rule: or(is('MaterialGroup', 'CAT-CON-RF'), is('MaterialGroup', 'CAT-CON-CE')), path: 'Active', createdDaysAgo: 40 },
  { code: 'DRY-SEASON-2027', type: 'SEASONAL', name: 'Dry-season build 2027', description: 'Construction peak, Nov–Mar. Retail and hardware shops outside Phnom Penh.', reward: ['Percentage', 1.5], from: '2026-11-15', to: '2027-03-31', priority: 15, sap: 'ZS01', rule: and(or(is('CustomerType', 'HARDWARE_SHOP'), is('CustomerType', 'RETAIL_SHOP')), not('Province', 'PP')), path: 'UnderFinanceReview', createdDaysAgo: 12 },
  { code: 'WATER-FEST-2026', type: 'SEASONAL', name: 'Water Festival weekend — KHQR 1%', description: 'Bon Om Touk weekend counter sales paid by KHQR.', reward: ['Percentage', 1], from: '2026-11-23', to: '2026-11-26', priority: 14, sap: null, rule: and(is('PaymentMethod', 'KHQR'), is('Plant', 'WH-PP', 'WH-CCV', 'WH-TKM')), path: 'UnderCommercialReview', createdDaysAgo: 4 },
  { code: 'YEAR-END-2026', type: 'SEASONAL', name: 'Year-end stock clearance', description: 'Structural steel and plate clearance before the stock count.', reward: ['Percentage', 3.5], from: '2026-12-01', to: '2026-12-31', priority: 18, sap: 'ZS01', rule: and(is('MaterialGroup', 'CAT-STL-ST'), atLeast('OrderTonnage', 5)), path: 'Draft', createdDaysAgo: 1 },

  // Project
  { code: 'PRJ-NR5-BRIDGE', type: 'PROJECT_PRICING', name: 'National Road 5 bridge works', description: 'Contractor pricing for the NR5 bridge package, Battambang.', reward: ['FixedAmount', 25], unit: 'tonne', from: '2026-06-01', to: '2027-05-31', priority: 70, stacking: 'Exclusive', sap: 'ZP01', rule: and(is('ProjectCode', 'NR5-BR-03'), is('MaterialGroup', 'CAT-STL-RB', 'CAT-FAB-CB')), path: 'Active', createdDaysAgo: 140 },
  { code: 'PRJ-SR-AIRPORT', type: 'PROJECT_PRICING', name: 'Siem Reap airport logistics park', description: 'Steel structure and roofing for the logistics park.', reward: ['Percentage', 4], from: '2026-09-01', to: '2027-08-31', priority: 70, stacking: 'Exclusive', sap: 'ZP01', rule: and(is('ProjectCode', 'SAI-LOG-01'), or(is('MaterialGroup', 'CAT-STL-ST'), is('MaterialGroup', 'CAT-CON-RF'))), path: 'RejectedFinance', createdDaysAgo: 35 },
  { code: 'PRJ-BOREY-PEAK', type: 'PROJECT_PRICING', name: 'Borey Peng Huoth phase 7', description: 'Rebar and cut-and-bend cages for phase 7.', reward: ['FixedAmount', 20], unit: 'tonne', from: '2026-10-01', to: '2027-09-30', priority: 70, sap: 'ZP01', rule: and(is('ProjectCode', 'BPH-P7'), is('MaterialGroup', 'CAT-STL-RB', 'CAT-FAB-CB')), path: 'Approved', createdDaysAgo: 22 },

  // Legacy
  { code: 'DLR-REBATE-2025', type: 'DEALER_REBATE', name: 'Dealer rebate 2025', description: 'Annual dealer rebate. Replaced by volume ladders.', reward: ['Percentage', 1.2], from: '2025-01-01', to: '2025-12-31', priority: 5, sap: 'ZR01', rule: and(is('CustomerType', 'DISTRIBUTOR', 'DEPOT')), path: 'Expired', createdDaysAgo: 520 },
  { code: 'DLR-REBATE-2026', type: 'DEALER_REBATE', name: 'Dealer rebate 2026 (withdrawn)', description: 'Withdrawn after the switch to volume ladders.', reward: ['Percentage', 1], from: '2026-01-01', to: '2026-06-30', priority: 5, sap: 'ZR01', rule: and(is('CustomerType', 'DISTRIBUTOR', 'DEPOT')), path: 'Deactivated', createdDaysAgo: 330 },
];

// ── Building the records ──────────────────────────────────────────────────────

const DAY = 86_400_000;
// Relative to the moment the seed is built, so records the tester creates always sort
// above the seed and "created 3 days ago" stays true whenever the demo runs.
let NOW = Date.now();
const at = (daysAgo: number, hour = 9) => {
  const d = new Date(NOW - daysAgo * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

/** Signatures implied by where a version stopped. */
function approvalsFor(path: Path, decidedDaysAgo: number, i: number): Approval[] {
  const commercial = (outcome: string, comment: string | null = null): Approval => ({
    stage: 'Commercial', outcome, decidedBy: COMMERCIAL_SIGNERS[i % 2], decidedAt: at(decidedDaysAgo + 1, 10), comment,
  });
  const finance = (outcome: string, comment: string | null = null): Approval => ({
    stage: 'Finance', outcome, decidedBy: FINANCE_SIGNERS[i % 2], decidedAt: at(decidedDaysAgo, 15), comment,
  });
  switch (path) {
    case 'UnderFinanceReview':
      return [commercial('Approved', 'Fits the regional plan.')];
    case 'Approved':
    case 'Active':
    case 'Deactivated':
    case 'Expired':
      return [commercial('Approved'), finance('Approved', 'Margin within the delegated limit.')];
    case 'Rejected':
      return [commercial('Rejected', 'Cement is not ours to discount against rebar — talk to the cement supplier first.')];
    case 'RejectedFinance':
      return [commercial('Approved'), finance('Rejected', 'Margin below floor at current HRC prices. Resubmit at 2.5%.')];
    default:
      return [];
  }
}

const STATUS_OF: Record<Path, string> = {
  Draft: 'Draft',
  UnderCommercialReview: 'UnderCommercialReview',
  UnderFinanceReview: 'UnderFinanceReview',
  Approved: 'Approved',
  Active: 'Active',
  Rejected: 'Rejected',
  RejectedFinance: 'Rejected',
  Cancelled: 'Cancelled',
  Deactivated: 'Deactivated',
  Expired: 'Expired',
};

const SAP_STATUS: Record<string, string> = {
  Active: 'Synced',
  Deactivated: 'Synced',
  Expired: 'Synced',
  Superseded: 'Synced',
  Approved: 'NotSynced',
};

function build(spec: Spec, index: number): StoredPromotion {
  const id = `PRM-${String(index + 1).padStart(4, '0')}`;
  const author = AUTHORS[index % AUTHORS.length];
  const conditions = flatten(spec.rule);
  const history = spec.history ?? [];
  const total = history.length + 1;

  const versions: PromotionVersionDto[] = [...history, { path: spec.path, reward: undefined, to: undefined }].map((h, v) => {
    const isLatest = v === total - 1;
    let status = STATUS_OF[h.path];
    // An older version that was live has since been replaced by a newer live one.
    if (!isLatest && status === 'Active' && history.slice(v + 1).some((x) => x.path === 'Active')) status = 'Superseded';
    if (!isLatest && status === 'Active' && spec.path === 'Active') status = 'Superseded';
    // Older versions were decided proportionally further back.
    const decided = Math.max(1, Math.round((spec.createdDaysAgo * (total - v)) / total) - 3);
    const sapStatus = spec.sap ? (SAP_STATUS[status] ?? 'NotSynced') : 'NotRequired';
    return {
      id: `${id}-V${v + 1}`,
      versionNumber: v + 1,
      status,
      name: spec.name,
      description: spec.description,
      validFrom: spec.from,
      validTo: h.to ?? spec.to,
      priority: spec.priority,
      stacking: spec.stacking ?? 'Stackable',
      rewardType: spec.reward[0],
      rewardValue: isLatest ? spec.reward[1] : (h.reward ?? spec.reward[1]),
      currency: spec.reward[0] === 'FixedAmount' ? 'USD' : null,
      unit: spec.unit ?? null,
      freeMaterialNumber: spec.free ?? null,
      requiresSapSync: Boolean(spec.sap),
      sapConditionType: spec.sap,
      sapStatus,
      sapConditionRecord: sapStatus === 'Synced' ? `00${String(41_200_000 + index * 137 + v * 11)}` : null,
      conditions,
      tiers: (spec.tiers ?? []).map(([fromQuantity, toQuantity, rewardValue, freeQuantity]) => ({
        fromQuantity,
        toQuantity,
        rewardValue,
        freeQuantity: freeQuantity ?? null,
      })),
      approvals: approvalsFor(h.path, decided, index + v),
      rule: spec.rule,
      isNestedRule: isNested(spec.rule) || Boolean(spec.links?.length),
      relationships: [],
    };
  });

  const live = versions.find((v) => v.status === 'Active');
  return {
    id,
    code: spec.code,
    businessType: spec.type,
    liveVersionNumber: live?.versionNumber ?? null,
    openVersionNumber: total,
    versions,
    createdBy: author,
    createdAt: at(spec.createdDaysAgo),
    updatedAt: at(Math.max(1, spec.createdDaysAgo - 4), 14),
  };
}

export function seedPromotions(): StoredPromotion[] {
  NOW = Date.now();
  const list = SPECS.map(build);
  const byCode = new Map(list.map((p) => [p.code, p]));
  // Links are resolved once every record has its id.
  SPECS.forEach((spec, i) => {
    if (!spec.links) return;
    const latest = list[i].versions[list[i].versions.length - 1];
    latest.relationships = spec.links
      .filter((l) => byCode.has(l.code))
      .map((l) => ({ relatedPromotionId: byCode.get(l.code)!.id, relatedPromotionCode: l.code, type: l.type }));
  });
  return list;
}
