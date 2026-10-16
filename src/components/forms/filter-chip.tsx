'use client';

import { EASE } from '@/lib/utilities/motion';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface ChipOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Compact select rendered as a pill. Written by hand rather than with the
 * shadcn Select so the closed state can shrink to the label width and the
 * "active" treatment can differ from a plain input.
 */
export function FilterChip({
  label,
  value,
  options,
  icon: Icon,
  onChange,
  allLabel = 'All',
  searchable = false,
}: {
  label: string;
  value: string;
  options: ChipOption[];
  icon?: LucideIcon;
  onChange: (value: string) => void;
  allLabel?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const active = value !== 'All';

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const visible = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 h-9 pl-3 pr-2.5 rounded-xl border text-[12px] font-medium whitespace-nowrap transition-all duration-200 active:scale-[0.97] ${
          active
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-background/60 border-surface text-muted-foreground hover:text-main hover:border-primary/20'
        }`}
      >
        {Icon && <Icon size={13} strokeWidth={2} />}
        <span className="max-w-[130px] truncate">
          {active ? selected?.label ?? value : label}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={13} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="absolute left-0 top-11 z-50 w-60 rounded-2xl glass card-shadow p-1.5 origin-top"
          >
            {searchable && (
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="w-full h-8 px-2.5 mb-1 rounded-lg bg-background/70 border border-surface text-[12px] text-main placeholder:text-muted-foreground focus:outline-none focus:border-primary/30"
              />
            )}
            <div className="max-h-64 overflow-y-auto scrollbar-hide">
              <Option
                label={allLabel}
                selected={value === 'All'}
                onClick={() => {
                  onChange('All');
                  setOpen(false);
                  setQuery('');
                }}
              />
              {visible.map((o) => (
                <Option
                  key={o.value}
                  label={o.label}
                  hint={o.hint}
                  selected={o.value === value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery('');
                  }}
                />
              ))}
              {visible.length === 0 && (
                <p className="px-2.5 py-3 text-[11.5px] text-muted-foreground text-center">No matches</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Option({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors duration-150 ${
        selected ? 'bg-primary/10 text-primary' : 'text-main hover:bg-accent/50'
      }`}
    >
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-medium truncate">{label}</span>
        {hint && <span className="block text-[10px] text-muted-foreground truncate">{hint}</span>}
      </span>
      {selected && <Check size={13} className="flex-shrink-0" />}
    </button>
  );
}

/** Segmented on/off pill used for assignment state and view switches. */
export function ToggleChip({
  label,
  active,
  count,
  onClick,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[12px] font-medium whitespace-nowrap transition-colors duration-200 active:scale-[0.97] ${
        active ? 'text-white' : 'text-muted-foreground hover:text-main'
      }`}
    >
      {active && (
        <motion.span
          layoutId="toggle-chip-bg"
          className="absolute inset-0 rounded-xl gradient-primary"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <span className="relative flex items-center gap-1.5">
        {Icon && <Icon size={13} />}
        {label}
        {typeof count === 'number' && (
          <span
            className={`px-1.5 py-px rounded-md text-[10px] font-bold tabular-nums ${
              active ? 'bg-white/25' : 'bg-muted'
            }`}
          >
            {count}
          </span>
        )}
      </span>
    </button>
  );
}
