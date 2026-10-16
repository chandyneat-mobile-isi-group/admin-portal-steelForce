'use client';

import { DrawerPanel, DrawerSection, FieldRow } from '@/components/shared/drawer-panel';
import { MetaPill, ProgressBar, StatusPill, type Tone } from '@/components/shared/status-pill';
import { ActionButton } from '@/components/layout/page-header';
import {
  WAREHOUSES,
  categoryPath,
  products,
  stock,
  stockStatus,
  type Product,
  type ProductStatus,
  type StockRow,
} from '@/features/materials/data/catalog';
import { formatCurrency, formatDate } from '@/lib/formatting';
import { FileText, Package, ShoppingCart, Warehouse } from 'lucide-react';
import { useMemo } from 'react';

export const PRODUCT_TONE: Record<ProductStatus, Tone> = {
  Active: 'positive',
  'Low Stock': 'warning',
  'Out of Stock': 'critical',
  Discontinued: 'neutral',
};

const STOCK_TONE: Record<string, Tone> = {
  'In Stock': 'positive',
  'Low Stock': 'warning',
  'Out of Stock': 'critical',
  'On Order': 'info',
};

/** Product record: specification, price, stock by location and related lines. */
export function ProductDrawer({
  product,
  onClose,
  onAction,
  stockRows = stock,
}: {
  product: Product | null;
  onClose: () => void;
  onAction?: (action: string, product: Product) => void;
  /** Current stock; defaults to the seed when the caller has no live inventory. */
  stockRows?: StockRow[];
}) {
  const rows = useMemo(
    () => (product ? stockRows.filter((s) => s.productId === product.id) : []),
    [product, stockRows]
  );

  const related = useMemo(
    () =>
      product
        ? products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4)
        : [],
    [product]
  );

  if (!product) {
    return (
      <DrawerPanel open={false} onClose={onClose} title="">
        {null}
      </DrawerPanel>
    );
  }

  const available = rows.reduce((sum, s) => sum + s.available, 0);
  const margin = Math.round(((product.price - product.cost) / product.price) * 100);

  return (
    <DrawerPanel
      open
      onClose={onClose}
      title={product.name}
      subtitle={`${product.code} · ${product.brand}`}
      icon={Package}
      width="w-full sm:w-[460px] lg:w-[520px]"
      footer={
        <div className="grid grid-cols-2 gap-2">
          <ActionButton icon={FileText} onClick={() => onAction?.('quote', product)}>
            Add to quotation
          </ActionButton>
          <ActionButton icon={ShoppingCart} tone="primary" onClick={() => onAction?.('order', product)}>
            Add to order
          </ActionButton>
        </div>
      }
    >
      {/* Product image stands in as a tinted plate — no stock photography in a demo */}
      <div
        className="h-32 rounded-card flex items-center justify-center border border-surface"
        style={{
          background: `linear-gradient(135deg, hsl(${product.hue}, 55%, 92%) 0%, hsl(${(product.hue + 30) % 360}, 55%, 84%) 100%)`,
        }}
      >
        <Package size={38} className="text-white/80" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill label={product.status} tone={PRODUCT_TONE[product.status]} />
        <MetaPill label={categoryPath(product.categoryId)} />
        <MetaPill label={`Per ${product.unit}`} />
      </div>

      <p className="text-[12px] text-muted-foreground leading-relaxed">{product.description}</p>

      <div className="grid grid-cols-3 gap-2">
        <Tile label="Selling price" value={formatCurrency(product.price)} />
        <Tile label="Margin" value={`${margin}%`} />
        <Tile label="Available" value={available.toLocaleString()} />
      </div>

      <DrawerSection title="Specifications">
        <div className="rounded-card border border-surface px-3">
          {product.specs.map((spec) => (
            <FieldRow key={spec.label} label={spec.label} value={spec.value} />
          ))}
          <FieldRow label="Last updated" value={formatDate(product.updatedAt)} />
        </div>
      </DrawerSection>

      <DrawerSection title="Pricing">
        <div className="rounded-card border border-surface px-3">
          <FieldRow label="Selling price" value={`${formatCurrency(product.price)} / ${product.unit}`} />
          <FieldRow label="Cost price" value={`${formatCurrency(product.cost)} / ${product.unit}`} />
          <FieldRow label="Gross margin" value={`${margin}%`} />
        </div>
      </DrawerSection>

      <DrawerSection title={`Availability by location (${rows.length})`}>
        <div className="space-y-1.5">
          {rows.map((row) => {
            const wh = WAREHOUSES.find((w) => w.id === row.warehouseId);
            const status = stockStatus(row);
            const pct = row.reorderLevel
              ? Math.min(100, (row.available / (row.reorderLevel * 3)) * 100)
              : 0;
            return (
              <div key={row.id} className="p-3 rounded-card border border-surface">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <Warehouse size={13} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-[12px] font-medium text-main truncate">{wh?.name}</span>
                  </span>
                  <StatusPill size="sm" label={status} tone={STOCK_TONE[status]} />
                </div>
                <div className="flex items-center justify-between text-[10.5px] text-muted-foreground mt-2 mb-1.5 tabular-nums">
                  <span>{row.available.toLocaleString()} available</span>
                  <span>
                    {row.reserved.toLocaleString()} reserved · reorder at{' '}
                    {row.reorderLevel.toLocaleString()}
                  </span>
                </div>
                <ProgressBar
                  value={pct}
                  tone={status === 'Out of Stock' ? 'critical' : status === 'Low Stock' ? 'warning' : 'positive'}
                />
              </div>
            );
          })}
          {rows.length === 0 && (
            <p className="text-[11.5px] text-muted-foreground text-center py-4">
              Not carried at any depot
            </p>
          )}
        </div>
      </DrawerSection>

      <DrawerSection title="Sales history">
        <div className="rounded-card border border-surface px-3">
          <FieldRow label="Sold (12 months)" value={`${product.soldYtd.toLocaleString()} ${product.unit}`} />
          <FieldRow label="Revenue (12 months)" value={formatCurrency(product.price * product.soldYtd)} />
          <FieldRow label="Average per month" value={`${Math.round(product.soldYtd / 12).toLocaleString()} ${product.unit}`} />
        </div>
      </DrawerSection>

      <DrawerSection title="Related products">
        <div className="space-y-1.5">
          {related.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 p-2.5 rounded-card border border-surface">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `hsl(${p.hue}, 55%, 92%)` }}
              >
                <Package size={13} className="text-slate-600" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-medium text-main truncate">{p.name}</span>
                <span className="block text-[10px] text-muted-foreground">{p.code}</span>
              </span>
              <span className="text-[11.5px] font-semibold text-main tabular-nums flex-shrink-0">
                {formatCurrency(p.price)}
              </span>
            </div>
          ))}
        </div>
      </DrawerSection>
    </DrawerPanel>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-surface p-2.5">
      <p className="text-[9.5px] text-muted-foreground mb-1">{label}</p>
      <p className="text-[13px] font-bold text-main tabular-nums truncate">{value}</p>
    </div>
  );
}
