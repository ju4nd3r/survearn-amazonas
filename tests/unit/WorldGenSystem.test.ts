import { describe, expect, it } from 'vitest';
import { WorldGenSystem } from '../../src/systems/WorldGenSystem';

describe('WorldGenSystem', () => {
  it('generates identical deterministic worlds for the same seed', () => {
    const w1 = WorldGenSystem.generateWorld('LETICIA-2026');
    const w2 = WorldGenSystem.generateWorld('LETICIA-2026');

    expect(w1.tiles[10]?.[10]?.biome).toBe(w2.tiles[10]?.[10]?.biome);
    expect(w1.resourceNodes.length).toBe(w2.resourceNodes.length);
    expect(w1.resourceNodes[0]?.itemId).toBe('euterpe_precatoria_asai');
    expect(w1.resourceNodes[1]?.itemId).toBe('manihot_esculenta_brava');
  });
});
