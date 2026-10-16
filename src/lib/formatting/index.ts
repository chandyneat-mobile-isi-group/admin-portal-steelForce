/** Presentation formatters. Shared by every module so figures read the same everywhere. */

import { TODAY } from '@/lib/utilities/demo-clock';

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}k`;
  }
  return `$${value.toLocaleString('en-US')}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "in 3 days" / "5 days ago" — the phrasing follow-up lists actually need. */
export function relativeDays(iso: string | null): { label: string; days: number } | null {
  if (!iso) return null;
  const days = Math.round(
    (new Date(`${iso}T00:00:00Z`).getTime() - TODAY.getTime()) / 86400000
  );
  if (days === 0) return { label: 'Today', days };
  if (days === 1) return { label: 'Tomorrow', days };
  if (days === -1) return { label: 'Yesterday', days };
  return {
    label: days > 0 ? `In ${days} days` : `${Math.abs(days)} days ago`,
    days,
  };
}
