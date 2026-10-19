import { z } from 'zod';

export const LocalizedTextSchema = z.object({
  es: z.string().min(1),
  en: z.string().min(1)
});

export const BiomeIdSchema = z.enum(['terra_firme', 'varzea', 'riverbank', 'aquatic']);

export const StatusEffectIdSchema = z.enum([
  'food_poisoning',
  'parasites',
  'malaria_fever',
  'venom_bite',
  'well_fed'
]);

export const PlantSpeciesSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  scientificName: z.string().min(3),
  commonName: LocalizedTextSchema,
  biomeIds: z.array(BiomeIdSchema).min(1),
  edibility: z.enum(['edible_raw', 'edible_processed', 'medicinal', 'toxic']),
  requiresProcessing: z.enum(['cook', 'grate_press_toast', 'boil_decoction']).optional(),
  processedItemId: z.string().optional(),
  effectsOnConsumeRaw: z.object({
    healthDelta: z.number(),
    hungerDelta: z.number(),
    thirstDelta: z.number(),
    staminaDelta: z.number(),
    addStatusEffect: StatusEffectIdSchema.optional(),
    cureStatusEffect: StatusEffectIdSchema.optional()
  }),
  inspectionHint: LocalizedTextSchema,
  howToUse: LocalizedTextSchema,
  funFact: LocalizedTextSchema,
  sources: z.array(z.string().min(5)).min(1),
  spriteTint: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});

export const AnimalSpeciesSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  scientificName: z.string().min(3),
  commonName: LocalizedTextSchema,
  biomeIds: z.array(BiomeIdSchema).min(1),
  threatLevel: z.enum(['harmless_prey', 'defensive_hazard', 'ambush_predator', 'disease_vector']),
  aiProfile: z.object({
    moveSpeed: z.number().positive(),
    aggroRadius: z.number().nonnegative(),
    fleeRadius: z.number().nonnegative(),
    attackDamage: z.number().nonnegative(),
    inflictsStatus: StatusEffectIdSchema.optional(),
    fearedByFire: z.boolean()
  }),
  yieldItems: z.array(
    z.object({
      itemId: z.string(),
      count: z.number().int().positive()
    })
  ),
  inspectionHint: LocalizedTextSchema,
  behaviorNote: LocalizedTextSchema,
  funFact: LocalizedTextSchema,
  sources: z.array(z.string().min(5)).min(1),
  spriteTint: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});

export const MaterialItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  scientificName: z.string().min(3),
  commonName: LocalizedTextSchema,
  category: z.enum(['material', 'processed_food', 'tool', 'water']),
  biomeIds: z.array(BiomeIdSchema),
  edibility: z.enum(['edible_safe', 'medicinal', 'non_edible']).optional(),
  effectsOnConsume: z
    .object({
      healthDelta: z.number(),
      hungerDelta: z.number(),
      thirstDelta: z.number(),
      staminaDelta: z.number(),
      addStatusEffect: StatusEffectIdSchema.optional(),
      cureStatusEffect: StatusEffectIdSchema.optional()
    })
    .optional(),
  description: LocalizedTextSchema,
  funFact: LocalizedTextSchema,
  sources: z.array(z.string().min(5)).min(1),
  spriteTint: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});

export const RecipeSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: LocalizedTextSchema,
  category: z.enum(['tool', 'camp', 'processing', 'medicine', 'transport']),
  ingredients: z
    .array(
      z.object({
        itemId: z.string(),
        count: z.number().int().positive()
      })
    )
    .min(1),
  requiredStation: z.enum(['none', 'campfire', 'shelter_workbench']),
  outputItemId: z.string(),
  outputCount: z.number().int().positive(),
  placesStructure: z.boolean().default(false),
  description: LocalizedTextSchema,
  culturalNote: LocalizedTextSchema
});

export const NPCSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(2),
  role: LocalizedTextSchema,
  community: z.string().min(2),
  biomeId: BiomeIdSchema,
  greeting: LocalizedTextSchema,
  unlocksSpeciesIds: z.array(z.string()),
  trades: z.array(
    z.object({
      giveItemId: z.string(),
      giveCount: z.number().int().positive(),
      receiveItemId: z.string(),
      receiveCount: z.number().int().positive()
    })
  ),
  dialogueNodes: z.array(
    z.object({
      id: z.string(),
      prompt: LocalizedTextSchema,
      response: LocalizedTextSchema,
      unlocksSpeciesId: z.string().optional()
    })
  )
});

export const BiomeDefinitionSchema = z.object({
  id: BiomeIdSchema,
  name: LocalizedTextSchema,
  description: LocalizedTextSchema,
  groundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  movementMultiplier: z.number().positive(),
  moistureBase: z.number().min(0).max(100)
});

export const SaveFileSchemaV1 = z.object({
  schemaVersion: z.literal(1),
  saveSlotId: z.enum(['autosave', 'slot_1', 'slot_2', 'slot_3']),
  savedAtISO: z.string(),
  worldSeed: z.string(),
  dayCount: z.number(),
  playerName: z.string(),
  x: z.number(),
  y: z.number(),
  health: z.number(),
  hunger: z.number(),
  thirst: z.number()
});

export const SaveFileSchemaV2 = z.object({
  schemaVersion: z.literal(2),
  saveSlotId: z.enum(['autosave', 'slot_1', 'slot_2', 'slot_3']),
  savedAtISO: z.string(),
  checksum: z.string(),
  worldSeed: z.string(),
  dayCount: z.number().int().positive(),
  timeOfDayMinutes: z.number().min(0).max(1439),
  weather: z.enum(['clear', 'humid_haze', 'tropical_rain', 'heavy_storm']),
  riverLevel: z.number().min(0).max(1),
  difficulty: z.enum(['explorer', 'survivalist', 'amazon_realist']),
  character: z.object({
    name: z.string().min(1).max(24),
    bodyType: z.enum(['agile', 'sturdy', 'balanced']),
    skinTone: z.string(),
    hairStyle: z.enum(['short', 'braided', 'curly', 'bun']),
    hairColor: z.string(),
    outfit: z.enum(['expedition_vest', 'river_poncho', 'botanist_shirt']),
    startingBackpack: z.enum(['botanist', 'fisher', 'pathfinder'])
  }),
  playerState: z.object({
    x: z.number(),
    y: z.number(),
    stats: z.object({
      health: z.number().min(0).max(100),
      hunger: z.number().min(0).max(100),
      thirst: z.number().min(0).max(100),
      stamina: z.number().min(0).max(100),
      bodyTemp: z.number().min(33).max(42),
      wetness: z.number().min(0).max(100),
      activeEffects: z.array(
        z.object({
          id: StatusEffectIdSchema,
          remainingSec: z.number().nonnegative()
        })
      )
    }),
    inventory: z.array(
      z.object({
        itemId: z.string(),
        count: z.number().int().positive()
      })
    ),
    discoveredSpecies: z.record(z.string(), z.enum(['observed', 'mastered'])),
    builtStructures: z.array(
      z.object({
        id: z.string(),
        recipeId: z.string(),
        x: z.number(),
        y: z.number()
      })
    ),
    harvestedNodes: z.array(z.string())
  })
});

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;
export type BiomeId = z.infer<typeof BiomeIdSchema>;
export type StatusEffectId = z.infer<typeof StatusEffectIdSchema>;
export type PlantSpecies = z.infer<typeof PlantSpeciesSchema>;
export type AnimalSpecies = z.infer<typeof AnimalSpeciesSchema>;
export type MaterialItem = z.infer<typeof MaterialItemSchema>;
export type RecipeDefinition = z.infer<typeof RecipeSchema>;
export type NPCDefinition = z.infer<typeof NPCSchema>;
export type BiomeDefinition = z.infer<typeof BiomeDefinitionSchema>;
export type SaveFileV1 = z.infer<typeof SaveFileSchemaV1>;
export type SaveFileV2 = z.infer<typeof SaveFileSchemaV2>;
