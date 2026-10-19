import {
  CharacterAppearance,
  DiscoveryLevel,
  GameSettings,
  InventoryItemSlot,
  SurvivalStats,
  WeatherType
} from '../types/game.types';

export interface GameEventMap {
  LANGUAGE_CHANGED: { language: 'es' | 'en' };
  SETTINGS_UPDATED: { settings: GameSettings };
  START_NEW_GAME: {
    character: CharacterAppearance;
    seed: string;
    difficulty: 'explorer' | 'survivalist' | 'amazon_realist';
  };
  LOAD_SAVED_GAME: { slotId: 'autosave' | 'slot_1' | 'slot_2' | 'slot_3' };
  TRIGGER_MANUAL_SAVE: { slotId: 'autosave' | 'slot_1' | 'slot_2' | 'slot_3' };
  STATS_UPDATED: {
    stats: SurvivalStats;
    dayCount: number;
    timeOfDayMinutes: number;
    weather: WeatherType;
    nearCampfire: boolean;
    inShelter: boolean;
  };
  INVENTORY_UPDATED: { inventory: InventoryItemSlot[] };
  SPECIES_DISCOVERED: {
    speciesId: string;
    level: DiscoveryLevel;
    discoveredAll: Record<string, DiscoveryLevel>;
  };
  TOAST_MESSAGE: { text: string; type: 'info' | 'warning' | 'success' | 'danger' };
  OPEN_MODAL: { modal: 'bitacora' | 'crafting' | 'settings' | 'saves' | 'creator' | 'dialogue' };
  OPEN_NPC_DIALOGUE: { npcId: string };
  CRAFT_RECIPE: { recipeId: string };
  CONSUME_INVENTORY_ITEM: { itemId: string };
  PLAYER_INPUT_ACTION: { action: 'interact' | 'inspect' | 'rest' };
  VICTORY_ACHIEVED: { method: 'canoe' | 'pier'; dayCount: number; discoveredCount: number };
}

type Handler<T> = (payload: T) => void;

class TypedEventBus {
  private readonly listeners = new Map<keyof GameEventMap, Set<Handler<unknown>>>();

  public on<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler as Handler<unknown>);
    return () => {
      set?.delete(handler as Handler<unknown>);
    };
  }

  public emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      handler(payload);
    }
  }
}

export const EventBus = new TypedEventBus();
