'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { usersRepository, type SalesEmployeeOption } from '../repositories';

/**
 * Picks the SAP sales employee a Sales Representative account is linked to.
 *
 * A dropdown over the synchronised SAP sales-employee list, searched on the server:
 * the list is thousands of people, so it shows the first 50 matches for what is typed
 * rather than loading everyone. The chosen personnel number becomes the account's
 * employee code - the number the representative's depots are registered under in SAP.
 */
export function SalesEmployeeSelect({
  value,
  selectedName,
  onChange,
  className,
  invalid,
}: {
  value: string;
  selectedName?: string | null;
  onChange: (option: SalesEmployeeOption | null) => void;
  className?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<SalesEmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  // Debounced server search while the list is open.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        setOptions(await usersRepository.searchSalesEmployees(search, controller.signal));
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, search]);

  // Close on a click outside.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (container.current && !container.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const choose = (option: SalesEmployeeOption | null) => {
    onChange(option);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        className={`${className ?? ''} flex items-center justify-between text-left ${invalid ? 'border-red-400' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? 'text-main truncate' : 'text-muted-foreground'}>
          {value ? (
            <>
              <span className="font-mono">{value}</span>
              {selectedName ? <span className="ml-2">{selectedName}</span> : null}
            </>
          ) : (
            '— Select SAP sales employee —'
          )}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {value ? (
            <X
              size={14}
              className="text-muted-foreground hover:text-main"
              onClick={(event) => {
                event.stopPropagation();
                choose(null);
              }}
              aria-label="Clear"
            />
          ) : null}
          <ChevronDown size={15} className="text-muted-foreground" />
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-surface bg-card shadow-lg">
          <div className="flex items-center gap-2 border-b border-surface px-3 py-2">
            <Search size={14} className="text-muted-foreground" />
            <input
              autoFocus
              className="w-full bg-transparent text-[13px] text-main placeholder:text-muted-foreground focus:outline-none"
              placeholder="Search name or personnel number"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {loading && <li className="px-3 py-2 text-[12px] text-muted-foreground">Searching…</li>}
            {!loading && failed && (
              <li className="px-3 py-2 text-[12px] text-red-500">Could not load SAP sales employees.</li>
            )}
            {!loading && !failed && options.length === 0 && (
              <li className="px-3 py-2 text-[12px] text-muted-foreground">No current sales employee matches.</li>
            )}
            {!loading &&
              !failed &&
              options.map((option) => (
                <li
                  key={option.personnelNumber}
                  role="option"
                  aria-selected={option.personnelNumber === value}
                  className={`cursor-pointer px-3 py-2 text-[13px] hover:bg-primary/5 ${
                    option.personnelNumber === value ? 'bg-primary/10 font-medium' : ''
                  }`}
                  onClick={() => choose(option)}
                >
                  <span className="font-mono text-muted-foreground mr-2">{option.personnelNumber}</span>
                  {option.fullName ?? '—'}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
