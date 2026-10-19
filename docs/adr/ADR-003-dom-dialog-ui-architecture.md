# ADR-003: Accessible HTML5 `<dialog>` Overlays Over Integer-Scaled Canvas

- **Status:** Accepted
- **Date:** 2026-10-19
- **Project:** "survearn" — Edition: Amazonas Colombia (*Selva Viva*)

## Context
"survearn" — Edition: Amazonas Colombia (*Selva Viva*) features text-rich educational interfaces: a searchable and filterable **Bitácora (Field Guide)** with Latin scientific names and citations, a **Character Creator**, a **Crafting & Processing Station**, **NPC Dialogue Trees**, and an accessible **Settings & Save Manager**.

## Decision
We render the game world on the Phaser 3 `<canvas>` and build all HUD/menu interfaces using **semantic HTML5 `<dialog>` modals and DOM overlays** styled with CSS Custom Properties, opened via `dialog.showModal()`, configured with `closedby="any"` (plus a click-outside bounding-box fallback for Safari), and scroll-contained via `overscroll-behavior: contain` on both `dialog:modal` and `dialog::backdrop`.

## Rationale & Trade-offs
HTML5 `<dialog>` provides native browser top-layer rendering, automatic keyboard focus trapping, `Esc` key dismissal, screen-reader ARIA semantics, crisp dynamic font scaling (`100%–130%`), and native mobile momentum scrolling. Synchronizing canvas pause states with modal open/close events requires a small `UIManager` coordinator, which is trivial via our `EventBus`.

## Alternatives Rejected
- **In-Canvas Bitmap Text UI (Phaser / RexUI):** Breaks screen readers, blurs or overflows when scaling font sizes or switching between Spanish and English string lengths, and lacks native mobile scroll physics.
- **Heavy SPA Framework (React / Vue / Angular):** Adds unnecessary runtime bundle size and virtual-DOM reconciliation overhead when clean, modular TypeScript DOM components suffice.
