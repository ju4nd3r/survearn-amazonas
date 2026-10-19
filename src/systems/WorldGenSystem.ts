import { TILE_SIZE, WORLD_HEIGHT_TILES, WORLD_WIDTH_TILES } from '../config/constants';
import { SeededRandom } from '../core/math/SeededRandom';
import {
  NPCEntity,
  ThreatEntity,
  WorldResourceNode,
  WorldTile
} from '../core/types/game.types';
import { ContentRegistry } from '../data/ContentRegistry';
import { BiomeId } from '../data/schemas';

export interface GeneratedWorldData {
  seed: string;
  widthTiles: number;
  heightTiles: number;
  tiles: WorldTile[][];
  resourceNodes: WorldResourceNode[];
  threats: ThreatEntity[];
  npcs: NPCEntity[];
  spawnX: number;
  spawnY: number;
  pierX: number;
  pierY: number;
}

export class WorldGenSystem {
  public static generateWorld(
    seed: string,
    harvestedNodeKeys: readonly string[] = []
  ): GeneratedWorldData {
    const rng = new SeededRandom(seed);
    const harvestedSet = new Set(harvestedNodeKeys);
    const widthTiles = WORLD_WIDTH_TILES;
    const heightTiles = WORLD_HEIGHT_TILES;
    const tiles: WorldTile[][] = [];

    const spawnTileX = 8;
    const spawnTileY = Math.floor(heightTiles / 2);
    const pierTileX = widthTiles - 4;
    const pierTileY = Math.floor(heightTiles / 2) + 2;

    // 1. Generate terrain biomes with winding Amazon tributary river along lower-middle band
    for (let y = 0; y < heightTiles; y++) {
      const row: WorldTile[] = [];
      for (let x = 0; x < widthTiles; x++) {
        const riverCenterY =
          Math.floor(heightTiles * 0.68) + Math.round(Math.sin(x * 0.22) * 2.5);
        const distToRiver = Math.abs(y - riverCenterY);
        const elevationNoise = rng.noise2D(x * 0.14, y * 0.14, 101);

        let biome: BiomeId = 'terra_firme';
        let elevation = elevationNoise;

        if (distToRiver <= 2) {
          biome = 'aquatic';
          elevation = 0.1;
        } else if (distToRiver <= 4) {
          biome = 'riverbank';
          elevation = 0.32;
        } else if (distToRiver <= 8 || elevationNoise < 0.38) {
          biome = 'varzea';
          elevation = 0.45;
        } else {
          biome = 'terra_firme';
          elevation = 0.78;
        }

        // Guarantee safe riverbank clearing around player spawn & eastern rescue pier
        if (Math.hypot(x - spawnTileX, y - spawnTileY) <= 3.5) {
          biome = 'riverbank';
          elevation = 0.55;
        }
        const isRescuePier = Math.hypot(x - pierTileX, y - pierTileY) <= 1.8;
        if (isRescuePier) {
          biome = 'riverbank';
          elevation = 0.6;
        }

        row.push({
          tileX: x,
          tileY: y,
          biome,
          elevation,
          isRescuePier
        });
      }
      tiles.push(row);
    }

    // 2. Pin authored onboarding nodes near spawn so vertical slice is always immediately testable
    const resourceNodes: WorldResourceNode[] = [];
    const addNode = (kind: 'plant' | 'material', itemId: string, tx: number, ty: number) => {
      const nodeKey = `${tx}:${ty}:${itemId}`;
      resourceNodes.push({
        nodeKey,
        kind,
        itemId,
        tileX: tx,
        tileY: ty,
        x: tx * TILE_SIZE + TILE_SIZE / 2,
        y: ty * TILE_SIZE + TILE_SIZE / 2,
        harvested: harvestedSet.has(nodeKey)
      });
    };

    // Authored starting clearing nodes (Edible Asaí, Toxic Raw Yuca Brava, Capirona Wood, River Stone, Chambira Fiber)
    addNode('plant', 'euterpe_precatoria_asai', spawnTileX + 2, spawnTileY - 1);
    addNode('plant', 'manihot_esculenta_brava', spawnTileX + 2, spawnTileY + 2);
    addNode('plant', 'croton_lechleri_sangre_drago', spawnTileX - 2, spawnTileY - 2);
    addNode('material', 'madera_capirona', spawnTileX - 2, spawnTileY + 1);
    addNode('material', 'madera_capirona', spawnTileX + 1, spawnTileY - 3);
    addNode('material', 'piedra_rio_silex', spawnTileX, spawnTileY + 3);
    addNode('material', 'fibra_chambira', spawnTileX + 3, spawnTileY);
    addNode('material', 'hoja_bijao', spawnTileX + 4, spawnTileY + 1);
    addNode('material', 'bambu_guadua_amaz', spawnTileX - 3, spawnTileY);
    addNode('material', 'resina_copal_brea', spawnTileX + 4, spawnTileY - 2);

    // 3. Procedurally scatter additional species & materials across biomes
    const allPlantIds = ContentRegistry.plants.map((p) => p.id);
    const worldMaterialIds = [
      'fibra_chambira',
      'madera_capirona',
      'hoja_bijao',
      'piedra_rio_silex',
      'resina_copal_brea',
      'arcilla_greda_blanca',
      'bambu_guadua_amaz',
      'totumo_crescencia'
    ];

    for (let y = 3; y < heightTiles - 3; y += 3) {
      for (let x = 3; x < widthTiles - 3; x += 3) {
        if (Math.hypot(x - spawnTileX, y - spawnTileY) < 5) continue;
        const tile = tiles[y]?.[x];
        if (!tile || tile.biome === 'aquatic') continue;

        const roll = rng.next();
        if (roll < 0.48) {
          const plantId = rng.pick(allPlantIds);
          addNode('plant', plantId, x, y);
        } else if (roll < 0.78) {
          const matId = rng.pick(worldMaterialIds);
          addNode('material', matId, x, y);
        }
      }
    }

    // 4. Spawn Friendly NPCs at safe landmarks
    const npcs: NPCEntity[] = [
      {
        id: 'npc_abuela_sabina',
        npcId: 'abuela_sabina',
        x: (spawnTileX + 5) * TILE_SIZE + 8,
        y: (spawnTileY - 1) * TILE_SIZE + 8
      },
      {
        id: 'npc_mateo_pescador',
        npcId: 'mateo_pescador',
        x: (spawnTileX + 12) * TILE_SIZE + 8,
        y: (spawnTileY + 4) * TILE_SIZE + 8
      },
      {
        id: 'npc_dra_valentina',
        npcId: 'dra_valentina_sinchi',
        x: (spawnTileX + 18) * TILE_SIZE + 8,
        y: (spawnTileY - 4) * TILE_SIZE + 8
      }
    ];

    // 5. Spawn Threats (Jaguar, Black Caiman, Lancehead Viper, Mosquito Swarm, Pirarucú)
    const threats: ThreatEntity[] = [
      {
        id: 'threat_jaguar_1',
        speciesId: 'panthera_onca_jaguar',
        x: (spawnTileX + 9) * TILE_SIZE,
        y: (spawnTileY - 6) * TILE_SIZE,
        homeX: (spawnTileX + 9) * TILE_SIZE,
        homeY: (spawnTileY - 6) * TILE_SIZE,
        vx: 0,
        vy: 0,
        state: 'wander',
        stateTimerSec: 3,
        attackCooldownSec: 0
      },
      {
        id: 'threat_caiman_1',
        speciesId: 'melanosuchus_niger_caiman_negro',
        x: (spawnTileX + 14) * TILE_SIZE,
        y: (spawnTileY + 7) * TILE_SIZE,
        homeX: (spawnTileX + 14) * TILE_SIZE,
        homeY: (spawnTileY + 7) * TILE_SIZE,
        vx: 0,
        vy: 0,
        state: 'idle',
        stateTimerSec: 4,
        attackCooldownSec: 0
      },
      {
        id: 'threat_talla_equis_1',
        speciesId: 'bothrops_atrox_talla_equis',
        x: (spawnTileX + 6) * TILE_SIZE,
        y: (spawnTileY - 5) * TILE_SIZE,
        homeX: (spawnTileX + 6) * TILE_SIZE,
        homeY: (spawnTileY - 5) * TILE_SIZE,
        vx: 0,
        vy: 0,
        state: 'idle',
        stateTimerSec: 5,
        attackCooldownSec: 0
      },
      {
        id: 'threat_anaconda_1',
        speciesId: 'eunectes_murinus_anaconda',
        x: (spawnTileX + 4) * TILE_SIZE,
        y: (spawnTileY + 5) * TILE_SIZE,
        homeX: (spawnTileX + 4) * TILE_SIZE,
        homeY: (spawnTileY + 5) * TILE_SIZE,
        vx: 0,
        vy: 0,
        state: 'wander',
        stateTimerSec: 4,
        attackCooldownSec: 0
      },
      {
        id: 'prey_pirarucu_1',
        speciesId: 'arapaima_gigas_pirarucu',
        x: (spawnTileX + 8) * TILE_SIZE,
        y: (spawnTileY + 8) * TILE_SIZE,
        homeX: (spawnTileX + 8) * TILE_SIZE,
        homeY: (spawnTileY + 8) * TILE_SIZE,
        vx: 0,
        vy: 0,
        state: 'wander',
        stateTimerSec: 4,
        attackCooldownSec: 0
      }
    ];

    return {
      seed,
      widthTiles,
      heightTiles,
      tiles,
      resourceNodes,
      threats,
      npcs,
      spawnX: spawnTileX * TILE_SIZE + 8,
      spawnY: spawnTileY * TILE_SIZE + 8,
      pierX: pierTileX * TILE_SIZE + 8,
      pierY: pierTileY * TILE_SIZE + 8
    };
  }
}
