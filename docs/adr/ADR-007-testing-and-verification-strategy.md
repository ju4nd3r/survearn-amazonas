# ADR-007: Multi-Layer Testing Strategy (Vitest, Playwright & Content Integrity Validator)

- **Status:** Accepted
- **Date:** 2026-10-19
- **Project:** "survearn" — Edition: Amazonas Colombia (*Selva Viva*)

## Context
We must verify both deterministic survival/crafting/migration logic and full browser integration (boot, language switch, character creation, foraging, Bitácora unlock, and IndexedDB save/load) in CI.

## Decision
We adopt a 3-tier verification strategy:
1. **Content & Locale Integrity (`tsx scripts/validate-content.ts`)**
2. **Fast Unit Tests (`Vitest` in `tests/unit/*.test.ts`)**
3. **Browser E2E Smoke Tests (`Playwright` Chromium in `tests/e2e/smoke.spec.ts`)**

## Rationale & Trade-offs
Vitest reuses our `vite.config.ts` module resolution and executes all domain unit tests in under 1 second. Playwright drives a real headless Chromium browser against the compiled app to verify canvas initialization, `<dialog>` interactions, and IndexedDB persistence end-to-end.

## Alternatives Rejected
- **Jest:** Requires duplicate transform pipelines (`ts-jest` / Babel) and has friction with native ESM packages.
- **Manual QA Only:** Cannot catch subtle schema regressions or missing translation keys across 50+ content items.
