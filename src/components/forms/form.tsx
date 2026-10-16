'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, ChevronDown, type LucideIcon } from 'lucide-react';
import { useId } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Form primitives.
 *
 * Validation state is always announced twice — a red border and a message tied
 * to the field with `aria-describedby` — so an error is never colour-only.
 */

export function FormSection({
  title,
  description,
  icon: Icon,
  step,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  step?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-surface bg-card p-6">
      <div className="flex items-start gap-3 mb-5">
        {(Icon || step) && (
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            {Icon ? (
              <Icon size={16} className="text-primary" />
            ) : (
              <span className="text-[12px] font-bold text-primary tabular-nums">{step}</span>
            )}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-[14px] font-bold text-main">{title}</h2>
          {description && (
            <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

const CONTROL =
  'w-full h-10 px-3 rounded-xl bg-background/60 border text-[12.5px] text-main placeholder:text-muted-foreground focus:outline-none focus:bg-card focus:ring-4 transition-all duration-200 disabled:opacity-60';

function controlTone(error?: string) {
  return error
    ? 'border-rose-500/50 focus:border-rose-500/60 focus:ring-rose-500/10'
    : 'border-surface focus:border-primary/40 focus:ring-primary/10';
}

function Wrapper({
  id,
  label,
  required,
  hint,
  error,
  full,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="block text-[12px] font-medium text-main mb-1.5">
        {label}
        {required && (
          <span className="text-rose-500 ml-0.5" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      <AnimatePresence>
        {error ? (
          <motion.p
            id={`${id}-error`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 mt-1.5 overflow-hidden"
          >
            <AlertCircle size={11} className="flex-shrink-0" />
            {error}
          </motion.p>
        ) : hint ? (
          <p className="text-[10.5px] text-muted-foreground mt-1.5">{hint}</p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  required,
  error,
  hint,
  placeholder,
  type = 'text',
  full,
  prefix,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
  type?: string;
  full?: boolean;
  prefix?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} required={required} hint={hint} error={error} full={full}>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12.5px] text-muted-foreground pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${CONTROL} ${controlTone(error)} ${prefix ? 'pl-7' : ''}`}
        />
      </div>
    </Wrapper>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  hint,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
  error?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} hint={hint} error={error} full>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${CONTROL} h-auto py-2.5 resize-y ${controlTone(error)}`}
      />
    </Wrapper>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  error,
  hint,
  placeholder = 'Select…',
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[] | ReadonlyArray<{ value: string; label: string }>;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
  full?: boolean;
}) {
  const id = useId();
  const normalised = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  return (
    <Wrapper id={id} label={label} required={required} hint={hint} error={error} full={full}>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${CONTROL} appearance-none pr-9 ${controlTone(error)} ${
            value ? '' : 'text-muted-foreground'
          }`}
        >
          <option value="">{placeholder}</option>
          {normalised.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
      </div>
    </Wrapper>
  );
}

/** Labelled switch. The state is in the thumb position and the label, not colour. */
export function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-surface last:border-0">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-[12.5px] font-medium text-main cursor-pointer">
          {label}
        </label>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-[22px] rounded-full flex-shrink-0 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          checked ? 'gradient-primary' : 'bg-muted'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm flex items-center justify-center"
          style={{ left: checked ? 22 : 3 }}
        >
          {checked && <Check size={9} className="text-primary" strokeWidth={3.5} />}
        </motion.span>
      </button>
    </div>
  );
}

/** Segmented choice — appearance density, view mode, radio-style settings. */
export function SegmentedField({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string; icon?: LucideIcon }>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-surface last:border-0">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-main">{label}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-muted/60 flex-shrink-0" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11.5px] font-medium transition-colors ${
                active ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-main'
              }`}
            >
              {o.icon && <o.icon size={13} />}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
