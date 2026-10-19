import tuning from '../config/tuning.json';
import { SeededRandom } from '../core/math/SeededRandom';
import { WeatherType } from '../core/types/game.types';

export interface WeatherClockState {
  dayCount: number;
  timeOfDayMinutes: number; // 0..1439
  weather: WeatherType;
  riverLevel: number; // 0.0..1.0
}

export class WeatherSystem {
  public static advanceClock(
    current: WeatherClockState,
    dtSec: number,
    worldSeed: string
  ): WeatherClockState {
    const minutesAdded = dtSec * tuning.simulation.inGameMinutesPerRealSecond;
    let totalMinutes = current.timeOfDayMinutes + minutesAdded;
    let dayCount = current.dayCount;

    while (totalMinutes >= 1440) {
      totalMinutes -= 1440;
      dayCount += 1;
    }

    // Weather transitions deterministically every 4 in-game hours (240 mins)
    const weatherWindowIndex = Math.floor((dayCount * 1440 + totalMinutes) / 240);
    const rng = new SeededRandom(`${worldSeed}:weather:${weatherWindowIndex}`);
    const roll = rng.next();

    let weather: WeatherType = 'clear';
    if (roll < 0.45) {
      weather = 'clear';
    } else if (roll < 0.7) {
      weather = 'humid_haze';
    } else if (roll < 0.9) {
      weather = 'tropical_rain';
    } else {
      weather = 'heavy_storm';
    }

    // Seasonal river level oscillation + rain boost
    const baseCycle = 0.35 + 0.25 * Math.sin((dayCount + totalMinutes / 1440) * 0.8);
    const rainBoost = weather === 'heavy_storm' ? 0.2 : weather === 'tropical_rain' ? 0.1 : 0;
    const riverLevel = Number(Math.min(1, Math.max(0, baseCycle + rainBoost)).toFixed(2));

    return {
      dayCount,
      timeOfDayMinutes: Number(totalMinutes.toFixed(2)),
      weather,
      riverLevel
    };
  }

  public static isNight(timeOfDayMinutes: number): boolean {
    return timeOfDayMinutes >= 19 * 60 || timeOfDayMinutes < 5 * 60 + 30;
  }

  public static formatClock(timeOfDayMinutes: number): string {
    const hrs = Math.floor(timeOfDayMinutes / 60) % 24;
    const mins = Math.floor(timeOfDayMinutes % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
}
