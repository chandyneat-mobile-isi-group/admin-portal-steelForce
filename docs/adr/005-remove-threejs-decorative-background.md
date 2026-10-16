# 005 — Remove the Three.js decorative background

**Status:** Accepted · **Date:** 2026-08-11

## Context

`components/three-background.tsx` rendered an animated WebGL backdrop behind the
login and shell surfaces, pulling in `three`, `@react-three/fiber`,
`@react-three/drei`, and `@types/three`.

It was decoration. It carried no product meaning, and cost:

- roughly 600 KB of JavaScript for a background
- a continuous render loop draining battery on laptops and tablets
- GPU work on the low-end hardware field sales staff actually use
- a canvas contributing nothing to screen readers

SteelForce is an enterprise tool people use for a full working day. Continuous
GPU animation behind a data table is a poor trade at that duty cycle.

## Decision

Remove the component and the four dependencies.

Where visual depth is wanted, use CSS: gradients, shadows, and short transitions
that the compositor handles cheaply and `prefers-reduced-motion` can disable.

## Consequences

Smaller bundle, no idle GPU load, less to install and audit. Login and shell keep
their existing CSS treatment; no layout changed.

Genuine 3D — a warehouse layout, a plant schematic — would justify revisiting
this. The rule is that 3D must carry product meaning, not atmosphere, and should
be dynamically imported on the one route that needs it.

## Alternatives rejected

**Keep it but pause when hidden** — retains the dependency weight and
accessibility gap to preserve decoration.

**Lighter WebGL library** — smaller version of the same trade.

**Keep the deps for later use** — unused dependencies still install, audit, and
mislead readers about what the app does. Reinstalling is cheap if a real use
appears.
