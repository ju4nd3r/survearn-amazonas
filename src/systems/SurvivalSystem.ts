import tuning from '../config/tuning.json';
import { DifficultyMode, SurvivalStats, WeatherType } from '../core/types/game.types';
import { ContentRegistry } from '../data/ContentRegistry';
import { StatusEffectId } from '../data/schemas';

export interface SurvivalTickContext {
  dtSec: number;
  difficulty: DifficultyMode;
  isMoving: boolean;
  isSprinting: boolean;
  inWater: boolean;
  weather: WeatherType;
  isNight: boolean;
  nearLitCampfire: boolean;
  insideShelter: boolean;
}

export class SurvivalSystem {
  public static createInitialStats(): SurvivalStats {
    return {
      health: 100,
      hunger: 92,
      thirst: 90,
      stamina: 100,
      bodyTemp: tuning.simulation.normalBodyTemp,
      wetness: 8,
      activeEffects: []
    };
  }

  public static tick(stats: SurvivalStats, ctx: SurvivalTickContext): SurvivalStats {
    const next: SurvivalStats = {
      ...stats,
      activeEffects: stats.activeEffects.map((e) => ({ ...e }))
    };

    const diffMult = tuning.difficultyMultipliers[ctx.difficulty].decayMultiplier;
    const activityMult = ctx.isSprinting ? 1.55 : ctx.isMoving ? 1.15 : 0.85;
    const heatMult = ctx.weather === 'clear' && !ctx.isNight ? 1.2 : 1.0;

    // 1. Decay hunger and thirst
    next.hunger = this.clamp(
      next.hunger - tuning.simulation.baseHungerDecayPerSec * diffMult * activityMult * ctx.dtSec,
      0,
      100
    );
    next.thirst = this.clamp(
      next.thirst -
        tuning.simulation.baseThirstDecayPerSec * diffMult * activityMult * heatMult * ctx.dtSec,
      0,
      100
    );

    // 2. Stamina drain / regen
    const hasWellFed = next.activeEffects.some((e) => e.id === 'well_fed');
    const staminaDrainMult = hasWellFed ? 0.75 : 1.0;
    if (ctx.inWater && ctx.isMoving) {
      next.stamina = this.clamp(
        next.stamina - tuning.simulation.swimStaminaDrainPerSec * staminaDrainMult * ctx.dtSec,
        0,
        100
      );
    } else if (ctx.isSprinting && ctx.isMoving) {
      next.stamina = this.clamp(
        next.stamina - tuning.simulation.sprintStaminaDrainPerSec * staminaDrainMult * ctx.dtSec,
        0,
        100
      );
    } else {
      const hydrationFactor = next.thirst > 25 ? 1.0 : 0.45;
      next.stamina = this.clamp(
        next.stamina + tuning.simulation.staminaRegenPerSec * hydrationFactor * ctx.dtSec,
        0,
        100
      );
    }

    // 3. Wetness & Body Temperature
    if (ctx.inWater) {
      next.wetness = this.clamp(next.wetness + 22 * ctx.dtSec, 0, 100);
    } else if (
      (ctx.weather === 'tropical_rain' || ctx.weather === 'heavy_storm') &&
      !ctx.insideShelter
    ) {
      const rainRate = ctx.weather === 'heavy_storm' ? 10 : 5;
      next.wetness = this.clamp(next.wetness + rainRate * ctx.dtSec, 0, 100);
    } else if (ctx.nearLitCampfire || ctx.insideShelter) {
      next.wetness = this.clamp(next.wetness - 14 * ctx.dtSec, 0, 100);
    } else {
      next.wetness = this.clamp(next.wetness - 3 * ctx.dtSec, 0, 100);
    }

    const hasFever = next.activeEffects.some((e) => e.id === 'malaria_fever');
    let targetTemp = tuning.simulation.normalBodyTemp;
    if (hasFever) {
      targetTemp = 38.9;
    } else if (ctx.isNight && next.wetness > 50 && !ctx.nearLitCampfire && !ctx.insideShelter) {
      targetTemp = 35.1;
    } else if (ctx.nearLitCampfire) {
      targetTemp = 37.1;
    }
    next.bodyTemp = Number(
      (next.bodyTemp + (targetTemp - next.bodyTemp) * Math.min(1, 0.25 * ctx.dtSec)).toFixed(2)
    );

    // 4. Tick active status effects
    for (const effect of next.activeEffects) {
      const cfg = tuning.statusEffects[effect.id];
      if (cfg) {
        next.health = this.clamp(next.health - cfg.healthDrainPerSec * ctx.dtSec, 0, 100);
        next.thirst = this.clamp(next.thirst - cfg.thirstDrainPerSec * ctx.dtSec, 0, 100);
      }
      effect.remainingSec = Math.max(0, effect.remainingSec - ctx.dtSec);
    }
    next.activeEffects = next.activeEffects.filter((e) => e.remainingSec > 0);

    // 5. Starvation / Dehydration / Hypothermia penalties
    if (next.hunger <= 0) {
      next.health = this.clamp(
        next.health - tuning.simulation.starvationHealthDrainPerSec * ctx.dtSec,
        0,
        100
      );
    }
    if (next.thirst <= 0) {
      next.health = this.clamp(
        next.health - tuning.simulation.dehydrationHealthDrainPerSec * ctx.dtSec,
        0,
        100
      );
    }
    if (next.bodyTemp < tuning.simulation.hypothermiaTempThreshold) {
      next.health = this.clamp(next.health - 0.6 * ctx.dtSec, 0, 100);
    }

    return next;
  }

  public static consumeItem(
    stats: SurvivalStats,
    itemId: string
  ): { stats: SurvivalStats; wasToxicOrRawRisk: boolean } {
    const next: SurvivalStats = {
      ...stats,
      activeEffects: stats.activeEffects.map((e) => ({ ...e }))
    };

    const plant = ContentRegistry.getPlant(itemId);
    const material = ContentRegistry.getMaterial(itemId);
    const effects = plant?.effectsOnConsumeRaw ?? material?.effectsOnConsume;

    if (!effects) {
      return { stats: next, wasToxicOrRawRisk: false };
    }

    next.health = this.clamp(next.health + effects.healthDelta, 0, 100);
    next.hunger = this.clamp(next.hunger + effects.hungerDelta, 0, 100);
    next.thirst = this.clamp(next.thirst + effects.thirstDelta, 0, 100);
    next.stamina = this.clamp(next.stamina + effects.staminaDelta, 0, 100);

    let wasToxicOrRawRisk = false;

    if (effects.cureStatusEffect) {
      next.activeEffects = next.activeEffects.filter((e) => e.id !== effects.cureStatusEffect);
    }

    if (effects.addStatusEffect) {
      this.addOrRefreshEffect(next, effects.addStatusEffect);
      if (effects.addStatusEffect !== 'well_fed') {
        wasToxicOrRawRisk = true;
      }
    }

    if (effects.healthDelta < 0) {
      wasToxicOrRawRisk = true;
    }

    return { stats: next, wasToxicOrRawRisk };
  }

  public static addOrRefreshEffect(stats: SurvivalStats, effectId: StatusEffectId): void {
    const duration = tuning.statusEffects[effectId].defaultDurationSec;
    const existing = stats.activeEffects.find((e) => e.id === effectId);
    if (existing) {
      existing.remainingSec = Math.max(existing.remainingSec, duration);
    } else {
      stats.activeEffects.push({ id: effectId, remainingSec: duration });
    }
  }

  private static clamp(val: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, val));
  }
}
