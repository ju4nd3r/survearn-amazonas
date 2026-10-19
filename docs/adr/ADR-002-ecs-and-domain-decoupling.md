# ADR-002: Lightweight Serializable ECS & Pure Domain Decoupling

- **Status:** Accepted
- **Date:** 2026-10-19
- **Project:** "survearn" — Edition: Amazonas Colombia (*Selva Viva*)

## Context
Survival mechanics (hunger/thirst decay, body temperature, *yuca brava* detoxification), AI state machines, crafting validation, and seeded chunk generation must be 100% deterministic, easily serializable to IndexedDB save slots, and unit-testable in Node/Vitest without spinning up a headless WebGL canvas.

## Decision
We implement a **Lightweight Serializable ECS and Pure Domain Systems (`src/core/` & `src/systems/`)** coupled to the Phaser renderer and DOM UI via a **Typed EventBus (`src/core/events/EventBus.ts`)**. Domain systems are forbidden from importing `phaser` or `window`.

## Rationale & Trade-offs
Plain TypeScript objects for entities and components allow zero-overhead JSON serialization, Zod validation, and straightforward schema migrations (`v1 -> v2`). While Structure-of-Arrays (SoA) TypedArray ECS libraries offer higher throughput at 50,000+ entities, our active 3×3 chunk window contains <300 entities where plain-object clarity and direct serializability are far more valuable.

## Alternatives Rejected
- **bitECS:** TypedArray-only components cannot naturally store strings (species IDs), nested inventory arrays, or status effect timers without complex external string-interning tables.
- **Phaser `GameObject` Inheritance Monolith:** Mixing survival math inside `Phaser.Physics.Arcade.Sprite` subclasses makes unit testing slow and couples save files to renderer internals.
