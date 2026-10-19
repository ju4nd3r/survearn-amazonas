import { describe, expect, it } from 'vitest';
import { SurvivalSystem } from '../../src/systems/SurvivalSystem';

describe('SurvivalSystem', () => {
  it('decays hunger and thirst over time according to difficulty and activity', () => {
    const initial = SurvivalSystem.createInitialStats();
    const afterTick = SurvivalSystem.tick(initial, {
      dtSec: 10,
      difficulty: 'survivalist',
      isMoving: true,
      isSprinting: false,
      inWater: false,
      weather: 'clear',
      isNight: false,
      nearLitCampfire: false,
      insideShelter: false
    });

    expect(afterTick.hunger).toBeLessThan(initial.hunger);
    expect(afterTick.thirst).toBeLessThan(initial.thirst);
    expect(afterTick.health).toBe(100);
  });

  it('restores hunger and thirst safely when consuming raw Asaí (Euterpe precatoria)', () => {
    const stats = {
      ...SurvivalSystem.createInitialStats(),
      hunger: 50,
      thirst: 50
    };
    const outcome = SurvivalSystem.consumeItem(stats, 'euterpe_precatoria_asai');

    expect(outcome.wasToxicOrRawRisk).toBe(false);
    expect(outcome.stats.hunger).toBe(66);
    expect(outcome.stats.thirst).toBe(64);
  });

  it('inflicts food_poisoning and health loss when consuming unprocessed Yuca Brava raw', () => {
    const stats = SurvivalSystem.createInitialStats();
    const outcome = SurvivalSystem.consumeItem(stats, 'manihot_esculenta_brava');

    expect(outcome.wasToxicOrRawRisk).toBe(true);
    expect(outcome.stats.health).toBe(75);
    expect(outcome.stats.activeEffects.some((e) => e.id === 'food_poisoning')).toBe(true);
  });

  it('cures malaria_fever when consuming Quina (Cinchona pubescens)', () => {
    const stats = SurvivalSystem.createInitialStats();
    SurvivalSystem.addOrRefreshEffect(stats, 'malaria_fever');
    expect(stats.activeEffects.some((e) => e.id === 'malaria_fever')).toBe(true);

    const outcome = SurvivalSystem.consumeItem(stats, 'cinchona_pubescens_quina');
    expect(outcome.stats.activeEffects.some((e) => e.id === 'malaria_fever')).toBe(false);
  });
});
