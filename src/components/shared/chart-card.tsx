'use client';

import { Card } from '@/components/ui/card';
import { EASE } from '@/lib/utilities/motion';
import { motion } from 'framer-motion';
import { BarChart3, Table2, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
}

/**
 * Chart container with a built-in table twin. Every chart in the module ships
 * its numbers in a WCAG-clean table, so no value is reachable only by colour
 * or only by hovering a mark.
 */
export function ChartCard({
  title,
  subtitle,
  icon: Icon,
  columns,
  rows,
  legend,
  footnote,
  height = 260,
  children,
  delay = 0,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  columns: TableColumn[];
  rows: Array<Record<string, React.ReactNode>>;
  legend?: React.ReactNode;
  footnote?: string;
  height?: number;
  children: React.ReactNode;
  delay?: number;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: EASE }}
    >
      <Card className="p-6 rounded-card border-surface card-shadow h-full flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-[13.5px] font-bold text-main truncate">{title}</h3>
              {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/60 flex-shrink-0">
            <ViewButton active={view === 'chart'} onClick={() => setView('chart')} label="Chart view">
              <BarChart3 size={13} />
            </ViewButton>
            <ViewButton active={view === 'table'} onClick={() => setView('table')} label="Table view">
              <Table2 size={13} />
            </ViewButton>
          </div>
        </div>

        {legend && <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 mt-3">{legend}</div>}

        <div className="flex-1 mt-4" style={{ minHeight: height }}>
          {view === 'chart' ? (
            <div style={{ height }}>{children}</div>
          ) : (
            <div className="overflow-x-auto" style={{ maxHeight: height + 40 }}>
              <table className="w-full text-[11.5px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-surface">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`py-2 px-2 font-semibold text-muted-foreground ${
                          col.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-surface last:border-0">
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`py-2 px-2 text-main ${
                            col.align === 'right' ? 'text-right tabular-nums' : 'text-left'
                          }`}
                        >
                          {row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {footnote && <p className="text-[10.5px] text-muted-foreground mt-3">{footnote}</p>}
      </Card>
    </motion.div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`w-7 h-6 rounded-md flex items-center justify-center transition-colors duration-200 ${
        active ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-main'
      }`}
    >
      {children}
    </button>
  );
}

/** Legend swatch — identity is never colour-alone, so the label is required. */
export function LegendItem({ color, label, value }: { color: string; label: string; value?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
      <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: color }} />
      <span className="text-main font-medium">{label}</span>
      {value && <span className="tabular-nums">{value}</span>}
    </span>
  );
}
