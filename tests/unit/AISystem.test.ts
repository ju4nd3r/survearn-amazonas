import { describe, expect, it } from 'vitest';
import { ThreatEntity } from '../../src/core/types/game.types';
import { AISystem } from '../../src/systems/AISystem';

describe('AISystem (Jaguar & Predator FSM)', () => {
  const baseJaguar: ThreatEntity = {
    id: 'jaguar_test',
    speciesId: 'panthera_onca_jaguar',
    x: 100,
    y: 100,
    homeX: 100,
    homeY: 100,
    vx: 0,
    vy: 0,
    state: 'idle',
    stateTimerSec: 2,
    attackCooldownSec: 0
  };

  it('transitions Jaguar from idle to stalk and chase as player approaches', () => {
    const stalkRes = AISystem.tickThreat(baseJaguar, {
      dtSec: 0.2,
      playerX: 200,
      playerY: 100,
      playerInShelter: false,
      structures: []
    });
    expect(stalkRes.threat.state).toBe('stalk');

    const chaseRes = AISystem.tickThreat(baseJaguar, {
      dtSec: 0.2,
      playerX: 150,
      playerY: 100,
      playerInShelter: false,
      structures: []
    });
    expect(chaseRes.threat.state).toBe('chase');
  });

  it('forces Jaguar into flee state when near a lit Capirona Campfire', () => {
    const fleeRes = AISystem.tickThreat(baseJaguar, {
      dtSec: 0.2,
      playerX: 140,
      playerY: 100,
      playerInShelter: false,
      structures: [
        {
          id: 'fire_1',
          recipeId: 'fogata_campamento',
          x: 135,
          y: 100
        }
      ]
    });
    expect(fleeRes.threat.state).toBe('flee');
  });
});
