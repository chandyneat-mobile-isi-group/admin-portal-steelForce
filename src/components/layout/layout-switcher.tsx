'use client';

import { Check, LayoutGrid } from 'lucide-react';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LAYOUT_OPTIONS } from '@/config/layouts';
import { useLayout } from '@/lib/layout/layout-context';
import { useI18n } from '@/lib/i18n';
import type { LayoutId } from '@/domain/enums/layout';

/**
 * Chooses the workspace shell.
 *
 * Built on Radix Popover, which brings the accessibility requirements with it:
 * focus moves into the panel on open and returns to the trigger on close,
 * Escape and outside-click dismiss, and the trigger carries `aria-expanded`.
 * The options are a radio group — one is always selected — so a screen reader
 * announces "2 of 3, selected" rather than reading three unrelated buttons.
 *
 * It changes presentation only. Nothing here touches the session, the route or
 * any permission.
 */
export function LayoutSwitcher({ compact = false }: { compact?: boolean }) {
  const { layout, setLayout } = useLayout();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  // `t` echoes the key back when a string is missing; fall back to the
  // registry's English label so a new layout never renders as `layout.x.label`.
  const label = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const choose = (id: LayoutId) => {
    setLayout(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label('layout.switcher.aria', 'Change application layout')}
          title={label('layout.switcher.aria', 'Change application layout')}
          className={`flex items-center justify-center rounded-lg text-muted-foreground transition-colors duration-fast ease-standard hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-[state=open]:bg-accent data-[state=open]:text-primary ${
            compact ? 'h-8 w-8' : 'h-9 w-9'
          }`}
        >
          <LayoutGrid size={compact ? 16 : 18} strokeWidth={1.9} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[308px] rounded-card border-border p-2 shadow-isi-lg"
      >
        <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-label text-muted-foreground">
          {label('layout.switcher.title', 'Choose Layout')}
        </p>

        <div role="radiogroup" aria-label={label('layout.switcher.title', 'Choose Layout')}>
          {LAYOUT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = option.id === layout;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(option.id)}
                className={`group flex w-full items-start gap-3 rounded-md p-2.5 text-left transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected ? 'bg-primary/[0.07]' : 'hover:bg-accent'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border transition-colors ${
                    selected
                      ? 'border-primary/25 bg-primary/10 text-primary'
                      : 'border-border bg-muted text-muted-foreground group-hover:text-primary'
                  }`}
                >
                  <Icon size={16} strokeWidth={1.9} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`truncate text-[13px] font-semibold ${
                        selected ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {label(option.labelKey, option.label)}
                    </span>
                    {selected && (
                      <Check size={14} className="flex-shrink-0 text-primary" aria-hidden />
                    )}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">
                    {label(option.descriptionKey, option.description)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
