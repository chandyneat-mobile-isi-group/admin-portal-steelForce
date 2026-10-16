'use client';

import { EASE } from '@/lib/utilities/motion';
import { Portal } from '@/components/ui/portal';
import { AnimatePresence, motion } from 'framer-motion';
import { X, type LucideIcon } from 'lucide-react';
import { useEffect } from 'react';

interface DrawerPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: string;
  width?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * The right-hand drawer shared by stop details and the plan summary. Owns the
 * scrim, the escape key and body scroll locking so callers only pass content.
 */
export function DrawerPanel({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  accent = '#004A98',
  width = 'w-full sm:w-[420px] lg:w-[460px]',
  children,
  footer,
}: DrawerPanelProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 34, stiffness: 320 }}
            className={`fixed top-0 right-0 h-full ${width} bg-card-surface border-l border-surface z-[61] flex flex-col shadow-2xl`}
          >
            <header className="flex items-start gap-3 px-5 py-4 border-b border-surface flex-shrink-0">
              {Icon && (
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accent}1A` }}
                >
                  <Icon size={18} style={{ color: accent }} strokeWidth={2} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-bold text-main truncate">{title}</h2>
                {subtitle && <p className="text-[11.5px] text-muted-foreground truncate">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-main hover:bg-accent/50 transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.35, ease: EASE }}
                className="space-y-6"
              >
                {children}
              </motion.div>
            </div>

            {footer && (
              <footer className="px-5 py-4 border-t border-surface flex-shrink-0 bg-card-surface">
                {footer}
              </footer>
            )}
          </motion.aside>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** Labelled block used inside drawers to group related fields. */
export function DrawerSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function FieldRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-surface last:border-0">
      {Icon && <Icon size={13} className="text-muted-foreground mt-0.5 flex-shrink-0" />}
      <span className="text-[11.5px] text-muted-foreground flex-shrink-0 w-28">{label}</span>
      <span className="text-[12px] font-medium text-main text-right ml-auto min-w-0 break-words">
        {value}
      </span>
    </div>
  );
}
