'use client';

import { AppLayout } from '@/lib/utilities/layout';
import { motion } from 'framer-motion';
import { Download, Plus, Upload, type LucideIcon } from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Title block at the top of a module page.
 *
 * The app header already names the section; this answers "what is this page
 * for" in one line and puts the page's primary actions where the eye lands
 * after reading it.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  meta,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex flex-wrap items-start justify-between gap-4"
    >
      <div className="min-w-0">
        <h1 className="text-[19px] font-bold text-main tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed max-w-[64ch]">
            {subtitle}
          </p>
        )}
        {meta && <div className="flex flex-wrap items-center gap-2 mt-2.5">{meta}</div>}
      </div>
      {actions && (
        <div className={`flex flex-wrap items-center ${AppLayout.controls}`}>{actions}</div>
      )}
    </motion.header>
  );
}

type ButtonTone = 'primary' | 'default' | 'danger';

const TONE: Record<ButtonTone, string> = {
  primary: 'gradient-primary text-white shadow-lg shadow-blue-500/20 border-transparent',
  default: 'border-surface text-main hover:bg-accent/50',
  danger: 'border-surface text-rose-600 dark:text-rose-400 hover:bg-rose-500/10',
};

/** The module-page button. One size, three tones, so pages don't invent their own. */
export function ActionButton({
  children,
  icon: Icon,
  tone = 'default',
  onClick,
  disabled,
  type = 'button',
  title,
}: {
  children?: React.ReactNode;
  icon?: LucideIcon;
  tone?: ButtonTone;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  title?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-[12.5px] font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${TONE[tone]}`}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

/** The Add / Import / Export trio most list pages carry. */
export function StandardActions({
  addLabel,
  onAdd,
  onImport,
  onExport,
}: {
  addLabel: string;
  onAdd?: () => void;
  onImport?: () => void;
  onExport?: () => void;
}) {
  return (
    <>
      {onImport && (
        <ActionButton icon={Upload} onClick={onImport}>
          Import
        </ActionButton>
      )}
      {onExport && (
        <ActionButton icon={Download} onClick={onExport}>
          Export
        </ActionButton>
      )}
      {onAdd && (
        <ActionButton icon={Plus} tone="primary" onClick={onAdd}>
          {addLabel}
        </ActionButton>
      )}
    </>
  );
}
