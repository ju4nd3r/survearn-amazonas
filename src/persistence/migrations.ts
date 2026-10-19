import { SaveFileSchemaV1, SaveFileSchemaV2, SaveFileV1, SaveFileV2 } from '../data/schemas';

export function computeSaveChecksum(payloadWithoutChecksum: Omit<SaveFileV2, 'checksum'>): string {
  const json = JSON.stringify(payloadWithoutChecksum);
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function migrateV1ToV2(v1: SaveFileV1): SaveFileV2 {
  const basePayload: Omit<SaveFileV2, 'checksum'> = {
    schemaVersion: 2,
    saveSlotId: v1.saveSlotId,
    savedAtISO: v1.savedAtISO,
    worldSeed: v1.worldSeed,
    dayCount: Math.max(1, v1.dayCount),
    timeOfDayMinutes: 480,
    weather: 'clear',
    riverLevel: 0.2,
    difficulty: 'survivalist',
    character: {
      name: v1.playerName || 'Yurupari',
      bodyType: 'balanced',
      skinTone: '#c68652',
      hairStyle: 'short',
      hairColor: '#1c1c1c',
      outfit: 'expedition_vest',
      startingBackpack: 'botanist'
    },
    playerState: {
      x: v1.x,
      y: v1.y,
      stats: {
        health: Math.min(100, Math.max(0, v1.health)),
        hunger: Math.min(100, Math.max(0, v1.hunger)),
        thirst: Math.min(100, Math.max(0, v1.thirst)),
        stamina: 100,
        bodyTemp: 37.0,
        wetness: 10,
        activeEffects: []
      },
      inventory: [{ itemId: 'agua_hervida_segura', count: 1 }],
      discoveredSpecies: {
        euterpe_precatoria_asai: 'observed'
      },
      builtStructures: [],
      harvestedNodes: []
    }
  };

  return {
    ...basePayload,
    checksum: computeSaveChecksum(basePayload)
  };
}

export function parseAndMigrateSaveData(rawUnknown: unknown): SaveFileV2 {
  if (rawUnknown === null || typeof rawUnknown !== 'object') {
    throw new Error('Corrupted save data: expected JSON object');
  }

  const record = rawUnknown as Record<string, unknown>;
  if (record.schemaVersion === 1) {
    const parsedV1 = SaveFileSchemaV1.parse(rawUnknown);
    return migrateV1ToV2(parsedV1);
  }

  const parsedV2 = SaveFileSchemaV2.parse(rawUnknown);
  const { checksum, ...rest } = parsedV2;
  const expectedChecksum = computeSaveChecksum(rest);
  if (checksum !== expectedChecksum) {
    throw new Error(
      `Corrupted save checksum: expected ${expectedChecksum} but received ${checksum}`
    );
  }
  return parsedV2;
}
