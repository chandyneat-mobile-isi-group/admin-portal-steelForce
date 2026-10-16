# Promotions: dynamic configuration — Admin Portal UI upgrade

**For:** admin-web-portal developers
**Backend change:** promotion types, condition definitions, nested AND / OR rules and promotion-to-promotion relationships are now database-driven.
**Status of the backend:** implemented, migrated and unit-tested (`AddConfigurablePromotionCatalog`). Nothing in the portal breaks today; this document lists what to build so the portal stops hard-coding what the server now serves.

---

## 1. What changed, in one paragraph

The server used to have two hard-coded lists: seven **business types** and thirteen **condition dimensions**. Both are now tables an administrator maintains through new endpoints. A promotion's conditions can be arranged as a **tree of AND / OR groups** instead of the old flat "OR-groups of ANDed conditions". A promotion can **require, depend on, exclude or combine with** another promotion. Priority and stacking are unchanged.

### Backward compatibility (nothing to do on day one)

| Area | What happens to the current portal |
|---|---|
| `businessType` on create / list / detail | Same strings as before (`PaymentMethodDiscount`, …). The seven are now seeded rows. |
| `conditions[].dimension` on create / edit | Still accepted. The response sends both `dimension` and the new `condition` with the same value. |
| `conditions[].group` (flat form) | Same meaning as before when no `rule` is sent. |
| Detail response | Gains `rule`, `isNestedRule`, `relationships`, `businessTypeName`, `conditionName`, `valueType`. Existing zod schemas ignore unknown keys. |
| Excel template / import | Dropdowns now list the catalogue's active codes. Import still uses the flat form only (see §8). |
| Mobile app | Unaffected. The incentives feed groups by each type's `feedKind`, and the seven shipped types keep their old kinds. |

The portal can ship the upgrade in steps (§9). Each step works on its own.

---

## 2. Permissions

No new permission. The token already carries the canonical names alongside the portal aliases, so use `can('promotions.configure')` directly.

| Action | Permission | Held by (default roles) |
|---|---|---|
| Read types, conditions, values, facts, sources | `promotions.read` | everyone who can open Promotions |
| Create / edit / (de)activate types and conditions | `promotions.configure` | Administrator, Head of Sales, Finance |
| Create / edit promotions (incl. rules and relationships) | `promotions.create` | unchanged |
| Preview (`POST /promotions/evaluate`) | `customers.read` | unchanged |

Hide or disable the configuration screens and their buttons without `promotions.configure`. The server still enforces it and returns 403.

---

## 3. New endpoints

All responses use the usual `{ data, meta }` envelope. Each route also answers under `/api/v1/admin/...`.

### 3.1 Promotion types

| Method | Route | Body | Returns |
|---|---|---|---|
| GET | `/api/v1/promotion-types?includeInactive=true` | – | `PromotionTypeDto[]` |
| POST | `/api/v1/promotion-types` | `CreatePromotionTypeRequest` | `PromotionTypeDto` (201) |
| PUT | `/api/v1/promotion-types/{id}` | `UpdatePromotionTypeRequest` | `PromotionTypeDto` |
| PATCH | `/api/v1/promotion-types/{id}/status` | `{ "isActive": false }` | `PromotionTypeDto` |

```jsonc
// PromotionTypeDto
{
  "id": "0199a7…",
  "code": "PaymentMethodDiscount",   // what promotions store; sent as businessType
  "name": "Payment method discount",
  "description": "Earned by the payment method, e.g. cash on delivery.",
  "feedKind": "paymentMethod",        // mobile incentives group
  "sortOrder": 2,
  "status": "Active",                  // Active | Inactive
  "isActive": true,
  "isSystem": true,                    // shipped with the platform
  "promotionCount": 2
}

// CreatePromotionTypeRequest (Update is the same without "code")
{ "code": "FactoryPickup", "name": "Factory pickup", "description": null, "feedKind": "transportationPickup", "sortOrder": 10 }
```

Rules the form should mirror:
- **Code:** a letter, then letters, digits or `_`, up to 64 characters. It is unique ignoring case and cannot be changed after creation, so make the field read-only when editing.
- **Name:** required, up to 128 characters.
- **Description:** up to 1024 characters.
- **Feed kind:** up to 64 characters; defaults to `general`.
- **Deactivation:** a type is deactivated, never deleted. Existing promotions keep it; it just stops being offered for new ones.

### 3.2 Condition definitions

| Method | Route | Body | Returns |
|---|---|---|---|
| GET | `/api/v1/promotion-conditions?includeInactive=true` | – | `PromotionConditionDefinitionDto[]` |
| GET | `/api/v1/promotion-conditions/{id}` | – | `PromotionConditionDefinitionDto` |
| POST | `/api/v1/promotion-conditions` | `CreatePromotionConditionDefinitionRequest` | `PromotionConditionDefinitionDto` (201) |
| PUT | `/api/v1/promotion-conditions/{id}` | `UpdatePromotionConditionDefinitionRequest` | `PromotionConditionDefinitionDto` |
| PATCH | `/api/v1/promotion-conditions/{id}/status` | `{ "isActive": false }` | `PromotionConditionDefinitionDto` |
| GET | `/api/v1/promotion-conditions/{id}/values?search=` | – | `PromotionConditionValuesDto` |
| PUT | `/api/v1/promotion-conditions/{id}/values` | `{ "values": PromotionConditionValueDto[] }` | `PromotionConditionDefinitionDto` |
| GET | `/api/v1/promotion-conditions/facts` | – | `PromotionFactDto[]` |
| GET | `/api/v1/promotion-conditions/sources` | – | `PromotionValueSourceKeyDto[]` |

```jsonc
// PromotionConditionDefinitionDto
{
  "id": "0199a7…",
  "code": "Region",                 // what a promotion condition stores; sent as "condition"
  "name": "Region",
  "description": "The customer's sales region / territory.",
  "valueType": "Text",              // Text | Number
  "operators": ["In", "NotIn"],     // what the builder should offer for this condition
  "valueSource": "Database",        // Static | Database | Sap | Api
  "sourceKey": "customers.territory",
  "factKey": "customer.region",     // the transaction fact the engine reads
  "scope": "customer",              // customer | order | line
  "sortOrder": 2,
  "status": "Active",
  "isActive": true,
  "isSystem": true,
  "values": []                      // static values only; use /values for the others
}

// CreatePromotionConditionDefinitionRequest (Update is the same without "code")
{
  "code": "CustomerTier",
  "name": "Customer tier",
  "description": "Loyalty tier",
  "valueType": "Text",
  "valueSource": "Static",
  "sourceKey": null,
  "factKey": "request.CUSTOMER_TIER",
  "sortOrder": 20,
  "values": [ { "value": "GOLD", "label": "Gold", "isActive": true } ]   // optional; replaces the list when sent
}

// PromotionConditionValuesDto  (GET …/{id}/values)
{
  "code": "PaymentMethod",
  "valueSource": "Sap",
  "sourceKey": "PaymentTerm",
  "resolved": true,               // false for Api sources and unknown keys
  "values": [ { "value": "T014", "label": "T014 - 14 day due net", "isActive": true } ]
}

// PromotionFactDto  (GET …/facts)
{ "key": "customer.paymentTerms", "description": "The customer's SAP payment terms key, e.g. T014.", "valueType": "Text", "scope": "customer" }

// PromotionValueSourceKeyDto  (GET …/sources)
{ "valueSource": "Sap", "sourceKey": "PaymentTerm", "description": "The SAP PaymentTerm catalogue, as last synchronised." }
```

**How the fields fit together** (the condition-definition form needs to explain this):

- **`factKey`** says *what the engine reads*. Pick one from `/facts`, or type `request.<KEY>` for a fact the platform cannot read itself. A `request.` fact is filled in by the caller's `attributes` on evaluation (§4.5). With this, a new condition needs no code change.
- **`valueType`** decides the operators:
  - `Text`: `In` and `NotIn`.
  - `Number`: `GreaterOrEqual`, `LessOrEqual` and `Between`.

  Use the definition's `operators` array rather than hard-coding this. The value type **cannot change while any promotion uses the condition**; the server returns 409 `Promotion.ConditionValueTypeInUse`.
- **`valueSource` + `sourceKey`** decide *where the picker's values come from*:

  | Source | `sourceKey` | Values |
  |---|---|---|
  | `Static` | none | The definition's own `values` list, edited on the definition form. |
  | `Sap` | A SAP catalogue from `/sources`, e.g. `PaymentTerm`, `CustomerGroup`, `SalesOrg` | Synchronised SAP data. |
  | `Database` | A platform column from `/sources`, e.g. `customers.territory`, `materials.productGroup` | Distinct values in use. |
  | `Api` | A URL | The server returns `resolved: false`; the portal fetches the URL itself. |

  Offer the source keys from `/sources`, filtered by the chosen source.
- **Static lists are enforced.** For a `Static` text definition with at least one active value, a promotion may only use listed values; anything else returns 400 `Promotion.ConditionValueNotAllowed`. An empty static list accepts anything. Database, SAP and Api values are not enforced.
- **Deactivation:** a deactivated definition can't be used in new or edited promotions (`Promotion.ConditionInactive`). Live promotions that already use it keep evaluating.

### 3.3 Seeded data after migration

| Types (code → name) | Conditions (code → fact, source) |
|---|---|
| `TransportationPickupDiscount` → Transportation / pickup discount | `Customer` → customer.code, Database `customers.code` |
| `ProductSkuDiscount` → Product / SKU discount | `CustomerType` → customer.type, Sap `CustomerGroup` |
| `PaymentMethodDiscount` → Payment method discount | `Region` → customer.region, Database `customers.territory` |
| `CustomerProductDiscount` → Customer + product discount | `Province` → customer.province, Database `customers.province` |
| `QuantityTierDiscount` → Quantity tier discount | `Product` → line.material, Database `materials.number` |
| `BuyXGetY` → Buy X get Y | `ProductGroup` → line.productGroup, Database `materials.productGroup` |
| `GeneralDiscount` → General discount | `ProductBrand` → line.brand, Database `materials.brand` |
| | `PaymentMethod` → order.paymentMethod, Sap `PaymentTerm` |
| | `PickupType` → order.pickupType, Static (FACTORY, BRANCH, DELIVERY) |
| | `PickupLocation` → order.pickupLocation, Static (seeded from values already in use) |
| | `SalesOrganization` → order.salesOrganization, Sap `SalesOrg` |
| | `DistributionChannel` → order.distributionChannel, Sap `DistributionChannel` |
| | `Quantity` → line.quantity, Static, **Number** |

---

## 4. Changes to the existing promotion endpoints

### 4.1 Create: the type

`businessType` is still accepted and is now a type **code**. The new alternative is `typeId`; send one of the two. The type must exist and be active, otherwise the server returns `Promotion.TypeNotFound` or `Promotion.TypeInactive`.

### 4.2 Conditions: `condition` instead of `dimension`

```jsonc
{ "condition": "Region", "operator": "In", "values": ["PHNOM PENH"] }
```

- `dimension` keeps working as an alias. New code should send `condition`.
- Operators also accept `EQUALS`, `NOT_EQUALS`, `INCLUDE`, `EXCLUDE`, `GREATER_THAN_OR_EQUAL` and `LESS_THAN_OR_EQUAL`.
- Unknown code → `Promotion.ConditionUnknown`. Deactivated definition → `Promotion.ConditionInactive`. Value outside a static list → `Promotion.ConditionValueNotAllowed`.

### 4.3 Rules: the nested AND / OR tree

Send `rule` and it **replaces** `conditions`. Leave `rule` out and `conditions[].group` keeps its original flat meaning.

```jsonc
// (Province = PHNOM PENH OR Province = KANDAL) AND Customer tier = GOLD AND Order amount >= 10000
"rule": {
  "operator": "And",
  "conditions": [
    { "condition": "CustomerTier", "operator": "In", "values": ["GOLD"] },
    { "condition": "OrderAmount",  "operator": "GreaterOrEqual", "values": ["10000"] }
  ],
  "groups": [
    {
      "operator": "Or",
      "conditions": [
        { "condition": "Province", "operator": "In", "values": ["PHNOM PENH"] },
        { "condition": "Province", "operator": "In", "values": ["KANDAL"] }
      ],
      "groups": []
    }
  ]
}
```

Server rules:
- `operator` is `And` or `Or`, case-insensitive.
- Every group needs at least one condition or subgroup; an empty group returns `Promotion.RuleInvalid`.
- A rule can have at most 50 groups, and a promotion at most 50 conditions.
- An empty root is allowed and means "everyone".
- `NotIn` is an ordinary leaf that holds when the value is *not* listed. To make an exclusion a veto, put it in an AND that covers everything.

### 4.4 Relationships

Each create or edit sends the whole list, and it replaces what was there.

```jsonc
"relationships": [
  { "relatedPromotionId": "0199…", "type": "Requires" }
]
```

| Type | Meaning (per line) |
|---|---|
| `Requires` | Applies only if the related promotion's conditions also hold. |
| `DependsOn` | Applies only if the related promotion actually ends up applied, after stacking and ceilings. |
| `Excludes` | Never together. The higher priority one wins, whichever side declared the link. |
| `CombinesWith` | Applies together with the related promotion even when stacking (NonStackable, Exclusive, HighestPriorityOnly) would stop it. |

Server rules:
- UPPER_SNAKE spellings are accepted too (`DEPENDS_ON`).
- Related promotion not found → `Promotion.RelationshipTargetNotFound`.
- Self-reference → `Promotion.RelationshipSelf`.
- A duplicate, or `Requires`/`DependsOn` together with `Excludes` on the same target → `Promotion.RelationshipInvalid`.
- A loop of `Requires`/`DependsOn` (A → B → C → A) → 422 `Promotion.RelationshipCircular`.
- Relationships live on the **version**, so they go through review and approval like every other field.

### 4.5 Responses

`PromotionVersionDto` gains:

```jsonc
{
  "conditions": [ { "condition": "Province", "dimension": "Province", "conditionName": "Province",
                    "valueType": "Text", "operator": "NotIn", "values": ["SIEM REAP"], "group": 0 } ],
  "rule": { "operator": "And", "conditions": [...], "groups": [...] },   // always present
  "isNestedRule": false,
  "relationships": [ { "relatedPromotionId": "…", "relatedPromotionCode": "BASE-STEEL", "type": "Requires" } ]
}
```

- **`rule` is always filled in.** A flat (older) promotion is shown as the tree it evaluates as: `And(exclusions…, Or(And(group 1), And(group 2)…))`. The detail page can render every promotion as a tree.
- **`conditions[].group`** is the OR-group number for a flat rule. For a nested rule it is the group number, 0 being the root. Read `rule` for the shape.

`PromotionSummaryDto` and `PromotionDetailDto` gain `businessTypeName`. It is null if the type has since been removed from the catalogue.

`POST /api/v1/promotions/evaluate` (admin preview) has the same body and response as the mobile evaluate. It adds `attributes` (`{ "CUSTOMER_TIER": ["GOLD"] }`), which feed `request.<KEY>` facts, and `lines[].unitPrice`, which feeds `order.amount`.

---

## 5. New and changed error codes to map in `problemDetail`

| Code | HTTP | Show |
|---|---|---|
| `Promotion.TypeNotFound` | 404 / 400 | "Choose a promotion type." |
| `Promotion.TypeInactive` | 422 | "This type is deactivated. Choose another or reactivate it." |
| `Promotion.TypeCodeTaken` | 409 | On the code field. |
| `Promotion.ConditionDefinitionNotFound` | 404 | – |
| `Promotion.ConditionDefinitionCodeTaken` | 409 | On the code field. |
| `Promotion.ConditionDefinitionInvalid` | 400 | Value type / source not recognised. |
| `Promotion.ConditionSourceKeyRequired` | 400 | On the source key field. |
| `Promotion.ConditionFactInvalid` | 400 | On the fact field. |
| `Promotion.ConditionValueInvalid` | 400 | On the values editor. |
| `Promotion.ConditionValueDuplicate` | 400 | On the values editor. |
| `Promotion.ConditionValueTypeInUse` | 409 | "Promotions use this condition, so its value type is locked." |
| `Promotion.ConditionUnknown` | 400 | Highlight the condition row. |
| `Promotion.ConditionInactive` | 422 | "This condition was deactivated — replace it." |
| `Promotion.ConditionValueNotAllowed` | 400 | Highlight the value chip. |
| `Promotion.CatalogCodeInvalid` / `CatalogNameInvalid` / `CatalogDescriptionTooLong` | 400 | Field-level. |
| `Promotion.RuleInvalid` | 400 | "Every group needs at least one condition." |
| `Promotion.RelationshipInvalid` / `RelationshipSelf` / `RelationshipTargetNotFound` | 400 | On the relationships section. |
| `Promotion.RelationshipCircular` | 422 | "These links make promotions depend on each other in a circle." |

Engine reason codes that can now appear in `notApplied` on the preview:
- `Relationship.RequiresNotMet`
- `Relationship.DependencyNotApplied`
- `Relationship.Excluded`
- `NotEligible.<ConditionCode>` and `Excluded.<ConditionCode>`, for any condition code including new ones.

---

## 6. Screen-by-screen work

### 6.1 Remove the hard-coded lists

| File | Today | Change to |
|---|---|---|
| `src/features/promotions/api.ts` | `PROMOTION_BUSINESS_TYPES`, `BUSINESS_TYPE_LABELS` | Delete. Read types from `usePromotionTypes()` and label with `name` (or `businessTypeName` from the row). Keep a fallback of showing the raw code. |
| `src/app/(portal)/promotions/promotion-form-dialog.tsx` | `DIMENSIONS`, `OPERATORS` | Delete. Conditions come from `usePromotionConditions({ includeInactive: false })`; operators from each definition's `operators`. |
| `src/app/(portal)/promotions/page.tsx` | Type filter from `PROMOTION_BUSINESS_TYPES` | `usePromotionTypes()`, inactive ones included and marked "(inactive)" so old promotions stay filterable. |
| `src/app/(portal)/promotions/[id]/page.tsx` | `BUSINESS_TYPE_LABELS[...]`, flat condition list | `promotion.businessTypeName ?? promotion.businessType`; render `rule` as a tree (§6.5). |

`STACKING_MODES`, `FREE_ITEM_CALCULATIONS` and the reward types stay as constants: they are engine behaviour, not catalogue data.

### 6.2 API module and hooks

Add `src/features/promotions/catalog-api.ts` (or extend `api.ts`):

```ts
export const PromotionTypeSchema = z.object({
  id: z.string(), code: z.string(), name: z.string(),
  description: z.string().nullable().optional(),
  feedKind: z.string(), sortOrder: z.number(),
  status: z.string(), isActive: z.boolean(), isSystem: z.boolean(),
  promotionCount: z.number().default(0),
});

export const ConditionValueSchema = z.object({
  value: z.string(), label: z.string(), isActive: z.boolean().default(true),
});

export const ConditionDefinitionSchema = z.object({
  id: z.string(), code: z.string(), name: z.string(),
  description: z.string().nullable().optional(),
  valueType: z.enum(['Text', 'Number']),
  operators: z.array(z.string()).default([]),
  valueSource: z.enum(['Static', 'Database', 'Sap', 'Api']),
  sourceKey: z.string().nullable().optional(),
  factKey: z.string(), scope: z.enum(['customer', 'order', 'line']),
  sortOrder: z.number(), status: z.string(), isActive: z.boolean(), isSystem: z.boolean(),
  values: z.array(ConditionValueSchema).default([]),
});

export const ConditionValuesSchema = z.object({
  code: z.string(), valueSource: z.string(), sourceKey: z.string().nullable().optional(),
  resolved: z.boolean(), values: z.array(ConditionValueSchema).default([]),
});

export const promotionCatalogApi = {
  listTypes: (includeInactive = true, signal?: AbortSignal) => /* GET /promotion-types */,
  createType: (input: CreatePromotionTypeInput) => /* POST */,
  updateType: (id: string, input: UpdatePromotionTypeInput) => /* PUT */,
  setTypeStatus: (id: string, isActive: boolean) => /* PATCH …/status */,
  listConditions: (includeInactive = true, signal?: AbortSignal) => /* GET /promotion-conditions */,
  createCondition: (input) => /* POST */,
  updateCondition: (id, input) => /* PUT */,
  setConditionStatus: (id, isActive) => /* PATCH …/status */,
  replaceConditionValues: (id, values) => /* PUT …/values */,
  conditionValues: (id, search?, signal?) => /* GET …/values?search= */,
  facts: () => /* GET …/facts */,
  sources: () => /* GET …/sources */,
};
```

Extend the existing schemas in `api.ts` (all additive, so they stay tolerant of older servers):

```ts
export const PromotionConditionSchema = z.object({
  condition: z.string().optional(),
  dimension: z.string().optional(),            // alias, same value
  conditionName: z.string().nullable().optional(),
  valueType: z.string().nullable().optional(),
  operator: z.string(),
  values: z.array(z.string()).default([]),
  group: z.number().nullable().optional(),
}).transform((c) => ({ ...c, code: c.condition ?? c.dimension ?? '' }));

export type PromotionRuleDto = {
  operator: 'And' | 'Or';
  conditions: z.infer<typeof PromotionConditionSchema>[];
  groups: PromotionRuleDto[];
};
export const PromotionRuleSchema: z.ZodType<PromotionRuleDto> = z.lazy(() => z.object({
  operator: z.enum(['And', 'Or']),
  conditions: z.array(PromotionConditionSchema).default([]),
  groups: z.array(PromotionRuleSchema).default([]),
}));

export const PromotionRelationshipSchema = z.object({
  relatedPromotionId: z.string(),
  relatedPromotionCode: z.string().nullable().optional(),
  type: z.enum(['Requires', 'DependsOn', 'Excludes', 'CombinesWith']),
});

// PromotionVersionSchema: add
//   rule: PromotionRuleSchema.optional(),
//   isNestedRule: z.boolean().default(false),
//   relationships: z.array(PromotionRelationshipSchema).default([]),
// PromotionListItemSchema / PromotionDetailSchema: add
//   businessTypeName: z.string().nullable().optional(),
```

`CreatePromotionInput` / `UpdatePromotionInput`:

```ts
businessType?: string;            // code, or…
typeId?: string;                  // …the type id (create only)
conditions?: { condition: string; operator: string; values: string[]; group?: number }[];
rule?: { operator: 'And' | 'Or'; conditions: ConditionInput[]; groups: RuleInput[] };
relationships?: { relatedPromotionId: string; type: 'Requires' | 'DependsOn' | 'Excludes' | 'CombinesWith' }[];
```

Hooks (`hooks.ts`):
- **Query keys:** add `promotionKeys.types(includeInactive)`, `promotionKeys.conditions(includeInactive)`, `promotionKeys.conditionValues(id, search)`, `promotionKeys.facts()` and `promotionKeys.sources()`.
- **Cache times:** facts and sources change only with a release, so give them `staleTime: Infinity`. Give types and conditions about 5 minutes.
- **Mutations:** every catalogue mutation invalidates `promotionKeys.types/conditions`. Type mutations also invalidate `promotionKeys.all`, because list rows show type names.

### 6.3 New settings screens (`promotions.configure`)

Put them under **Promotions → Configuration** with two tabs, e.g. routes `/promotions/configuration/types` and `/promotions/configuration/conditions`. Add both to `config/navigation.ts` and `config/permissions.ts`.

**Promotion types tab**
- **Table columns:** Code · Name · Feed group · Promotions (count) · Status badge · System badge · actions (Edit, Activate/Deactivate).
- **Order:** sort by `sortOrder` then name, and offer an inline sort-order input.
- **Create/Edit dialog:**
  - Code (locked when editing).
  - Name.
  - Description.
  - Feed group: a select of the known kinds (`general`, `paymentMethod`, `transportationPickup`, `productSku`, `customerProduct`, `quantityTier`, `buyXGetY`) plus free text, with the hint "groups the card in the mobile incentives feed".
  - Sort order.
- **Deactivate:** confirm with "N promotions use this type; they keep it. It just stops being offered for new promotions."

**Conditions tab**
- **Table columns:** Code · Name · Reads (`factKey` + scope badge) · Value type · Source (`valueSource` + `sourceKey`) · Values count (static) · Status · actions.
- **Create/Edit dialog**, in four steps or sections:
  1. **Identity:** code (locked when editing), name, description, sort order.
  2. **What it reads:** a combobox of `/facts`, grouped by scope, showing each fact's description, plus a "Custom attribute" option that turns into a `request.` + KEY input. Suggest a default value type from the chosen fact's `valueType`. Explain that a custom attribute must be sent by the caller (mobile or the preview) as `attributes.KEY`.
  3. **Value type:** Text / Number. When editing and promotions use the condition, disable it with the tooltip "Locked: promotions use this condition".
  4. **Values:** a source radio:
     - **Static:** an inline table editor (value, label, active toggle, drag to reorder). Upper-case values on blur; the server does it anyway.
     - **Sap / Database:** a source key select filtered from `/sources`, then a **Preview values** button that calls `/{id}/values`, or that shows a hint before the first save.
     - **Api:** a URL input, with the note "the portal will call this URL to fill the picker".

### 6.4 Promotion form: type, rule builder, relationships

`promotion-form-dialog.tsx` is the biggest change. Split it into components:

```
promotion-form-dialog.tsx         (keeps reward / validity / SAP / tiers sections)
  ├─ promotion-type-select.tsx     usePromotionTypes(false) → select of active types
  ├─ rule-builder/
  │    ├─ rule-builder.tsx         tree editor, state = RuleInput
  │    ├─ rule-group.tsx           AND/OR segmented toggle, children, "+ Condition", "+ Group", remove
  │    ├─ condition-row.tsx        condition select → operator select → value input
  │    └─ condition-value-input.tsx
  └─ relationships-editor.tsx
```

**Type select:** active types only, sorted. On edit, show the stored type read-only, even if it has since been deactivated.

**Rule builder**
- **State:** a tree of `{ id, operator, conditions[], groups[] }`. Use client-only ids for React keys; strip them before sending.
- **Root:** start with `operator: 'And'`, empty. Show an AND/OR segmented control on the root and on every group. Nest groups with an indented left border and a label row: "ALL of" for And, "ANY of" for Or.
- **Condition row:**
  1. Condition picker from `usePromotionConditions(false)`, grouped by `scope` (Customer / Order / Line).
  2. Operator select from that definition's `operators`, with friendly labels:

     | Operator | Label |
     |---|---|
     | `In` | is one of |
     | `NotIn` | is not one of |
     | `GreaterOrEqual` | ≥ |
     | `LessOrEqual` | ≤ |
     | `Between` | between |

  3. Value input, chosen by `valueType` and `valueSource`:
     - **Number:** a number input, or two inputs for Between.
     - **Static:** a multi-select of the definition's active `values`, with no free text because the server enforces the list.
     - **Sap / Database:** an async multi-select combobox calling `/{id}/values?search=` (debounced 300 ms, up to 500 results), with free text allowed. Show labels; send `value`.
     - **Api, or `resolved: false`:** fetch `sourceKey` from the browser if CORS allows; otherwise use free-text chips.
- **Limits:** mirror the server and disable "+ Group" at 50 groups and "+ Condition" at 50 conditions in total. Block save if any group is empty, highlight it, and show "Add a condition or remove the group".
- **Human-readable summary:** render the tree under the builder as text, e.g. `(Province is one of PHNOM PENH, KANDAL) AND Customer tier is one of GOLD`. Reuse the same renderer on the detail page and in the approval screen.
- **Changing the condition** on a row clears its operator and values.

**Flat vs nested, which to send**

| Situation | Send |
|---|---|
| New promotion | `rule` |
| Editing a promotion with `isNestedRule: true` | `rule` |
| Editing a promotion with `isNestedRule: false` | Load the tree from `version.rule`. If the user changed the structure (moved, regrouped, or toggled AND/OR), send `rule`. If they only changed values or added conditions to an existing group, send flat `conditions` (each with its original `group`) so the promotion stays importable by spreadsheet (§8). |

The simplest correct option is to always send `rule`, which evaluates identically. Its cost is that the promotion can no longer be re-imported from Excel, and the UI should warn about that the first time: "Saving with the rule builder makes this promotion portal-only for spreadsheet import."

**Relationships editor**
- A table of rows: related promotion, relationship type, remove button.
- The related-promotion picker is a combobox over `usePromotions({ search })`. It shows code · name · status and excludes the promotion being edited.
- The type select shows Requires / Depends on / Excludes / Combines with, each with a one-line hint (copy the meanings from §4.4).
- Validate on the client: no duplicate (promotion, type) pairs, and no Requires/DependsOn together with Excludes on the same promotion.
- Show the server's `Promotion.RelationshipCircular` as a banner on the section.

**Priority:** the field already exists. Add the helper "Higher applies first. Exclusive / non-stackable promotions win over lower ones unless linked with Combines with."

### 6.5 Detail page (`[id]/page.tsx`)

- **Header:** `businessTypeName ?? businessType`.
- **Conditions section:** rename to **Rule** and render `version.rule` as a read-only tree. Use the same AND/OR group styling as the builder, a chip per value, and `conditionName` as the label. Put a "Flat rule" or "Nested rule" badge, from `isNestedRule`, in the section header.
- **New Relationships section:** list each relationship with its type icon and a link to the related promotion (`/promotions/{relatedPromotionId}`). Show the empty state "Not linked to other promotions".
- **Version comparison:** if the page shows a diff, the audit text now includes `Rule:` and `Relationships:` changes.

### 6.6 List page (`page.tsx`)

- **Type filter:** options come from `usePromotionTypes(true)`. Send the code as `businessType`.
- **Type column:** `row.businessTypeName ?? row.businessType`.
- **"Find by condition" filter (`dimension` + `value`):** a condition select from the catalogue plus a value input. The server matches the condition code.

### 6.7 Preview panel (new, optional but recommended)

Add a "Preview" drawer on the detail page and in the form that calls `POST /api/v1/promotions/evaluate`:

- **Inputs:**
  - Customer picker.
  - Payment method.
  - Pickup type.
  - An attributes editor (key → values) listing every `request.*` fact used by the rule being edited.
  - Lines: material, quantity, unit and unit price. Unit price is what makes `order.amount` conditions work.
- **Output per line:**
  - `applied`: code, name, percent or amount, priority, stacking.
  - `notApplied`: code with its `reason`. Map the `Relationship.*` codes to friendly text.

This is the quickest way for Finance to check AND/OR logic and relationships before submitting.

### 6.8 Approval screens (`/approval/promotions`)

Reviewers need to see what they are signing, so reuse the read-only rule tree and the relationships list from §6.5.

---

## 7. UX rules worth enforcing on the client

1. **Inactive catalogue entries:**
   - Pickers for new choices exclude them.
   - Anything already saved on a promotion is still shown, with an "Inactive" badge.
   - Editing such a promotion forces the user to replace the inactive condition before saving. The server refuses it with `Promotion.ConditionInactive`.
2. **Codes are case-insensitive** on the server. Compare with `toUpperCase()` when matching a stored condition to a definition.
3. **Values** are stored trimmed and upper-cased, so display them as stored.
4. **Number conditions** take exactly one value, or two for Between; the low value must be ≤ the high one; and values can't be negative.
5. **Edit body is whole.** An edit replaces the configuration, including `relationships`. Always send the current relationships, or the edit clears them.
6. **`isSystem` entries** can be renamed and deactivated like any other. Consider a confirm step before deactivating one, because the shipped promotions use them.

---

## 8. Excel template and import

- Template dropdowns now list the active type and condition codes from the catalogue, so no portal change is needed.
- The workbook expresses only the **flat** form and has no relationships. Import **refuses** to overwrite a promotion that uses a nested rule or relationships, with an error row: "uses a nested AND / OR rule or relationships … Edit it in the portal."
- The import panel's help text should say so.

---

## 9. Suggested delivery order

| Step | Scope | Depends on |
|---|---|---|
| 1 | Schemas + `promotionCatalogApi` + hooks (§6.2). Swap the hard-coded type/condition lists for the API (§6.1). | – |
| 2 | Configuration screens: types, conditions, static values (§6.3). | 1 |
| 3 | Detail page: rule tree + relationships, read-only (§6.5); the same in approval (§6.8). | 1 |
| 4 | Rule builder in the form (§6.4), with value pickers by source. | 1 |
| 5 | Relationships editor (§6.4). | 1 |
| 6 | Preview drawer (§6.7). | 4 |

---

## 10. Test checklist for the portal

- [ ] Type list loads the seven seeded types; creating one makes it appear in the promotion form immediately.
- [ ] A deactivated type disappears from the create form but still labels existing promotions.
- [ ] Creating a condition over `request.CUSTOMER_TIER` with static values GOLD/SILVER; it appears in the builder with In/NotIn only.
- [ ] A Number condition shows only ≥, ≤ and between, and validates the number inputs.
- [ ] A SAP-sourced condition (`PaymentMethod`) loads T014, TCOD… from `/values` with search.
- [ ] Editing a condition used by a promotion: value type is locked; forcing it shows the 409 message.
- [ ] Builder: `(Province PP OR KANDAL) AND Tier GOLD` saves, and the detail page renders the same tree.
- [ ] An empty group blocks save on the client; if bypassed, `Promotion.RuleInvalid` is shown.
- [ ] An old (flat) promotion opens in the builder with the right tree; saving without structural change keeps `isNestedRule: false`.
- [ ] Relationships: add Requires → save → detail shows it; A→B→A shows the circular-dependency banner.
- [ ] Preview: B requiring A shows `Relationship.RequiresNotMet` when A's conditions fail.
- [ ] Users without `promotions.configure` don't see the configuration screens; direct navigation shows the 403 state.
- [ ] Mobile incentives feed still groups cards the same way for the seven shipped types.

---

## Appendix: backend reference

| Concern | Where |
|---|---|
| Catalogue entities, facts, seeds | `backend-server/src/ISI.Domain/Modules/Promotions/PromotionCatalog.cs` |
| Rule groups, relationships, rule tree | `…/Promotions/PromotionRules.cs`, `PromotionVersion.BuildRule()` |
| Engine (tree evaluation, relationships, stacking) | `…/Promotions/Engine/PromotionRuleEngine.cs` |
| Catalogue API handlers + value resolution | `backend-server/src/ISI.Application/Features/Promotions/PromotionCatalogFeature.cs` |
| Request → configuration, cycle check | `…/Features/Promotions/PromotionMapping.cs`, `PromotionConfigurationBuilder.cs` |
| Contracts | `backend-server/src/ISI.Contracts/Promotions/PromotionCatalogContracts.cs`, `PromotionContracts.cs` |
| Controllers | `backend-server/src/ISI.Api/Controllers/Promotions/PromotionCatalogControllers.cs` |
| Migration (data conversion + seed, reversible) | `backend-server/src/ISI.Persistence/Migrations/20261002050526_AddConfigurablePromotionCatalog.cs` |
