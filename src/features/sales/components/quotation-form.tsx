'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/feedback/feedback';
import { ActionButton } from '@/components/layout/page-header';
import { SelectField, TextArea, TextField } from '@/components/forms/form';
import { formatCurrency } from '@/lib/formatting';
import { isoDate } from '@/lib/utilities/demo-clock';
import { crmDepotById } from '@/features/depots/data/crm';
import { documentTotal, salesReps, tradingDepots } from '../data/lines';
import { QUOTATION_STATUSES, type Quotation } from '../data/quotations';
import { quotationActions, type QuotationDraft } from '../store';
import { LineItemsEditor } from './line-items';

type Errors = Partial<Record<'depotId' | 'repId' | 'closing' | 'discount' | 'lines', string>>;

const depotOptions = tradingDepots
  .map((d) => ({ value: d.id, label: `${d.name} — ${d.province}` }))
  .sort((a, b) => a.label.localeCompare(b.label));
const repOptions = salesReps.map((r) => ({ value: r.id, label: `${r.name} (${r.team})` }));

function emptyDraft(): QuotationDraft {
  return { depotId: '', repId: '', closing: isoDate(14), status: 'Draft', discount: 0, lines: [], notes: '' };
}

export function QuotationFormModal({
  open,
  quotation,
  onClose,
}: {
  open: boolean;
  quotation: Quotation | null;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<QuotationDraft>(emptyDraft);
  const [discount, setDiscount] = useState('0');
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    const next = quotation
      ? {
          depotId: quotation.depotId,
          repId: quotation.repId,
          closing: quotation.closing,
          status: quotation.status,
          discount: quotation.discount,
          lines: quotation.lines,
          notes: quotation.notes,
        }
      : emptyDraft();
    setDraft(next);
    setDiscount(String(next.discount));
    setErrors({});
  }, [open, quotation]);

  const set = <K extends keyof QuotationDraft>(key: K, value: QuotationDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const total = useMemo(() => documentTotal(draft.lines, Number(discount) || 0), [draft.lines, discount]);

  const submit = () => {
    const e: Errors = {};
    const pct = Number(discount);
    if (!draft.depotId) e.depotId = 'Choose the depot this quotation is for.';
    if (!draft.repId) e.repId = 'Choose the sales rep.';
    if (!draft.closing) e.closing = 'Closing date is required.';
    else if (!quotation && draft.closing < isoDate(0)) e.closing = 'Closing date cannot be in the past.';
    if (discount.trim() === '' || Number.isNaN(pct) || pct < 0 || pct > 25) e.discount = 'Enter a discount between 0 and 25%.';
    if (draft.lines.length === 0) e.lines = 'Add at least one product line.';
    else if (draft.lines.some((l) => l.qty <= 0)) e.lines = 'Every line needs a quantity above zero.';
    setErrors(e);
    if (Object.keys(e).length) return;

    const final = { ...draft, discount: pct };
    if (quotation) {
      quotationActions.update(quotation.id, final);
      toast.success('Quotation updated', { description: `${quotation.id} · ${formatCurrency(total)}` });
    } else {
      const created = quotationActions.create(final, isoDate(0));
      toast.success('Quotation created', { description: `${created.id} for ${created.customer}` });
    }
    onClose();
  };

  // A new quotation starts as Draft or goes straight to approval; later stages come from the board.
  const statusOptions = quotation ? QUOTATION_STATUSES.filter((s) => s !== 'Converted' || quotation.status === 'Converted') : (['Draft', 'Pending'] as const);

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={FileText}
      title={quotation ? `Edit ${quotation.id}` : 'New quotation'}
      subtitle={quotation ? quotation.customer : 'Price a set of materials for a depot'}
      width="w-[min(720px,calc(100vw-32px))]"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-muted-foreground">
            Total <span className="text-[14px] font-bold text-main tabular-nums">{formatCurrency(total)}</span>
          </span>
          <div className="flex items-center gap-2">
            <ActionButton onClick={onClose}>Cancel</ActionButton>
            <ActionButton icon={Save} tone="primary" onClick={submit}>
              {quotation ? 'Save changes' : 'Create quotation'}
            </ActionButton>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField
          label="Depot"
          required
          value={draft.depotId}
          options={depotOptions}
          error={errors.depotId}
          onChange={(v) => {
            set('depotId', v);
            const owner = crmDepotById[v]?.repId;
            if (owner) set('repId', owner);
          }}
        />
        <SelectField label="Sales rep" required value={draft.repId} options={repOptions} error={errors.repId} onChange={(v) => set('repId', v)} />
        <TextField label="Closing date" type="date" required value={draft.closing} error={errors.closing} onChange={(v) => set('closing', v)} />
        <SelectField label="Status" value={draft.status} options={statusOptions} onChange={(v) => v && set('status', v as QuotationDraft['status'])} />
        <TextField label="Discount" prefix="%" value={discount} error={errors.discount} onChange={setDiscount} hint="Above 10% routes to Level 2 approval" full />
      </div>
      <LineItemsEditor lines={draft.lines} onChange={(lines) => set('lines', lines)} error={errors.lines} />
      <TextArea label="Notes" value={draft.notes} onChange={(v) => set('notes', v)} placeholder="Project, validity, delivery terms…" rows={2} />
    </Modal>
  );
}
