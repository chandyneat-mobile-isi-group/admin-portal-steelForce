/**
 * Deterministic helpers shared by every mock repository.
 *
 * All demo data is generated from a seed rather than `Math.random`, so the
 * server render and the client hydration produce identical markup. A mismatch
 * here surfaces as a hydration error on every page.
 */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: number) {
  const rand = mulberry32(seed);
  return {
    rand,
    pick: <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)],
    int: (min: number, max: number) => min + Math.floor(rand() * (max - min + 1)),
    float: (min: number, max: number) => min + rand() * (max - min),
    chance: (p: number) => rand() < p,
    /** Weighted pick: `[['Active', 6], ['Inactive', 1]]`. */
    weighted: <T,>(entries: ReadonlyArray<readonly [T, number]>): T => {
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let roll = rand() * total;
      for (const [value, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return value;
      }
      return entries[entries.length - 1][0];
    },
  };
}
