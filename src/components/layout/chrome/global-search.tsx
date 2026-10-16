'use client';

import { ArrowRight, Command, CornerDownLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { isNavGroup, navigationFor } from '@/config/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { authorizeRoute } from '@/lib/auth/authorization';
import { useI18n } from '@/lib/i18n';

/**
 * The portal's global search: a jump-to-page palette.
 *
 * Results are the permission-filtered navigation tree plus the sub-pages that do
 * not have their own menu entry, so it can only offer screens the session may
 * open. ⌘K / Ctrl+K focuses it from anywhere; arrows and Enter navigate.
 */

interface SearchTarget {
  href: string;
  label: string;
  context: string;
  keywords?: string;
}

/** Screens reached from inside a module rather than from the menu. */
const EXTRA_TARGETS: SearchTarget[] = [
  { href: '/notifications', label: 'Notifications', context: 'Account', keywords: 'alerts inbox bell' },
  { href: '/profile', label: 'My profile', context: 'Account', keywords: 'me avatar password' },
  { href: '/planning/board', label: 'Planning board', context: 'Visit Operation', keywords: 'stops kanban assign' },
  { href: '/planning/calendar', label: 'Planning calendar', context: 'Visit Operation', keywords: 'schedule week' },
  { href: '/planning/map', label: 'Route map', context: 'Visit Operation', keywords: 'routes gps' },
  { href: '/planning/call-plans', label: 'Call plans', context: 'Visit Operation', keywords: 'upload import csv' },
  { href: '/planning/plan-vs-actual', label: 'Plan vs actual', context: 'Visit Operation', keywords: 'missed visits' },
  { href: '/planning/schedules', label: 'Rep schedules', context: 'Visit Operation', keywords: 'weekly' },
  { href: '/planning/analytics', label: 'Planning analytics', context: 'Visit Operation' },
  { href: '/materials/inventory', label: 'Inventory', context: 'Materials', keywords: 'stock warehouse low stock' },
  { href: '/materials/categories', label: 'Material categories', context: 'Materials', keywords: 'rebar roofing pipe' },
  { href: '/promotions/configuration/types', label: 'Promotion types', context: 'Promotion Settings' },
  { href: '/promotions/configuration/conditions', label: 'Promotion conditions', context: 'Promotion Settings' },
  { href: '/user-management/users', label: 'Users', context: 'Administration', keywords: 'accounts staff' },
  { href: '/user-management/roles', label: 'Roles', context: 'Administration', keywords: 'permissions access' },
  { href: '/user-management/departments', label: 'Departments', context: 'Administration' },
  { href: '/user-management/activity-logs', label: 'Activity logs', context: 'Administration', keywords: 'audit' },
  { href: '/user-management/login-history', label: 'Login history', context: 'Administration' },
];

export function GlobalSearch({ className = '' }: { className?: string }) {
  const { t } = useI18n();
  const { permissions } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const labelOf = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const targets = useMemo<SearchTarget[]>(() => {
    const fromNav: SearchTarget[] = [];
    navigationFor(permissions).forEach((section) => {
      section.nodes.forEach((node) => {
        if (isNavGroup(node)) {
          node.children.forEach((leaf) =>
            fromNav.push({ href: leaf.href, label: labelOf(leaf.labelKey, leaf.label), context: labelOf(node.labelKey, node.label), keywords: leaf.label })
          );
        } else {
          fromNav.push({ href: node.href, label: labelOf(node.labelKey, node.label), context: labelOf(section.labelKey, section.label), keywords: node.label });
        }
      });
    });
    const seen = new Set(fromNav.map((x) => x.href));
    const extras = EXTRA_TARGETS.filter((x) => !seen.has(x.href) && authorizeRoute(x.href, permissions).allowed);
    return [...fromNav, ...extras];
    // labelOf depends only on `t`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions, t]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets.slice(0, 8);
    const words = q.split(/\s+/);
    return targets
      .map((x) => {
        const hay = `${x.label} ${x.context} ${x.keywords ?? ''} ${x.href}`.toLowerCase();
        if (!words.every((w) => hay.includes(w))) return null;
        const score = x.label.toLowerCase().startsWith(q) ? 0 : x.label.toLowerCase().includes(q) ? 1 : 2;
        return { x, score };
      })
      .filter((r): r is { x: SearchTarget; score: number } => r !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 10)
      .map((r) => r.x);
  }, [query, targets]);

  useEffect(() => setActive(0), [query]);

  // ⌘K / Ctrl+K from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (target: SearchTarget | undefined) => {
    if (!target) return;
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    router.push(target.href);
  };

  return (
    <div className={`group relative w-full ${className}`}>
      <Search
        size={17}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            go(results[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        placeholder={t('header.search')}
        aria-label={t('header.search')}
        className="h-10 w-full rounded-md border border-border bg-background/60 pl-10 pr-14 text-[13px] text-foreground transition-all duration-med ease-standard placeholder:text-muted-foreground focus:border-primary/30 focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
      <kbd className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:flex">
        <Command size={9} />K
      </kbd>

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-12 z-50 max-h-[360px] overflow-y-auto rounded-card border border-border bg-popover p-1.5 shadow-isi-lg"
        >
          <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-label text-muted-foreground">
            {query.trim() ? `Pages matching “${query.trim()}”` : 'Jump to'}
          </p>
          {results.length === 0 && (
            <p className="px-2 py-4 text-center text-[12px] text-muted-foreground">No pages match.</p>
          )}
          {results.map((r, i) => (
            <button
              key={r.href}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(r)}
              className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors ${i === active ? 'bg-accent' : ''}`}
            >
              <ArrowRight size={13} className="flex-shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-foreground">{r.label}</span>
                <span className="block truncate text-[10.5px] text-muted-foreground">{r.context} · {r.href}</span>
              </span>
              {i === active && <CornerDownLeft size={12} className="flex-shrink-0 text-muted-foreground" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
