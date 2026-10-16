'use client';

import { Portal } from '@/components/ui/portal';
import { ActionButton } from '@/components/layout/page-header';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, ServerCrash, type LucideIcon } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Confirmation for destructive or irreversible actions. Portalled so it is
 * never trapped by an animated or transformed ancestor.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  icon: Icon = AlertTriangle,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  icon?: LucideIcon;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onCancel}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90]"
            />
            <div className="fixed inset-0 flex items-center justify-center z-[91] pointer-events-none p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 14 }}
                transition={{ duration: 0.22, ease: EASE }}
                role="alertdialog"
                aria-modal="true"
                aria-label={title}
                className="pointer-events-auto w-[min(400px,calc(100vw-32px))]"
              >
              <div className="bg-card-surface border border-surface rounded-card card-shadow p-5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3.5 ${
                    tone === 'danger' ? 'bg-rose-500/10' : 'bg-primary/10'
                  }`}
                >
                  <Icon
                    size={19}
                    className={
                      tone === 'danger' ? 'text-rose-600 dark:text-rose-400' : 'text-primary'
                    }
                  />
                </div>
                <h2 className="text-[15px] font-bold text-main">{title}</h2>
                <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-relaxed">{body}</p>
                <div className="flex gap-2 mt-5">
                  <button
                    onClick={onCancel}
                    className="flex-1 h-10 rounded-xl border border-surface text-[12.5px] font-semibold text-main hover:bg-accent/50 active:scale-[0.98] transition-all"
                  >
                    {cancelLabel}
                  </button>
                  <button
                    onClick={onConfirm}
                    className={`flex-1 h-10 rounded-xl text-white text-[12.5px] font-semibold active:scale-[0.98] transition-all shadow-lg ${
                      tone === 'danger'
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                        : 'gradient-primary shadow-blue-500/20'
                    }`}
                  >
                    {confirmLabel}
                  </button>
                </div>
              </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** Generic modal shell for create/edit forms. */
export function Modal({
  open,
  title,
  subtitle,
  icon: Icon,
  onClose,
  footer,
  width = 'w-[min(560px,calc(100vw-32px))]',
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onClose: () => void;
  footer?: React.ReactNode;
  width?: string;
  children: React.ReactNode;
}) {
  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90]"
            />
            <div className="fixed inset-0 flex items-center justify-center z-[91] pointer-events-none p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ duration: 0.22, ease: EASE }}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`pointer-events-auto ${width} max-h-[calc(100vh-64px)] flex flex-col`}
              >
              <div className="bg-card-surface border border-surface rounded-card card-shadow flex flex-col overflow-hidden">
                <header className="flex items-start gap-3 px-5 py-4 border-b border-surface flex-shrink-0">
                  {Icon && (
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={17} className="text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[14.5px] font-bold text-main truncate">{title}</h2>
                    {subtitle && (
                      <p className="text-[11.5px] text-muted-foreground truncate">{subtitle}</p>
                    )}
                  </div>
                </header>
                <div className="px-5 py-4 overflow-y-auto space-y-4">{children}</div>
                {footer && (
                  <footer className="px-5 py-4 border-t border-surface flex-shrink-0">
                    {footer}
                  </footer>
                )}
              </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/**
 * Error surface for a section that failed to load. Always offers a way
 * forward — an error with no action is just a dead end.
 */
export function ErrorState({
  title,
  body,
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center py-12 px-6 rounded-card border border-dashed border-surface text-center"
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-3">
        <ServerCrash size={20} className="text-rose-600 dark:text-rose-400" />
      </div>
      <p className="text-[13px] font-semibold text-main">{title ?? t('feedback.error.title')}</p>
      <p className="text-[11.5px] text-muted-foreground mt-1 max-w-[320px] leading-relaxed">
        {body ?? t('feedback.error.body')}
      </p>
      {onRetry && (
        <div className="mt-4">
          <ActionButton icon={RefreshCw} onClick={onRetry}>
            {t('feedback.error.retry')}
          </ActionButton>
        </div>
      )}
    </div>
  );
}
