'use client';

/**
 * The AND / OR rule editor.
 *
 * Nothing here names a condition. The picker lists the catalogue's active definitions,
 * each row offers that definition's own operators, and the value input is chosen by its
 * value type and source — so a condition an administrator adds tomorrow works here
 * without a code change.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, FolderPlus, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { findByCode, operatorLabel, byCatalogOrder, type ConditionDefinitionDto } from '../catalog-api';
import { useConditionValues } from '../hooks';
import {
  MAX_CONDITIONS,
  MAX_GROUPS,
  countTree,
  newCondition,
  newGroup,
  removeGroup,
  updateGroup,
  type ConditionNode,
  type GroupNode,
  type Junction,
  type RuleIssue,
} from './rule-tree';

const SCOPE_LABEL: Record<string, string> = { customer: 'Customer', order: 'Order', line: 'Line' };

/** Fallback when a definition arrives without its operator list. */
const DEFAULT_OPERATORS: Record<string, string[]> = {
  Text: ['In', 'NotIn'],
  Number: ['GreaterOrEqual', 'LessOrEqual', 'Between'],
};

export function operatorsFor(def?: ConditionDefinitionDto): string[] {
  if (!def) return [];
  return def.operators.length > 0 ? def.operators : DEFAULT_OPERATORS[def.valueType] ?? ['In', 'NotIn'];
}

export const JUNCTION_STYLE: Record<Junction, { rail: string; chip: string; label: string }> = {
  And: { rail: 'border-sky-500/50', chip: 'bg-sky-500/10 text-sky-700 dark:text-sky-300', label: 'ALL of' },
  Or: { rail: 'border-violet-500/50', chip: 'bg-violet-500/10 text-violet-700 dark:text-violet-300', label: 'ANY of' },
};

export function RuleBuilder({
  value,
  onChange,
  definitions,
  loading,
  issues,
  showIssues,
}: {
  value: GroupNode;
  onChange: (next: GroupNode) => void;
  /** Every definition, inactive included, so stored rows still have a label. */
  definitions: ConditionDefinitionDto[] | undefined;
  loading?: boolean;
  issues: RuleIssue[];
  showIssues: boolean;
}) {
  const totals = countTree(value);
  const limits = { groups: totals.groups >= MAX_GROUPS, conditions: totals.conditions >= MAX_CONDITIONS };
  const issueFor = (id: string) => (showIssues ? issues.find((i) => i.nodeId === id)?.message : undefined);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-surface px-4 py-6 text-[12px] text-muted-foreground">
        <Loader2 size={14} className="animate-spin" /> Loading the condition catalogue…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <GroupEditor
        group={value}
        root={value}
        isRoot
        depth={0}
        onRoot={onChange}
        definitions={definitions ?? []}
        limits={limits}
        issueFor={issueFor}
      />
      <p className="text-[10.5px] text-muted-foreground tabular-nums">
        {totals.conditions}/{MAX_CONDITIONS} conditions · {totals.groups}/{MAX_GROUPS} groups
      </p>
    </div>
  );
}

function GroupEditor({
  group,
  root,
  isRoot,
  depth,
  onRoot,
  definitions,
  limits,
  issueFor,
}: {
  group: GroupNode;
  root: GroupNode;
  isRoot?: boolean;
  depth: number;
  onRoot: (next: GroupNode) => void;
  definitions: ConditionDefinitionDto[];
  limits: { groups: boolean; conditions: boolean };
  issueFor: (id: string) => string | undefined;
}) {
  const style = JUNCTION_STYLE[group.operator];
  const edit = (fn: (g: GroupNode) => GroupNode) => onRoot(updateGroup(root, group.id, fn));
  const problem = issueFor(group.id);
  const empty = group.conditions.length === 0 && group.groups.length === 0;

  return (
    <div
      className={`rounded-xl border ${problem ? 'border-rose-400 bg-rose-500/5' : 'border-surface'} ${
        isRoot ? 'bg-card' : 'bg-muted/20'
      } p-3`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <JunctionToggle value={group.operator} onChange={(operator) => edit((g) => ({ ...g, operator }))} />
        <span className="text-[11.5px] text-muted-foreground">
          {group.operator === 'And' ? 'Every item below must match' : 'At least one item below must match'}
        </span>
        {!isRoot && (
          <button
            type="button"
            onClick={() => onRoot(removeGroup(root, group.id))}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
          >
            <Trash2 size={12} /> Remove group
          </button>
        )}
      </div>

      <div className={`mt-3 space-y-2 border-l-2 pl-3 ${style.rail}`}>
        {empty && (
          <p className="py-1 text-[11.5px] text-muted-foreground">
            {isRoot ? 'No conditions — this promotion applies to everyone.' : 'Empty group.'}
          </p>
        )}
        {group.conditions.map((c, i) => (
          <div key={c.id}>
            {i > 0 && <JoinWord operator={group.operator} />}
            <ConditionRow
              node={c}
              definitions={definitions}
              problem={issueFor(c.id)}
              onChange={(next) => edit((g) => ({ ...g, conditions: g.conditions.map((x) => (x.id === c.id ? next : x)) }))}
              onRemove={() => edit((g) => ({ ...g, conditions: g.conditions.filter((x) => x.id !== c.id) }))}
            />
          </div>
        ))}
        {group.groups.map((child, i) => (
          <div key={child.id}>
            {(group.conditions.length > 0 || i > 0) && <JoinWord operator={group.operator} />}
            <GroupEditor
              group={child}
              root={root}
              depth={depth + 1}
              onRoot={onRoot}
              definitions={definitions}
              limits={limits}
              issueFor={issueFor}
            />
          </div>
        ))}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={limits.conditions}
            onClick={() => edit((g) => ({ ...g, conditions: [...g.conditions, newCondition()] }))}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-surface px-2.5 py-1.5 text-[11.5px] font-medium text-primary hover:bg-primary/5 disabled:opacity-40"
          >
            <Plus size={12} /> Condition
          </button>
          <button
            type="button"
            disabled={limits.groups}
            onClick={() =>
              edit((g) => ({ ...g, groups: [...g.groups, { ...newGroup(g.operator === 'And' ? 'Or' : 'And'), conditions: [newCondition()] }] }))
            }
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-surface px-2.5 py-1.5 text-[11.5px] font-medium text-muted-foreground hover:bg-accent/40 disabled:opacity-40"
          >
            <FolderPlus size={12} /> Group
          </button>
        </div>
      </div>

      {problem && (
        <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-rose-600">
          <AlertCircle size={12} /> {problem}
        </p>
      )}
    </div>
  );
}

function JunctionToggle({ value, onChange }: { value: Junction; onChange: (v: Junction) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-surface bg-muted/40 p-0.5">
      {(['And', 'Or'] as const).map((op) => (
        <button
          key={op}
          type="button"
          onClick={() => onChange(op)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
            value === op ? `${JUNCTION_STYLE[op].chip} shadow-sm` : 'text-muted-foreground hover:text-main'
          }`}
        >
          {JUNCTION_STYLE[op].label}
        </button>
      ))}
    </div>
  );
}

function JoinWord({ operator }: { operator: Junction }) {
  return (
    <span className={`my-1 inline-block rounded px-1.5 py-px text-[9.5px] font-bold tracking-wider ${JUNCTION_STYLE[operator].chip}`}>
      {operator.toUpperCase()}
    </span>
  );
}

// ── One condition ─────────────────────────────────────────────────────────────

function ConditionRow({
  node,
  definitions,
  problem,
  onChange,
  onRemove,
}: {
  node: ConditionNode;
  definitions: ConditionDefinitionDto[];
  problem?: string;
  onChange: (next: ConditionNode) => void;
  onRemove: () => void;
}) {
  const def = findByCode(definitions, node.condition);
  const operators = operatorsFor(def);

  // Grouped by scope; inactive ones are not offered, except the one already stored.
  const grouped = useMemo(() => {
    const map = new Map<string, ConditionDefinitionDto[]>();
    [...definitions]
      .filter((d) => d.isActive || d.code.toUpperCase() === node.condition.toUpperCase())
      .sort(byCatalogOrder)
      .forEach((d) => map.set(d.scope, [...(map.get(d.scope) ?? []), d]));
    return Array.from(map.entries());
  }, [definitions, node.condition]);

  return (
    <div className={`rounded-lg border ${problem ? 'border-rose-400' : 'border-surface'} bg-card p-2`}>
      <div className="flex flex-col gap-2 md:flex-row md:items-start">
        <select
          value={def?.code ?? node.condition}
          onChange={(e) => {
            const next = findByCode(definitions, e.target.value);
            // Changing the condition clears its operator and values.
            onChange({ ...node, condition: e.target.value, operator: operatorsFor(next)[0] ?? '', values: [] });
          }}
          className="h-9 w-full md:w-48 flex-shrink-0 rounded-lg border border-surface bg-transparent px-2 text-[12px] font-medium"
        >
          <option value="">Choose condition…</option>
          {grouped.map(([scope, defs]) => (
            <optgroup key={scope} label={SCOPE_LABEL[scope] ?? scope}>
              {defs.map((d) => (
                <option key={d.id} value={d.code}>
                  {d.name}
                  {d.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </optgroup>
          ))}
          {node.condition && !def && <option value={node.condition}>{node.condition} (unknown)</option>}
        </select>

        <select
          value={node.operator}
          disabled={!def}
          onChange={(e) =>
            onChange({ ...node, operator: e.target.value, values: def?.valueType === 'Number' ? [] : node.values })
          }
          className="h-9 w-full md:w-36 flex-shrink-0 rounded-lg border border-surface bg-transparent px-2 text-[12px] disabled:opacity-50"
        >
          {operators.length === 0 && <option value="">—</option>}
          {operators.map((op) => (
            <option key={op} value={op}>
              {operatorLabel(op)}
            </option>
          ))}
        </select>

        <div className="min-w-0 flex-1">
          {def ? (
            <ConditionValueInput definition={def} operator={node.operator} values={node.values} onChange={(values) => onChange({ ...node, values })} />
          ) : (
            <div className="flex h-9 items-center rounded-lg border border-dashed border-surface px-3 text-[11.5px] text-muted-foreground">
              Choose a condition first
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove condition"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center self-end rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 md:self-auto"
        >
          <Trash2 size={13} />
        </button>
      </div>
      {def?.description && <p className="mt-1.5 text-[10.5px] text-muted-foreground">{def.description}</p>}
      {problem && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-rose-600">
          <AlertCircle size={12} /> {problem}
        </p>
      )}
    </div>
  );
}

// ── Values ────────────────────────────────────────────────────────────────────

/** Picks the right input for a definition's value type and source. */
export function ConditionValueInput({
  definition,
  operator,
  values,
  onChange,
}: {
  definition: ConditionDefinitionDto;
  operator: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  if (definition.valueType === 'Number') {
    const between = operator === 'Between';
    const set = (i: number, v: string) => {
      const next = [...values];
      next[i] = v;
      onChange(next.slice(0, between ? 2 : 1).map((x) => x ?? ''));
    };
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={values[0] ?? ''}
          onChange={(e) => set(0, e.target.value)}
          placeholder={between ? 'From' : 'Value'}
          className="h-9 w-full min-w-0 rounded-lg border border-surface bg-transparent px-3 text-[12px] tabular-nums"
        />
        {between && (
          <>
            <span className="text-[11px] text-muted-foreground">and</span>
            <input
              type="number"
              min={0}
              value={values[1] ?? ''}
              onChange={(e) => set(1, e.target.value)}
              placeholder="To"
              className="h-9 w-full min-w-0 rounded-lg border border-surface bg-transparent px-3 text-[12px] tabular-nums"
            />
          </>
        )}
      </div>
    );
  }

  const activeStatic = definition.values.filter((v) => v.isActive);
  if (definition.valueSource === 'Static') {
    // A non-empty static list is enforced by the server, so no free text then.
    return (
      <ValuePicker
        values={values}
        onChange={onChange}
        options={activeStatic}
        allowFree={activeStatic.length === 0}
        hint={activeStatic.length === 0 ? 'Type a value and press Enter' : undefined}
      />
    );
  }

  return <RemoteValuePicker definition={definition} values={values} onChange={onChange} />;
}

function RemoteValuePicker({
  definition,
  values,
  onChange,
}: {
  definition: ConditionDefinitionDto;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Api sources are not resolved by the server; the picker falls back to free text.
  const remote = definition.valueSource !== 'Api';
  const query = useConditionValues(definition.id, debounced, remote && open);
  const unresolved = !remote || query.data?.resolved === false;

  return (
    <ValuePicker
      values={values}
      onChange={onChange}
      options={unresolved ? [] : (query.data?.values ?? []).filter((v) => v.isActive).slice(0, 500)}
      allowFree
      loading={query.isFetching}
      search={search}
      onSearch={setSearch}
      onOpenChange={setOpen}
      hint={
        unresolved
          ? 'Values are not listed for this source — type a value and press Enter'
          : query.isError
            ? 'Could not load values — type a value and press Enter'
            : undefined
      }
    />
  );
}

/** Chips plus a searchable dropdown. Values are stored upper-cased, as the server does. */
function ValuePicker({
  values,
  onChange,
  options,
  allowFree,
  loading,
  search: controlledSearch,
  onSearch,
  onOpenChange,
  hint,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: { value: string; label?: string | null }[];
  allowFree: boolean;
  loading?: boolean;
  search?: string;
  onSearch?: (s: string) => void;
  onOpenChange?: (open: boolean) => void;
  hint?: string;
}) {
  const [localSearch, setLocalSearch] = useState('');
  const search = controlledSearch ?? localSearch;
  const setSearch = onSearch ?? setLocalSearch;
  const [open, setOpenState] = useState(false);
  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  };
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const chosen = new Set(values.map((v) => v.toUpperCase()));
  const term = search.trim().toUpperCase();
  const filtered = options.filter(
    (o) => !chosen.has(o.value.toUpperCase()) && (!term || o.value.toUpperCase().includes(term) || (o.label ?? '').toUpperCase().includes(term))
  );
  const labelOf = (v: string) => options.find((o) => o.value.toUpperCase() === v.toUpperCase())?.label;

  const add = (v: string) => {
    const clean = v.trim().toUpperCase();
    if (!clean || chosen.has(clean)) return;
    onChange([...values, clean]);
    setSearch('');
  };

  return (
    <div ref={box} className="relative">
      <div
        onClick={() => setOpen(true)}
        className="flex min-h-9 flex-wrap items-center gap-1 rounded-lg border border-surface bg-transparent px-2 py-1 cursor-text"
      >
        {values.map((v) => (
          <span key={v} title={labelOf(v) ?? undefined} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
            <span className="font-mono">{v}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(values.filter((x) => x !== v));
              }}
              aria-label={`Remove ${v}`}
              className="hover:text-rose-600"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const exact = filtered.find((o) => o.value.toUpperCase() === term);
              if (exact) add(exact.value);
              else if (allowFree) add(search);
              else if (filtered[0]) add(filtered[0].value);
            } else if (e.key === 'Backspace' && !search && values.length) {
              onChange(values.slice(0, -1));
            } else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={values.length ? '' : options.length || !allowFree ? 'Search values…' : 'Type and press Enter'}
          className="h-7 min-w-[80px] flex-1 bg-transparent text-[12px] outline-none"
        />
        {loading ? <Loader2 size={12} className="animate-spin text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
      </div>

      {open && (filtered.length > 0 || (allowFree && term) || (!allowFree && options.length === 0)) && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 max-h-56 overflow-y-auto rounded-lg border border-surface bg-card p-1 shadow-xl">
          {allowFree && term && !filtered.some((o) => o.value.toUpperCase() === term) && (
            <button
              type="button"
              onClick={() => add(search)}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-accent/50"
            >
              <Plus size={12} className="text-primary" /> Add “<span className="font-mono">{term}</span>”
            </button>
          )}
          {filtered.slice(0, 200).map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => add(o.value)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-accent/50"
            >
              <span className="truncate">{o.label || o.value}</span>
              {o.label && o.label !== o.value && <span className="flex-shrink-0 font-mono text-[10.5px] text-muted-foreground">{o.value}</span>}
            </button>
          ))}
          {!allowFree && options.length === 0 && (
            <p className="flex items-center gap-1.5 px-2 py-1.5 text-[11.5px] text-muted-foreground">
              <Search size={12} /> This condition has no values yet.
            </p>
          )}
        </div>
      )}
      {hint && <p className="mt-1 text-[10.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
