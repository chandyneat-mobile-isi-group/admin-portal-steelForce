/**
 * The rule builder's state: a tree of AND / OR groups holding condition leaves.
 *
 * Client-only ids key the React list and are stripped before sending. The server's
 * limits are mirrored here (50 groups, 50 conditions, no empty group) so a rule the
 * server would refuse is caught while it is being written.
 */
import type { ConditionInput, PromotionRuleDto, PromotionVersionDto, RuleInput } from '../api';
import { findByCode, operatorLabel, type ConditionDefinitionDto } from '../catalog-api';

export const MAX_GROUPS = 50;
export const MAX_CONDITIONS = 50;

export type Junction = 'And' | 'Or';

export interface ConditionNode {
  id: string;
  /** Catalogue code; '' until chosen. */
  condition: string;
  operator: string;
  values: string[];
}

export interface GroupNode {
  id: string;
  operator: Junction;
  conditions: ConditionNode[];
  groups: GroupNode[];
}

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const newCondition = (): ConditionNode => ({ id: nextId('c'), condition: '', operator: '', values: [] });
export const newGroup = (operator: Junction = 'And'): GroupNode => ({
  id: nextId('g'),
  operator,
  conditions: [],
  groups: [],
});

const junction = (op?: string | null): Junction => ((op ?? '').toLowerCase() === 'or' ? 'Or' : 'And');

/** A server rule as builder state — used to open an existing rule in the builder. */
export function fromDto(rule?: PromotionRuleDto | null): GroupNode {
  if (!rule) return newGroup('And');
  return {
    id: nextId('g'),
    operator: junction(rule.operator),
    conditions: rule.conditions.map((c) => ({ id: nextId('c'), condition: c.code, operator: c.operator, values: [...c.values] })),
    groups: rule.groups.map((g) => fromDto(g)),
  };
}

/** Builder state as the request body: ids stripped, unfinished rows dropped. */
export function toInput(group: GroupNode): RuleInput {
  return {
    operator: group.operator,
    conditions: group.conditions
      .filter((c) => c.condition && c.operator && c.values.length > 0)
      .map<ConditionInput>((c) => ({ condition: c.condition, operator: c.operator, values: c.values })),
    groups: group.groups.map(toInput),
  };
}

export function countTree(group: GroupNode): { groups: number; conditions: number } {
  return group.groups.reduce(
    (acc, g) => {
      const inner = countTree(g);
      return { groups: acc.groups + 1 + inner.groups, conditions: acc.conditions + inner.conditions };
    },
    { groups: 0, conditions: group.conditions.length }
  );
}

export function isEmptyRoot(group: GroupNode) {
  return group.conditions.length === 0 && group.groups.length === 0;
}

// ── Immutable edits by id ─────────────────────────────────────────────────────

export function updateGroup(root: GroupNode, id: string, fn: (g: GroupNode) => GroupNode): GroupNode {
  if (root.id === id) return fn(root);
  return { ...root, groups: root.groups.map((g) => updateGroup(g, id, fn)) };
}

export function removeGroup(root: GroupNode, id: string): GroupNode {
  return { ...root, groups: root.groups.filter((g) => g.id !== id).map((g) => removeGroup(g, id)) };
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface RuleIssue {
  nodeId: string;
  message: string;
}

/**
 * Everything that would make the server refuse the rule, or silently drop a row.
 * An empty root is fine — it means "everyone".
 */
export function validateRule(root: GroupNode, definitions: readonly ConditionDefinitionDto[] | undefined): RuleIssue[] {
  const issues: RuleIssue[] = [];
  const { groups, conditions } = countTree(root);
  if (groups > MAX_GROUPS) issues.push({ nodeId: root.id, message: `At most ${MAX_GROUPS} groups.` });
  if (conditions > MAX_CONDITIONS) issues.push({ nodeId: root.id, message: `At most ${MAX_CONDITIONS} conditions.` });

  const walk = (g: GroupNode, isRoot: boolean) => {
    if (!isRoot && g.conditions.length === 0 && g.groups.length === 0) {
      issues.push({ nodeId: g.id, message: 'Add a condition or remove the group.' });
    }
    g.conditions.forEach((c) => {
      const def = findByCode(definitions, c.condition);
      if (!c.condition) return issues.push({ nodeId: c.id, message: 'Choose a condition.' });
      if (definitions && !def) return issues.push({ nodeId: c.id, message: 'This condition is not in the catalogue.' });
      if (def && !def.isActive) return issues.push({ nodeId: c.id, message: 'This condition was deactivated — replace it.' });
      if (!c.operator) return issues.push({ nodeId: c.id, message: 'Choose an operator.' });
      if (c.values.filter((v) => v.trim()).length === 0) return issues.push({ nodeId: c.id, message: 'Add at least one value.' });
      if (def?.valueType === 'Number') {
        const nums = c.values.map(Number);
        const need = c.operator === 'Between' ? 2 : 1;
        if (c.values.length !== need || c.values.some((v) => v.trim() === '') || nums.some((n) => !Number.isFinite(n)))
          return issues.push({ nodeId: c.id, message: need === 2 ? 'Enter a low and a high number.' : 'Enter one number.' });
        if (nums.some((n) => n < 0)) return issues.push({ nodeId: c.id, message: 'Numbers cannot be negative.' });
        if (need === 2 && nums[0] > nums[1]) return issues.push({ nodeId: c.id, message: 'The low value must not exceed the high one.' });
      }
      return undefined;
    });
    g.groups.forEach((child) => walk(child, false));
  };
  walk(root, true);
  return issues;
}

// ── Plain-language summary ────────────────────────────────────────────────────

type Leaf = { code: string; operator: string; values: string[]; name?: string | null };
type Tree = { operator: string; conditions: Leaf[]; groups: Tree[] };

function leafText(leaf: Leaf, definitions?: readonly ConditionDefinitionDto[]) {
  const def = findByCode(definitions, leaf.code);
  const name = leaf.name || def?.name || leaf.code || '…';
  const label = (v: string) => def?.values.find((x) => x.value.toUpperCase() === v.toUpperCase())?.label || v;
  if (leaf.operator === 'Between') return `${name} between ${leaf.values[0] ?? '…'} and ${leaf.values[1] ?? '…'}`;
  return `${name} ${operatorLabel(leaf.operator || '…')} ${leaf.values.map(label).join(', ') || '…'}`;
}

function treeText(tree: Tree, definitions: readonly ConditionDefinitionDto[] | undefined, nested: boolean): string {
  const parts = [
    ...tree.conditions.map((c) => leafText(c, definitions)),
    ...tree.groups.map((g) => treeText(g, definitions, true)).filter(Boolean),
  ];
  if (parts.length === 0) return '';
  const joined = parts.join(junction(tree.operator) === 'Or' ? ' OR ' : ' AND ');
  return nested && parts.length > 1 ? `(${joined})` : joined;
}

/** `(Province is one of PP, KANDAL) AND Customer tier is one of GOLD`. Empty = everyone. */
export function summarizeRule(tree: Tree | undefined, definitions?: readonly ConditionDefinitionDto[]): string {
  return (tree && treeText(tree, definitions, false)) || 'Everyone — no conditions.';
}

/** Builder state in the summary's shape. */
export const nodeAsTree = (g: GroupNode): Tree => ({
  operator: g.operator,
  conditions: g.conditions.map((c) => ({ code: c.condition, operator: c.operator, values: c.values })),
  groups: g.groups.map(nodeAsTree),
});

/** A server rule in the summary's shape. */
export const dtoAsTree = (r: PromotionRuleDto): Tree => ({
  operator: r.operator,
  conditions: r.conditions.map((c) => ({ code: c.code, operator: c.operator, values: c.values, name: c.conditionName })),
  groups: r.groups.map(dtoAsTree),
});

/**
 * The rule a version evaluates as. Newer servers always send `rule`; for an older one
 * the flat form is rebuilt the way the engine reads it — OR across groups, AND within.
 */
export function ruleOf(version: Pick<PromotionVersionDto, 'rule' | 'conditions'>): PromotionRuleDto {
  if (version.rule) return version.rule;
  const groups = new Map<number, PromotionVersionDto['conditions']>();
  version.conditions.forEach((c) => groups.set(c.group ?? 0, [...(groups.get(c.group ?? 0) ?? []), c]));
  if (groups.size <= 1) return { operator: 'And', conditions: version.conditions, groups: [] };
  return {
    operator: 'Or',
    conditions: [],
    groups: Array.from(groups.values()).map((conditions) => ({ operator: 'And', conditions, groups: [] })),
  };
}
