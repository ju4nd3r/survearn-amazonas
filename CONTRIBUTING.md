# Contributing to "survearn" — Edition: Amazonas Colombia (*Selva Viva*)

Thank you for contributing to **survearn — Edition: Amazonas Colombia (*Selva Viva*)**!

## 1. Adding New Flora, Fauna, Recipes, or Dialogues (No Programming Required)
All species, materials, recipes, and NPCs live in validated JSON files inside `src/data/content/`:
- `src/data/content/plants.json`
- `src/data/content/animals.json`
- `src/data/content/materials.json`
- `src/data/content/recipes.json`
- `src/data/content/npcs.json`

Before opening a Pull Request:
1. Review [`/docs/CULTURAL_ACCURACY_CHECKLIST.md`](./docs/CULTURAL_ACCURACY_CHECKLIST.md) to ensure every species includes its accepted Latin scientific name, respectful attribution of Indigenous/local knowledge, and at least one credible citation (Instituto SINCHI, Instituto Humboldt, PNN Colombia, or IUCN).
2. Provide both Colombian Spanish (`es`) and English (`en`) translations.
3. Run the automated validator:
   ```bash
   npm run validate:content
   ```

## 2. Engineering & Code Quality Standards
- **Domain Decoupling:** Core simulation files in `src/systems/` and `src/core/` must remain pure TypeScript with zero Phaser or DOM imports so they can be unit-tested in Vitest.
- **Verification Gate:** Every PR must pass:
  ```bash
  npm run validate:content
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run build
  ```
- **Conventional Commits:** Use `feat:`, `fix:`, `docs:`, `content:`, `test:`, or `chore:` prefixes.
