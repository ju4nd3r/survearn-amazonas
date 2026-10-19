# ADR-001: Engine, Language, and Build Pipeline (Phaser 3 + TypeScript Strict + Vite)

- **Status:** Accepted
- **Date:** 2026-10-19
- **Project:** "survearn" — Edition: Amazonas Colombia (*Selva Viva*)

## Context
We need a 2D web game engine and build toolchain capable of crisp pixel-art rendering, integer canvas scaling across mobile portrait/landscape viewports, fast hot-module replacement (HMR), offline PWA bundling, and strict compile-time safety across complex ethnobotanical data structures.

## Decision
We choose **Phaser 3 (`^3.87.0`)**, **TypeScript 5.6 (`strict: true`, `noUncheckedIndexedAccess: true`)**, and **Vite 6**.

## Rationale & Trade-offs
Phaser 3 provides battle-tested 2D WebGL/Canvas batching, camera follow/culling, input handling, and integer scale management out of the box, while Vite compiles TypeScript in milliseconds. Although Phaser's bundle size (~1 MB raw, ~280 KB gzipped) is larger than a micro-renderer, Nginx gzip/brotli compression and PWA service-worker precaching make subsequent loads instantaneous (<50 ms).

## Alternatives Rejected
- **PixiJS:** Pure renderer; would require writing our own scene lifecycle, camera culling, tilemap collision, and game loop scheduler.
- **Kaboom / Kaplay:** Global-state-heavy API that is harder to decouple for strict unit testing in Vitest.
- **Godot 4 Web Export (WASM):** Large initial download (15–30 MB), poor integration with native HTML5 accessible `<dialog>` screen-reader overlays, and `SharedArrayBuffer` COOP/COEP header friction on mobile browsers.
