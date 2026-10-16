'use client';

/**
 * Promotion types — the "Type" every promotion is filed under.
 *
 * Deactivating never deletes: promotions that already use a type keep it, it just
 * stops being offered for new ones.
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertCircle, Loader2, Pencil, Plus, Power, Search, Shapes } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/feedback/feedback';
import {
  byCatalogOrder,
  promotionErrorMessage,
  usePromotionTypes,
  useSavePromotionType,
  useSetPromotionTypeStatus,
  type PromotionTypeDto,
} from '@/features/promotions';
import { TypeDialog } from '@/features/promotions/config/type-dialog';
import { StatusPill, SystemPill } from '@/features/promotions/config/pills';

export default function PromotionTypesPage() {
  const { data, isLoading, isError, error } = usePromotionTypes(true);
  const setStatus = useSetPromotionTypeStatus();
  const save = useSavePromotionType();

  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [editing, setEditing] = useState<PromotionTypeDto | 'new' | null>(null);
  const [toggling, setToggling] = useState<PromotionTypeDto | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...(data ?? [])]
      .filter((t) => showInactive || t.isActive)
      .filter((t) => !term || t.code.toLowerCase().includes(term) || t.name.toLowerCase().includes(term))
      .sort(byCatalogOrder);
  }, [data, search, showInactive]);

  const activeCount = (data ?? []).filter((t) => t.isActive).length;

  const saveOrder = (type: PromotionTypeDto, value: string) => {
    const sortOrder = Number(value);
    if (!Number.isFinite(sortOrder) || sortOrder === type.sortOrder) return;
    save.mutate(
      { id: type.id, data: { name: type.name, description: type.description ?? null, feedKind: type.feedKind, sortOrder } },
      { onError: (err) => toast.error(promotionErrorMessage(err, 'Could not change the order.')) }
    );
  };

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
            placeholder="Search code or name"
            className="h-9 w-full rounded-xl border border-surface bg-card pl-9 pr-3 text-[12.5px]"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive
        </label>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl gradient-primary px-3.5 text-[12.5px] font-semibold text-white"
        >
          <Plus size={14} /> New type
        </button>
      </div>

      <Card className="overflow-hidden rounded-card border-surface p-0 card-shadow">
        <div className="flex items-center gap-2.5 border-b border-surface px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shapes size={15} />
          </span>
          <div>
            <p className="text-[14px] font-bold text-main">Promotion types</p>
            <p className="text-[11.5px] text-muted-foreground">
              {activeCount} active of {data?.length ?? 0} · offered in the promotion form and list filter
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="flex items-center justify-center gap-2 py-14 text-[13px] text-muted-foreground">
            <Loader2 size={15} className="animate-spin" /> Loading types…
          </p>
        ) : isError ? (
          <p className="flex items-start gap-2 px-5 py-5 text-[12.5px] text-rose-600">
            <AlertCircle size={15} className="mt-0.5" /> {promotionErrorMessage(error, 'The types could not be loaded.')}
          </p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-[12.5px] text-muted-foreground">No types match.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-surface text-[10.5px] uppercase tracking-wider text-muted-foreground">
                  <th className="w-20 px-5 py-2.5 font-semibold">Order</th>
                  <th className="px-3 py-2.5 font-semibold">Type</th>
                  <th className="px-3 py-2.5 font-semibold">Feed group</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Promotions</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className={`border-b border-surface last:border-0 ${t.isActive ? '' : 'opacity-60'}`}>
                    <td className="px-5 py-3">
                      <input
                        key={`${t.id}-${t.sortOrder}`}
                        type="number"
                        defaultValue={t.sortOrder}
                        onBlur={(e) => saveOrder(t, e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                        aria-label={`Sort order for ${t.name}`}
                        className="h-8 w-14 rounded-md border border-surface bg-transparent px-2 text-[12px] tabular-nums"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[12.5px] font-semibold text-main">{t.name}</span>
                        {t.isSystem && <SystemPill />}
                      </span>
                      <span className="block font-mono text-[11px] text-muted-foreground">{t.code}</span>
                      {t.description && <span className="mt-0.5 block max-w-md truncate text-[11px] text-muted-foreground">{t.description}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-main">{t.feedKind}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-[12.5px] font-semibold tabular-nums text-main">{t.promotionCount}</td>
                    <td className="px-3 py-3">
                      <StatusPill active={t.isActive} />
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditing(t)}
                          className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11.5px] font-medium text-main hover:bg-accent/50"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => setToggling(t)}
                          className={`inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[11.5px] font-medium ${
                            t.isActive ? 'text-rose-600 hover:bg-rose-500/10' : 'text-emerald-600 hover:bg-emerald-500/10'
                          }`}
                        >
                          <Power size={12} /> {t.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && <TypeDialog key={editing === 'new' ? 'new' : editing.id} type={editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={toggling !== null}
        tone={toggling?.isActive ? 'danger' : 'primary'}
        title={toggling?.isActive ? `Deactivate ${toggling?.name}?` : `Activate ${toggling?.name}?`}
        body={
          toggling?.isActive
            ? `${toggling.promotionCount} promotion${toggling.promotionCount === 1 ? '' : 's'} use this type; they keep it. It just stops being offered for new promotions.${
                toggling.isSystem ? ' This is a system type that shipped promotions use.' : ''
              }`
            : 'It will be offered again when creating promotions.'
        }
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Activate'}
        onConfirm={confirmToggle}
        onCancel={() => setToggling(null)}
      />
    </>
  );
}
