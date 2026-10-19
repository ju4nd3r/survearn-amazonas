import tuning from '../config/tuning.json';
import { BuiltStructure, ThreatEntity } from '../core/types/game.types';
import { ContentRegistry } from '../data/ContentRegistry';
import { StatusEffectId } from '../data/schemas';

export interface AITickInput {
  dtSec: number;
  playerX: number;
  playerY: number;
  playerInShelter: boolean;
  structures: readonly BuiltStructure[];
}

export interface AITickResult {
  threat: ThreatEntity;
  damageDealtToPlayer: number;
  inflictedStatus?: StatusEffectId;
}

export class AISystem {
  public static tickThreat(threat: ThreatEntity, input: AITickInput): AITickResult {
    const next: ThreatEntity = { ...threat };
    const species = ContentRegistry.getAnimal(threat.speciesId);

    if (!species) {
      return { threat: next, damageDealtToPlayer: 0 };
    }

    const profile = species.aiProfile;
    next.stateTimerSec = Math.max(0, next.stateTimerSec - input.dtSec);
    next.attackCooldownSec = Math.max(0, next.attackCooldownSec - input.dtSec);

    const dxPlayer = input.playerX - next.x;
    const dyPlayer = input.playerY - next.y;
    const distToPlayer = Math.hypot(dxPlayer, dyPlayer);

    // Check if near any lit campfire
    const nearFire =
      profile.fearedByFire &&
      input.structures.some(
        (s) =>
          s.recipeId === 'fogata_campamento' &&
          Math.hypot(s.x - next.x, s.y - next.y) <= tuning.simulation.campfireSafeRadiusPx
      );

    const playerNearFire =
      profile.fearedByFire &&
      input.structures.some(
        (s) =>
          s.recipeId === 'fogata_campamento' &&
          Math.hypot(s.x - input.playerX, s.y - input.playerY) <=
            tuning.simulation.campfireSafeRadiusPx
      );

    // 1. Evaluate State Transitions
    if (nearFire || (playerNearFire && distToPlayer <= profile.aggroRadius)) {
      next.state = 'flee';
      next.stateTimerSec = 3.0;
    } else if (species.threatLevel === 'harmless_prey') {
      if (distToPlayer <= profile.fleeRadius) {
        next.state = 'flee';
      } else if (next.stateTimerSec <= 0) {
        next.state = next.state === 'idle' ? 'wander' : 'idle';
        next.stateTimerSec = 2.5;
      }
    } else {
      // Predator or defensive hazard
      if (input.playerInShelter) {
        next.state = 'wander';
      } else if (distToPlayer <= 22) {
        next.state = 'attack';
      } else if (distToPlayer <= profile.aggroRadius * 0.65) {
        next.state = 'chase';
      } else if (distToPlayer <= profile.aggroRadius) {
        next.state = 'stalk';
      } else {
        if (next.state === 'stalk' || next.state === 'chase' || next.state === 'attack') {
          next.state = 'wander';
          next.stateTimerSec = 2.0;
        } else if (next.stateTimerSec <= 0) {
          next.state = next.state === 'idle' ? 'wander' : 'idle';
          next.stateTimerSec = 3.0;
        }
      }
    }

    // 2. Execute State Steering & Actions
    let damageDealtToPlayer = 0;
    let inflictedStatus: StatusEffectId | undefined;

    switch (next.state) {
      case 'idle': {
        next.vx = 0;
        next.vy = 0;
        break;
      }
      case 'wander': {
        const dxHome = next.homeX - next.x;
        const dyHome = next.homeY - next.y;
        const distHome = Math.hypot(dxHome, dyHome);
        if (distHome > 96) {
          next.vx = (dxHome / distHome) * (profile.moveSpeed * 0.5);
          next.vy = (dyHome / distHome) * (profile.moveSpeed * 0.5);
        } else if (Math.hypot(next.vx, next.vy) < 1) {
          next.vx = profile.moveSpeed * 0.35;
          next.vy = 0;
        }
        break;
      }
      case 'stalk': {
        if (distToPlayer > 0.001) {
          next.vx = (dxPlayer / distToPlayer) * (profile.moveSpeed * 0.45);
          next.vy = (dyPlayer / distToPlayer) * (profile.moveSpeed * 0.45);
        }
        break;
      }
      case 'chase': {
        if (distToPlayer > 0.001) {
          next.vx = (dxPlayer / distToPlayer) * profile.moveSpeed;
          next.vy = (dyPlayer / distToPlayer) * profile.moveSpeed;
        }
        break;
      }
      case 'flee': {
        if (distToPlayer > 0.001) {
          next.vx = -(dxPlayer / distToPlayer) * (profile.moveSpeed * 1.15);
          next.vy = -(dyPlayer / distToPlayer) * (profile.moveSpeed * 1.15);
        } else {
          next.vx = -profile.moveSpeed;
          next.vy = 0;
        }
        break;
      }
      case 'attack': {
        next.vx = 0;
        next.vy = 0;
        if (next.attackCooldownSec <= 0 && !input.playerInShelter) {
          damageDealtToPlayer = profile.attackDamage;
          inflictedStatus = profile.inflictsStatus;
          next.attackCooldownSec = 2.2;
        }
        break;
      }
    }

    next.x += next.vx * input.dtSec;
    next.y += next.vy * input.dtSec;

    return {
      threat: next,
      damageDealtToPlayer,
      inflictedStatus
    };
  }
}
