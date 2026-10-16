---
name: react-performance
description: Diagnose and fix React rendering performance — unnecessary re-renders, memoization (memo/useMemo/useCallback and React Compiler), list virtualization, context splitting, transitions, code splitting, and profiling. Use this skill whenever a React UI feels slow or janky, a table/list is large, typing lags, the user asks about re-renders, useMemo/useCallback, or wants to optimize a component, even if they just say "this page is laggy".
---

# React Performance

Measure first, then fix the actual bottleneck. Most slowness comes from: rendering too much, rendering too often, or doing expensive work during render.

## Workflow
1. **Reproduce** with a production build (`next build && next start`) — dev mode is slow by design.
2. **Profile**: React DevTools Profiler ("Highlight updates" + "Record why each component rendered"), Chrome Performance panel for long tasks (>50ms).
3. **Classify** the problem using the table below.
4. **Fix the smallest thing**, re-measure, keep only fixes that help.

| Symptom | Likely cause | Fix |
|---|---|---|
| Whole page re-renders on keystroke | state too high | move state down / colocate |
| Everything under a Provider re-renders | wide context value | split context, memo value, or use a store with selectors |
| Big list scroll jank | too many DOM nodes | virtualize |
| Input lag during filtering | expensive sync update | `useDeferredValue` / `useTransition` |
| Slow first load | big bundle | `next/dynamic`, lazy import heavy libs |
| Child re-renders with same data | new object/fn identity each render | memo + stable props (or React Compiler) |

## Colocate state
```tsx
// ❌ Search state in page re-renders the heavy chart
// ✅ Isolate it
function SearchBox() { const [q, setQ] = useState(""); return <input value={q} onChange={e => setQ(e.target.value)} />; }
```
Also: pass expensive subtrees as `children` so they don't re-render when the wrapper's state changes.

## Memoization rules
- If **React Compiler** is enabled, don't hand-write `useMemo`/`useCallback`; write plain code that follows the Rules of React.
- Otherwise, use `memo` only for components that render often with the same props and are measurably expensive.
- `useMemo` for expensive calculations or to keep object identity stable for memoized children / effect deps.
- `useCallback` only when the function is passed to a memoized child or used in deps.
```tsx
const Row = memo(function Row({ item, onSelect }: RowProps) { /* ... */ });
const handleSelect = useCallback((id: string) => setSelected(id), []);
const sorted = useMemo(() => [...items].sort(byDate), [items]);
```

## Context splitting
```tsx
const StateCtx = createContext<State | null>(null);
const DispatchCtx = createContext<Dispatch | null>(null);   // dispatch is stable → consumers don't re-render
```
For high-frequency global state, prefer Zustand/Jotai with selectors: `useStore(s => s.count)`.

## Transitions for responsiveness
```tsx
const [query, setQuery] = useState("");
const deferred = useDeferredValue(query);
const results = useMemo(() => filter(items, deferred), [items, deferred]);
const isStale = query !== deferred;
```
```tsx
const [isPending, startTransition] = useTransition();
startTransition(() => setTab(next)); // keeps UI interactive
```

## Virtualize long lists (>~200 rows)
```tsx
import { useVirtualizer } from "@tanstack/react-virtual";
const parentRef = useRef<HTMLDivElement>(null);
const v = useVirtualizer({ count: rows.length, getScrollElement: () => parentRef.current, estimateSize: () => 44, overscan: 8 });
return (
  <div ref={parentRef} style={{ height: 600, overflow: "auto" }}>
    <div style={{ height: v.getTotalSize(), position: "relative" }}>
      {v.getVirtualItems().map(vi => (
        <div key={rows[vi.index].id} style={{ position: "absolute", top: 0, transform: `translateY(${vi.start}px)`, height: vi.size, width: "100%" }}>
          <Row item={rows[vi.index]} />
        </div>
      ))}
    </div>
  </div>
);
```

## Keys and effects
- Stable, unique keys (IDs), never array index for reorderable lists.
- Don't derive state in effects: compute during render. Effects that `setState` on every render cause double renders.
- Debounce/throttle resize, scroll, and search handlers.

## Code splitting
```tsx
const Chart = dynamic(() => import("./Chart"), { ssr: false, loading: () => <Skeleton h={300} /> });
```
Import heavy libs (date, charts, editors) only where used; prefer `import { x } from "lib/x"` paths that tree-shake.

## Anti-patterns
- Wrapping everything in `memo`/`useMemo` "just in case"
- Inline object props to memoized children (`style={{...}}`, `options={{...}}`)
- Storing derived data in state
- Giant single context for the whole app

## Checklist
- [ ] Profiled in production build; bottleneck identified
- [ ] State colocated; contexts split
- [ ] Lists >200 items virtualized
- [ ] Expensive filters deferred
- [ ] Heavy components lazy-loaded
- [ ] No long tasks >50ms during common interactions (INP < 200ms)
