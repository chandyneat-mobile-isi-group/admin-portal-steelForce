import { categories, leafCategories, products, WAREHOUSES } from '@/features/materials/data/catalog';
import { crmDepots } from '@/features/depots/data/crm';
import { CUSTOMER_TYPES, SALES_ORGS } from '@/features/planning/types';
import type {
  ConditionDefinitionDto,
  ConditionValueDto,
  PromotionFactDto,
  PromotionTypeDto,
  ValueSourceKeyDto,
} from '../catalog-api';

/**
 * Seed for the promotion catalogue: types, condition definitions, the facts the engine
 * can read and the value sources a picker can be filled from.
 *
 * Picker values for database and SAP sources are derived from the depot and material
 * masters, so a customer or material chosen in a rule is one the CRM and inventory
 * screens also know.
 */

/** Province codes as the engine stores them, with the planning module's names. */
export const PROVINCE_VALUES: ConditionValueDto[] = [
  { value: 'PP', label: 'Phnom Penh', isActive: true },
  { value: 'KDL', label: 'Kandal', isActive: true },
  { value: 'BTB', label: 'Battambang', isActive: true },
  { value: 'SRP', label: 'Siem Reap', isActive: true },
  { value: 'KSP', label: 'Kampong Speu', isActive: true },
];

export const PROVINCE_CODE: Record<string, string> = Object.fromEntries(
  PROVINCE_VALUES.map((v) => [v.label as string, v.value])
);

const upperSnake = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

export function seedPromotionTypes(): PromotionTypeDto[] {
  const rows: Omit<PromotionTypeDto, 'promotionCount' | 'status'>[] = [
    { id: 'PT-001', code: 'PAYMENT_METHOD', name: 'Payment method discount', description: 'Rewards cash on delivery or prompt bank transfer.', feedKind: 'paymentMethod', sortOrder: 10, isActive: true, isSystem: true },
    { id: 'PT-002', code: 'SELF_PICKUP', name: 'Self-pickup discount', description: 'Customer collects from an ISI depot with their own truck.', feedKind: 'transportationPickup', sortOrder: 20, isActive: true, isSystem: true },
    { id: 'PT-003', code: 'PRODUCT_SKU', name: 'Product discount', description: 'A price cut on named materials or a material group.', feedKind: 'productSku', sortOrder: 30, isActive: true, isSystem: true },
    { id: 'PT-004', code: 'CUSTOMER_PRODUCT', name: 'Customer-specific price', description: 'Negotiated pricing for one depot or key account on chosen materials.', feedKind: 'customerProduct', sortOrder: 40, isActive: true, isSystem: true },
    { id: 'PT-005', code: 'VOLUME_TIER', name: 'Volume discount', description: 'Steps up with the tonnage or quantity on the order.', feedKind: 'quantityTier', sortOrder: 50, isActive: true, isSystem: true },
    { id: 'PT-006', code: 'BUY_X_GET_Y', name: 'Buy X get Y', description: 'Free accessories or pieces when a quantity is bought.', feedKind: 'buyXGetY', sortOrder: 60, isActive: true, isSystem: true },
    { id: 'PT-007', code: 'SEASONAL', name: 'Seasonal campaign', description: 'Time-boxed campaigns — Khmer New Year, Pchum Ben, dry-season build.', feedKind: 'general', sortOrder: 70, isActive: true, isSystem: false },
    { id: 'PT-008', code: 'PROJECT_PRICING', name: 'Project pricing', description: 'Site-specific pricing for named construction projects.', feedKind: 'general', sortOrder: 80, isActive: true, isSystem: false },
    { id: 'PT-009', code: 'DEALER_REBATE', name: 'Dealer rebate (legacy)', description: 'Replaced by volume discounts in 2026. Kept for old promotions.', feedKind: 'general', sortOrder: 90, isActive: false, isSystem: false },
  ];
  return rows.map((r) => ({ ...r, status: r.isActive ? 'Active' : 'Inactive', promotionCount: 0 }));
}

const TEXT_OPS = ['In', 'NotIn'];
const NUMBER_OPS = ['GreaterOrEqual', 'LessOrEqual', 'Between'];

export function seedConditionDefinitions(): ConditionDefinitionDto[] {
  const def = (
    d: Omit<ConditionDefinitionDto, 'operators' | 'status' | 'values' | 'isActive' | 'isSystem'> &
      Partial<Pick<ConditionDefinitionDto, 'values' | 'isActive' | 'isSystem'>>
  ): ConditionDefinitionDto => {
    const isActive = d.isActive ?? true;
    return {
      ...d,
      operators: d.valueType === 'Number' ? NUMBER_OPS : TEXT_OPS,
      values: d.values ?? [],
      isActive,
      isSystem: d.isSystem ?? true,
      status: isActive ? 'Active' : 'Inactive',
    };
  };
  const active = (pairs: [string, string][]) => pairs.map(([value, label]) => ({ value, label, isActive: true }));

  return [
    def({
      id: 'PC-001', code: 'PaymentMethod', name: 'Payment method', description: 'How the order is paid.',
      valueType: 'Text', valueSource: 'Static', sourceKey: null, factKey: 'order.paymentMethod', scope: 'order', sortOrder: 10,
      values: [
        ...active([['TCOD', 'Cash on delivery'], ['TT', 'Bank transfer (ABA / ACLEDA)'], ['KHQR', 'KHQR mobile payment'], ['CR30', 'Credit — Net 30']]),
        { value: 'CHQ', label: 'Cheque', isActive: false },
      ],
    }),
    def({
      id: 'PC-002', code: 'DeliveryMode', name: 'Delivery mode', description: 'Delivered by ISI fleet, or collected by the customer.',
      valueType: 'Text', valueSource: 'Static', sourceKey: null, factKey: 'order.shippingCondition', scope: 'order', sortOrder: 20,
      values: active([['PICKUP', 'Customer pickup'], ['DELIVERY', 'ISI delivery'], ['THIRDPARTY', 'Third-party carrier']]),
    }),
    def({
      id: 'PC-003', code: 'Plant', name: 'Depot / plant', description: 'The depot the order ships or is collected from.',
      valueType: 'Text', valueSource: 'Database', sourceKey: 'warehouses.code', factKey: 'order.plant', scope: 'order', sortOrder: 30,
    }),
    def({
      id: 'PC-004', code: 'Province', name: 'Customer province', description: 'Province on the customer master.',
      valueType: 'Text', valueSource: 'Static', sourceKey: null, factKey: 'customer.province', scope: 'customer', sortOrder: 40,
      values: PROVINCE_VALUES,
    }),
    def({
      id: 'PC-005', code: 'CustomerTier', name: 'Customer tier', description: 'Loyalty tier.',
      valueType: 'Text', valueSource: 'Static', sourceKey: null, factKey: 'customer.tier', scope: 'customer', sortOrder: 50,
      values: active([['PLATINUM', 'Platinum'], ['GOLD', 'Gold'], ['SILVER', 'Silver'], ['BRONZE', 'Bronze']]),
    }),
    def({
      id: 'PC-006', code: 'CustomerType', name: 'Customer type', description: 'Hardware shop, contractor, distributor…',
      valueType: 'Text', valueSource: 'Static', sourceKey: null, factKey: 'customer.type', scope: 'customer', sortOrder: 60,
      values: CUSTOMER_TYPES.map((t) => ({ value: upperSnake(t), label: t, isActive: true })),
    }),
    def({
      id: 'PC-007', code: 'Customer', name: 'Customer', description: 'A named sold-to account.',
      valueType: 'Text', valueSource: 'Database', sourceKey: 'customers.code', factKey: 'customer.code', scope: 'customer', sortOrder: 70,
    }),
    def({
      id: 'PC-008', code: 'SalesOrg', name: 'Sales organisation', description: 'The selling company on the order.',
      valueType: 'Text', valueSource: 'Static', sourceKey: null, factKey: 'customer.salesOrg', scope: 'customer', sortOrder: 80,
      values: SALES_ORGS.map((s) => ({ value: upperSnake(s), label: s, isActive: true })),
    }),
    def({
      id: 'PC-009', code: 'Material', name: 'Material', description: 'The SAP material number on the line.',
      valueType: 'Text', valueSource: 'Sap', sourceKey: 'sap.materials', factKey: 'line.materialNumber', scope: 'line', sortOrder: 90,
    }),
    def({
      id: 'PC-010', code: 'MaterialGroup', name: 'Material group', description: 'Product category, mapped to the SAP price group.',
      valueType: 'Text', valueSource: 'Sap', sourceKey: 'sap.materialGroups', factKey: 'line.materialGroup', scope: 'line', sortOrder: 100,
    }),
    def({
      id: 'PC-011', code: 'LineQuantity', name: 'Line quantity', description: 'Quantity on the line, in its sales unit.',
      valueType: 'Number', valueSource: 'Static', sourceKey: null, factKey: 'line.quantity', scope: 'line', sortOrder: 110,
    }),
    def({
      id: 'PC-012', code: 'OrderTonnage', name: 'Order tonnage', description: 'Total steel weight on the order, in tonnes.',
      valueType: 'Number', valueSource: 'Static', sourceKey: null, factKey: 'order.totalWeightTonnes', scope: 'order', sortOrder: 120,
    }),
    def({
      id: 'PC-013', code: 'OrderValue', name: 'Order value (USD)', description: 'Net order value before promotions.',
      valueType: 'Number', valueSource: 'Static', sourceKey: null, factKey: 'order.netValue', scope: 'order', sortOrder: 130,
    }),
    def({
      id: 'PC-014', code: 'ProjectCode', name: 'Project code', description: 'Construction project registered in the CRM.',
      valueType: 'Text', valueSource: 'Api', sourceKey: 'https://crm.isisteel.com.kh/api/projects', factKey: 'request.PROJECT_CODE', scope: 'order', sortOrder: 140,
      isSystem: false,
    }),
    def({
      id: 'PC-015', code: 'DistributionChannel', name: 'Distribution channel', description: 'Retired — use Customer type instead.',
      valueType: 'Text', valueSource: 'Static', sourceKey: null, factKey: 'customer.distributionChannel', scope: 'customer', sortOrder: 150,
      values: active([['10', 'Direct'], ['20', 'Dealer'], ['30', 'Export']]), isActive: false, isSystem: false,
    }),
  ];
}

export const PROMOTION_FACTS: PromotionFactDto[] = [
  { key: 'customer.code', description: 'Sold-to account number.', valueType: 'Text', scope: 'customer' },
  { key: 'customer.province', description: 'Province on the customer master.', valueType: 'Text', scope: 'customer' },
  { key: 'customer.tier', description: 'Loyalty tier: Platinum, Gold, Silver, Bronze.', valueType: 'Text', scope: 'customer' },
  { key: 'customer.type', description: 'Customer type from the CRM.', valueType: 'Text', scope: 'customer' },
  { key: 'customer.salesOrg', description: 'Sales organisation the account belongs to.', valueType: 'Text', scope: 'customer' },
  { key: 'customer.distributionChannel', description: 'SAP distribution channel.', valueType: 'Text', scope: 'customer' },
  { key: 'customer.creditStatus', description: 'Good standing, watchlist, on hold, overdue.', valueType: 'Text', scope: 'customer' },
  { key: 'order.paymentMethod', description: 'Payment terms chosen on the quotation.', valueType: 'Text', scope: 'order' },
  { key: 'order.shippingCondition', description: 'Pickup or delivery.', valueType: 'Text', scope: 'order' },
  { key: 'order.plant', description: 'Shipping depot.', valueType: 'Text', scope: 'order' },
  { key: 'order.netValue', description: 'Net order value in USD, before promotions.', valueType: 'Number', scope: 'order' },
  { key: 'order.totalWeightTonnes', description: 'Total weight of steel lines, tonnes.', valueType: 'Number', scope: 'order' },
  { key: 'order.lineCount', description: 'Number of lines on the order.', valueType: 'Number', scope: 'order' },
  { key: 'line.materialNumber', description: 'SAP material number.', valueType: 'Text', scope: 'line' },
  { key: 'line.materialGroup', description: 'Material group / category.', valueType: 'Text', scope: 'line' },
  { key: 'line.brand', description: 'Brand on the material master.', valueType: 'Text', scope: 'line' },
  { key: 'line.quantity', description: 'Line quantity in the sales unit.', valueType: 'Number', scope: 'line' },
  { key: 'line.netPrice', description: 'Unit net price in USD.', valueType: 'Number', scope: 'line' },
];

export const VALUE_SOURCE_KEYS: ValueSourceKeyDto[] = [
  { valueSource: 'Database', sourceKey: 'customers.code', description: 'Account numbers from the depot / customer master.' },
  { valueSource: 'Database', sourceKey: 'warehouses.code', description: 'ISI depots and yards.' },
  { valueSource: 'Database', sourceKey: 'customers.province', description: 'Provinces in use on customer records.' },
  { valueSource: 'Sap', sourceKey: 'sap.materials', description: 'Material master, synchronised nightly from SAP.' },
  { valueSource: 'Sap', sourceKey: 'sap.materialGroups', description: 'Material groups (product categories).' },
  { valueSource: 'Sap', sourceKey: 'sap.priceGroups', description: 'SAP customer price groups.' },
];

/** SAP price group per leaf category. */
export const PRICE_GROUP: Record<string, string> = Object.fromEntries(
  leafCategories.map((c, i) => [c.id, `Z${String(i + 1).padStart(2, '0')}`])
);

/** Resolves the picker values for a database or SAP source. `undefined` = cannot list. */
export function sourceValues(sourceKey: string | null | undefined): ConditionValueDto[] | undefined {
  switch (sourceKey) {
    case 'customers.code':
      return crmDepots.map((d) => ({ value: d.code, label: `${d.name} · ${d.province}`, isActive: d.status !== 'Inactive' }));
    case 'warehouses.code':
      return WAREHOUSES.map((w) => ({ value: w.id, label: `${w.name} (${w.province})`, isActive: true }));
    case 'customers.province':
      return PROVINCE_VALUES;
    case 'sap.materials':
      return products.map((p) => ({ value: p.code, label: p.name, isActive: p.status !== 'Discontinued' }));
    case 'sap.materialGroups':
      return leafCategories.map((c) => ({ value: c.id, label: c.name, isActive: true }));
    case 'sap.priceGroups':
      return leafCategories.map((c) => ({ value: PRICE_GROUP[c.id], label: c.name, isActive: true }));
    default:
      return undefined;
  }
}

/** The category → SAP price group join the promotion engine is keyed on. */
export function categoryMappings() {
  return leafCategories.map((c) => {
    const parent = categories.find((p) => p.id === c.parentId);
    return {
      categoryCode: c.id,
      categoryName: parent ? `${parent.name} › ${c.name}` : c.name,
      sapPriceGroup: PRICE_GROUP[c.id],
    };
  });
}
