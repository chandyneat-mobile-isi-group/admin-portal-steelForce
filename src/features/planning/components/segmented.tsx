'use client';

/** A small pill toggle for switching a page between views (Daily / Weekly, …). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-muted/60 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`h-8 px-3 rounded-lg text-[12px] font-semibold transition-colors ${
            value === option.value
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted-foreground hover:text-main'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
