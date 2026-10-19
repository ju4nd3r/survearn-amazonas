export const GAME_TITLE = 'survearn — Edition: Amazonas Colombia';
export const GAME_SUBTITLE = 'Selva Viva';
export const TILE_SIZE = 16;
export const CHUNK_SIZE_TILES = 16;
export const WORLD_WIDTH_TILES = 48;
export const WORLD_HEIGHT_TILES = 48;
export const AUTOSAVE_INTERVAL_MS = 45000;
export const CURRENT_SAVE_SCHEMA_VERSION = 2;
export const IndexedDBConfig = {
  dbName: 'survearn_amazonas_db',
  dbVersion: 1,
  savesStore: 'saves',
  settingsStore: 'settings'
} as const;
