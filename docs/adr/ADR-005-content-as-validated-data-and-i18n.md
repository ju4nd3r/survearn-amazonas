# ADR-005: Content-as-Validated-Data & Typed Bilingual Localization (`es` / `en`)

- **Status:** Accepted
- **Date:** 2026-10-19
- **Project:** "survearn" — Edition: Amazonas Colombia (*Selva Viva*)

## Context
All botanical, zoological, crafting, biome, and narrative data (20+ plants, 15+ animals, 10+ recipes, 8+ materials, NPCs, and dialogues) must be editable by non-programmers/researchers, cite credible scientific sources (SINCHI, Humboldt, PNN, IUCN), and support instant runtime switching between Colombian Spanish (`es`) and English (`en`) while keeping Latin scientific names invariant.

## Decision
We store all game content in structured JSON catalogs under `src/data/content/*.json` and UI strings in `src/data/locales/{es,en}.json`, validated by Zod schemas (`src/data/schemas.ts`) and enforced in CI via `scripts/validate-content.ts`.

## Rationale & Trade-offs
Separating content into validated JSON files prevents magic numbers in code and guarantees at build time that every species has scientific citations, valid status effect IDs, and complete Spanish/English translations. Inline `{ es, en }` localized fields inside species/recipe JSON keep domain catalogs self-contained for biologists reviewing accuracy.

## Alternatives Rejected
- **Hardcoded TypeScript Classes per Item/Species:** Requires developer intervention for every text edit or tuning tweak and mixes code with data.
- **Unchecked JSON / CSV Files:** Prone to typos in item IDs or missing translations that only surface late in gameplay.
