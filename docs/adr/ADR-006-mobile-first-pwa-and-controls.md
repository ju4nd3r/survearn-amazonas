# ADR-006: Mobile-First Responsive Layout, Dual Input Controls & PWA Offline Strategy

- **Status:** Accepted
- **Date:** 2026-10-19
- **Project:** "survearn" — Edition: Amazonas Colombia (*Selva Viva*)

## Context
Players in Colombia and worldwide frequently play on mid-range mobile devices (both portrait and landscape) with intermittent connectivity, as well as desktop browsers with keyboard/mouse or gamepads.

## Decision
We use **Phaser Scale.RESIZE with integer pixel zoom**, a **Unified Input Controller (`InputController.ts`)** combining a virtual thumb-stick + context action buttons (with Left-Handed flip mode) and Keyboard/Gamepad bindings, CSS `env(safe-area-inset-*)` layout adaptation, and **`vite-plugin-pwa` (Workbox)** for 100% offline capability.

## Rationale & Trade-offs
Dynamic viewport resizing with integer zoom (`Math.max(2, Math.floor(minDim / 240))`) guarantees razor-sharp 16×16 pixel art without sub-pixel shimmering on any screen aspect ratio. Workbox precaches all static bundles and JSON catalogs so the entire game runs offline after initial load and remains ready for future Capacitor Android/iOS packaging.

## Alternatives Rejected
- **Fixed 16:9 Canvas with Black Letterboxing:** Wastes up to 60% of the screen in mobile portrait mode and pushes touch controls into awkward corners.
- **Continuous Fractional Canvas Scaling:** Causes ugly pixel-art distortion and tile-seam bleeding.
