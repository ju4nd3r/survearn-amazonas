import { BiomeId, StatusEffectId } from '../../data/schemas';

export type LanguageCode = 'es' | 'en';
export type DifficultyMode = 'explorer' | 'survivalist' | 'amazon_realist';
export type WeatherType = 'clear' | 'humid_haze' | 'tropical_rain' | 'heavy_storm';
export type DiscoveryLevel = 'observed' | 'mastered';
export type AIState = 'idle' | 'wander' | 'stalk' | 'chase' | 'attack' | 'flee';

export interface CharacterAppearance {
  name: string;
  bodyType: 'agile' | 'sturdy' | 'balanced';
  skinTone: string;
  hairStyle: 'short' | 'braided' | 'curly' | 'bun';
  hairColor: string;
  outfit: 'expedition_vest' | 'river_poncho' | 'botanist_shirt';
  startingBackpack: 'botanist' | 'fisher' | 'pathfinder';
}

export interface ActiveStatusEffect {
  id: StatusEffectId;
  remainingSec: number;
}

export interface SurvivalStats {
  health: number;
  hunger: number;
  thirst: number;
  stamina: number;
  bodyTemp: number;
  wetness: number;
  activeEffects: ActiveStatusEffect[];
}

export interface InventoryItemSlot {
  itemId: string;
  count: number;
}

export interface BuiltStructure {
  id: string;
  recipeId: string;
  x: number;
  y: number;
}

export interface WorldResourceNode {
  nodeKey: string;
  kind: 'plant' | 'material';
  itemId: string;
  tileX: number;
  tileY: number;
  x: number;
  y: number;
  harvested: boolean;
}

export interface ThreatEntity {
  id: string;
  speciesId: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  state: AIState;
  stateTimerSec: number;
  attackCooldownSec: number;
}

export interface NPCEntity {
  id: string;
  npcId: string;
  x: number;
  y: number;
}

export interface GameSettings {
  language: LanguageCode;
  volume: number;
  leftHanded: boolean;
  colorblindMode: boolean;
  reduceMotion: boolean;
  textScale: 100 | 115 | 130;
  fpsCap: 30 | 60;
}

export interface WorldTile {
  tileX: number;
  tileY: number;
  biome: BiomeId;
  elevation: number;
  isRescuePier?: boolean;
}
