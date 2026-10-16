'use client';

/**
 * Condition definitions — what a promotion's rule can test.
 *
 * Each row says what the engine reads (`factKey`), whether it is text or a number, and
 * where the rule builder's value picker gets its options. A deactivated definition
 * cannot be used in new or edited promotions; live ones that use it keep evaluating.
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, ListFilter, Loader2, Pencil, Plus, Power, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/feedback/feedback';
import {
  byCatalogOrder,
  operatorLabel,
  promotionErrorMessage,
  usePromotionConditions,
  useSetConditionStatus,
  type ConditionDefinitionDto,
} from '@/features/promotions';
import { ConditionDialog } from '@/features/promotions/config/condition-dialog';
import { ScopePill, StatusPill, SystemPill } from '@/features/promotions/config/pills';

const SOURCE_LABEL: Record<string, string> = { Static: 'Fixed list', Database: 'Platform data', Sap: 'SAP', Api: 'URL' };

export default function PromotionConditionsPage() {
  const { data, isLoading, isError, error } = usePromotionConditions(true);
  const setStatus = useSetConditionStatus();

  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [editing, setEditing] = useState<ConditionDefinitionDto | 'new' | null>(null);
  const [toggling, setToggling] = useState<ConditionDefinitionDto | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...(data ?? [])]
      .filter((d) => showInactive || d.isActive)
      .filter((d) => !scope || d.scope === scope)
      .filter((d) => !term || [d.code, d.name, d.factKey].some((x) => x.toLowerCase().includes(term)))
      .sort(byCatalogOrder);
  }, [data, search, scope, showInactive]);

  const scopes = Array.from(new Set((data ?? []).map((d) => d.scope)));
  const activeCount = (data ?? []).filter((d) => d.isActive).length;

  const confirmToggle = () => {
    if (!toggling) return;
    const next = !toggling.isActive;
    setStatus.mutate(
      { id: toggling.id, isActive: next },
      {
        onSuccess: () => toast.success(`${toggling.name} ${next ? 'activated' : 'deactivated'}.`),
        onError: (err) => toast.error(promotionErrorMessage(err, 'Could not change the status.')),
        onSettled: () => setToggling(null),
      }
    );
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, name or fact"
            className="h-9 w-full rounded-xl border border-surface bg-card pl-9 pr-3 text-[12.5px]"
          />
        </div>
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="h-9 rounded-xl border border-surface bg-card px-3 text-[12.5px] capitalize">
          <option value="">Any scope</option>
          {scopes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive
        </label>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl gradient-primary px-3.5 text-[12.5px] font-semibold text-white"
        >
          <Plus size={14} /> New condition
        </button>
      </div>

      <Card className="overflow-hidden rounded-card border-surface p-0 card-shadow">
        <div className="flex items-center gap-2.5 border-b border-surface px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ListFilter size={15} />
          </span>
          <div>
            <p className="text-[14px] font-bold text-main">Conditions</p>
            <p className="text-[11.5px] text-muted-foreground">
              {activeCount} active of {data?.length ?? 0} · offered in the rule builder
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="flex items-center justify-center gap-2 py-14 text-[13px] text-muted-foreground">
            <Loader2 size={15} className="animate-spin" /> Loading conditions…
          </p>
        ) : isError ? (
          <p className="flex items-start gap-2 px-5 py-5 text-[12.5px] text-rose-600">
            <AlertCircle size={15} className="mt-0.5" /> {promotionErrorMessage(error, 'The conditions could not be loaded.')}
          </p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-[12.5px] text-muted-foreground">No conditions match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead>
                <tr className="border-b border-surface text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 font-semibold">Condition</th>
                  <th className="px-3 py-2.5 font-semibold">Reads</th>
                  <th className="px-3 py-2.5 font-semibold">Type · operators</th>
                  <th className="px-3 py-2.5 font-semibold">Values from</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const staticCount = d.values.filter((v) => v.isActive).length;
                  return (
                    <tr key={d.id} className={`border-b border-surface last:border-0 ${d.isActive ? '' : 'opacity-60'}`}>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[12.5px] font-semibold text-main">{d.name}</span>
                          {d.isSystem && <SystemPill />}
                        </span>
                        <span className="block font-mono text-[11px] text-muted-foreground">{d.code}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-1.5">
                          <ScopePill scope={d.scope} />
                          <span className={`font-mono text-[11.5px] ${d.factKey.startsWith('request.') ? 'text-amber-700 dark:text-amber-300' : 'text-main'}`}>
                            {d.factKey}
                          </span>
                        </span>
                        {d.factKey.startsWith('request.') && (
                          <span className="block text-[10.5px] text-muted-foreground">Custom attribute, sent by the caller</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[12px] font-semibold text-main">{d.valueType}</span>
                        <span className="block text-[10.5px] text-muted-foreground">{d.operators.map(operatorLabel).join(' · ') || '—'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[12px] font-medium text-main">{SOURCE_LABEL[d.valueSource] ?? d.valueSource}</span>
                        <span className="block max-w-[220px] truncate font-mono text-[10.5px] text-muted-foreground">
                          {d.valueSource === 'Static' ? `${staticCount} value${staticCount === 1 ? '' : 's'}${staticCount ? ' · enforced' : ' · any value'}` : d.sourceKey ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill active={d.isActive} />
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditing(d)}
                            className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11.5px] font-medium text-main hover:bg-accent/50"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            onClick={() => setToggling(d)}
                            className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11.5px] font-medium ${
                              d.isActive ? 'text-rose-600 hover:bg-rose-500/10' : 'text-emerald-600 hover:bg-emerald-500/10'
                            }`}
                          >
                            <Power size={12} /> {d.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && <ConditionDialog key={editing === 'new' ? 'new' : editing.id} definition={editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={toggling !== null}
        tone={toggling?.isActive ? 'danger' : 'primary'}
        title={toggling?.isActive ? `Deactivate ${toggling?.name}?` : `Activate ${toggling?.name}?`}
        body={
          toggling?.isActive
            ? `It can no longer be used in new or edited promotions. Live promotions that already use it keep evaluating.${
                toggling.isSystem ? ' This is a system condition that shipped promotions use.' : ''
              }`
            : 'It will be offered again in the rule builder.'
        }
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Activate'}
        onConfirm={confirmToggle}
        onCancel={() => setToggling(null)}
      />
    </>
  );
}
