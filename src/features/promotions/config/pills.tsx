/** Small badges shared by the configuration tables. */

export function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
        active ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export function SystemPill() {
  return (
    <span title="Shipped with the platform" className="rounded bg-primary/10 px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wider text-primary">
      System
    </span>
  );
}

const SCOPE_TONE: Record<string, string> = {
  customer: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  order: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  line: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
};

export function ScopePill({ scope }: { scope: string }) {
  return (
    <span className={`rounded px-1.5 py-px text-[10px] font-semibold capitalize ${SCOPE_TONE[scope] ?? 'bg-muted text-muted-foreground'}`}>
      {scope}
    </span>
  );
}
