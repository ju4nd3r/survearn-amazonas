import Phaser from 'phaser';
import { ProceduralAtlasGenerator } from '../assets/ProceduralAtlasGenerator';
import { AudioSynth } from '../assets/WebAudioSynthesizer';
import { AUTOSAVE_INTERVAL_MS, TILE_SIZE } from '../config/constants';
import tuning from '../config/tuning.json';
import { EventBus } from '../core/events/EventBus';
import {
  BuiltStructure,
  CharacterAppearance,
  DifficultyMode,
  DiscoveryLevel,
  InventoryItemSlot,
  SurvivalStats,
  WeatherType
} from '../core/types/game.types';
import { ContentRegistry } from '../data/ContentRegistry';
import { i18n } from '../i18n/I18nService';
import { SaveManager, SaveSlotId } from '../persistence/SaveManager';
import { AISystem } from '../systems/AISystem';
import { CraftingSystem } from '../systems/CraftingSystem';
import { FieldGuideSystem } from '../systems/FieldGuideSystem';
import { ForagingSystem } from '../systems/ForagingSystem';
import { SurvivalSystem } from '../systems/SurvivalSystem';
import { WeatherSystem } from '../systems/WeatherSystem';
import { GeneratedWorldData, WorldGenSystem } from '../systems/WorldGenSystem';
import { InputController } from './controllers/InputController';

export class WorldScene extends Phaser.Scene {
  private inputCtrl!: InputController;
  private worldData!: GeneratedWorldData;

  private character: CharacterAppearance = {
    name: 'Yurupari',
    bodyType: 'balanced',
    skinTone: '#c68652',
    hairStyle: 'braided',
    hairColor: '#1c1c1c',
    outfit: 'expedition_vest',
    startingBackpack: 'botanist'
  };
  private difficulty: DifficultyMode = 'survivalist';
  private stats: SurvivalStats = SurvivalSystem.createInitialStats();
  private inventory: InventoryItemSlot[] = [];
  private discoveredSpecies: Record<string, DiscoveryLevel> = {};
  private builtStructures: BuiltStructure[] = [];
  private harvestedNodeKeys: string[] = [];

  private dayCount = 1;
  private timeOfDayMinutes = 8 * 60 + 30; // 08:30 AM
  private weather: WeatherType = 'clear';
  private riverLevel = 0.25;

  private playerSprite!: Phaser.GameObjects.Sprite;
  private tileGroup!: Phaser.GameObjects.Group;
  private nodeSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private threatSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private npcSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private structureSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private nightOverlay!: Phaser.GameObjects.Rectangle;

  private simAccumulatorMs = 0;
  private aiAccumulatorMs = 0;
  private autosaveAccumulatorMs = 0;
  private victoryTriggered = false;

  constructor() {
    super({ key: 'WorldScene' });
  }

  public create(): void {
    this.inputCtrl = new InputController(this);
    this.tileGroup = this.add.group();

    this.startNewExpedition(this.character, 'AMAZONAS-2026', 'survivalist');

    // Subscribe to UI / EventBus commands
    EventBus.on('START_NEW_GAME', ({ character, seed, difficulty }) => {
      this.startNewExpedition(character, seed, difficulty);
    });

    EventBus.on('LOAD_SAVED_GAME', ({ slotId }) => {
      void this.loadFromSlot(slotId);
    });

    EventBus.on('TRIGGER_MANUAL_SAVE', ({ slotId }) => {
      void this.saveToSlot(slotId, true);
    });

    EventBus.on('PLAYER_INPUT_ACTION', ({ action }) => {
      if (action === 'interact') {
        this.handleInteractAction();
      } else if (action === 'inspect') {
        this.handleInspectAction();
      } else if (action === 'rest') {
        this.handleRestAction();
      }
    });

    EventBus.on('CRAFT_RECIPE', ({ recipeId }) => {
      this.handleCraftRecipe(recipeId);
    });

    EventBus.on('CONSUME_INVENTORY_ITEM', ({ itemId }) => {
      this.handleConsumeInventoryItem(itemId);
    });
  }

  private startNewExpedition(
    character: CharacterAppearance,
    seed: string,
    difficulty: DifficultyMode
  ): void {
    this.character = { ...character };
    this.difficulty = difficulty;
    this.stats = SurvivalSystem.createInitialStats();
    this.dayCount = 1;
    this.timeOfDayMinutes = 8 * 60 + 30;
    this.weather = 'clear';
    this.riverLevel = 0.25;
    this.builtStructures = [];
    this.harvestedNodeKeys = [];
    this.victoryTriggered = false;

    // Starting backpack items
    if (character.startingBackpack === 'botanist') {
      this.inventory = [
        { itemId: 'agua_hervida_segura', count: 2 },
        { itemId: 'croton_lechleri_sangre_drago', count: 1 }
      ];
      this.discoveredSpecies = {
        euterpe_precatoria_asai: 'observed',
        manihot_esculenta_brava: 'observed',
        croton_lechleri_sangre_drago: 'mastered'
      };
    } else if (character.startingBackpack === 'fisher') {
      this.inventory = [
        { itemId: 'fibra_chambira', count: 2 },
        { itemId: 'pescado_asado_patarasca', count: 1 },
        { itemId: 'agua_hervida_segura', count: 1 }
      ];
      this.discoveredSpecies = {
        arapaima_gigas_pirarucu: 'observed',
        prochilodus_nigricans_bocachico: 'mastered'
      };
    } else {
      this.inventory = [
        { itemId: 'madera_capirona', count: 2 },
        { itemId: 'piedra_rio_silex', count: 1 },
        { itemId: 'casabe_tostado', count: 1 }
      ];
      this.discoveredSpecies = {
        euterpe_precatoria_asai: 'observed'
      };
    }

    this.worldData = WorldGenSystem.generateWorld(seed, this.harvestedNodeKeys);
    this.rebuildSceneVisuals(this.worldData.spawnX, this.worldData.spawnY);
    this.broadcastAllState();
    void this.saveToSlot('autosave', false);
  }

  private rebuildSceneVisuals(playerX: number, playerY: number): void {
    this.tileGroup.clear(true, true);
    for (const s of this.nodeSprites.values()) s.destroy();
    for (const s of this.threatSprites.values()) s.destroy();
    for (const s of this.npcSprites.values()) s.destroy();
    for (const s of this.structureSprites.values()) s.destroy();
    this.nodeSprites.clear();
    this.threatSprites.clear();
    this.npcSprites.clear();
    this.structureSprites.clear();

    // Render terrain tiles
    for (let y = 0; y < this.worldData.heightTiles; y++) {
      const row = this.worldData.tiles[y];
      if (!row) continue;
      for (let x = 0; x < this.worldData.widthTiles; x++) {
        const tile = row[x];
        if (!tile) continue;
        const texKey = tile.isRescuePier
          ? 'tile_pier'
          : tile.biome === 'terra_firme'
            ? 'tile_terra_firme'
            : tile.biome === 'varzea'
              ? 'tile_varzea'
              : tile.biome === 'riverbank'
                ? 'tile_riverbank'
                : 'tile_aquatic';
        const img = this.add
          .image(x * TILE_SIZE + 8, y * TILE_SIZE + 8, texKey)
          .setDepth(1);
        this.tileGroup.add(img);
      }
    }

    // Render resource nodes
    for (const node of this.worldData.resourceNodes) {
      if (node.harvested) continue;
      const texKey =
        node.kind === 'material'
          ? 'node_material'
          : node.itemId.includes('manihot')
            ? 'node_tuber'
            : 'node_plant';
      const spr = this.add.sprite(node.x, node.y, texKey).setDepth(5);
      this.nodeSprites.set(node.nodeKey, spr);
    }

    // Render built structures
    for (const st of this.builtStructures) {
      this.spawnStructureSprite(st);
    }

    // Render Friendly NPCs
    for (const npc of this.worldData.npcs) {
      const spr = this.add.sprite(npc.x, npc.y, 'npc_mentor').setDepth(8);
      this.npcSprites.set(npc.id, spr);
    }

    // Render Threats & Wildlife
    for (const threat of this.worldData.threats) {
      const texKey = threat.speciesId.includes('jaguar')
        ? 'creature_jaguar'
        : threat.speciesId.includes('pirarucu')
          ? 'creature_fish'
          : 'creature_reptile';
      const spr = this.add.sprite(threat.x, threat.y, texKey).setDepth(9);
      this.threatSprites.set(threat.id, spr);
    }

    // Render Player layered character sprite
    const charTex = ProceduralAtlasGenerator.getOrCreateCharacterTexture(this, this.character);
    if (this.playerSprite) {
      this.playerSprite.destroy();
    }
    this.playerSprite = this.add.sprite(playerX, playerY, charTex).setDepth(10);

    // Night lighting tint overlay
    if (this.nightOverlay) {
      this.nightOverlay.destroy();
    }
    this.nightOverlay = this.add
      .rectangle(
        (this.worldData.widthTiles * TILE_SIZE) / 2,
        (this.worldData.heightTiles * TILE_SIZE) / 2,
        this.worldData.widthTiles * TILE_SIZE,
        this.worldData.heightTiles * TILE_SIZE,
        0x07121f,
        0
      )
      .setDepth(20);

    // Configure Camera with crisp pixel rounding
    this.cameras.main.setBounds(
      0,
      0,
      this.worldData.widthTiles * TILE_SIZE,
      this.worldData.heightTiles * TILE_SIZE
    );
    this.cameras.main.startFollow(this.playerSprite, true, 0.15, 0.15);
    this.cameras.main.setZoom(3);
  }

  public override update(_time: number, deltaMs: number): void {
    if (!this.playerSprite || !this.worldData) return;

    const dtSec = Math.min(0.1, deltaMs / 1000);
    const move = this.inputCtrl.getMovement();
    const isMoving = Math.abs(move.dx) > 0.01 || Math.abs(move.dy) > 0.01;
    const currentTile = this.getTileAtWorld(this.playerSprite.x, this.playerSprite.y);
    const inWater = currentTile?.biome === 'aquatic';

    // 1. Apply Player Movement
    const baseSpeed = 62;
    const biomeMult = inWater ? 0.58 : currentTile?.biome === 'varzea' ? 0.82 : 1.0;
    const sprintMult = move.sprinting && this.stats.stamina > 10 ? 1.38 : 1.0;
    const currentDriftX = inWater ? 8 * dtSec : 0; // Gentle downstream river current

    const nextX = Phaser.Math.Clamp(
      this.playerSprite.x + move.dx * baseSpeed * biomeMult * sprintMult * dtSec + currentDriftX,
      12,
      this.worldData.widthTiles * TILE_SIZE - 12
    );
    const nextY = Phaser.Math.Clamp(
      this.playerSprite.y + move.dy * baseSpeed * biomeMult * sprintMult * dtSec,
      12,
      this.worldData.heightTiles * TILE_SIZE - 12
    );
    this.playerSprite.setPosition(nextX, nextY);

    // Check if player reached the Eastern Community Pier Rescue Landmark
    if (
      !this.victoryTriggered &&
      Math.hypot(nextX - this.worldData.pierX, nextY - this.worldData.pierY) <= 22
    ) {
      this.victoryTriggered = true;
      AudioSynth.playChime('discover');
      EventBus.emit('TOAST_MESSAGE', {
        text: i18n.t('messages.victoryPier'),
        type: 'success'
      });
      EventBus.emit('VICTORY_ACHIEVED', {
        method: 'pier',
        dayCount: this.dayCount,
        discoveredCount: Object.keys(this.discoveredSpecies).length
      });
    }

    // 2. AI Tick (10 Hz / every 100ms)
    this.aiAccumulatorMs += deltaMs;
    if (this.aiAccumulatorMs >= 100) {
      const aiDt = this.aiAccumulatorMs / 1000;
      this.aiAccumulatorMs = 0;
      const inShelter = this.isPlayerInShelter();

      for (let i = 0; i < this.worldData.threats.length; i++) {
        const threat = this.worldData.threats[i];
        if (!threat) continue;
        const res = AISystem.tickThreat(threat, {
          dtSec: aiDt,
          playerX: this.playerSprite.x,
          playerY: this.playerSprite.y,
          playerInShelter: inShelter,
          structures: this.builtStructures
        });
        this.worldData.threats[i] = res.threat;
        const spr = this.threatSprites.get(res.threat.id);
        if (spr) {
          spr.setPosition(res.threat.x, res.threat.y);
        }

        if (res.damageDealtToPlayer > 0) {
          const diffDamageMult =
            tuning.difficultyMultipliers[this.difficulty].threatDamageMultiplier;
          this.stats.health = Math.max(
            0,
            this.stats.health - res.damageDealtToPlayer * diffDamageMult
          );
          if (res.inflictedStatus) {
            SurvivalSystem.addOrRefreshEffect(this.stats, res.inflictedStatus);
          }
          AudioSynth.playChime('warning');
          EventBus.emit('TOAST_MESSAGE', {
            text: i18n.t('messages.jaguarWarning'),
            type: 'danger'
          });
        }
      }
    }

    // 3. Survival & Weather Tick (2 Hz / every 500ms)
    this.simAccumulatorMs += deltaMs;
    if (this.simAccumulatorMs >= 500) {
      const simDt = this.simAccumulatorMs / 1000;
      this.simAccumulatorMs = 0;

      const nextClock = WeatherSystem.advanceClock(
        {
          dayCount: this.dayCount,
          timeOfDayMinutes: this.timeOfDayMinutes,
          weather: this.weather,
          riverLevel: this.riverLevel
        },
        simDt,
        this.worldData.seed
      );
      this.dayCount = nextClock.dayCount;
      this.timeOfDayMinutes = nextClock.timeOfDayMinutes;
      this.weather = nextClock.weather;
      this.riverLevel = nextClock.riverLevel;

      const isNight = WeatherSystem.isNight(this.timeOfDayMinutes);
      const nearFire = this.isPlayerNearCampfire();
      const inShelter = this.isPlayerInShelter();

      this.stats = SurvivalSystem.tick(this.stats, {
        dtSec: simDt,
        difficulty: this.difficulty,
        isMoving,
        isSprinting: move.sprinting,
        inWater,
        weather: this.weather,
        isNight,
        nearLitCampfire: nearFire,
        insideShelter: inShelter
      });

      this.nightOverlay.setAlpha(isNight ? (nearFire ? 0.28 : 0.52) : 0);
      this.broadcastStats();
    }

    // 4. Periodic Autosave
    this.autosaveAccumulatorMs += deltaMs;
    if (this.autosaveAccumulatorMs >= AUTOSAVE_INTERVAL_MS) {
      this.autosaveAccumulatorMs = 0;
      void this.saveToSlot('autosave', false);
    }
  }

  private handleInteractAction(): void {
    const px = this.playerSprite.x;
    const py = this.playerSprite.y;

    // 1. Check nearby Friendly NPC first
    for (const npc of this.worldData.npcs) {
      if (Math.hypot(npc.x - px, npc.y - py) <= 30) {
        const def = ContentRegistry.npcs.find((n) => n.id === npc.npcId);
        if (def) {
          for (const spId of def.unlocksSpeciesIds) {
            this.discoveredSpecies = FieldGuideSystem.unlockSpecies(
              this.discoveredSpecies,
              spId,
              'mastered'
            );
          }
          EventBus.emit('SPECIES_DISCOVERED', {
            speciesId: def.unlocksSpeciesIds[0] ?? 'euterpe_precatoria_asai',
            level: 'mastered',
            discoveredAll: this.discoveredSpecies
          });
          EventBus.emit('OPEN_NPC_DIALOGUE', { npcId: npc.npcId });
          return;
        }
      }
    }

    // 2. Check nearby Resource Node
    const nearestNode = ForagingSystem.findNearestNode(this.worldData.resourceNodes, px, py, 32);
    if (nearestNode) {
      const res = ForagingSystem.harvestNode(
        nearestNode,
        this.inventory,
        this.discoveredSpecies
      );
      this.inventory = res.inventory;
      this.discoveredSpecies = res.discovered;
      this.harvestedNodeKeys.push(nearestNode.nodeKey);

      const spr = this.nodeSprites.get(nearestNode.nodeKey);
      if (spr) {
        spr.destroy();
        this.nodeSprites.delete(nearestNode.nodeKey);
      }

      AudioSynth.playChime('harvest');
      const itemName = i18n.getLanguage() === 'es' ? res.itemNameEs : res.itemNameEn;
      EventBus.emit('TOAST_MESSAGE', {
        text: `${i18n.t('messages.harvested')} ${itemName}`,
        type: 'success'
      });
      this.broadcastAllState();
      return;
    }

    // 3. If standing in or adjacent to water, scoop Raw River Water
    const tile = this.getTileAtWorld(px, py);
    if (tile && (tile.biome === 'aquatic' || tile.biome === 'riverbank' || tile.biome === 'varzea')) {
      this.inventory = CraftingSystem.addItem(this.inventory, 'agua_rio_cruda', 1);
      this.discoveredSpecies = FieldGuideSystem.unlockSpecies(
        this.discoveredSpecies,
        'agua_rio_cruda',
        'observed'
      );
      AudioSynth.playChime('harvest');
      EventBus.emit('TOAST_MESSAGE', {
        text: i18n.t('messages.waterCollected'),
        type: 'info'
      });
      this.broadcastAllState();
    }
  }

  private handleInspectAction(): void {
    const px = this.playerSprite.x;
    const py = this.playerSprite.y;
    const lang = i18n.getLanguage();

    // Check nearby threat/creature first
    for (const threat of this.worldData.threats) {
      if (Math.hypot(threat.x - px, threat.y - py) <= 95) {
        const animal = ContentRegistry.getAnimal(threat.speciesId);
        if (animal) {
          this.discoveredSpecies = FieldGuideSystem.unlockSpecies(
            this.discoveredSpecies,
            animal.id,
            'observed'
          );
          AudioSynth.playChime('discover');
          EventBus.emit('TOAST_MESSAGE', {
            text: `${i18n.t('messages.inspected')} ${animal.commonName[lang]} (${animal.scientificName}) — ${animal.inspectionHint[lang]}`,
            type: 'info'
          });
          this.broadcastAllState();
          return;
        }
      }
    }

    // Check nearby plant/material node
    const node = ForagingSystem.findNearestNode(this.worldData.resourceNodes, px, py, 56);
    if (node) {
      this.discoveredSpecies = FieldGuideSystem.unlockSpecies(
        this.discoveredSpecies,
        node.itemId,
        'observed'
      );
      const plant = ContentRegistry.getPlant(node.itemId);
      const mat = ContentRegistry.getMaterial(node.itemId);
      const name = plant ? plant.commonName[lang] : mat ? mat.commonName[lang] : node.itemId;
      const hint = plant ? plant.inspectionHint[lang] : mat ? mat.description[lang] : '';

      AudioSynth.playChime('discover');
      EventBus.emit('TOAST_MESSAGE', {
        text: `${i18n.t('messages.inspected')} ${name} — ${hint}`,
        type: 'info'
      });
      this.broadcastAllState();
    }
  }

  private handleRestAction(): void {
    this.timeOfDayMinutes = (this.timeOfDayMinutes + 180) % 1440;
    if (this.timeOfDayMinutes < 180) {
      this.dayCount += 1;
    }
    const bonusHealth = this.isPlayerInShelter() || this.isPlayerNearCampfire() ? 18 : 8;
    this.stats.health = Math.min(100, this.stats.health + bonusHealth);
    this.stats.stamina = 100;
    this.broadcastStats();
    void this.saveToSlot('autosave', false);
  }

  private handleCraftRecipe(recipeId: string): void {
    const res = CraftingSystem.executeCraft(
      recipeId,
      this.inventory,
      this.isPlayerNearCampfire(),
      this.isPlayerInShelter()
    );

    if (!res.success) {
      EventBus.emit('TOAST_MESSAGE', {
        text:
          res.reason === 'needs_campfire'
            ? i18n.t('crafting.needsCampfire')
            : i18n.t('crafting.missingIngredients'),
        type: 'warning'
      });
      return;
    }

    this.inventory = res.inventory;
    AudioSynth.playChime('craft');

    if (res.placedStructureRecipeId) {
      const st: BuiltStructure = {
        id: `struct_${Date.now()}`,
        recipeId: res.placedStructureRecipeId,
        x: this.playerSprite.x + 16,
        y: this.playerSprite.y
      };
      this.builtStructures.push(st);
      this.spawnStructureSprite(st);

      if (res.placedStructureRecipeId === 'fogata_campamento') {
        EventBus.emit('TOAST_MESSAGE', {
          text: i18n.t('messages.campfireLit'),
          type: 'success'
        });
      } else if (res.placedStructureRecipeId === 'tambo_palafito_refugio') {
        EventBus.emit('TOAST_MESSAGE', {
          text: i18n.t('messages.shelterBuilt'),
          type: 'success'
        });
      } else if (res.placedStructureRecipeId === 'curiara_canoa_rescate') {
        this.victoryTriggered = true;
        EventBus.emit('TOAST_MESSAGE', {
          text: i18n.t('messages.victoryCanoe'),
          type: 'success'
        });
        EventBus.emit('VICTORY_ACHIEVED', {
          method: 'canoe',
          dayCount: this.dayCount,
          discoveredCount: Object.keys(this.discoveredSpecies).length
        });
      }
    } else {
      const recipe = ContentRegistry.getRecipe(recipeId);
      const lang = i18n.getLanguage();
      EventBus.emit('TOAST_MESSAGE', {
        text: `${i18n.t('messages.crafted')} ${recipe ? recipe.name[lang] : recipeId}`,
        type: 'success'
      });
    }

    this.broadcastAllState();
  }

  private handleConsumeInventoryItem(itemId: string): void {
    const slot = this.inventory.find((s) => s.itemId === itemId);
    if (!slot || slot.count <= 0) return;

    const outcome = SurvivalSystem.consumeItem(this.stats, itemId);
    this.stats = outcome.stats;
    this.inventory = CraftingSystem.removeItem(this.inventory, itemId, 1);
    this.discoveredSpecies = FieldGuideSystem.unlockSpecies(
      this.discoveredSpecies,
      itemId,
      'mastered'
    );

    const lang = i18n.getLanguage();
    const itemName = ContentRegistry.getItemDisplayName(itemId, lang);

    if (outcome.wasToxicOrRawRisk) {
      AudioSynth.playChime('warning');
      EventBus.emit('TOAST_MESSAGE', {
        text: `${i18n.t('messages.consumedToxic')} ${itemName}`,
        type: 'danger'
      });
    } else {
      AudioSynth.playChime('harvest');
      EventBus.emit('TOAST_MESSAGE', {
        text: `${i18n.t('messages.consumedSafe')} ${itemName}`,
        type: 'success'
      });
    }

    this.broadcastAllState();
  }

  private spawnStructureSprite(st: BuiltStructure): void {
    const texKey =
      st.recipeId === 'fogata_campamento'
        ? 'structure_campfire'
        : st.recipeId === 'tambo_palafito_refugio'
          ? 'structure_tambo'
          : 'structure_canoe';
    const spr = this.add.sprite(st.x, st.y, texKey).setDepth(6);
    this.structureSprites.set(st.id, spr);
  }

  private isPlayerNearCampfire(): boolean {
    if (!this.playerSprite) return false;
    return this.builtStructures.some(
      (s) =>
        s.recipeId === 'fogata_campamento' &&
        Math.hypot(s.x - this.playerSprite.x, s.y - this.playerSprite.y) <=
          tuning.simulation.campfireSafeRadiusPx
    );
  }

  private isPlayerInShelter(): boolean {
    if (!this.playerSprite) return false;
    return this.builtStructures.some(
      (s) =>
        s.recipeId === 'tambo_palafito_refugio' &&
        Math.hypot(s.x - this.playerSprite.x, s.y - this.playerSprite.y) <= 44
    );
  }

  private getTileAtWorld(wx: number, wy: number) {
    const tx = Math.floor(wx / TILE_SIZE);
    const ty = Math.floor(wy / TILE_SIZE);
    return this.worldData.tiles[ty]?.[tx];
  }

  private async saveToSlot(slotId: SaveSlotId, showToast: boolean): Promise<void> {
    if (!this.playerSprite || !this.worldData) return;
    await SaveManager.saveGame(slotId, {
      worldSeed: this.worldData.seed,
      dayCount: this.dayCount,
      timeOfDayMinutes: this.timeOfDayMinutes,
      weather: this.weather,
      riverLevel: this.riverLevel,
      difficulty: this.difficulty,
      character: this.character,
      playerState: {
        x: Math.round(this.playerSprite.x),
        y: Math.round(this.playerSprite.y),
        stats: this.stats,
        inventory: this.inventory,
        discoveredSpecies: this.discoveredSpecies,
        builtStructures: this.builtStructures,
        harvestedNodes: this.harvestedNodeKeys
      }
    });
    if (showToast) {
      EventBus.emit('TOAST_MESSAGE', {
        text: `💾 ${slotId.toUpperCase()} guardado / saved.`,
        type: 'success'
      });
    }
  }

  private async loadFromSlot(slotId: SaveSlotId): Promise<void> {
    const loaded = await SaveManager.loadGame(slotId);
    if (!loaded) return;

    this.character = loaded.character;
    this.difficulty = loaded.difficulty;
    this.dayCount = loaded.dayCount;
    this.timeOfDayMinutes = loaded.timeOfDayMinutes;
    this.weather = loaded.weather;
    this.riverLevel = loaded.riverLevel;
    this.stats = loaded.playerState.stats;
    this.inventory = loaded.playerState.inventory;
    this.discoveredSpecies = loaded.playerState.discoveredSpecies;
    this.builtStructures = loaded.playerState.builtStructures;
    this.harvestedNodeKeys = loaded.playerState.harvestedNodes;

    this.worldData = WorldGenSystem.generateWorld(loaded.worldSeed, this.harvestedNodeKeys);
    this.rebuildSceneVisuals(loaded.playerState.x, loaded.playerState.y);
    this.broadcastAllState();
  }

  private broadcastStats(): void {
    EventBus.emit('STATS_UPDATED', {
      stats: this.stats,
      dayCount: this.dayCount,
      timeOfDayMinutes: this.timeOfDayMinutes,
      weather: this.weather,
      nearCampfire: this.isPlayerNearCampfire(),
      inShelter: this.isPlayerInShelter()
    });
  }

  private broadcastAllState(): void {
    this.broadcastStats();
    EventBus.emit('INVENTORY_UPDATED', { inventory: this.inventory });
    EventBus.emit('SPECIES_DISCOVERED', {
      speciesId: 'euterpe_precatoria_asai',
      level: this.discoveredSpecies.euterpe_precatoria_asai ?? 'observed',
      discoveredAll: this.discoveredSpecies
    });
  }
}
