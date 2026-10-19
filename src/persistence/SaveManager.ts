import { IndexedDBConfig } from '../config/constants';
import { GameSettings } from '../core/types/game.types';
import { SaveFileV2 } from '../data/schemas';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import { computeSaveChecksum, parseAndMigrateSaveData } from './migrations';

export type SaveSlotId = 'autosave' | 'slot_1' | 'slot_2' | 'slot_3';

const DEFAULT_SETTINGS: GameSettings = {
  language: 'es',
  volume: 0.7,
  leftHanded: false,
  colorblindMode: false,
  reduceMotion: false,
  textScale: 100,
  fpsCap: 60
};

export class SaveManagerService {
  private readonly adapter = new IndexedDBAdapter();

  public async saveGame(
    slotId: SaveSlotId,
    payloadWithoutChecksum: Omit<SaveFileV2, 'checksum' | 'saveSlotId' | 'savedAtISO' | 'schemaVersion'>
  ): Promise<SaveFileV2> {
    const base: Omit<SaveFileV2, 'checksum'> = {
      schemaVersion: 2,
      saveSlotId: slotId,
      savedAtISO: new Date().toISOString(),
      ...payloadWithoutChecksum
    };
    const fullSave: SaveFileV2 = {
      ...base,
      checksum: computeSaveChecksum(base)
    };
    await this.adapter.setItem(IndexedDBConfig.savesStore, slotId, fullSave);
    return fullSave;
  }

  public async loadGame(slotId: SaveSlotId): Promise<SaveFileV2 | null> {
    const raw = await this.adapter.getItem<unknown>(IndexedDBConfig.savesStore, slotId);
    if (!raw) return null;
    return parseAndMigrateSaveData(raw);
  }

  public async listSlots(): Promise<Record<SaveSlotId, SaveFileV2 | null>> {
    const slots: SaveSlotId[] = ['autosave', 'slot_1', 'slot_2', 'slot_3'];
    const result: Record<SaveSlotId, SaveFileV2 | null> = {
      autosave: null,
      slot_1: null,
      slot_2: null,
      slot_3: null
    };
    for (const s of slots) {
      try {
        result[s] = await this.loadGame(s);
      } catch {
        result[s] = null;
      }
    }
    return result;
  }

  public exportSaveToString(save: SaveFileV2): string {
    return JSON.stringify(save, null, 2);
  }

  public async importSaveFromString(jsonString: string, targetSlot: SaveSlotId): Promise<SaveFileV2> {
    const raw = JSON.parse(jsonString) as unknown;
    const migrated = parseAndMigrateSaveData(raw);
    const { checksum: _old, saveSlotId: _slot, savedAtISO: _iso, schemaVersion: _ver, ...rest } = migrated;
    return this.saveGame(targetSlot, rest);
  }

  public async saveSettings(settings: GameSettings): Promise<void> {
    await this.adapter.setItem(IndexedDBConfig.settingsStore, 'user_settings', settings);
  }

  public async loadSettings(): Promise<GameSettings> {
    const stored = await this.adapter.getItem<Partial<GameSettings>>(
      IndexedDBConfig.settingsStore,
      'user_settings'
    );
    return {
      ...DEFAULT_SETTINGS,
      ...(stored ?? {})
    };
  }

  public async resetAllData(): Promise<void> {
    await this.adapter.clearAll();
  }
}

export const SaveManager = new SaveManagerService();
