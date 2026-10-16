import { DEFAULT_LAYOUT, LAYOUT_IDS } from '@/domain/enums/layout';

/**
 * Runs before first paint, in `<head>`, so the shell never swaps under the user.
 *
 * Same technique `next-themes` uses for the theme class. Kept as a string
 * because it must execute ahead of React, and built from the enum so the list
 * of valid ids cannot drift from `domain/enums/layout.ts`.
 */
export const LAYOUT_INIT_SCRIPT = `(function(){try{var k=localStorage.getItem('steelforce-layout');var v=${JSON.stringify(
  LAYOUT_IDS
)};document.documentElement.dataset.layout=v.indexOf(k)>-1?k:'${DEFAULT_LAYOUT}'}catch(e){document.documentElement.dataset.layout='${DEFAULT_LAYOUT}'}})()`;
