'use client';

import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatting';
import { lineFor, productById, sellableProducts, subtotal, type DocumentLine } from '../data/lines';

const CELL_INPUT =
  'h-9 w-full rounded-xl border border-surface bg-background/50 px-2.5 text-[12.5px] text-main focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10';

/** Editable line items for the order and quotation forms. */
export function LineItemsEditor({
  lines,
  onChange,
  error,
}: {
  lines: DocumentLine[];
  onChange: (lines: DocumentLine[]) => void;
  error?: string;
}) {
  const setLine = (index: number, next: DocumentLine) => onChange(lines.map((l, i) => (i === index ? next : l)));

  const addLine = () => {
    const used = new Set(lines.map((l) => l.productId));
    const product = sellableProducts.find((p) => !used.has(p.id)) ?? sellableProducts[0];
    onChange([...lines, lineFor(product, 1)]);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-semibold text-main">Line items</span>
        <button
          type="button"
          onClick={addLine}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
        >
          <Plus size={13} /> Add line
        </button>
      </div>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={`${line.productId}-${i}`} className="grid grid-cols-[minmax(0,1fr)_80px_90px_32px] gap-2 items-center">
            <select
              aria-label={`Product for line ${i + 1}`}
              value={line.productId}
              onChange={(e) => {
                const product = productById[e.target.value];
                if (product) setLine(i, lineFor(product, line.qty));
              }}
              className={CELL_INPUT}
            >
              {sellableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name} ({formatCurrency(p.price)}/{p.unit})
                </option>
              ))}
            </select>
            <input
              aria-label={`Quantity for line ${i + 1}`}
              type="number"
              min={1}
              value={line.qty || ''}
              onChange={(e) => setLine(i, { ...line, qty: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
              className={`${CELL_INPUT} text-right tabular-nums`}
            />
            <span className="text-right text-[12px] font-semibold text-main tabular-nums">
              {formatCurrency(line.qty * line.unitPrice)}
            </span>
            <button
              type="button"
              aria-label={`Remove line ${i + 1}`}
              onClick={() => onChange(lines.filter((_, j) => j !== i))}
              className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {lines.length === 0 && (
          <p className="text-[12px] text-muted-foreground py-3 text-center rounded-xl border border-dashed border-surface">
            No lines yet — add at least one product.
          </p>
        )}
      </div>
      {error && <p className="mt-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>}
      <p className="mt-2 text-right text-[12px] text-muted-foreground">
        Subtotal <span className="font-semibold text-main tabular-nums">{formatCurrency(subtotal(lines))}</span>
      </p>
    </div>
  );
}

/** Read-only line table for detail drawers. */
export function LineItemsTable({ lines, discount, total }: { lines: DocumentLine[]; discount: number; total: number }) {
  return (
    <div className="rounded-card border border-surface overflow-hidden">
      <table className="w-full text-[11.5px]">
        <thead>
          <tr className="bg-muted/30 border-b border-surface text-muted-foreground">
            <th className="text-left px-3 py-2 font-semibold">Product</th>
            <th className="text-right px-3 py-2 font-semibold">Qty</th>
            <th className="text-right px-3 py-2 font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.productId} className="border-b border-surface last:border-0">
              <td className="px-3 py-2">
                <span className="block font-medium text-main">{l.name}</span>
                <span className="block text-[10.5px] text-muted-foreground">
                  {l.code} · {formatCurrency(l.unitPrice)}/{l.unit}
                </span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-main">
                {l.qty.toLocaleString()} {l.unit}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-main">{formatCurrency(l.qty * l.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-surface bg-muted/20">
            <td className="px-3 py-2 text-muted-foreground" colSpan={2}>
              Subtotal · discount {discount}%
            </td>
            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(subtotal(lines))}</td>
          </tr>
          <tr className="bg-muted/20">
            <td className="px-3 py-2 font-semibold text-main" colSpan={2}>
              Total
            </td>
            <td className="px-3 py-2 text-right tabular-nums font-bold text-main">{formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
