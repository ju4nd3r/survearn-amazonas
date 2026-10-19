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
  private playerFacing: 'side' | 'down' | 'up' = 'down';
  private wasInWater = false;
  private activeCanoeId: string | null = null;
  private playerActionBusyUntil = 0;
  private isSleepingTransition = false;

  private tileGroup!: Phaser.GameObjects.Group;
  private nodeSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private threatSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private npcSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private npcPromptIndicators = new Map<string, Phaser.GameObjects.Container>();
  private structureSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private nightOverlay!: Phaser.GameObjects.Rectangle;

  private simAccumulatorMs = 0;
  private aiAccumulatorMs = 0;
  private autosaveAccumulatorMs = 0;
  private victoryTriggered = false;
  private isGamePaused = false;
  private currentNearbyNpcId: string | null = null;

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

    EventBus.on('LANGUAGE_CHANGED', () => {
      const pText = i18n.getLanguage() === 'es' ? 'ℹ️ [E] Hablar' : 'ℹ️ [E] Talk';
      for (const container of this.npcPromptIndicators.values()) {
        const textObj = container.list[1] as Phaser.GameObjects.Text | undefined;
        if (textObj) textObj.setText(pText);
      }
    });

    EventBus.on('GAME_PAUSE_CHANGED', ({ paused }) => {
      this.isGamePaused = paused;
      if (paused) {
        this.anims.pauseAll();
      } else {
        this.anims.resumeAll();
      }
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
    this.playerFacing = 'down';
    this.wasInWater = false;
    this.activeCanoeId = null;
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

    // Place moored wooden dugout canoes at the northern and southern riverbanks so player can cross by boat
    const northShoreY = (Math.floor(this.worldData.heightTiles * 0.68) - 2) * TILE_SIZE + 8;
    const southShoreY = (Math.floor(this.worldData.heightTiles * 0.68) + 3) * TILE_SIZE + 8;
    this.builtStructures = [
      {
        id: 'canoe_dock_north',
        recipeId: 'curiara_canoa_rescate',
        x: this.worldData.spawnX + TILE_SIZE,
        y: northShoreY
      },
      {
        id: 'canoe_dock_south',
        recipeId: 'curiara_canoa_rescate',
        x: this.worldData.spawnX + TILE_SIZE * 6,
        y: southShoreY
      }
    ];

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
    for (const c of this.npcPromptIndicators.values()) c.destroy();
    this.nodeSprites.clear();
    this.threatSprites.clear();
    this.npcSprites.clear();
    this.structureSprites.clear();
    this.npcPromptIndicators.clear();

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

    // Render detailed 24x24 botanical & material resource nodes
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

    // Render Friendly NPCs with breathing idle animation & prominent Information Beacon badge
    const lang = i18n.getLanguage();
    const promptText = lang === 'es' ? 'ℹ️ [E] Hablar' : 'ℹ️ [E] Talk';
    for (const npc of this.worldData.npcs) {
      const spr = this.add.sprite(npc.x, npc.y, 'npc_mentor').setDepth(8);
      spr.play('npc_idle');
      this.npcSprites.set(npc.id, spr);

      // Create floating Information Beacon & interaction prompt badge above NPC
      const badgeBg = this.add.graphics();
      badgeBg.fillStyle(0x071b12, 0.95);
      badgeBg.lineStyle(1.5, 0xf1c40f, 1);
      badgeBg.fillRoundedRect(-32, -8, 64, 16, 4);
      badgeBg.strokeRoundedRect(-32, -8, 64, 16, 4);

      const label = this.add
        .text(0, 0, promptText, {
          fontSize: '8px',
          color: '#fef9e7',
          fontStyle: 'bold',
          stroke: '#071b12',
          strokeThickness: 2
        })
        .setOrigin(0.5);

      const promptContainer = this.add
        .container(npc.x, npc.y - 20, [badgeBg, label])
        .setDepth(22)
        .setAlpha(0);

      this.tweens.add({
        targets: promptContainer,
        y: npc.y - 24,
        duration: 650,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.npcPromptIndicators.set(npc.id, promptContainer);
    }

    // Render Threats & Wildlife with dedicated species animations and water vs ground adaptations
    for (const threat of this.worldData.threats) {
      const isJaguar = threat.speciesId.includes('jaguar');
      const isFish = threat.speciesId.includes('pirarucu');
      const isAnaconda = threat.speciesId.includes('anaconda');
      const isSnake =
        threat.speciesId.includes('talla_equis') || threat.speciesId.includes('verrugosa');
      const texKey = isJaguar
        ? 'creature_jaguar'
        : isFish
          ? 'creature_fish'
          : isAnaconda
            ? 'creature_anaconda'
            : isSnake
              ? 'creature_snake'
              : 'creature_caiman';
      const spr = this.add.sprite(threat.x, threat.y, texKey).setDepth(9);

      const threatTile = this.getTileAtWorld(threat.x, threat.y);
      const inWater = threatTile?.biome === 'aquatic';

      if (isJaguar) spr.play(inWater ? 'jaguar_swim' : 'jaguar_idle');
      else if (isFish) spr.play(inWater ? 'fish_swim' : 'fish_flop');
      else if (isAnaconda) spr.play(inWater ? 'anaconda_swim' : 'anaconda_slither');
      else if (isSnake) spr.play('snake_coil');
      else spr.play(inWater ? 'caiman_swim' : 'caiman_walk');

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
      .sprite(playerX, playerY, this.currentCharTexKey, 13)
      .setDepth(10);
    this.playerSprite.play(`${this.currentCharTexKey}_idle_${this.playerFacing}`);

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
    if (!this.playerSprite || !this.worldData || this.isSleepingTransition || this.isGamePaused) return;

    const dtSec = Math.min(0.1, deltaMs / 1000);
    const move = this.inputCtrl.getMovement();
    const isMoving = Math.abs(move.dx) > 0.01 || Math.abs(move.dy) > 0.01;
    const currentTile = this.getTileAtWorld(this.playerSprite.x, this.playerSprite.y);
    const inWater = currentTile?.biome === 'aquatic';

    // Auto-board moored riverbank canoe when stepping onto it toward the river
    if (!this.activeCanoeId && isMoving && (inWater || currentTile?.biome === 'riverbank')) {
      const nearbyCanoe = this.builtStructures.find(
        (s) =>
          s.recipeId === 'curiara_canoa_rescate' &&
          Math.hypot(s.x - this.playerSprite.x, s.y - this.playerSprite.y) <= 18
      );
      if (nearbyCanoe) {
        this.activeCanoeId = nearbyCanoe.id;
        AudioSynth.playChime('craft');
      }
    }

    const ridingCanoe = this.activeCanoeId !== null;

    // 1. Apply Player Movement, Directional Perspective, Swimming & Canoe Navigation
    const baseSpeed = 62;
    const biomeMult = ridingCanoe
      ? inWater
        ? 1.24
        : 0.92
      : inWater
        ? 0.58
        : currentTile?.biome === 'varzea'
          ? 0.82
          : 1.0;
    const sprintMult = move.sprinting && this.stats.stamina > 10 ? 1.38 : 1.0;
    const currentDriftX = inWater && !ridingCanoe ? 8 * dtSec : 0;

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

    const nextTile = this.getTileAtWorld(nextX, nextY);

    // If riding a canoe and walking onto dry inland forest (terra_firme or varzea), dock the canoe at shore
    if (
      ridingCanoe &&
      nextTile &&
      nextTile.biome !== 'aquatic' &&
      nextTile.biome !== 'riverbank'
    ) {
      const canoeSpr = this.structureSprites.get(this.activeCanoeId!);
      if (canoeSpr) canoeSpr.setDepth(6);
      this.activeCanoeId = null;
    }

    this.playerSprite.setPosition(nextX, nextY);

    // Sync active canoe hull directly underneath the player
    if (this.activeCanoeId) {
      const canoeStruct = this.builtStructures.find((s) => s.id === this.activeCanoeId);
      if (canoeStruct) {
        canoeStruct.x = nextX;
        canoeStruct.y = nextY + 3;
      }
      const canoeSpr = this.structureSprites.get(this.activeCanoeId);
      if (canoeSpr) {
        canoeSpr.setPosition(nextX, nextY + 3);
        canoeSpr.setDepth(9.5);
        if (move.dx < -0.05) canoeSpr.setFlipX(true);
        else if (move.dx > 0.05) canoeSpr.setFlipX(false);
      }
    }

    // Update 4-directional perspective facing (down / up / side)
    if (isMoving) {
      if (Math.abs(move.dy) > Math.abs(move.dx) * 1.05 && !inWater && !this.activeCanoeId) {
        this.playerFacing = move.dy > 0 ? 'down' : 'up';
        this.playerSprite.setFlipX(false);
      } else {
        this.playerFacing = 'side';
        if (move.dx < -0.05) {
          this.playerSprite.setFlipX(true);
        } else if (move.dx > 0.05) {
          this.playerSprite.setFlipX(false);
        }
      }
    }

    // Entry water splash burst when plunging into the river without a boat
    if (inWater && !this.wasInWater && !this.activeCanoeId) {
      this.spawnWaterSplashEffect(nextX, nextY + 3);
    }
    this.wasInWater = inWater;

    if (timeMs > this.playerActionBusyUntil) {
      let targetAnim: string;
      if (this.activeCanoeId) {
        targetAnim = isMoving
          ? `${this.currentCharTexKey}_paddle`
          : `${this.currentCharTexKey}_paddle_idle`;
      } else if (inWater) {
        targetAnim = isMoving
          ? `${this.currentCharTexKey}_swim`
          : `${this.currentCharTexKey}_swim_idle`;
      } else {
        targetAnim = isMoving
          ? `${this.currentCharTexKey}_walk_${this.playerFacing}`
          : `${this.currentCharTexKey}_idle_${this.playerFacing}`;
      }
      this.playerSprite.anims.timeScale = isMoving ? sprintMult : 1.0;
      if (this.playerSprite.anims.currentAnim?.key !== targetAnim) {
        this.playerSprite.play(targetAnim, true);
      }
    }

    // Spawn water wake ripples (when swimming or paddling canoe) or footstep dust on land
    if (isMoving && timeMs % 180 < deltaMs + 12) {
      if (inWater || this.activeCanoeId) {
        const wake = this.add
          .circle(nextX, nextY + 4, this.activeCanoeId ? 5 : 3, 0x5dade2, 0.45)
          .setStrokeStyle(1, 0xd6eaf8, 0.85)
          .setDepth(4);
        this.tweens.add({
          targets: wake,
          radius: this.activeCanoeId ? 14 : 10,
          alpha: 0,
          duration: 380,
          onComplete: () => wake.destroy()
        });
      } else {
        const stepColor = currentTile?.biome === 'riverbank' ? 0xd5bdaf : 0x58d68d;
        const footOffsetX =
          (Math.floor(timeMs / 180) % 2 === 0 ? -3 : 3) * (this.playerSprite.flipX ? -1 : 1);
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

    // 1b. Update proximity Information Beacon & notify HUD / Touch controls
    let closestNpc: { id: string; npcId: string; name: string; role: string; dist: number } | null =
      null;
    for (const npc of this.worldData.npcs) {
      const indicator = this.npcPromptIndicators.get(npc.id);
      const dist = Math.hypot(npc.x - nextX, npc.y - nextY);
      if (dist <= 48) {
        if (!closestNpc || dist < closestNpc.dist) {
          const def = ContentRegistry.npcs.find((n) => n.id === npc.npcId);
          const lang = i18n.getLanguage();
          closestNpc = {
            id: npc.id,
            npcId: npc.npcId,
            name: def?.name ?? npc.npcId,
            role: def?.role[lang] ?? '',
            dist
          };
        }
      }
      if (indicator) {
        indicator.setAlpha(dist <= 48 ? 1 : 0);
      }
    }

    if (closestNpc) {
      if (this.currentNearbyNpcId !== closestNpc.npcId) {
        this.currentNearbyNpcId = closestNpc.npcId;
        EventBus.emit('NPC_PROXIMITY_CHANGED', {
          nearbyNpcId: closestNpc.npcId,
          npcName: closestNpc.name,
          role: closestNpc.role
        });
      }
    } else if (this.currentNearbyNpcId !== null) {
      this.currentNearbyNpcId = null;
      EventBus.emit('NPC_PROXIMITY_CHANGED', {
        nearbyNpcId: null,
        npcName: null,
        role: null
      });
    }

    // 2. AI Tick (10 Hz / every 100ms) with Water vs Ground Adaptive Animations
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
          if (res.threat.vx < -0.5) spr.setFlipX(true);
          else if (res.threat.vx > 0.5) spr.setFlipX(false);

          const threatTile = this.getTileAtWorld(res.threat.x, res.threat.y);
          const inWater = threatTile?.biome === 'aquatic';

          if (res.threat.speciesId.includes('jaguar')) {
            let desiredAnim: string;
            if (inWater) {
              desiredAnim = 'jaguar_swim';
            } else {
              const isRunning =
                res.threat.state === 'chase' ||
                res.threat.state === 'attack' ||
                res.threat.state === 'flee' ||
                Math.hypot(res.threat.vx, res.threat.vy) > 30;
              desiredAnim = isRunning ? 'jaguar_run' : 'jaguar_idle';
            }
            if (spr.anims.currentAnim?.key !== desiredAnim) {
              spr.play(desiredAnim, true);
            }
          } else if (res.threat.speciesId.includes('caiman')) {
            const desiredAnim = inWater ? 'caiman_swim' : 'caiman_walk';
            if (spr.anims.currentAnim?.key !== desiredAnim) {
              spr.play(desiredAnim, true);
            }
          } else if (res.threat.speciesId.includes('anaconda')) {
            const desiredAnim = inWater ? 'anaconda_swim' : 'anaconda_slither';
            if (spr.anims.currentAnim?.key !== desiredAnim) {
              spr.play(desiredAnim, true);
            }
          } else if (res.threat.speciesId.includes('pirarucu')) {
            const desiredAnim = inWater ? 'fish_swim' : 'fish_flop';
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
        inWater: inWater && !this.activeCanoeId,
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

  private spawnWaterSplashEffect(x: number, y: number): void {
    const ring = this.add
      .circle(x, y, 4, 0x5dade2, 0.7)
      .setStrokeStyle(1.5, 0xffffff, 0.95)
      .setDepth(23);
    this.tweens.add({
      targets: ring,
      radius: 16,
      alpha: 0,
      duration: 380,
      onComplete: () => ring.destroy()
    });

    for (let i = 0; i < 6; i++) {
      const drop = this.add
        .rectangle(x, y, 2, 2, i % 2 === 0 ? 0xffffff : 0x85c1e9)
        .setDepth(24);
      const angle = (Math.PI * 2 * i) / 6;
      this.tweens.add({
        targets: drop,
        x: x + Math.cos(angle) * 11,
        y: y + Math.sin(angle) * 8 - 4,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => drop.destroy()
      });
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

  private playHarvestSequence(
    kind: 'plant' | 'material' | 'water',
    itemId: string,
    itemDisplayName: string,
    sourceX: number,
    sourceY: number,
    nodeSprite?: Phaser.GameObjects.Sprite
  ): void {
    const harvestStyle = ProceduralAtlasGenerator.getHarvestStyleForItem(kind, itemId);
    const lootTexKey = ProceduralAtlasGenerator.getLootIconTextureKey(itemId);

    // Lock character movement animation for 650ms so the 6-frame harvest + hold-up animation plays cleanly
    this.playerActionBusyUntil = this.time.now + 650;
    this.playerSprite.setFlipX(sourceX < this.playerSprite.x);
    this.playerSprite.play(`${this.currentCharTexKey}_${harvestStyle}`, true);

    // 1. Node Reaction & Biome Debris Particles according to harvest style
    if (harvestStyle === 'pick_fruit') {
      // Shake palm/fruit tree canopy horizontally while berries & leaves rain down, then shrink away
      if (nodeSprite) {
        this.tweens.add({
          targets: nodeSprite,
          x: { from: sourceX - 3, to: sourceX + 3 },
          duration: 55,
          yoyo: true,
          repeat: 3,
          onComplete: () => {
            this.tweens.add({
              targets: nodeSprite,
              scaleX: 0.25,
              scaleY: 0.25,
              alpha: 0,
              duration: 180,
              onComplete: () => nodeSprite.destroy()
            });
          }
        });
      }
      const particleColors = [0x2ecc71, 0x27ae60, 0x8e44ad, 0xe67e22, 0xf1c40f];
      for (let i = 0; i < 7; i++) {
        const pColor = particleColors[i % particleColors.length] ?? 0x2ecc71;
        const drop = this.add
          .rectangle(
            sourceX + (Math.random() - 0.5) * 14,
            sourceY - 6 + (Math.random() - 0.5) * 6,
            2,
            2,
            pColor
          )
          .setDepth(24);
        this.tweens.add({
          targets: drop,
          x: drop.x + (Math.random() - 0.5) * 12,
          y: sourceY + 6 + Math.random() * 6,
          alpha: 0,
          duration: 360 + i * 35,
          ease: 'Quad.easeIn',
          onComplete: () => drop.destroy()
        });
      }
    } else if (harvestStyle === 'chop_wood') {
      // Machete slash flash + woodchip & bark splinters + tree topple
      const slashArc = this.add.circle(sourceX, sourceY, 5, 0xf8fafc, 0.85).setDepth(25);
      this.tweens.add({
        targets: slashArc,
        scaleX: 2.2,
        scaleY: 0.45,
        alpha: 0,
        duration: 190,
        onComplete: () => slashArc.destroy()
      });

      if (nodeSprite) {
        nodeSprite.setTintFill(0xffffff);
        this.time.delayedCall(80, () => {
          if (nodeSprite.active) nodeSprite.clearTint();
        });
        this.tweens.add({
          targets: nodeSprite,
          x: sourceX + (sourceX >= this.playerSprite.x ? 4 : -4),
          angle: sourceX >= this.playerSprite.x ? 28 : -28,
          scaleY: 0.65,
          alpha: 0,
          duration: 320,
          ease: 'Back.easeIn',
          onComplete: () => nodeSprite.destroy()
        });
      }

      const chipColors = [0xd35400, 0xe67e22, 0xf5cba7, 0x6e2c00];
      for (let i = 0; i < 8; i++) {
        const chipColor = chipColors[i % chipColors.length] ?? 0xd35400;
        const chip = this.add
          .rectangle(sourceX, sourceY - 2, 3, 2, chipColor)
          .setDepth(24);
        const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4;
        const dist = 10 + Math.random() * 10;
        this.tweens.add({
          targets: chip,
          x: sourceX + Math.cos(angle) * dist,
          y: sourceY + Math.sin(angle) * dist + 4,
          angle: 180,
          alpha: 0,
          duration: 340,
          ease: 'Cubic.easeOut',
          onComplete: () => chip.destroy()
        });
      }
    } else if (harvestStyle === 'dig_tuber') {
      // Uproot pop upward + flying dark Amazonian soil clods
      if (nodeSprite) {
        this.tweens.add({
          targets: nodeSprite,
          y: sourceY - 9,
          scaleX: 1.25,
          scaleY: 1.25,
          duration: 160,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: nodeSprite,
              scaleX: 0.1,
              scaleY: 0.1,
              alpha: 0,
              duration: 150,
              onComplete: () => nodeSprite.destroy()
            });
          }
        });
      }
      const soilColors = [0x5d4037, 0x784212, 0x935116, 0x2ecc71];
      for (let i = 0; i < 8; i++) {
        const sColor = soilColors[i % soilColors.length] ?? 0x5d4037;
        const clod = this.add.rectangle(sourceX, sourceY + 3, 2, 2, sColor).setDepth(24);
        this.tweens.add({
          targets: clod,
          x: sourceX + (Math.random() - 0.5) * 22,
          y: sourceY - 8 + Math.random() * 14,
          alpha: 0,
          duration: 350,
          ease: 'Quad.easeOut',
          onComplete: () => clod.destroy()
        });
      }
    } else if (harvestStyle === 'scoop_water') {
      // Concentric river water ripples + glistening water droplets
      for (let r = 0; r < 2; r++) {
        const ripple = this.add
          .circle(sourceX, sourceY + 2, 3, 0x5dade2, 0.65)
          .setStrokeStyle(1, 0xd6eaf8, 0.9)
          .setDepth(23);
        this.tweens.add({
          targets: ripple,
          radius: 15 + r * 6,
          alpha: 0,
          duration: 420 + r * 110,
          onComplete: () => ripple.destroy()
        });
      }
      for (let i = 0; i < 6; i++) {
        const droplet = this.add.rectangle(sourceX, sourceY, 2, 2, 0xaed6f1).setDepth(24);
        this.tweens.add({
          targets: droplet,
          x: sourceX + (Math.random() - 0.5) * 16,
          y: sourceY - 10 + Math.random() * 12,
          alpha: 0,
          duration: 320,
          onComplete: () => droplet.destroy()
        });
      }
    } else {
      // gather_ground: sparkle pop + leaf/dust flecks
      if (nodeSprite) {
        this.tweens.add({
          targets: nodeSprite,
          y: sourceY - 5,
          scaleX: 1.3,
          scaleY: 0.3,
          alpha: 0,
          duration: 240,
          onComplete: () => nodeSprite.destroy()
        });
      }
      for (let i = 0; i < 6; i++) {
        const fleck = this.add
          .rectangle(sourceX, sourceY, 2, 2, i % 2 === 0 ? 0xf7dc6f : 0x58d68d)
          .setDepth(24);
        this.tweens.add({
          targets: fleck,
          x: sourceX + (Math.random() - 0.5) * 18,
          y: sourceY - 6 + (Math.random() - 0.5) * 14,
          alpha: 0,
          duration: 300,
          onComplete: () => fleck.destroy()
        });
      }
    }

    // 2. Flying 16x16 Collectible Loot Icon Arc -> Explorer's Raised Hands -> Into Backpack
    const lootSprite = this.add
      .sprite(sourceX, sourceY - 2, lootTexKey)
      .setDepth(27)
      .setScale(0.55);

    const glowRing = this.add
      .circle(sourceX, sourceY - 2, 7, 0xf4d03f, 0.38)
      .setDepth(26);

    // Stage A: Pop out of harvested node up above the player's raised hands
    this.tweens.add({
      targets: [lootSprite, glowRing],
      x: () => this.playerSprite.x,
      y: () => this.playerSprite.y - 17,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 280,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Stage B: Hold aloft briefly with golden discovery pulse, then tuck into backpack
        this.tweens.add({
          targets: glowRing,
          scaleX: 1.7,
          scaleY: 1.7,
          alpha: 0,
          duration: 260,
          onComplete: () => glowRing.destroy()
        });

        this.tweens.add({
          targets: lootSprite,
          x: () => this.playerSprite.x,
          y: () => this.playerSprite.y - 4,
          scaleX: 0.2,
          scaleY: 0.2,
          alpha: 0,
          delay: 150,
          duration: 210,
          ease: 'Cubic.easeIn',
          onComplete: () => lootSprite.destroy()
        });
      }
    });

    // 3. Floating "+1 Item Name" banner rising clearly above the loot icon
    const banner = this.add
      .text(this.playerSprite.x, this.playerSprite.y - 24, `+1 ${itemDisplayName}`, {
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#fef9e7',
        stroke: '#09170e',
        strokeThickness: 2.5
      })
      .setOrigin(0.5)
      .setDepth(28);

    this.tweens.add({
      targets: banner,
      y: this.playerSprite.y - 40,
      alpha: 0,
      duration: 850,
      ease: 'Cubic.easeOut',
      onComplete: () => banner.destroy()
    });
  }

  private handleInteractAction(): void {
    const px = this.playerSprite.x;
    const py = this.playerSprite.y;

    // 0. Check if boarding or disembarking a River Canoe (Curiara / Potrillo)
    if (this.activeCanoeId) {
      const currentTile = this.getTileAtWorld(px, py);
      if (currentTile && currentTile.biome !== 'aquatic') {
        const canoeSpr = this.structureSprites.get(this.activeCanoeId);
        if (canoeSpr) canoeSpr.setDepth(6);
        this.activeCanoeId = null;
        AudioSynth.playChime('craft');
        EventBus.emit('TOAST_MESSAGE', {
          text:
            i18n.getLanguage() === 'es'
              ? '🛶 Canoa amarrada en la orilla.'
              : '🛶 Canoe moored at the riverbank.',
          type: 'info'
        });
        return;
      }
    } else {
      const nearbyCanoe = this.builtStructures.find(
        (s) => s.recipeId === 'curiara_canoa_rescate' && Math.hypot(s.x - px, s.y - py) <= 34
      );
      if (nearbyCanoe) {
        this.activeCanoeId = nearbyCanoe.id;
        this.playerSprite.setPosition(nearbyCanoe.x, nearbyCanoe.y - 3);
        AudioSynth.playChime('craft');
        EventBus.emit('TOAST_MESSAGE', {
          text:
            i18n.getLanguage() === 'es'
              ? '🛶 Navegando en Canoa Amazónica — cruza el río con seguridad.'
              : '🛶 Boarded River Canoe — paddle safely across the river.',
          type: 'success'
        });
        return;
      }
    }

    // 1. Check nearby Friendly NPC first
    for (const npc of this.worldData.npcs) {
      if (Math.hypot(npc.x - px, npc.y - py) <= 48) {
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
      }

      const itemName = i18n.getLanguage() === 'es' ? res.itemNameEs : res.itemNameEn;
      this.playHarvestSequence(
        nearestNode.kind,
        nearestNode.itemId,
        itemName,
        nearestNode.x,
        nearestNode.y,
        spr
      );

      AudioSynth.playChime('harvest');
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
      const waterMat = ContentRegistry.getMaterial('agua_rio_cruda');
      const waterName = waterMat ? waterMat.commonName[i18n.getLanguage()] : 'Agua de Río';
      this.playHarvestSequence('water', 'agua_rio_cruda', waterName, px, py + 4);
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
