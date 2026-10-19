import { describe, expect, it } from 'vitest';
import { parseAndMigrateSaveData } from '../../src/persistence/migrations';

describe('SaveMigrations', () => {
  it('migrates legacy v1 save payload to v2 with valid checksum', () => {
    const legacyV1 = {
      schemaVersion: 1,
      saveSlotId: 'slot_1',
      savedAtISO: '2026-10-19T12:00:00.000Z',
      worldSeed: 'AMAZONAS-LEGACY',
      dayCount: 4,
      playerName: 'Sabina',
      x: 160,
      y: 220,
      health: 85,
      hunger: 70,
      thirst: 65
    };

    const migrated = parseAndMigrateSaveData(legacyV1);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.character.name).toBe('Sabina');
    expect(migrated.playerState.stats.health).toBe(85);
    expect(migrated.checksum).toMatch(/^[0-9a-f]{8}$/);
  });

  it('rejects tampered v2 save files when checksum does not match', () => {
    const legacyV1 = {
      schemaVersion: 1,
      saveSlotId: 'slot_1',
      savedAtISO: '2026-10-19T12:00:00.000Z',
      worldSeed: 'SEED-1',
      dayCount: 2,
      playerName: 'Amaru',
      x: 100,
      y: 100,
      health: 90,
      hunger: 80,
      thirst: 80
    };
    const validV2 = parseAndMigrateSaveData(legacyV1);
    const tampered = {
      ...validV2,
      dayCount: 999
    };

    expect(() => parseAndMigrateSaveData(tampered)).toThrow(/Corrupted save checksum/);
  });
});
