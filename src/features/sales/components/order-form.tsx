'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/feedback/feedback';
import { ActionButton } from '@/components/layout/page-header';
import { SelectField, TextArea, TextField } from '@/components/forms/form';
import { formatCurrency } from '@/lib/formatting';
import { isoDate } from '@/lib/utilities/demo-clock';
import { crmDepotById } from '@/features/depots/data/crm';
import { documentTotal, salesReps, tradingDepots } from '../data/lines';
import { ORDER_STATUSES, PAYMENT_STATUSES, type SalesOrder } from '../data/orders';
import { orderActions, type OrderDraft } from '../store';
import { LineItemsEditor } from './line-items';

type Errors = Partial<Record<'depotId' | 'repId' | 'date' | 'deliveryDate' | 'discount' | 'lines', string>>;

const depotOptions = tradingDepots
  .map((d) => ({ value: d.id, label: `${d.name} — ${d.province}` }))
  .sort((a, b) => a.label.localeCompare(b.label));
const repOptions = salesReps.map((r) => ({ value: r.id, label: `${r.name} (${r.team})` }));

function emptyDraft(): OrderDraft {
  return {
    depotId: '',
    repId: '',
    date: isoDate(0),
    deliveryDate: isoDate(3),
    status: 'Pending',
    payment: 'Unpaid',
    discount: 0,
    lines: [],
    notes: '',
  };
}

/** Create / edit an order. `order` null means create. */
export function OrderFormModal({
  open,
  order,
  onClose,
  onSaved,
}: {
  open: boolean;
  order: SalesOrder | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const [draft, setDraft] = useState<OrderDraft>(emptyDraft);
  const [discount, setDiscount] = useState('0');
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    const next = order
      ? {
          depotId: order.depotId,
          repId: order.repId,
          date: order.date,
          deliveryDate: order.deliveryDate,
          status: order.status,
          payment: order.payment,
          discount: order.discount,
          lines: order.lines,
          notes: order.notes,
        }
      : emptyDraft();
    setDraft(next);
    setDiscount(String(next.discount));
    setErrors({});
  }, [open, order]);

  const set = <K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const total = useMemo(() => documentTotal(draft.lines, Number(discount) || 0), [draft.lines, discount]);

  const submit = () => {
    const e: Errors = {};
    const pct = Number(discount);
    if (!draft.depotId) e.depotId = 'Choose the depot placing the order.';
    if (!draft.repId) e.repId = 'Choose the responsible sales rep.';
    if (!draft.date) e.date = 'Order date is required.';
    if (draft.deliveryDate && draft.date && draft.deliveryDate < draft.date) e.deliveryDate = 'Delivery cannot be before the order date.';
    if (discount.trim() === '' || Number.isNaN(pct) || pct < 0 || pct > 20) e.discount = 'Enter a discount between 0 and 20%.';
    if (draft.lines.length === 0) e.lines = 'Add at least one product line.';
    else if (draft.lines.some((l) => l.qty <= 0)) e.lines = 'Every line needs a quantity above zero.';
    setErrors(e);
    if (Object.keys(e).length) return;

    const final = { ...draft, discount: pct };
    if (order) {
      orderActions.update(order.id, final);
      toast.success('Order updated', { description: `${order.id} · ${formatCurrency(total)}` });
      onSaved?.(order.id);
    } else {
      const created = orderActions.create(final);
      toast.success('Order created', { description: `${created.id} for ${created.customer}` });
      onSaved?.(created.id);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={ShoppingCart}
      title={order ? `Edit ${order.id}` : 'New order'}
      subtitle={order ? order.customer : 'Raise a sales order against a depot'}
      width="w-[min(720px,calc(100vw-32px))]"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12px] text-muted-foreground">
            Total <span className="text-[14px] font-bold text-main tabular-nums">{formatCurrency(total)}</span>
          </span>
          <div className="flex items-center gap-2">
            <ActionButton onClick={onClose}>Cancel</ActionButton>
            <ActionButton icon={Save} tone="primary" onClick={submit}>
              {order ? 'Save changes' : 'Create order'}
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
            // Default the rep to the depot's account owner.
            const owner = crmDepotById[v]?.repId;
            if (owner) set('repId', owner);
          }}
        />
        <SelectField label="Sales rep" required value={draft.repId} options={repOptions} error={errors.repId} onChange={(v) => set('repId', v)} />
        <TextField label="Order date" type="date" required value={draft.date} error={errors.date} onChange={(v) => set('date', v)} />
        <TextField label="Delivery date" type="date" value={draft.deliveryDate} error={errors.deliveryDate} onChange={(v) => set('deliveryDate', v)} />
        <SelectField label="Status" value={draft.status} options={ORDER_STATUSES} onChange={(v) => v && set('status', v as OrderDraft['status'])} />
        <SelectField label="Payment" value={draft.payment} options={PAYMENT_STATUSES} onChange={(v) => v && set('payment', v as OrderDraft['payment'])} />
        <TextField label="Discount" prefix="%" value={discount} error={errors.discount} onChange={setDiscount} hint="0–20%; above 10% normally needs approval" full />
      </div>
      <LineItemsEditor lines={draft.lines} onChange={(lines) => set('lines', lines)} error={errors.lines} />
      <TextArea label="Notes" value={draft.notes} onChange={(v) => set('notes', v)} placeholder="Delivery instructions, site contact…" rows={2} />
    </Modal>
  );
}
