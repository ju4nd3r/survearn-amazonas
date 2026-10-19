# ADR-004: Offline-First Persistence with IndexedDB, Zod Validation & Versioned Migrations

- **Status:** Accepted
- **Date:** 2026-10-19
- **Project:** "survearn" — Edition: Amazonas Colombia (*Selva Viva*)

## Context
Players need reliable autosaves, at least 3 manual save slots, JSON file export/import for backups, and protection against corrupted save files or schema changes across game updates.

## Decision
We use an **IndexedDB storage adapter (`IndexedDBAdapter.ts`)** paired with **Zod runtime schema validation and a deterministic version migration pipeline (`migrations.ts`)**, plus an **FNV-1a integrity checksum** and an automatic `localStorage` fallback for restricted test environments.

## Rationale & Trade-offs
IndexedDB is asynchronous (never blocks the 60 FPS game loop during autosave) and supports large storage quotas for world chunk deltas. Validating every loaded or imported save with Zod catches corrupted or tampered JSON before it can crash the simulation, and pure migration functions (`v1 -> v2`) guarantee backward compatibility.

## Alternatives Rejected
- **Raw `localStorage` Only:** Synchronous writes can cause frame stutters on mobile devices and hit the 5 MB origin quota when storing multiple slots.
- **Unvalidated JSON `JSON.parse()`:** Any missing field from an older game version or malformed user import causes cryptic runtime exceptions deep inside game systems.
