import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  AnimalSpeciesSchema,
  BiomeDefinitionSchema,
  MaterialItemSchema,
  NPCSchema,
  PlantSpeciesSchema,
  RecipeSchema
} from '../src/data/schemas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function readJson<T>(relativePath: string): T {
  const fullPath = path.join(rootDir, relativePath);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(raw) as T;
}

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v as Record<string, unknown>, nextKey));
    } else {
      if (typeof v !== 'string' || v.trim().length === 0) {
        throw new Error(`Empty or non-string locale value at key "${nextKey}"`);
      }
      keys.push(nextKey);
    }
  }
  return keys.sort();
}

function main(): void {
  console.info('🌿 Validating "survearn" — Edition: Amazonas Colombia (Selva Viva) content...');

  const plants = z.array(PlantSpeciesSchema).parse(readJson('src/data/content/plants.json'));
  const animals = z.array(AnimalSpeciesSchema).parse(readJson('src/data/content/animals.json'));
  const materials = z.array(MaterialItemSchema).parse(readJson('src/data/content/materials.json'));
  const recipes = z.array(RecipeSchema).parse(readJson('src/data/content/recipes.json'));
  const biomes = z.array(BiomeDefinitionSchema).parse(readJson('src/data/content/biomes.json'));
  const npcs = z.array(NPCSchema).parse(readJson('src/data/content/npcs.json'));

  if (plants.length < 20) {
    throw new Error(`Expected at least 20 plants, found ${plants.length}`);
  }
  if (animals.length < 15) {
    throw new Error(`Expected at least 15 animals, found ${animals.length}`);
  }
  if (recipes.length < 10) {
    throw new Error(`Expected at least 10 craftable recipes, found ${recipes.length}`);
  }
  if (materials.length < 8) {
    throw new Error(`Expected at least 8 materials/items, found ${materials.length}`);
  }

  // Referential integrity check: every recipe ingredient must exist in plants or materials
  const validItemIds = new Set<string>([
    ...plants.map((p) => p.id),
    ...materials.map((m) => m.id),
    ...recipes.map((r) => r.outputItemId)
  ]);

  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      if (!validItemIds.has(ing.itemId)) {
        throw new Error(
          `Recipe "${recipe.id}" references unknown ingredient itemId "${ing.itemId}"`
        );
      }
    }
  }

  // Localization parity check (es.json vs en.json)
  const esLocale = readJson<Record<string, unknown>>('src/data/locales/es.json');
  const enLocale = readJson<Record<string, unknown>>('src/data/locales/en.json');
  const esKeys = collectKeys(esLocale);
  const enKeys = collectKeys(enLocale);

  const missingInEn = esKeys.filter((k) => !enKeys.includes(k));
  const missingInEs = enKeys.filter((k) => !esKeys.includes(k));

  if (missingInEn.length > 0 || missingInEs.length > 0) {
    throw new Error(
      `Locale key mismatch! Missing in EN: [${missingInEn.join(', ')}], Missing in ES: [${missingInEs.join(', ')}]`
    );
  }

  console.info(
    `✅ Content validation passed: ${plants.length} plants, ${animals.length} animals, ${materials.length} materials/items, ${recipes.length} recipes, ${biomes.length} biomes, ${npcs.length} NPCs, ${esKeys.length} localized keys.`
  );
}

main();
