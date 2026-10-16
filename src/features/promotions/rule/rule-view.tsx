'use client';

/**
 * Read-only rendering of a promotion's rule and its links to other promotions.
 *
 * Shared by the detail page and the approval screen, so a reviewer signs exactly the
 * tree the author built, in the same AND / OR styling as the builder.
 */

import Link from 'next/link';
import { ArrowUpRight, Ban, Combine, GitBranch, Link2, ShieldCheck } from 'lucide-react';
import type { PromotionRelationshipDto, PromotionRuleDto } from '../api';
import { RELATIONSHIP_INFO, type RelationshipType } from '../api';
import { findByCode, operatorLabel, type ConditionDefinitionDto } from '../catalog-api';
import { JUNCTION_STYLE } from './rule-builder';
import { dtoAsTree, summarizeRule } from './rule-tree';

const junction = (op: string) => (op.toLowerCase() === 'or' ? 'Or' : 'And');

export function RuleTreeView({
  rule,
  definitions,
}: {
  rule: PromotionRuleDto | undefined;
  definitions?: readonly ConditionDefinitionDto[];
}) {
  if (!rule || (rule.conditions.length === 0 && rule.groups.length === 0)) {
    return (
      <p className="rounded-xl border border-dashed border-surface px-4 py-3 text-[12.5px] text-muted-foreground">
        No conditions — this promotion applies to every line it is evaluated against.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <GroupView group={rule} definitions={definitions} isRoot />
      <p className="rounded-lg bg-muted/40 px-3 py-2 text-[11.5px] text-muted-foreground">
        <span className="font-semibold text-main">In words: </span>
        {summarizeRule(dtoAsTree(rule), definitions)}
      </p>
    </div>
  );
}

function GroupView({
  group,
  definitions,
  isRoot,
}: {
  group: PromotionRuleDto;
  definitions?: readonly ConditionDefinitionDto[];
  isRoot?: boolean;
}) {
  const op = junction(group.operator);
  const style = JUNCTION_STYLE[op];
  const items = group.conditions.length + group.groups.length;

  return (
    <div className={`rounded-xl border border-surface ${isRoot ? '' : 'bg-muted/20'} p-3`}>
      {items > 1 && (
        <span className={`inline-block rounded-md px-2 py-0.5 text-[10.5px] font-bold ${style.chip}`}>{style.label}</span>
      )}
      <div className={`${items > 1 ? 'mt-2.5 border-l-2 pl-3' : ''} space-y-2 ${style.rail}`}>
        {group.conditions.map((c, i) => {
          const def = findByCode(definitions, c.code);
          const name = c.conditionName || def?.name || c.code;
          const labelOf = (v: string) => def?.values.find((x) => x.value.toUpperCase() === v.toUpperCase())?.label;
          return (
            <div key={`c${i}`}>
              {i > 0 && <Join op={op} />}
              <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                <span className="font-semibold text-main">{name}</span>
                {def && !def.isActive && (
                  <span className="rounded bg-slate-500/10 px-1 text-[9.5px] font-semibold uppercase text-slate-600 dark:text-slate-300">Inactive</span>
                )}
                <span className="text-muted-foreground">
                  {c.operator === 'Between' ? 'between' : operatorLabel(c.operator)}
                </span>
                {c.operator === 'Between' ? (
                  <span className="font-mono text-[11.5px] text-main">
                    {c.values[0] ?? '—'} – {c.values[1] ?? '—'}
                  </span>
                ) : (
                  c.values.map((v) => (
                    <span
                      key={v}
                      title={labelOf(v) ?? undefined}
                      className="rounded-md border border-surface bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] text-main"
                    >
                      {v}
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
        {group.groups.map((g, i) => (
          <div key={`g${i}`}>
            {(group.conditions.length > 0 || i > 0) && <Join op={op} />}
            <GroupView group={g} definitions={definitions} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Join({ op }: { op: 'And' | 'Or' }) {
  return (
    <span className={`mb-1 inline-block rounded px-1.5 py-px text-[9.5px] font-bold tracking-wider ${JUNCTION_STYLE[op].chip}`}>
      {op.toUpperCase()}
    </span>
  );
}

// ── Relationships ─────────────────────────────────────────────────────────────

export const RELATIONSHIP_LOOK: Record<RelationshipType, { icon: typeof Link2; tone: string }> = {
  Requires: { icon: ShieldCheck, tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  DependsOn: { icon: GitBranch, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  Excludes: { icon: Ban, tone: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  CombinesWith: { icon: Combine, tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
};

export function relationshipMeta(type: string) {
  const known = type as RelationshipType;
  return {
    info: RELATIONSHIP_INFO[known] ?? { label: type, hint: '' },
    look: RELATIONSHIP_LOOK[known] ?? { icon: Link2, tone: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
  };
}

export function RelationshipList({ relationships }: { relationships: PromotionRelationshipDto[] }) {
  if (relationships.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-surface px-4 py-3 text-[12.5px] text-muted-foreground">
        Not linked to other promotions.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {relationships.map((r) => {
        const { info, look } = relationshipMeta(r.type);
        const Icon = look.icon;
        return (
          <li key={`${r.type}-${r.relatedPromotionId}`} className="flex items-center gap-3 rounded-xl border border-surface p-3">
            <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${look.tone}`}>
              <Icon size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
                <span className={`rounded-md px-1.5 py-px text-[10.5px] font-bold ${look.tone}`}>{info.label}</span>
                <Link href={`/promotions/${r.relatedPromotionId}`} className="inline-flex items-center gap-0.5 font-mono font-semibold text-primary hover:underline">
                  {r.relatedPromotionCode ?? r.relatedPromotionId.slice(0, 8)}
                  <ArrowUpRight size={12} />
                </Link>
              </span>
              {info.hint && <span className="mt-0.5 block text-[11px] text-muted-foreground">{info.hint}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
