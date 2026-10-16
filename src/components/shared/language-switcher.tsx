'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useI18n, type Locale } from '@/lib/i18n';

const languages: { code: Locale; flag: string; labelKey: string }[] = [
  { code: 'en', flag: '🇺🇸', labelKey: 'language.english' },
  { code: 'km', flag: '🇰🇭', labelKey: 'language.khmer' },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const current = languages.find((l) => l.code === locale)!;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={t('language.label')}
        aria-expanded={open}
        className="flex items-center gap-2 h-10 px-2.5 rounded-xl text-muted-foreground hover:text-primary hover:bg-accent/50 transition-all duration-200"
      >
        <Globe size={18} strokeWidth={1.8} />
        <span className="text-[12px] font-semibold hidden sm:inline">{current.flag}</span>
        <ChevronDown size={14} className={`hidden sm:block transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-12 w-48 glass rounded-2xl card-shadow p-2 z-50"
              role="menu"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-2">
                {t('language.label')}
              </p>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLocale(lang.code);
                    setOpen(false);
                  }}
                  role="menuitem"
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    locale === lang.code
                      ? 'bg-accent/50 text-primary'
                      : 'text-muted-foreground hover:bg-accent/30 hover:text-primary'
                  }`}
                >
                  <span className="text-[16px]">{lang.flag}</span>
                  <span className="text-[13px] font-medium flex-1 text-left">{t(lang.labelKey)}</span>
                  {locale === lang.code && <Check size={15} className="text-primary" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
