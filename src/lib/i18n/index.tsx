'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import en from '@/locales/en/common.json';
import km from '@/locales/km/common.json';

export type Locale = 'en' | 'km';

type Dict = Record<string, string>;
const dictionaries: Record<Locale, Dict> = { en, km };

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  formatNumber: (n: number, opts?: Intl.NumberFormatOptions) => string;
  formatCurrency: (n: number, currency?: string) => string;
  formatDate: (d: Date | string, opts?: Intl.DateTimeFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'steelforce-locale';

function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'km') return stored;
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(getInitialLocale());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
    document.body.classList.toggle('font-khmer', locale === 'km');
  }, [locale, mounted]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = dictionaries[locale] || dictionaries.en;
      let str = dict[key] ?? dictionaries.en[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return str;
    },
    [locale]
  );

  const formatNumber = useCallback(
    (n: number, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale === 'km' ? 'km-KH' : 'en-US', opts).format(n),
    [locale]
  );

  const formatCurrency = useCallback(
    (n: number, currency = 'USD') => {
      if (locale === 'km') {
        return `${new Intl.NumberFormat('km-KH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ដុល្លារ`;
      }
      return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);
    },
    [locale]
  );

  const formatDate = useCallback(
    (d: Date | string, opts?: Intl.DateTimeFormatOptions) => {
      const date = typeof d === 'string' ? new Date(d) : d;
      return new Intl.DateTimeFormat(locale === 'km' ? 'km-KH' : 'en-US', opts || { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
    },
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, formatNumber, formatCurrency, formatDate }),
    [locale, setLocale, t, formatNumber, formatCurrency, formatDate]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
