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
  private currentCharTexKey = '';
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
  private playerActionBusyUntil = 0;
  private isSleepingTransition = false;

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
      if (this.isSleepingTransition) return;
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

    // Render terrain tiles with 4 organic variants per biome to eliminate grid repetition
    for (let y = 0; y < this.worldData.heightTiles; y++) {
      const row = this.worldData.tiles[y];
      if (!row) continue;
      for (let x = 0; x < this.worldData.widthTiles; x++) {
        const tile = row[x];
        if (!tile) continue;
        const variantIdx = (x * 7 + y * 13) % 4;
        const suffix = variantIdx === 0 ? '' : `_${variantIdx}`;
        const texKey = tile.isRescuePier
          ? 'tile_pier'
          : tile.biome === 'terra_firme'
            ? `tile_terra_firme${suffix}`
            : tile.biome === 'varzea'
              ? `tile_varzea${suffix}`
              : tile.biome === 'riverbank'
                ? `tile_riverbank${suffix}`
                : `tile_aquatic${suffix}`;
        const img = this.add.image(x * TILE_SIZE + 8, y * TILE_SIZE + 8, texKey).setDepth(1);
        this.tileGroup.add(img);
      }
    }

    // Render detailed 24x24 botanical & material resource nodes with gentle canopy sway tween
    for (const node of this.worldData.resourceNodes) {
      if (node.harvested) continue;
      const texKey = ProceduralAtlasGenerator.getNodeTextureKey(node.kind, node.itemId);
      const spr = this.add.sprite(node.x, node.y, texKey).setDepth(5);
      this.nodeSprites.set(node.nodeKey, spr);
    }

    // Render built structures
    for (const st of this.builtStructures) {
      this.spawnStructureSprite(st);
    }

    // Render Friendly NPCs with breathing idle animation
    for (const npc of this.worldData.npcs) {
      const spr = this.add.sprite(npc.x, npc.y, 'npc_mentor').setDepth(8);
      spr.play('npc_idle');
      this.npcSprites.set(npc.id, spr);
    }

    // Render Threats & Wildlife with dedicated species animations
    for (const threat of this.worldData.threats) {
      const isJaguar = threat.speciesId.includes('jaguar');
      const isFish = threat.speciesId.includes('pirarucu');
      const isSnake = threat.speciesId.includes('talla_equis') || threat.speciesId.includes('verrugosa');
      const texKey = isJaguar
        ? 'creature_jaguar'
        : isFish
          ? 'creature_fish'
          : isSnake
            ? 'creature_snake'
            : 'creature_caiman';
      const spr = this.add.sprite(threat.x, threat.y, texKey).setDepth(9);
      if (isJaguar) spr.play('jaguar_idle');
      else if (isFish) spr.play('fish_swim');
      else if (isSnake) spr.play('snake_coil');
      else spr.play('caiman_move');

      this.threatSprites.set(threat.id, spr);
    }

    // Render Player 24x24 animated character spritesheet
    this.currentCharTexKey = ProceduralAtlasGenerator.getOrCreateCharacterTexture(
      this,
      this.character
    );
    if (this.playerSprite) {
      this.playerSprite.destroy();
    }
    this.playerSprite = this.add
      .sprite(playerX, playerY, this.currentCharTexKey, 0)
      .setDepth(10);
    this.playerSprite.play(`${this.currentCharTexKey}_idle`);

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

  public override update(timeMs: number, deltaMs: number): void {
    if (!this.playerSprite || !this.worldData || this.isSleepingTransition) return;

    const dtSec = Math.min(0.1, deltaMs / 1000);
    const move = this.inputCtrl.getMovement();
    const isMoving = Math.abs(move.dx) > 0.01 || Math.abs(move.dy) > 0.01;
    const currentTile = this.getTileAtWorld(this.playerSprite.x, this.playerSprite.y);
    const inWater = currentTile?.biome === 'aquatic';

    // 1. Apply Player Movement & Walk / Idle Animation State
    const baseSpeed = 62;
    const biomeMult = inWater ? 0.58 : currentTile?.biome === 'varzea' ? 0.82 : 1.0;
    const sprintMult = move.sprinting && this.stats.stamina > 10 ? 1.38 : 1.0;
    const currentDriftX = inWater ? 8 * dtSec : 0;

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

    if (move.dx < -0.05) {
      this.playerSprite.setFlipX(true);
    } else if (move.dx > 0.05) {
      this.playerSprite.setFlipX(false);
    }

    if (timeMs > this.playerActionBusyUntil) {
      const targetAnim = isMoving
        ? `${this.currentCharTexKey}_walk`
        : `${this.currentCharTexKey}_idle`;
      this.playerSprite.anims.timeScale = isMoving ? sprintMult : 1.0;
      if (this.playerSprite.anims.currentAnim?.key !== targetAnim) {
        this.playerSprite.play(targetAnim, true);
      }
    }

    // Spawn subtle footstep dust / water splash particles at boot level while walking
    if (isMoving && timeMs % 180 < deltaMs + 12) {
      const stepColor = inWater
        ? 0x85c1e9
        : currentTile?.biome === 'riverbank'
          ? 0xd5bdaf
          : 0x58d68d;
      const footOffsetX = (Math.floor(timeMs / 180) % 2 === 0 ? -3 : 3) * (this.playerSprite.flipX ? -1 : 1);
      const puff = this.add
        .rectangle(nextX + footOffsetX, nextY + 9, 2, 2, stepColor, 0.75)
        .setDepth(9);
      this.tweens.add({
        targets: puff,
        y: nextY + 6,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 260,
        onComplete: () => puff.destroy()
      });
    }

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

    // 2. AI Tick (10 Hz / every 100ms) with Jaguar Run / Pounce Animations
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
          if (res.threat.vx < -1) spr.setFlipX(true);
          else if (res.threat.vx > 1) spr.setFlipX(false);

          if (res.threat.speciesId.includes('jaguar')) {
            const isRunning =
              res.threat.state === 'chase' ||
              res.threat.state === 'attack' ||
              res.threat.state === 'flee' ||
              Math.hypot(res.threat.vx, res.threat.vy) > 30;
            const desiredAnim = isRunning ? 'jaguar_run' : 'jaguar_idle';
            if (spr.anims.currentAnim?.key !== desiredAnim) {
              spr.play(desiredAnim, true);
            }
          }
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

          // Visual hit flash & lunge feedback on player and attacker
          this.playerSprite.setTint(0xe74c3c);
          this.time.delayedCall(220, () => {
            if (this.playerSprite) this.playerSprite.clearTint();
          });

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

  private playPlayerActionPose(
    animSuffix: 'action' | 'inspect',
    badgeEmoji: string,
    targetX?: number,
    targetY?: number
  ): void {
    this.playerActionBusyUntil = this.time.now + 420;
    this.playerSprite.play(`${this.currentCharTexKey}_${animSuffix}`, true);

    if (targetX !== undefined) {
      this.playerSprite.setFlipX(targetX < this.playerSprite.x);
    }

    // Floating pixel action badge & harvest burst
    const floatText = this.add
      .text(this.playerSprite.x, this.playerSprite.y - 14, badgeEmoji, {
        fontSize: '10px',
        color: '#fef9e7',
        stroke: '#09170e',
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setDepth(25);

    this.tweens.add({
      targets: floatText,
      y: this.playerSprite.y - 26,
      alpha: 0,
      duration: 550,
      ease: 'Cubic.easeOut',
      onComplete: () => floatText.destroy()
    });

    if (targetX !== undefined && targetY !== undefined) {
      const ring = this.add.circle(targetX, targetY, 3, 0xf1c40f, 0.85).setDepth(24);
      this.tweens.add({
        targets: ring,
        radius: 13,
        alpha: 0,
        duration: 340,
        onComplete: () => ring.destroy()
      });
    }
  }

  private handleInteractAction(): void {
    const px = this.playerSprite.x;
    const py = this.playerSprite.y;

    // 1. Check nearby Friendly NPC first
    for (const npc of this.worldData.npcs) {
      if (Math.hypot(npc.x - px, npc.y - py) <= 32) {
        this.playPlayerActionPose('action', '💬', npc.x, npc.y);
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
    const nearestNode = ForagingSystem.findNearestNode(this.worldData.resourceNodes, px, py, 34);
    if (nearestNode) {
      this.playPlayerActionPose('action', '🌿 +1', nearestNode.x, nearestNode.y);
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
        this.nodeSprites.delete(nearestNode.nodeKey);
        this.tweens.add({
          targets: spr,
          scaleX: 1.35,
          scaleY: 0.2,
          alpha: 0,
          duration: 220,
          onComplete: () => spr.destroy()
        });
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
    if (
      tile &&
      (tile.biome === 'aquatic' || tile.biome === 'riverbank' || tile.biome === 'varzea')
    ) {
      this.playPlayerActionPose('action', '💧 +1', px, py);
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
      if (Math.hypot(threat.x - px, threat.y - py) <= 105) {
        this.playPlayerActionPose('inspect', '🔍📖', threat.x, threat.y);
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
    const node = ForagingSystem.findNearestNode(this.worldData.resourceNodes, px, py, 64);
    if (node) {
      this.playPlayerActionPose('inspect', '🔍📖', node.x, node.y);
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
      return;
    }

    this.playPlayerActionPose('inspect', '🔍');
  }

  private handleRestAction(): void {
    if (this.isSleepingTransition) return;
    this.isSleepingTransition = true;

    const sheltered = this.isPlayerInShelter() || this.isPlayerNearCampfire();
    const bonusHealth = sheltered ? 22 : 10;

    this.timeOfDayMinutes = (this.timeOfDayMinutes + 240) % 1440;
    if (this.timeOfDayMinutes < 240) {
      this.dayCount += 1;
    }

    this.stats.health = Math.min(100, this.stats.health + bonusHealth);
    this.stats.stamina = 100;
    if (sheltered) {
      this.stats.wetness = Math.max(0, this.stats.wetness - 45);
      this.stats.bodyTemp = tuning.simulation.normalBodyTemp;
    }

    // Floating Zzz animation above character while sleep curtain fades in/out
    const zzz = this.add
      .text(this.playerSprite.x, this.playerSprite.y - 14, '💤 Zzz...', {
        fontSize: '10px',
        color: '#f9e79f',
        stroke: '#09170e',
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setDepth(26);

    this.tweens.add({
      targets: zzz,
      y: this.playerSprite.y - 28,
      alpha: 0,
      duration: 1400,
      onComplete: () => zzz.destroy()
    });

    EventBus.emit('SLEEP_TRANSITION_START', {
      dayCount: this.dayCount,
      timeFormatted: WeatherSystem.formatClock(this.timeOfDayMinutes),
      healthRecovered: bonusHealth,
      sheltered
    });

    const isNight = WeatherSystem.isNight(this.timeOfDayMinutes);
    this.nightOverlay.setAlpha(isNight ? (this.isPlayerNearCampfire() ? 0.28 : 0.52) : 0);
    this.broadcastStats();
    void this.saveToSlot('autosave', false);

    this.time.delayedCall(1500, () => {
      this.isSleepingTransition = false;
    });
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
    this.playPlayerActionPose('action', '🔨✨');
    AudioSynth.playChime('craft');

    if (res.placedStructureRecipeId) {
      const st: BuiltStructure = {
        id: `struct_${Date.now()}`,
        recipeId: res.placedStructureRecipeId,
        x: this.playerSprite.x + 20,
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
      this.playPlayerActionPose('action', '🤢⚠️');
      AudioSynth.playChime('warning');
      EventBus.emit('TOAST_MESSAGE', {
        text: `${i18n.t('messages.consumedToxic')} ${itemName}`,
        type: 'danger'
      });
    } else {
      this.playPlayerActionPose('action', '💚✨');
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
    if (st.recipeId === 'fogata_campamento') {
      spr.play('campfire_burn');
    }
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
