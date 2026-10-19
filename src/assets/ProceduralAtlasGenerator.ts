import Phaser from 'phaser';
import { CharacterAppearance } from '../core/types/game.types';

export type HarvestStyle = 'chop_wood' | 'pick_fruit' | 'dig_tuber' | 'gather_ground' | 'scoop_water';

/**
 * Generates high-detail 24x24 pixel-art sprite sheets, 16x16 collectible loot icons,
 * multi-frame specialized harvesting animations, shaded terrain tiles, and wildlife sprites.
 */
export class ProceduralAtlasGenerator {
  public static registerBaseTextures(scene: Phaser.Scene): void {
    // 1. Shaded 16x16 Terrain Biome Tiles (4 variants each to break grid repetition)
    this.createTerrainVariants(scene);
    this.createPierTexture(scene, 'tile_pier');

    // 2. Detailed 24x24 Botanical & Material World Nodes
    this.createDetailedPalmTexture(scene, 'node_palm_asai', '#2ecc71', '#5b2c6f', '#6e4726');
    this.createDetailedPalmTexture(scene, 'node_palm_chontaduro', '#27ae60', '#e65c22', '#5c3c1e');
    this.createDetailedPalmTexture(scene, 'node_palm_moriche', '#1e8449', '#a93226', '#6e4726');
    this.createDetailedShrubTexture(scene, 'node_tuber_brava', '#2ecc71', '#c0392b', '#784212');
    this.createDetailedShrubTexture(scene, 'node_tuber_dulce', '#58d68d', '#d4ac0d', '#935116');
    this.createDetailedTreeFruitTexture(scene, 'node_fruit_tree', '#229954', '#f1c40f', '#5d4037');
    this.createDetailedMedicinalTreeTexture(scene, 'node_medicinal', '#1abc9c', '#c0392b', '#bdc3c7');
    this.createDetailedToxicVineTexture(scene, 'node_toxic', '#196f3d', '#8e44ad');

    // Detailed Materials (Wood logs, Flint stones, Chambira fibers, Bijao leaves, Bamboo, Resin/Clay)
    this.createDetailedWoodTexture(scene, 'node_mat_wood');
    this.createDetailedStoneTexture(scene, 'node_mat_stone');
    this.createDetailedFiberTexture(scene, 'node_mat_fiber');
    this.createDetailedLeafTexture(scene, 'node_mat_leaf');
    this.createDetailedBambooTexture(scene, 'node_mat_bamboo');
    this.createDetailedResinTexture(scene, 'node_mat_resin');

    // 3. Dedicated 16x16 Collectible Loot Icons (flown during collection & shown in UI)
    this.createCollectibleLootIcons(scene);

    // Legacy alias fallbacks so any external callers remain compatible
    this.createDetailedPalmTexture(scene, 'node_plant', '#2ecc71', '#6c3483', '#6e4726');
    this.createDetailedShrubTexture(scene, 'node_tuber', '#27ae60', '#a04000', '#6e4726');
    this.createDetailedStoneTexture(scene, 'node_material');

    // 4. Animated & Detailed Structures (Campfire 4 frames, Tambo 24x24, Curiara Canoe 24x24)
    this.createAnimatedCampfireSpritesheet(scene, 'structure_campfire');
    this.createDetailedTamboTexture(scene, 'structure_tambo');
    this.createDetailedCanoeTexture(scene, 'structure_canoe');

    // 5. Multi-Frame Wildlife & Mentor Spritesheets (24x24 per frame)
    this.createJaguarSpritesheet(scene, 'creature_jaguar');
    this.createCaimanSpritesheet(scene, 'creature_caiman');
    this.createSnakeSpritesheet(scene, 'creature_snake');
    this.createAnacondaSpritesheet(scene, 'creature_anaconda');
    this.createFishSpritesheet(scene, 'creature_fish');
    this.createNPCSpritesheet(scene, 'npc_mentor');

    // Register global Phaser animations
    this.registerGlobalAnimations(scene);
  }

  public static getNodeTextureKey(kind: 'plant' | 'material', itemId: string): string {
    if (kind === 'material') {
      if (itemId.includes('madera')) return 'node_mat_wood';
      if (itemId.includes('piedra')) return 'node_mat_stone';
      if (itemId.includes('fibra')) return 'node_mat_fiber';
      if (itemId.includes('hoja')) return 'node_mat_leaf';
      if (itemId.includes('bambu')) return 'node_mat_bamboo';
      return 'node_mat_resin';
    }
    if (itemId.includes('asai')) return 'node_palm_asai';
    if (itemId.includes('chontaduro')) return 'node_palm_chontaduro';
    if (itemId.includes('moriche')) return 'node_palm_moriche';
    if (itemId.includes('brava')) return 'node_tuber_brava';
    if (itemId.includes('dulce')) return 'node_tuber_dulce';
    if (itemId.includes('curare') || itemId.includes('dieffenbachia')) return 'node_toxic';
    if (
      itemId.includes('sangre_drago') ||
      itemId.includes('quina') ||
      itemId.includes('una_gato') ||
      itemId.includes('ajo') ||
      itemId.includes('huito')
    ) {
      return 'node_medicinal';
    }
    return 'node_fruit_tree';
  }

  public static getLootIconTextureKey(itemId: string): string {
    if (itemId.includes('asai') || itemId.includes('caimarona') || itemId.includes('camu')) {
      return 'loot_berries';
    }
    if (itemId.includes('chontaduro') || itemId.includes('moriche') || itemId.includes('araza')) {
      return 'loot_tropical_fruit';
    }
    if (itemId.includes('manihot') || itemId.includes('yuca')) {
      return 'loot_tuber';
    }
    if (
      itemId.includes('sangre_drago') ||
      itemId.includes('quina') ||
      itemId.includes('una_gato') ||
      itemId.includes('ajo') ||
      itemId.includes('huito')
    ) {
      return 'loot_medicine';
    }
    if (itemId.includes('madera') || itemId.includes('bambu')) {
      return 'loot_wood';
    }
    if (itemId.includes('piedra') || itemId.includes('arcilla')) {
      return 'loot_stone';
    }
    if (itemId.includes('fibra')) {
      return 'loot_fiber';
    }
    if (itemId.includes('hoja')) {
      return 'loot_leaf';
    }
    if (itemId.includes('agua')) {
      return 'loot_water';
    }
    return 'loot_tropical_fruit';
  }

  public static getHarvestStyleForItem(
    kind: 'plant' | 'material' | 'water',
    itemId: string
  ): HarvestStyle {
    if (kind === 'water' || itemId.includes('agua')) {
      return 'scoop_water';
    }
    if (kind === 'material') {
      if (itemId.includes('madera') || itemId.includes('bambu')) {
        return 'chop_wood';
      }
      return 'gather_ground';
    }
    if (itemId.includes('manihot') || itemId.includes('yuca')) {
      return 'dig_tuber';
    }
    if (
      itemId.includes('asai') ||
      itemId.includes('chontaduro') ||
      itemId.includes('moriche') ||
      itemId.includes('cacao') ||
      itemId.includes('copoazu') ||
      itemId.includes('araza') ||
      itemId.includes('caimarona') ||
      itemId.includes('camu')
    ) {
      return 'pick_fruit';
    }
    return 'gather_ground';
  }

  private static thumbCache = new Map<string, string>();

  public static getItemBiomeLocationHint(itemId: string, lang: 'es' | 'en'): string {
    if (itemId.includes('madera')) return lang === 'es' ? 'Troncos de Capirona (Selva)' : 'Capirona Trunks (Forest)';
    if (itemId.includes('piedra')) return lang === 'es' ? 'Orilla pedregosa del río' : 'Riverbank gravel';
    if (itemId.includes('fibra')) return lang === 'es' ? 'Palmas de cumare/chambira' : 'Chambira palm groves';
    if (itemId.includes('hoja') || itemId.includes('bijao')) return lang === 'es' ? 'Sotobosque húmedo' : 'Humid understory';
    if (itemId.includes('bambu') || itemId.includes('guadua')) return lang === 'es' ? 'Guaduales en la ribera' : 'Riverside bamboo';
    if (itemId.includes('resina') || itemId.includes('copal')) return lang === 'es' ? 'Corteza de árboles viejos' : 'Old-growth tree bark';
    if (itemId.includes('manihot') || itemId.includes('yuca')) return lang === 'es' ? 'Chagras y claros de selva' : 'Forest clearings';
    if (itemId.includes('agua')) return lang === 'es' ? 'Río Amazonas y cochas' : 'Amazon river & oxbow lakes';
    if (itemId.includes('pescado')) return lang === 'es' ? 'Aguas del río (con lanza/nasa)' : 'River waters (spear/trap)';
    if (itemId.includes('asai')) return lang === 'es' ? 'Palmas altas de asaí' : 'Tall asaí palms';
    if (itemId.includes('chontaduro')) return lang === 'es' ? 'Palmas de chontaduro' : 'Peach palms';
    if (itemId.includes('sangre_drago') || itemId.includes('quina')) return lang === 'es' ? 'Árboles medicinales' : 'Medicinal canopy';
    return lang === 'es' ? 'Explora la selva viva' : 'Explore the rainforest';
  }

  /**
   * Generates a crisp 24x24 pixel-art miniature data URL for an item so players can visually
   * recognize what to search for on the map.
   */
  public static getItemThumbnailDataUrl(itemId: string): string {
    const cached = this.thumbCache.get(itemId);
    if (cached) return cached;

    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.imageSmoothingEnabled = false;

    // Subtly dark circular backdrop for high contrast in UI
    ctx.fillStyle = 'rgba(7, 24, 15, 0.85)';
    ctx.beginPath();
    ctx.roundRect(1, 1, 22, 22, 4);
    ctx.fill();

    if (itemId.includes('madera')) {
      // Capirona wood log with bark & rings
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(3, 7, 18, 10);
      ctx.fillStyle = '#6e2c00';
      ctx.fillRect(4, 8, 16, 8);
      ctx.fillStyle = '#a04000';
      ctx.fillRect(5, 9, 14, 6);
      ctx.fillStyle = '#f5cba7';
      ctx.fillRect(16, 9, 3, 6); // End cut ring
      ctx.fillStyle = '#6e2c00';
      ctx.fillRect(17, 11, 1, 2);
    } else if (itemId.includes('piedra')) {
      // River flint stone
      ctx.fillStyle = '#1b2631';
      ctx.fillRect(5, 7, 14, 11);
      ctx.fillStyle = '#5d6d7e';
      ctx.fillRect(6, 8, 12, 9);
      ctx.fillStyle = '#85929e';
      ctx.fillRect(7, 9, 6, 4);
      ctx.fillStyle = '#ebf5fb';
      ctx.fillRect(8, 9, 2, 2);
    } else if (itemId.includes('fibra')) {
      // Chambira fiber roll
      ctx.fillStyle = '#7d6608';
      ctx.fillRect(4, 6, 16, 12);
      ctx.fillStyle = '#d4ac0d';
      ctx.fillRect(5, 7, 14, 10);
      ctx.fillStyle = '#f9e79f';
      ctx.fillRect(7, 9, 10, 2);
      ctx.fillRect(7, 13, 10, 2);
      ctx.fillStyle = '#9a7d0a';
      ctx.fillRect(11, 6, 2, 12);
    } else if (itemId.includes('hoja') || itemId.includes('bijao')) {
      // Large bijao leaf
      ctx.fillStyle = '#0e3a1d';
      ctx.fillRect(6, 3, 12, 18);
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(7, 4, 10, 16);
      ctx.fillStyle = '#58d68d';
      ctx.fillRect(8, 5, 4, 14);
      ctx.fillStyle = '#145a32';
      ctx.fillRect(11, 4, 1, 17); // Central leaf vein
    } else if (itemId.includes('bambu') || itemId.includes('guadua')) {
      // Guadua bamboo stalk
      ctx.fillStyle = '#145a32';
      ctx.fillRect(9, 2, 6, 20);
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(10, 3, 4, 18);
      ctx.fillStyle = '#f1c40f'; // Bamboo node joints
      ctx.fillRect(9, 7, 6, 2);
      ctx.fillRect(9, 14, 6, 2);
    } else if (itemId.includes('resina') || itemId.includes('copal')) {
      // Golden copal resin teardrop
      ctx.fillStyle = '#7e5109';
      ctx.fillRect(7, 6, 10, 12);
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(8, 7, 8, 10);
      ctx.fillStyle = '#f9e79f';
      ctx.fillRect(9, 8, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, 8, 2, 2);
    } else if (itemId.includes('manihot') || itemId.includes('yuca')) {
      // Cassava tuber root
      ctx.fillStyle = '#1b120c';
      ctx.fillRect(4, 7, 16, 10);
      ctx.fillStyle = '#784212';
      ctx.fillRect(5, 8, 14, 8);
      ctx.fillStyle = '#f5cba7'; // White starchy interior
      ctx.fillRect(14, 9, 4, 6);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(4, 5, 4, 3);
    } else if (itemId.includes('agua_hervida')) {
      // Purified steaming water totuma
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(5, 10, 14, 8);
      ctx.fillStyle = '#a04000';
      ctx.fillRect(6, 11, 12, 6);
      ctx.fillStyle = '#5dade2';
      ctx.fillRect(7, 11, 10, 3);
      // Steam wisps
      ctx.fillStyle = '#d6eaf8';
      ctx.fillRect(8, 6, 2, 3);
      ctx.fillRect(13, 5, 2, 4);
    } else if (itemId.includes('agua')) {
      // Raw river water in totuma gourd
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(5, 10, 14, 8);
      ctx.fillStyle = '#a04000';
      ctx.fillRect(6, 11, 12, 6);
      ctx.fillStyle = '#2980b9';
      ctx.fillRect(7, 11, 10, 4);
      ctx.fillStyle = '#5dade2';
      ctx.fillRect(9, 12, 2, 2);
    } else if (itemId.includes('pescado_asado')) {
      // Patarasca: roasted fish parcel wrapped in bijao leaf
      ctx.fillStyle = '#145a32';
      ctx.fillRect(4, 7, 16, 10);
      ctx.fillStyle = '#1e8449';
      ctx.fillRect(5, 8, 14, 8);
      ctx.fillStyle = '#f39c12'; // Chambira binding strings
      ctx.fillRect(9, 7, 2, 10);
      ctx.fillRect(14, 7, 2, 10);
    } else if (itemId.includes('pescado')) {
      // Fresh river fish
      ctx.fillStyle = '#1c2833';
      ctx.fillRect(3, 8, 18, 8);
      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(4, 9, 16, 6);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(6, 12, 11, 2);
      ctx.fillStyle = '#111111'; // Eye
      ctx.fillRect(17, 10, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(18, 10, 1, 1);
    } else if (itemId.includes('casabe')) {
      // Golden circular casabe flatbread
      ctx.fillStyle = '#935116';
      ctx.beginPath();
      ctx.arc(12, 12, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f5cba7';
      ctx.beginPath();
      ctx.arc(12, 12, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b9770e'; // Toast spots
      ctx.fillRect(9, 10, 2, 2);
      ctx.fillRect(13, 13, 2, 2);
    } else if (itemId.includes('lanza')) {
      // Bamboo fishing spear
      ctx.fillStyle = '#6e2c00';
      ctx.fillRect(4, 18, 15, 2);
      ctx.fillStyle = '#d35400';
      ctx.fillRect(17, 16, 4, 3);
      ctx.fillStyle = '#f1c40f'; // Fire-hardened point
      ctx.fillRect(20, 15, 3, 2);
    } else if (itemId.includes('machete')) {
      // Knapped stone bush knife
      ctx.fillStyle = '#6e2c00'; // Handle
      ctx.fillRect(5, 15, 4, 3);
      ctx.fillStyle = '#7f8c8d'; // Flint blade
      ctx.fillRect(8, 9, 12, 5);
      ctx.fillStyle = '#ecf0f1'; // Sharp cutting edge
      ctx.fillRect(9, 13, 11, 1);
    } else if (itemId.includes('trampa') || itemId.includes('nasa')) {
      // Woven conical fish trap
      ctx.fillStyle = '#7d6608';
      ctx.fillRect(4, 8, 16, 8);
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(6, 9, 12, 6);
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(16, 10, 2, 4);
    } else if (itemId.includes('hamaca')) {
      // Woven hammock
      ctx.fillStyle = '#7d6608';
      ctx.fillRect(3, 10, 18, 5);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(5, 11, 14, 3);
    } else if (itemId.includes('fogata')) {
      // Campfire
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(5, 15, 14, 4);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(8, 7, 8, 9);
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(9, 8, 6, 7);
      ctx.fillStyle = '#fef9e7';
      ctx.fillRect(11, 11, 2, 3);
    } else if (itemId.includes('tambo')) {
      // Palafito / Tambo shelter
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(6, 14, 2, 7);
      ctx.fillRect(16, 14, 2, 7);
      ctx.fillStyle = '#a04000';
      ctx.fillRect(4, 13, 16, 2);
      ctx.fillStyle = '#d35400'; // Thatched roof
      ctx.fillRect(3, 6, 18, 7);
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(6, 4, 12, 3);
    } else if (itemId.includes('canoa')) {
      // Curiara dugout canoe
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(3, 10, 18, 6);
      ctx.fillStyle = '#a04000';
      ctx.fillRect(5, 11, 14, 4);
      ctx.fillStyle = '#f5cba7'; // Paddle
      ctx.fillRect(9, 8, 2, 9);
    } else if (itemId.includes('asai')) {
      // Asaí berries
      ctx.fillStyle = '#1e8449';
      ctx.fillRect(10, 4, 4, 4);
      ctx.fillStyle = '#4a235a';
      ctx.fillRect(7, 8, 10, 10);
      ctx.fillStyle = '#8e44ad';
      ctx.fillRect(8, 9, 3, 3);
      ctx.fillRect(13, 9, 3, 3);
      ctx.fillRect(10, 13, 3, 3);
    } else if (itemId.includes('chontaduro')) {
      // Chontaduro fruit
      ctx.fillStyle = '#1e8449';
      ctx.fillRect(10, 4, 4, 3);
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(6, 7, 12, 11);
      ctx.fillStyle = '#e67e22';
      ctx.fillRect(8, 8, 8, 8);
    } else {
      // Generic berry/fruit/material icon
      ctx.fillStyle = '#1e8449';
      ctx.fillRect(8, 7, 8, 9);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(9, 8, 6, 7);
    }

    const dataUrl = canvas.toDataURL();
    this.thumbCache.set(itemId, dataUrl);
    return dataUrl;
  }

  /**
   * Generates a 27-frame (24x24 per frame = 648x24 strip) character spritesheet:
   * Frame 0..1: Side Profile Idle (Breathing torso bob)
   * Frame 2..5: Side Profile Walk Cycle (Scissoring legs + arm swing)
   * Frame 6..12: Specialized Harvest & Action Poses (Chop, Pick, Dig, Scoop, Hold-Up, Inspect)
   * Frame 13: Front Perspective Idle (Down)
   * Frame 14..17: Front Perspective Walk Cycle (Down — foreshortened boots stepping toward camera)
   * Frame 18: Rear Perspective Idle (Up — back of head + full expedition backpack)
   * Frame 19..22: Rear Perspective Walk Cycle (Up — alternating lifted boot soles + backpack sway)
   * Frame 23..24: River Swimming Strokes (Submerged lower body + frothy water ring + alternating swim strokes)
   * Frame 25..26: Canoe Paddling Strokes (Seated in dugout canoe pulling wooden oar through water)
   */
  public static getOrCreateCharacterTexture(
    scene: Phaser.Scene,
    appearance: CharacterAppearance
  ): string {
    const key = `char_v5_${appearance.bodyType}_${appearance.skinTone}_${appearance.hairStyle}_${appearance.hairColor}_${appearance.outfit}_${appearance.startingBackpack}`;
    if (scene.textures.exists(key)) {
      return key;
    }

    const frameW = 24;
    const frameH = 24;
    const totalFrames = 27;
    const canvas = document.createElement('canvas');
    canvas.width = frameW * totalFrames;
    canvas.height = frameH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return key;
    ctx.imageSmoothingEnabled = false;

    for (let f = 0; f < totalFrames; f++) {
      this.drawDetailedExplorerFrame(ctx, f * frameW, 0, appearance, f, 1);
    }

    scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
      frameWidth: frameW,
      frameHeight: frameH
    });

    // Register character-specific directional, swimming, canoeing, and harvesting animations
    if (!scene.anims.exists(`${key}_idle`)) {
      // Side Profile (Left/Right)
      scene.anims.create({
        key: `${key}_idle`,
        frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 1 }),
        frameRate: 2.5,
        repeat: -1
      });
      scene.anims.create({
        key: `${key}_idle_side`,
        frames: scene.anims.generateFrameNumbers(key, { start: 0, end: 1 }),
        frameRate: 2.5,
        repeat: -1
      });
      scene.anims.create({
        key: `${key}_walk`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [2, 3, 4, 5] }),
        frameRate: 10,
        repeat: -1
      });
      scene.anims.create({
        key: `${key}_walk_side`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [2, 3, 4, 5] }),
        frameRate: 10,
        repeat: -1
      });

      // Front Perspective (Down — walking toward camera)
      scene.anims.create({
        key: `${key}_idle_down`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [13, 15] }),
        frameRate: 2.5,
        repeat: -1
      });
      scene.anims.create({
        key: `${key}_walk_down`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [14, 15, 16, 17] }),
        frameRate: 10,
        repeat: -1
      });

      // Rear Perspective (Up — walking away from camera, full backpack + boot soles)
      scene.anims.create({
        key: `${key}_idle_up`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [18, 20] }),
        frameRate: 2.5,
        repeat: -1
      });
      scene.anims.create({
        key: `${key}_walk_up`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [19, 20, 21, 22] }),
        frameRate: 10,
        repeat: -1
      });

      // River Swimming (Submerged lower body + alternating arm strokes)
      scene.anims.create({
        key: `${key}_swim`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [23, 24] }),
        frameRate: 6,
        repeat: -1
      });
      scene.anims.create({
        key: `${key}_swim_idle`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [23, 24] }),
        frameRate: 2.5,
        repeat: -1
      });

      // Canoe Paddling (Seated in wooden canoe + dipping paddle)
      scene.anims.create({
        key: `${key}_paddle`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [25, 26] }),
        frameRate: 6,
        repeat: -1
      });
      scene.anims.create({
        key: `${key}_paddle_idle`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [25] }),
        frameRate: 2,
        repeat: -1
      });

      // Specialized Harvesting Animations
      scene.anims.create({
        key: `${key}_chop_wood`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [6, 7, 6, 7, 11, 0] }),
        frameRate: 10,
        repeat: 0
      });
      scene.anims.create({
        key: `${key}_pick_fruit`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [8, 0, 8, 11, 11, 0] }),
        frameRate: 9,
        repeat: 0
      });
      scene.anims.create({
        key: `${key}_dig_tuber`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [9, 7, 9, 11, 11, 0] }),
        frameRate: 9,
        repeat: 0
      });
      scene.anims.create({
        key: `${key}_gather_ground`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [9, 9, 11, 11, 0] }),
        frameRate: 9,
        repeat: 0
      });
      scene.anims.create({
        key: `${key}_scoop_water`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [10, 10, 11, 0] }),
        frameRate: 8,
        repeat: 0
      });
      scene.anims.create({
        key: `${key}_action`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [6, 7, 11, 0] }),
        frameRate: 9,
        repeat: 0
      });
      scene.anims.create({
        key: `${key}_inspect`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [12, 12, 0] }),
        frameRate: 4,
        repeat: 0
      });
    }

    return key;
  }

  public static renderCharacterPreviewToCanvas(
    canvas: HTMLCanvasElement,
    appearance: CharacterAppearance
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0f2918';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1b4329';
    ctx.fillRect(0, Math.floor(canvas.height * 0.72), canvas.width, Math.ceil(canvas.height * 0.28));

    const scale = Math.max(1, Math.floor(canvas.width / 24));
    this.drawDetailedExplorerFrame(ctx, 0, 0, appearance, 13, scale);
  }

  private static drawDetailedExplorerFrame(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    appearance: CharacterAppearance,
    frameIdx: number,
    scale: number
  ): void {
    const px = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(ox + x * scale, oy + y * scale, w * scale, h * scale);
    };

    const bodyW =
      appearance.bodyType === 'sturdy' ? 10 : appearance.bodyType === 'agile' ? 8 : 9;
    const leftX = Math.floor((24 - bodyW) / 2);

    const packMain =
      appearance.startingBackpack === 'botanist'
        ? '#2e7d32'
        : appearance.startingBackpack === 'fisher'
          ? '#1565c0'
          : '#d35400';
    const packShade =
      appearance.startingBackpack === 'botanist'
        ? '#1b5e20'
        : appearance.startingBackpack === 'fisher'
          ? '#0d47a1'
          : '#a04000';
    const packTrim = '#f39c12';

    const outfitMain =
      appearance.outfit === 'expedition_vest'
        ? '#c29b61'
        : appearance.outfit === 'river_poncho'
          ? '#16a085'
          : '#d6eaf8';
    const outfitShade =
      appearance.outfit === 'expedition_vest'
        ? '#9c7844'
        : appearance.outfit === 'river_poncho'
          ? '#117864'
          : '#aed6f1';

    // =========================================================================
    // CASE A: RIVER SWIMMING FRAMES (23..24) — Submerged lower body + Swim Stroke
    // =========================================================================
    if (frameIdx === 23 || frameIdx === 24) {
      const strokeB = frameIdx === 24;
      const bobY = strokeB ? 1 : 0;

      // Frothy cyan/white water surface ring around submerged chest
      px(2, 16, 20, 5, 'rgba(21, 101, 192, 0.55)');
      px(3, 15 + bobY, 18, 4, '#2e86c1');
      px(4, 15 + bobY, 16, 2, '#5dade2');
      // White water foam crests & splashes
      px(strokeB ? 3 : 5, 14 + bobY, 4, 2, '#d6eaf8');
      px(strokeB ? 15 : 13, 14 + bobY, 5, 2, '#ffffff');
      px(strokeB ? 2 : 19, 12, 2, 2, '#d6eaf8');

      // Top of waterproof backpack bobbing just at the waterline
      px(5, 10 + bobY, 4, 5, '#111914');
      px(6, 11 + bobY, 3, 4, packMain);

      // Upper shoulders above water
      px(8, 10 + bobY, 8, 5, '#141e18');
      px(9, 11 + bobY, 6, 4, outfitMain);

      // Alternating Front-Crawl / Breaststroke Arms cutting through the water
      if (!strokeB) {
        px(15, 11 + bobY, 6, 3, appearance.skinTone);
        px(19, 13 + bobY, 3, 1, '#ffffff');
        px(3, 12 + bobY, 4, 3, appearance.skinTone);
      } else {
        px(14, 12 + bobY, 4, 3, appearance.skinTone);
        px(2, 11 + bobY, 5, 3, appearance.skinTone);
        px(1, 13 + bobY, 3, 1, '#ffffff');
      }

      // Head tilted slightly up to keep chin clear of river current
      px(7, 3 + bobY, 10, 8, '#141e18');
      px(8, 4 + bobY, 8, 7, appearance.skinTone);
      px(10, 7 + bobY, 1, 2, '#111111');
      px(14, 7 + bobY, 1, 2, '#111111');
      px(15, 7 + bobY, 1, 2, '#ffffff');
      px(7, 3 + bobY, 10, 2, appearance.hairColor);
      px(8, 2 + bobY, 8, 2, appearance.hairColor);
      return;
    }

    // =========================================================================
    // CASE B: CANOE PADDLING FRAMES (25..26) — Seated in Canoe + Wooden Oar
    // =========================================================================
    if (frameIdx === 25 || frameIdx === 26) {
      const pullBack = frameIdx === 26;
      const bobY = pullBack ? 1 : 0;

      // Backpack & Upper Torso seated inside canoe hull
      px(5, 8 + bobY, 4, 7, '#111914');
      px(6, 9 + bobY, 3, 5, packMain);
      px(8, 8 + bobY, 8, 8, '#141e18');
      px(9, 9 + bobY, 6, 6, outfitMain);
      px(9, 14 + bobY, 6, 1, '#4a2f1d');

      // Head facing forward
      px(7, 2 + bobY, 10, 7, '#141e18');
      px(8, 3 + bobY, 8, 6, appearance.skinTone);
      px(13, 6 + bobY, 1, 2, '#111111');
      px(14, 6 + bobY, 1, 2, '#ffffff');
      px(7, 2 + bobY, 10, 2, appearance.hairColor);
      px(8, 1 + bobY, 8, 2, appearance.hairColor);

      // Hands & Carved Wooden Canoe Paddle (Remo Amazónico)
      if (!pullBack) {
        px(13, 10 + bobY, 4, 3, appearance.skinTone);
        px(14, 7 + bobY, 2, 10, '#6e2c00');
        px(15, 16 + bobY, 3, 5, '#ca6f1e');
        px(14, 19 + bobY, 5, 2, '#d6eaf8');
      } else {
        px(11, 11 + bobY, 4, 3, appearance.skinTone);
        px(11, 8 + bobY, 2, 9, '#6e2c00');
        px(9, 16 + bobY, 4, 5, '#ca6f1e');
        px(13, 18 + bobY, 4, 2, '#ffffff');
      }
      return;
    }

    // =========================================================================
    // CASE C: FRONT PERSPECTIVE (DOWN — Frames 13..17, Walking Toward Camera)
    // =========================================================================
    if (frameIdx >= 13 && frameIdx <= 17) {
      const stepPhase = frameIdx - 13; // 0=idle, 1=L forward, 2=pass, 3=R forward, 4=pass
      const bobY = stepPhase === 1 || stepPhase === 3 ? 1 : 0;

      // Ground drop shadow
      px(6, 21, 12, 2, 'rgba(0, 0, 0, 0.42)');

      // Top of backpack peeking behind shoulders
      px(leftX - 1, 7 + bobY, bodyW + 2, 3, '#111914');
      px(leftX, 8 + bobY, bodyW, 2, packMain);

      // Front Perspective Legs (Foreshortened depth: stepping leg has larger closer boot at y=17..21, back leg is higher at y=15..18)
      if (stepPhase === 1) {
        // Back leg (Right)
        px(12, 15, 4, 4, '#101712');
        px(13, 15, 2, 2, '#1f2d3a');
        px(13, 17, 2, 2, '#4e342e');
        // Front closer leg (Left — larger foreshortened boot!)
        px(7, 16, 5, 6, '#101712');
        px(8, 16, 3, 2, '#34495e');
        px(8, 18, 3, 3, '#6e4726');
        px(8, 18, 3, 1, '#a04000');
        px(8, 20, 3, 1, '#2c1d14');
      } else if (stepPhase === 3) {
        // Back leg (Left)
        px(8, 15, 4, 4, '#101712');
        px(9, 15, 2, 2, '#1f2d3a');
        px(9, 17, 2, 2, '#4e342e');
        // Front closer leg (Right — larger foreshortened boot!)
        px(12, 16, 5, 6, '#101712');
        px(13, 16, 3, 2, '#34495e');
        px(13, 18, 3, 3, '#6e4726');
        px(13, 18, 3, 1, '#a04000');
        px(13, 20, 3, 1, '#2c1d14');
      } else {
        const liftLeft = stepPhase === 4 ? -1 : 0;
        const liftRight = stepPhase === 2 ? -1 : 0;
        px(7, 16 + liftLeft, 5, 5, '#101712');
        px(8, 16 + liftLeft, 3, 2, '#34495e');
        px(8, 18 + liftLeft, 3, 2, '#6e4726');
        px(12, 16 + liftRight, 5, 5, '#101712');
        px(13, 16 + liftRight, 3, 2, '#34495e');
        px(13, 18 + liftRight, 3, 2, '#6e4726');
      }

      // Front Torso with V-neck collar, backpack shoulder straps, and centered belt buckle
      px(leftX - 1, 8 + bobY, bodyW + 2, 8, '#141e18');
      px(leftX, 9 + bobY, bodyW, 6, outfitMain);
      px(leftX, 13 + bobY, bodyW, 2, outfitShade);
      px(leftX, 9 + bobY, 2, 5, packShade);
      px(leftX + bodyW - 2, 9 + bobY, 2, 5, packShade);
      px(leftX, 11 + bobY, 1, 1, packTrim);
      px(leftX + bodyW - 1, 11 + bobY, 1, 1, packTrim);
      px(11, 9 + bobY, 2, 3, '#1e4d2b');
      px(leftX, 14 + bobY, bodyW, 1, '#4a2f1d');
      px(11, 14 + bobY, 2, 1, '#f1c40f');

      // Front Perspective Arms
      const leftArmY = stepPhase === 3 ? 10 : stepPhase === 1 ? 8 : 9;
      const leftArmH = stepPhase === 3 ? 6 : stepPhase === 1 ? 4 : 5;
      const rightArmY = stepPhase === 1 ? 10 : stepPhase === 3 ? 8 : 9;
      const rightArmH = stepPhase === 1 ? 6 : stepPhase === 3 ? 4 : 5;

      px(leftX - 2, leftArmY + bobY, 2, leftArmH, appearance.skinTone);
      px(leftX - 2, leftArmY + bobY, 2, 2, outfitMain);
      px(leftX + bodyW, rightArmY + bobY, 2, rightArmH, appearance.skinTone);
      px(leftX + bodyW, rightArmY + bobY, 2, 2, outfitMain);

      // Symmetrical Front Head & Both Eyes
      px(7, 2 + bobY, 10, 8, '#141e18');
      px(8, 3 + bobY, 8, 7, appearance.skinTone);
      px(8, 9 + bobY, 8, 1, 'rgba(0,0,0,0.15)');
      px(9, 6 + bobY, 1, 2, '#ffffff');
      px(10, 6 + bobY, 1, 2, '#111111');
      px(14, 6 + bobY, 1, 2, '#111111');
      px(15, 6 + bobY, 1, 2, '#ffffff');
      px(9, 5 + bobY, 2, 1, appearance.hairColor);
      px(14, 5 + bobY, 2, 1, appearance.hairColor);

      // Front Hair
      px(7, 2 + bobY, 10, 2, appearance.hairColor);
      px(8, 1 + bobY, 8, 2, appearance.hairColor);
      if (appearance.hairStyle === 'braided') {
        px(6, 4 + bobY, 2, 8, appearance.hairColor);
        px(16, 4 + bobY, 2, 8, appearance.hairColor);
        px(6, 11 + bobY, 2, 1, '#e74c3c');
        px(16, 11 + bobY, 2, 1, '#e74c3c');
      } else if (appearance.hairStyle === 'curly') {
        px(6, 2 + bobY, 12, 4, appearance.hairColor);
      } else if (appearance.hairStyle === 'bun') {
        px(10, 0 + bobY, 4, 2, appearance.hairColor);
        px(10, 1 + bobY, 4, 1, '#f1c40f');
      }
      return;
    }

    // =========================================================================
    // CASE D: REAR PERSPECTIVE (UP — Frames 18..22, Walking Away From Camera)
    // =========================================================================
    if (frameIdx >= 18 && frameIdx <= 22) {
      const stepPhase = frameIdx - 18; // 0=idle, 1=L away/R sole up, 2=pass, 3=R away/L sole up, 4=pass
      const bobY = stepPhase === 1 || stepPhase === 3 ? 1 : 0;
      const packSwayX = stepPhase === 1 ? -1 : stepPhase === 3 ? 1 : 0;

      // Ground drop shadow
      px(6, 21, 12, 2, 'rgba(0, 0, 0, 0.42)');

      // Rear Perspective Legs (Kicking boot shows dark mud-treaded sole facing the camera!)
      if (stepPhase === 1) {
        px(8, 15, 4, 4, '#101712');
        px(9, 15, 2, 3, '#1f2d3a');
        px(12, 15, 5, 6, '#101712');
        px(13, 15, 3, 2, '#34495e');
        px(13, 17, 3, 3, '#1c130c');
        px(13, 18, 3, 1, '#7f8c8d');
      } else if (stepPhase === 3) {
        px(12, 15, 4, 4, '#101712');
        px(13, 15, 2, 3, '#1f2d3a');
        px(7, 15, 5, 6, '#101712');
        px(8, 15, 3, 2, '#34495e');
        px(8, 17, 3, 3, '#1c130c');
        px(8, 18, 3, 1, '#7f8c8d');
      } else {
        px(7, 16, 5, 5, '#101712');
        px(8, 16, 3, 2, '#2c3e50');
        px(8, 18, 3, 2, '#4e342e');
        px(12, 16, 5, 5, '#101712');
        px(13, 16, 3, 2, '#2c3e50');
        px(13, 18, 3, 2, '#4e342e');
      }

      // Rear Torso & Arms swinging away
      px(leftX - 1, 8 + bobY, bodyW + 2, 8, '#141e18');
      px(leftX, 9 + bobY, bodyW, 6, outfitShade);

      const leftArmY = stepPhase === 1 ? 8 : stepPhase === 3 ? 10 : 9;
      const rightArmY = stepPhase === 3 ? 8 : stepPhase === 1 ? 10 : 9;
      px(leftX - 2, leftArmY + bobY, 2, 5, appearance.skinTone);
      px(leftX - 2, leftArmY + bobY, 2, 2, outfitShade);
      px(leftX + bodyW, rightArmY + bobY, 2, 5, appearance.skinTone);
      px(leftX + bodyW, rightArmY + bobY, 2, 2, outfitShade);

      // Back of Head (Covered completely in hair — no face/eyes visible from behind!)
      px(7, 2 + bobY, 10, 8, '#141e18');
      px(8, 2 + bobY, 8, 7, appearance.hairColor);
      px(9, 1 + bobY, 6, 2, appearance.hairColor);
      px(10, 3 + bobY, 4, 1, 'rgba(255,255,255,0.14)');
      if (appearance.hairStyle === 'braided') {
        px(7, 5 + bobY, 2, 7, appearance.hairColor);
        px(15, 5 + bobY, 2, 7, appearance.hairColor);
        px(7, 11 + bobY, 2, 1, '#e74c3c');
        px(15, 11 + bobY, 2, 1, '#e74c3c');
      } else if (appearance.hairStyle === 'bun') {
        px(10, 4 + bobY, 4, 4, '#111111');
        px(10, 4 + bobY, 4, 3, appearance.hairColor);
        px(10, 6 + bobY, 4, 1, '#f1c40f');
      }

      // Full Expedition Backpack Centered on Back (Drawn on top of torso in rear view!)
      const pxPack = 7 + packSwayX;
      px(pxPack - 1, 7 + bobY, 12, 9, '#111914');
      px(pxPack, 8 + bobY, 10, 2, '#d5bdaf');
      px(pxPack + 2, 8 + bobY, 1, 2, '#4a2f1d');
      px(pxPack + 7, 8 + bobY, 1, 2, '#4a2f1d');
      px(pxPack, 10 + bobY, 10, 5, packMain);
      px(pxPack, 10 + bobY, 10, 2, packShade);
      px(pxPack + 2, 10 + bobY, 1, 5, '#3e2723');
      px(pxPack + 7, 10 + bobY, 1, 5, '#3e2723');
      px(pxPack + 2, 12 + bobY, 1, 1, packTrim);
      px(pxPack + 7, 12 + bobY, 1, 1, packTrim);
      return;
    }

    // =========================================================================
    // CASE E: SIDE PROFILE PERSPECTIVE (Frames 0..5) & ACTION POSES (Frames 6..12)
    // =========================================================================
    const isCrouching = frameIdx === 9 || frameIdx === 10;
    const isReachingUp = frameIdx === 8 || frameIdx === 11;
    const bobY = isCrouching
      ? 2
      : isReachingUp
        ? -1
        : frameIdx === 1 || frameIdx === 2 || frameIdx === 4 || frameIdx === 7
          ? 1
          : 0;

    // Ground drop shadow
    const shadowW = frameIdx === 2 || frameIdx === 4 || isCrouching ? 14 : 11;
    const shadowX = Math.floor((24 - shadowW) / 2);
    px(shadowX, 21, shadowW, 2, 'rgba(0, 0, 0, 0.42)');

    // 1. Side-Profile Backpack Protruding Behind the Explorer's Back
    px(4, 7 + bobY, 6, 9, '#111914');
    px(5, 7 + bobY, 4, 2, '#d5bdaf');
    px(5, 9 + bobY, 4, 6, packMain);
    px(5, 9 + bobY, 4, 2, packShade);
    px(6, 11 + bobY, 2, 1, packTrim);

    // 2. Side-Profile Biomechanical Scissoring Legs
    let leftLegX = 9;
    let leftLegY = 16;
    let leftSoleUp = false;

    let rightLegX = 12;
    let rightLegY = 16;
    let rightSoleUp = false;

    if (frameIdx === 2) {
      leftLegX = 6;
      leftLegY = 16;
      rightLegX = 15;
      rightLegY = 14;
      rightSoleUp = true;
    } else if (frameIdx === 3) {
      leftLegX = 9;
      leftLegY = 16;
      rightLegX = 12;
      rightLegY = 14;
      rightSoleUp = true;
    } else if (frameIdx === 4) {
      leftLegX = 6;
      leftLegY = 14;
      leftSoleUp = true;
      rightLegX = 15;
      rightLegY = 16;
    } else if (frameIdx === 5) {
      leftLegX = 9;
      leftLegY = 14;
      leftSoleUp = true;
      rightLegX = 12;
      rightLegY = 16;
    } else if (isCrouching) {
      leftLegX = 7;
      leftLegY = 17;
      rightLegX = 14;
      rightLegY = 17;
    }

    const drawLeg = (lx: number, ly: number, isLifted: boolean, isFrontLeg: boolean) => {
      const trouserColor = isFrontLeg ? '#34495e' : '#1f2d3a';
      const bootColor = isFrontLeg ? '#6e4726' : '#4e342e';
      const legH = isCrouching ? 5 : 6;
      px(lx - 1, ly, 5, legH, '#101712');
      px(lx, ly, 3, isCrouching ? 2 : 3, trouserColor);
      px(lx, ly + (isCrouching ? 2 : 3), 4, 2, bootColor);
      px(lx, ly + (isCrouching ? 4 : 5), 4, 1, isLifted ? '#d5bdaf' : '#2c1d14');
    };

    if (frameIdx === 2 || frameIdx === 5) {
      drawLeg(rightLegX, rightLegY, rightSoleUp, false);
      drawLeg(leftLegX, leftLegY, leftSoleUp, true);
    } else {
      drawLeg(leftLegX, leftLegY, leftSoleUp, false);
      drawLeg(rightLegX, rightLegY, rightSoleUp, true);
    }

    // 3. Side-Profile Torso Outfit & Belt
    px(8, 8 + bobY, 8, 8, '#141e18');
    px(9, 9 + bobY, 6, 6, outfitMain);
    px(9, 13 + bobY, 6, 2, outfitShade);
    px(9, 9 + bobY, 2, 5, packShade);
    px(9, 14 + bobY, 6, 1, '#4a2f1d');
    px(13, 14 + bobY, 2, 1, '#f1c40f');

    // 4. Side-Profile Arms & Specialized Harvest / Action Poses
    const armSwingX = frameIdx === 2 ? 2 : frameIdx === 4 ? -2 : 0;
    const armSwingY = frameIdx === 2 ? -1 : frameIdx === 4 ? 1 : 0;

    if (frameIdx === 6) {
      px(leftX - 2, 9 + bobY, 2, 5, appearance.skinTone);
      px(leftX + bodyW, 4 + bobY, 2, 6, appearance.skinTone);
      px(leftX + bodyW + 1, 0, 2, 6, '#ecf0f1');
      px(leftX + bodyW + 2, 0, 1, 5, '#ffffff');
    } else if (frameIdx === 7) {
      px(leftX - 2, 10 + bobY, 2, 5, appearance.skinTone);
      px(leftX + bodyW, 10 + bobY, 3, 3, appearance.skinTone);
      px(leftX + bodyW + 2, 11 + bobY, 5, 2, '#ecf0f1');
      px(leftX + bodyW + 4, 4, 2, 3, 'rgba(255, 255, 255, 0.85)');
      px(leftX + bodyW + 5, 7, 2, 5, 'rgba(174, 214, 241, 0.9)');
      px(leftX + bodyW + 3, 12, 3, 2, 'rgba(255, 255, 255, 0.85)');
    } else if (frameIdx === 8) {
      px(leftX - 2, 4 + bobY, 2, 6, appearance.skinTone);
      px(leftX + bodyW, 3 + bobY, 2, 7, appearance.skinTone);
      px(leftX - 2, 8 + bobY, 2, 2, outfitMain);
      px(leftX + bodyW, 8 + bobY, 2, 2, outfitMain);
    } else if (frameIdx === 9) {
      px(leftX - 2, 12 + bobY, 2, 6, appearance.skinTone);
      px(leftX + bodyW, 12 + bobY, 3, 6, appearance.skinTone);
      px(leftX + bodyW + 1, 16 + bobY, 3, 2, '#935116');
    } else if (frameIdx === 10) {
      px(leftX - 2, 11 + bobY, 2, 5, appearance.skinTone);
      px(leftX + bodyW, 11 + bobY, 3, 4, appearance.skinTone);
      px(leftX + bodyW + 2, 12 + bobY, 5, 4, '#ca6f1e');
      px(leftX + bodyW + 3, 12 + bobY, 3, 2, '#5dade2');
    } else if (frameIdx === 11) {
      px(leftX - 2, 4 + bobY, 2, 6, appearance.skinTone);
      px(leftX + bodyW, 4 + bobY, 2, 6, appearance.skinTone);
      px(9, 0, 6, 2, '#f1c40f');
    } else if (frameIdx === 12) {
      px(leftX - 2, 9 + bobY, 2, 5, appearance.skinTone);
      px(leftX + bodyW, 7 + bobY, 3, 3, appearance.skinTone);
      px(leftX + bodyW + 2, 5, 4, 4, '#f1c40f');
      px(leftX + bodyW + 3, 6, 2, 2, '#85c1e9');
    } else {
      px(10 + armSwingX, 9 + bobY + armSwingY, 3, 5, '#141e18');
      px(11 + armSwingX, 9 + bobY + armSwingY, 2, 2, outfitMain);
      px(11 + armSwingX, 11 + bobY + armSwingY, 2, 3, appearance.skinTone);
    }

    // 5. Side-Profile Head, Nose & Forward-Looking Eye
    px(8, 2 + bobY, 9, 8, '#141e18');
    px(9, 3 + bobY, 7, 7, appearance.skinTone);
    px(16, 6 + bobY, 1, 2, appearance.skinTone);
    px(9, 9 + bobY, 7, 1, 'rgba(0,0,0,0.14)');
    px(13, 6 + bobY, 1, 2, '#ffffff');
    px(14, 6 + bobY, 1, 2, '#111111');
    px(13, 5 + bobY, 2, 1, appearance.hairColor);

    // 6. Side-Profile Hair & Back Ponytail / Braid
    px(7, 2 + bobY, 10, 2, appearance.hairColor);
    px(8, 1 + bobY, 8, 2, appearance.hairColor);
    px(8, 3 + bobY, 3, 5, appearance.hairColor);

    if (appearance.hairStyle === 'braided') {
      px(6, 4 + bobY, 2, 7, appearance.hairColor);
      px(6, 10 + bobY, 2, 1, '#e74c3c');
    } else if (appearance.hairStyle === 'curly') {
      px(6, 2 + bobY, 6, 5, appearance.hairColor);
    } else if (appearance.hairStyle === 'bun') {
      px(6, 2 + bobY, 3, 3, appearance.hairColor);
      px(7, 3 + bobY, 1, 2, '#f1c40f');
    }
  }

  /**
   * Generates crisp 16x16 collectible loot icons with dark pixel outlines and specular highlights
   * for the flying harvest animation and visual feedback.
   */
  private static createCollectibleLootIcons(scene: Phaser.Scene): void {
    const makeIcon = (key: string, drawFn: (ctx: CanvasRenderingContext2D) => void) => {
      if (scene.textures.exists(key)) return;
      const tex = scene.textures.createCanvas(key, 16, 16);
      if (!tex) return;
      const ctx = tex.getContext();
      ctx.imageSmoothingEnabled = false;
      drawFn(ctx);
      tex.refresh();
    };

    // 1. Asaí / Caimarona Berry Cluster
    makeIcon('loot_berries', (ctx) => {
      ctx.fillStyle = '#1e8449';
      ctx.fillRect(6, 1, 4, 3);
      ctx.fillStyle = '#14081c';
      ctx.fillRect(3, 4, 10, 10);
      const berries: [number, number][] = [
        [4, 5],
        [8, 5],
        [6, 8],
        [4, 10],
        [9, 10]
      ];
      for (const [bx, by] of berries) {
        ctx.fillStyle = '#5b2c6f';
        ctx.fillRect(bx, by, 3, 3);
        ctx.fillStyle = '#d2b4de';
        ctx.fillRect(bx, by, 1, 1);
      }
    });

    // 2. Chontaduro / Moriche / Tropical Fruit
    makeIcon('loot_tropical_fruit', (ctx) => {
      ctx.fillStyle = '#191007';
      ctx.fillRect(3, 3, 10, 11);
      ctx.fillStyle = '#e65c22';
      ctx.fillRect(4, 4, 8, 9);
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(5, 5, 5, 6);
      ctx.fillStyle = '#fef9e7';
      ctx.fillRect(5, 5, 2, 2);
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(6, 2, 4, 2);
    });

    // 3. Cassava Tuber Root (Yuca)
    makeIcon('loot_tuber', (ctx) => {
      ctx.fillStyle = '#1b120c';
      ctx.fillRect(2, 5, 12, 8);
      ctx.fillStyle = '#784212';
      ctx.fillRect(3, 6, 10, 6);
      ctx.fillStyle = '#f5cba7';
      ctx.fillRect(10, 7, 3, 4); // Peeled starchy white tip
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(6, 2, 4, 3);
    });

    // 4. Medicinal Bark & Crimson Latex Drop (Sangre de Drago / Quina)
    makeIcon('loot_medicine', (ctx) => {
      ctx.fillStyle = '#1c2833';
      ctx.fillRect(3, 3, 10, 11);
      ctx.fillStyle = '#935116';
      ctx.fillRect(4, 4, 8, 9);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(6, 5, 4, 6);
      ctx.fillStyle = '#fadbd8';
      ctx.fillRect(7, 6, 1, 2);
    });

    // 5. Capirona Wood Logs / Bamboo Bundle
    makeIcon('loot_wood', (ctx) => {
      ctx.fillStyle = '#1b120c';
      ctx.fillRect(2, 4, 12, 9);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(3, 5, 9, 3);
      ctx.fillStyle = '#6e4726';
      ctx.fillRect(3, 9, 9, 3);
      ctx.fillStyle = '#f5cba7';
      ctx.fillRect(11, 5, 2, 3);
      ctx.fillRect(11, 9, 2, 3);
    });

    // 6. River Quartzite & Flint Stone
    makeIcon('loot_stone', (ctx) => {
      ctx.fillStyle = '#17202a';
      ctx.fillRect(3, 4, 10, 9);
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(4, 5, 8, 7);
      ctx.fillStyle = '#d0d3d4';
      ctx.fillRect(5, 6, 5, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, 6, 2, 1);
    });

    // 7. Coiled Chambira Palm Fiber
    makeIcon('loot_fiber', (ctx) => {
      ctx.fillStyle = '#4a3519';
      ctx.fillRect(3, 3, 10, 10);
      ctx.fillStyle = '#f5cba7';
      ctx.fillRect(4, 4, 8, 8);
      ctx.fillStyle = '#9c640c';
      ctx.fillRect(6, 6, 4, 4);
      ctx.fillStyle = '#fef9e7';
      ctx.fillRect(5, 4, 4, 1);
    });

    // 8. Broad Waterproof Bijao Leaf
    makeIcon('loot_leaf', (ctx) => {
      ctx.fillStyle = '#0e3d1f';
      ctx.fillRect(2, 3, 12, 10);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(3, 4, 10, 8);
      ctx.fillStyle = '#abebc6';
      ctx.fillRect(4, 7, 8, 2);
      ctx.fillRect(7, 5, 2, 6);
    });

    // 9. Totuma Gourd Filled with Water
    makeIcon('loot_water', (ctx) => {
      ctx.fillStyle = '#1b120c';
      ctx.fillRect(3, 5, 10, 8);
      ctx.fillStyle = '#ca6f1e';
      ctx.fillRect(4, 7, 8, 5);
      ctx.fillStyle = '#3498db';
      ctx.fillRect(4, 5, 8, 3);
      ctx.fillStyle = '#d6eaf8';
      ctx.fillRect(5, 5, 4, 1);
    });
  }

  private static createTerrainVariants(scene: Phaser.Scene): void {
    const biomes: {
      prefix: string;
      base: string;
      dark: string;
      light: string;
      accent: string;
    }[] = [
      {
        prefix: 'tile_terra_firme',
        base: '#1e4d2b',
        dark: '#15381f',
        light: '#29663a',
        accent: '#388e3c'
      },
      {
        prefix: 'tile_varzea',
        base: '#1f4e43',
        dark: '#15372f',
        light: '#2b6a5b',
        accent: '#48c9b0'
      },
      {
        prefix: 'tile_riverbank',
        base: '#785f41',
        dark: '#5e4930',
        light: '#8e7250',
        accent: '#b7950b'
      },
      {
        prefix: 'tile_aquatic',
        base: '#1b4f72',
        dark: '#154360',
        light: '#2471a3',
        accent: '#5dade2'
      }
    ];

    for (const b of biomes) {
      for (let v = 0; v < 4; v++) {
        const key = v === 0 ? b.prefix : `${b.prefix}_${v}`;
        if (scene.textures.exists(key)) continue;
        const tex = scene.textures.createCanvas(key, 16, 16);
        if (!tex) continue;
        const ctx = tex.getContext();
        ctx.fillStyle = b.base;
        ctx.fillRect(0, 0, 16, 16);

        const ox = (v * 5) % 11;
        const oy = (v * 3) % 11;
        ctx.fillStyle = b.dark;
        ctx.fillRect(1 + ox, 2 + oy, 3, 1);
        ctx.fillRect((9 + ox) % 14, (11 + oy) % 14, 2, 2);

        ctx.fillStyle = b.light;
        ctx.fillRect((4 + ox) % 13, (6 + oy) % 13, 3, 1);
        ctx.fillRect((11 + ox) % 14, (3 + oy) % 14, 2, 1);

        if (b.prefix === 'tile_aquatic') {
          ctx.fillStyle = b.accent;
          ctx.fillRect((3 + v * 3) % 12, (5 + v * 4) % 14, 4, 1);
        } else if (v % 2 === 0) {
          ctx.fillStyle = b.accent;
          ctx.fillRect((6 + ox) % 14, (8 + oy) % 14, 1, 2);
          ctx.fillRect((7 + ox) % 14, (7 + oy) % 14, 1, 2);
        }
        tex.refresh();
      }
    }
  }

  private static createPierTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 16, 16);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#4e342e';
    for (let y = 0; y < 16; y += 4) {
      ctx.fillRect(0, y, 16, 1);
      ctx.fillRect(3, y + 1, 1, 2);
      ctx.fillRect(12, y + 1, 1, 2);
    }
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(5, 5, 6, 6);
    ctx.fillStyle = '#fef9e7';
    ctx.fillRect(6, 6, 4, 4);
    tex.refresh();
  }

  private static createDetailedPalmTexture(
    scene: Phaser.Scene,
    key: string,
    frondColor: string,
    fruitColor: string,
    trunkColor: string
  ): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    // Ground root shadow
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fillRect(5, 20, 14, 3);

    // Flared base roots & ringed palm trunk with bark highlight
    ctx.fillStyle = '#120b07';
    ctx.fillRect(8, 18, 8, 4);
    ctx.fillRect(9, 7, 6, 14);
    ctx.fillStyle = trunkColor;
    ctx.fillRect(10, 7, 4, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(10, 8, 1, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    for (let y = 9; y <= 19; y += 2) {
      ctx.fillRect(10, y, 4, 1);
    }

    // Lush hanging berry/fruit panicles on both sides of the crownshaft
    ctx.fillStyle = '#120b07';
    ctx.fillRect(5, 7, 5, 6);
    ctx.fillRect(14, 7, 5, 6);
    ctx.fillStyle = fruitColor;
    ctx.fillRect(6, 8, 3, 4);
    ctx.fillRect(15, 8, 3, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(6, 8, 1, 1);
    ctx.fillRect(8, 10, 1, 1);
    ctx.fillRect(15, 8, 1, 1);
    ctx.fillRect(17, 10, 1, 1);

    // Multi-layered arching pinnate palm fronds with leaflet tips
    ctx.fillStyle = '#092110';
    ctx.fillRect(1, 2, 22, 7);
    ctx.fillStyle = frondColor;
    ctx.fillRect(2, 3, 20, 4);
    ctx.fillRect(5, 1, 14, 3);
    ctx.fillRect(1, 5, 4, 3);
    ctx.fillRect(19, 5, 4, 3);
    // Sunlit top leaflets
    ctx.fillStyle = '#abebc6';
    ctx.fillRect(6, 1, 12, 1);
    ctx.fillRect(3, 3, 5, 1);
    ctx.fillRect(16, 3, 5, 1);

    tex.refresh();
  }

  private static createDetailedShrubTexture(
    scene: Phaser.Scene,
    key: string,
    leafColor: string,
    petioleColor: string,
    tuberColor: string
  ): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    // Soil mound & exposed cassava tubers with peeled white starchy tip
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(4, 19, 16, 4);
    ctx.fillStyle = '#120b07';
    ctx.fillRect(5, 14, 14, 7);
    ctx.fillStyle = tuberColor;
    ctx.fillRect(6, 15, 6, 5);
    ctx.fillRect(12, 16, 5, 4);
    ctx.fillStyle = '#fdfefe';
    ctx.fillRect(15, 17, 2, 2); // Exposed white starch

    // Distinct colored petioles (bright crimson on Yuca Brava vs golden-green on Yuca Dulce)
    ctx.fillStyle = petioleColor;
    ctx.fillRect(11, 8, 2, 8);
    ctx.fillRect(7, 9, 4, 2);
    ctx.fillRect(13, 9, 4, 2);

    // 5-lobed palmate cassava leaves with central veins
    ctx.fillStyle = '#092110';
    ctx.fillRect(2, 2, 20, 9);
    ctx.fillStyle = leafColor;
    ctx.fillRect(3, 4, 5, 5);
    ctx.fillRect(9, 2, 6, 6);
    ctx.fillRect(16, 4, 5, 5);
    ctx.fillStyle = '#abebc6';
    ctx.fillRect(11, 3, 2, 4);
    ctx.fillRect(5, 5, 2, 2);
    ctx.fillRect(17, 5, 2, 2);

    tex.refresh();
  }

  private static createDetailedTreeFruitTexture(
    scene: Phaser.Scene,
    key: string,
    canopyColor: string,
    fruitColor: string,
    trunkColor: string
  ): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(4, 20, 16, 3);
    ctx.fillStyle = '#120b07';
    ctx.fillRect(8, 10, 8, 12);
    ctx.fillStyle = trunkColor;
    ctx.fillRect(9, 11, 6, 10);
    ctx.fillStyle = '#092110';
    ctx.fillRect(2, 1, 20, 12);
    ctx.fillStyle = canopyColor;
    ctx.fillRect(3, 2, 18, 10);
    ctx.fillStyle = '#58d68d';
    ctx.fillRect(6, 2, 12, 2);
    // Detailed hanging pods/fruits with highlights
    const pods: [number, number][] = [
      [5, 8],
      [15, 8],
      [10, 4]
    ];
    for (const [px, py] of pods) {
      ctx.fillStyle = '#120b07';
      ctx.fillRect(px - 1, py - 1, 5, 5);
      ctx.fillStyle = fruitColor;
      ctx.fillRect(px, py, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px, py, 1, 1);
    }
    tex.refresh();
  }

  private static createDetailedMedicinalTreeTexture(
    scene: Phaser.Scene,
    key: string,
    canopyColor: string,
    sapColor: string,
    barkColor: string
  ): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(5, 20, 14, 3);
    // Mottled silver-gray bark with diagonal crimson Sangre de Drago latex cut
    ctx.fillStyle = '#17202a';
    ctx.fillRect(7, 9, 10, 13);
    ctx.fillStyle = barkColor;
    ctx.fillRect(8, 10, 8, 11);
    ctx.fillStyle = sapColor;
    ctx.fillRect(10, 11, 2, 3);
    ctx.fillRect(11, 13, 2, 4);
    ctx.fillRect(12, 16, 2, 3);

    // Crown with medicinal blossoms
    ctx.fillStyle = '#0b2e23';
    ctx.fillRect(2, 1, 20, 10);
    ctx.fillStyle = canopyColor;
    ctx.fillRect(3, 2, 18, 8);
    ctx.fillStyle = '#a3e4d7';
    ctx.fillRect(6, 2, 12, 2);
    ctx.fillStyle = sapColor;
    ctx.fillRect(6, 5, 3, 2);
    ctx.fillRect(15, 5, 3, 2);
    tex.refresh();
  }

  private static createDetailedToxicVineTexture(
    scene: Phaser.Scene,
    key: string,
    leafColor: string,
    berryColor: string
  ): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(4, 19, 16, 3);
    ctx.fillStyle = '#111111';
    ctx.fillRect(3, 4, 18, 16);
    ctx.fillStyle = leafColor;
    ctx.fillRect(4, 5, 16, 14);
    // High-contrast variegated cream spots & aposematic purple-red toxic berries
    ctx.fillStyle = '#fcf3cf';
    ctx.fillRect(6, 7, 3, 3);
    ctx.fillRect(15, 8, 3, 3);
    ctx.fillRect(7, 13, 2, 3);
    ctx.fillStyle = berryColor;
    ctx.fillRect(10, 11, 4, 5);
    ctx.fillStyle = '#f5b7b1';
    ctx.fillRect(11, 12, 1, 1);
    tex.refresh();
  }

  private static createDetailedWoodTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(2, 17, 20, 4);
    // 3 stacked Capirona logs with concentric golden heartwood rings and green sprout
    ctx.fillStyle = '#1b120c';
    ctx.fillRect(2, 8, 20, 11);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(3, 9, 14, 4);
    ctx.fillStyle = '#6e4726';
    ctx.fillRect(4, 14, 14, 4);
    // End-grain rings
    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(16, 9, 4, 4);
    ctx.fillRect(17, 14, 4, 4);
    ctx.fillStyle = '#a04000';
    ctx.fillRect(17, 10, 2, 2);
    ctx.fillRect(18, 15, 2, 2);
    // Small green twig leaf on top log
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(8, 6, 4, 3);
    tex.refresh();
  }

  private static createDetailedStoneTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(3, 17, 18, 4);
    // Faceted river quartzite & dark flint cobble with crystalline specular edge
    ctx.fillStyle = '#17202a';
    ctx.fillRect(3, 7, 18, 12);
    ctx.fillStyle = '#566573';
    ctx.fillRect(4, 11, 16, 7);
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(5, 8, 12, 6);
    ctx.fillStyle = '#eaeded';
    ctx.fillRect(6, 9, 7, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 9, 3, 1);
    tex.refresh();
  }

  private static createDetailedFiberTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(4, 18, 16, 3);
    ctx.fillStyle = '#2e1c10';
    ctx.fillRect(4, 6, 16, 13);
    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(5, 7, 14, 11);
    // Braided twist lines
    ctx.fillStyle = '#b9770e';
    for (let x = 6; x <= 16; x += 3) {
      ctx.fillRect(x, 8, 2, 9);
    }
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(9, 4, 6, 3); // Young palm spear leaf top
    tex.refresh();
  }

  private static createDetailedLeafTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(3, 18, 18, 3);
    ctx.fillStyle = '#092110';
    ctx.fillRect(2, 4, 20, 15);
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(3, 5, 18, 13);
    ctx.fillStyle = '#58d68d';
    ctx.fillRect(4, 6, 16, 6);
    // Leaf midrib & lateral veins
    ctx.fillStyle = '#d4efdf';
    ctx.fillRect(4, 11, 16, 2);
    for (let x = 6; x <= 16; x += 4) {
      ctx.fillRect(x, 7, 1, 9);
    }
    tex.refresh();
  }

  private static createDetailedBambooTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(4, 19, 16, 3);
    ctx.fillStyle = '#0e3d1f';
    ctx.fillRect(5, 2, 14, 19);
    ctx.fillStyle = '#58d68d';
    ctx.fillRect(6, 3, 4, 17);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(13, 3, 4, 17);
    ctx.fillStyle = '#abebc6';
    ctx.fillRect(7, 3, 1, 17);
    ctx.fillRect(14, 3, 1, 17);
    // Prominent Guadua internode rings
    ctx.fillStyle = '#145a32';
    ctx.fillRect(5, 7, 14, 2);
    ctx.fillRect(5, 14, 14, 2);
    tex.refresh();
  }

  private static createDetailedResinTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(4, 18, 16, 3);
    ctx.fillStyle = '#4a3519';
    ctx.fillRect(5, 6, 14, 13);
    ctx.fillStyle = '#f9e79f';
    ctx.fillRect(6, 7, 12, 11);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(8, 10, 8, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 8, 4, 3);
    tex.refresh();
  }

  private static createAnimatedCampfireSpritesheet(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const frameW = 24;
    const frameH = 24;
    const frames = 4;
    const canvas = document.createElement('canvas');
    canvas.width = frameW * frames;
    canvas.height = frameH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let f = 0; f < frames; f++) {
      const ox = f * frameW;
      ctx.fillStyle = f % 2 === 0 ? 'rgba(243, 156, 18, 0.28)' : 'rgba(231, 76, 60, 0.34)';
      ctx.fillRect(ox + 2, 6, 20, 16);

      ctx.fillStyle = '#5d4037';
      ctx.fillRect(ox + 4, 16, 16, 4);
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(ox + 3, 18, 4, 3);
      ctx.fillRect(ox + 17, 18, 4, 3);
      ctx.fillRect(ox + 10, 19, 4, 3);

      const flameHeight = f === 1 ? 11 : f === 3 ? 9 : 10;
      const flameShiftX = f === 1 ? 1 : f === 2 ? -1 : 0;
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(ox + 7 + flameShiftX, 17 - flameHeight, 10, flameHeight);

      ctx.fillStyle = '#f39c12';
      ctx.fillRect(ox + 8 + flameShiftX, 17 - flameHeight + 2, 8, flameHeight - 2);
      ctx.fillStyle = '#fef9e7';
      ctx.fillRect(ox + 10, 13, 4, 4);

      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(ox + 9 + ((f * 3) % 6), 3 + (f % 3), 2, 2);
    }

    scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
      frameWidth: frameW,
      frameHeight: frameH
    });
  }

  private static createDetailedTamboTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(2, 20, 20, 3);

    ctx.fillStyle = '#4e342e';
    ctx.fillRect(4, 12, 2, 10);
    ctx.fillRect(18, 12, 2, 10);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(3, 15, 18, 3);

    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(6, 12, 12, 2);
    ctx.fillRect(8, 13, 8, 2);

    ctx.fillStyle = '#1b120c';
    ctx.fillRect(1, 3, 22, 9);
    ctx.fillStyle = '#d35400';
    ctx.fillRect(2, 4, 20, 7);
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(4, 2, 16, 4);
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(7, 1, 10, 2);

    tex.refresh();
  }

  private static createDetailedCanoeTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 32, 20);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.imageSmoothingEnabled = false;

    // Water shadow / reflection beneath hull
    ctx.fillStyle = 'rgba(11, 35, 64, 0.45)';
    ctx.fillRect(2, 14, 28, 4);
    ctx.fillStyle = 'rgba(214, 234, 248, 0.55)';
    ctx.fillRect(1, 15, 4, 1);
    ctx.fillRect(27, 15, 4, 1);

    // Tapered Amazonian dugout canoe hull (Curiara / Potrillo) with pointed bow & stern prows
    ctx.fillStyle = '#1b110c'; // Dark outline
    ctx.fillRect(1, 8, 30, 5);
    ctx.fillRect(3, 7, 26, 7);
    ctx.fillRect(0, 7, 3, 3); // Stern prow tip
    ctx.fillRect(29, 7, 3, 3); // Bow prow tip

    // Mahogany outer hull planking
    ctx.fillStyle = '#6e2c00';
    ctx.fillRect(2, 8, 28, 5);
    ctx.fillStyle = '#a04000';
    ctx.fillRect(4, 8, 24, 4);
    ctx.fillStyle = '#d35400'; // Upper gunwale highlight
    ctx.fillRect(3, 8, 26, 1);
    ctx.fillRect(1, 8, 2, 1);
    ctx.fillRect(29, 8, 2, 1);

    // Hollow interior & carved wooden thwarts (benches)
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(6, 9, 20, 3);
    ctx.fillStyle = '#f5cba7'; // Wooden seats
    ctx.fillRect(9, 9, 2, 3);
    ctx.fillRect(15, 9, 2, 3);
    ctx.fillRect(21, 9, 2, 3);

    // Coiled chambira mooring rope at bow
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(26, 8, 2, 2);

    tex.refresh();
  }

  private static createJaguarSpritesheet(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const frameW = 24;
    const frameH = 24;
    const frames = 6; // 0..1=land idle, 2..3=land run, 4..5=water swim
    const canvas = document.createElement('canvas');
    canvas.width = frameW * frames;
    canvas.height = frameH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let f = 0; f < frames; f++) {
      const ox = f * frameW;

      // Frames 4..5: Water Swimming Jaguar
      if (f >= 4) {
        const swimWave = f === 4 ? 0 : 1;
        // Water ripples and wake around submerged body
        ctx.fillStyle = 'rgba(21, 101, 192, 0.45)';
        ctx.fillRect(ox + 2, 14, 20, 6);
        ctx.fillStyle = '#5dade2';
        ctx.fillRect(ox + 3, 15 + swimWave, 18, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ox + 1, 16, 3, 1);
        ctx.fillRect(ox + 19, 16, 3, 1);

        // Submerged Torso & Paddling Front Paw
        ctx.fillStyle = '#111111';
        ctx.fillRect(ox + 4, 10 + swimWave, 14, 5);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(ox + 5, 11 + swimWave, 12, 4);
        ctx.fillStyle = '#d35400';
        ctx.fillRect(ox + 7, 12 + swimWave, 2, 2);
        ctx.fillRect(ox + 11, 12 + swimWave, 2, 2);

        // Paddling paw reaching through water
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(ox + (f === 4 ? 17 : 15), 13, 3, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ox + (f === 4 ? 18 : 16), 14, 2, 1);

        // Head held high above water line
        ctx.fillStyle = '#111111';
        ctx.fillRect(ox + 15, 6 + swimWave, 8, 6);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(ox + 16, 7 + swimWave, 6, 4);
        ctx.fillStyle = '#111111';
        ctx.fillRect(ox + 15, 5 + swimWave, 2, 2); // Ear
        ctx.fillRect(ox + 19, 5 + swimWave, 2, 2); // Ear
        ctx.fillStyle = '#a9dfbf'; // Eye
        ctx.fillRect(ox + 19, 7 + swimWave, 2, 1);
        ctx.fillStyle = '#ffffff'; // Muzzle
        ctx.fillRect(ox + 21, 9 + swimWave, 2, 2);
        continue;
      }

      // Frames 0..3: Terrestrial Jaguar (Idle & Run)
      const crouchY = f === 1 ? 2 : f === 2 ? -1 : 0;

      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(ox + 3, 19, 18, 3);

      ctx.fillStyle = '#111111';
      ctx.fillRect(ox + 1, 10 + crouchY + (f % 2), 4, 3);
      ctx.fillStyle = '#d68910';
      ctx.fillRect(ox + 2, 11 + crouchY + (f % 2), 3, 1);

      ctx.fillStyle = '#111111';
      if (f === 2) {
        ctx.fillRect(ox + 3, 14, 3, 5);
        ctx.fillRect(ox + 7, 15, 3, 4);
        ctx.fillRect(ox + 15, 15, 3, 4);
        ctx.fillRect(ox + 19, 13, 3, 5);
      } else if (f === 3) {
        ctx.fillRect(ox + 6, 15, 3, 5);
        ctx.fillRect(ox + 9, 16, 3, 4);
        ctx.fillRect(ox + 13, 16, 3, 4);
        ctx.fillRect(ox + 16, 15, 3, 5);
      } else {
        ctx.fillRect(ox + 5, 14 + crouchY, 3, 6 - crouchY);
        ctx.fillRect(ox + 9, 15 + crouchY, 2, 5 - crouchY);
        ctx.fillRect(ox + 14, 15 + crouchY, 2, 5 - crouchY);
        ctx.fillRect(ox + 17, 14 + crouchY, 3, 6 - crouchY);
      }

      ctx.fillStyle = '#111111';
      ctx.fillRect(ox + 4, 8 + crouchY, 15, 8);
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(ox + 5, 9 + crouchY, 13, 6);
      ctx.fillStyle = '#fef9e7';
      ctx.fillRect(ox + 7, 14 + crouchY, 9, 1);

      ctx.fillStyle = '#111111';
      ctx.fillRect(ox + 6, 10 + crouchY, 3, 3);
      ctx.fillRect(ox + 10, 11 + crouchY, 3, 3);
      ctx.fillRect(ox + 14, 10 + crouchY, 3, 3);
      ctx.fillStyle = '#d35400';
      ctx.fillRect(ox + 7, 11 + crouchY, 1, 1);
      ctx.fillRect(ox + 11, 12 + crouchY, 1, 1);
      ctx.fillRect(ox + 15, 11 + crouchY, 1, 1);

      ctx.fillStyle = '#111111';
      ctx.fillRect(ox + 16, 5 + crouchY, 7, 7);
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(ox + 17, 6 + crouchY, 5, 5);
      ctx.fillStyle = '#111111';
      ctx.fillRect(ox + 16, 4 + crouchY, 2, 2);
      ctx.fillRect(ox + 20, 4 + crouchY, 2, 2);
      ctx.fillStyle = f >= 2 ? '#e74c3c' : '#a9dfbf';
      ctx.fillRect(ox + 20, 7 + crouchY, 2, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ox + 21, 10 + crouchY, 1, 2);
    }

    scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
      frameWidth: frameW,
      frameHeight: frameH
    });
  }

  /**
   * Black Caiman (Melanosuchus niger):
   * Frames 0..1: Water Swimming (low submerged profile in river with water ripple waves)
   * Frames 2..5: Land High Walk / Crawling (body elevated on 4 muscular clawed legs with ground shadow)
   */
  private static createCaimanSpritesheet(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const frameW = 24;
    const frameH = 24;
    const frames = 6;
    const canvas = document.createElement('canvas');
    canvas.width = frameW * frames;
    canvas.height = frameH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let f = 0; f < frames; f++) {
      const ox = f * frameW;

      // ==========================================
      // FRAMES 0..1: CAIMAN SWIMMING IN WATER
      // ==========================================
      if (f < 2) {
        // Water ripple wake
        ctx.fillStyle = 'rgba(21, 101, 192, 0.45)';
        ctx.fillRect(ox + 1, 15, 22, 5);
        ctx.fillStyle = '#5dade2';
        ctx.fillRect(ox + 2, 16 + (f % 2), 19, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ox + (f === 0 ? 3 : 5), 15, 4, 1);

        // Low submerged profile
        ctx.fillStyle = '#0b130e';
        ctx.fillRect(ox + 2, 11, 20, 5);
        ctx.fillRect(ox + 13, 8, 5, 4); // Eye ridge

        ctx.fillStyle = '#1e3a28';
        ctx.fillRect(ox + 3, 12, 14, 3);
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(ox + 4, 12, 12, 2);

        // Conical white teeth glints
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ox + 16, 14, 1, 1);
        ctx.fillRect(ox + 18, 14, 1, 1);
        ctx.fillRect(ox + 20, 14, 1, 1);

        // Dorsal tail scutes swimming
        ctx.fillStyle = '#145a32';
        for (let x = 2; x <= 13; x += 3) {
          ctx.fillRect(ox + x, 10 + ((x + f) % 2), 2, 2);
        }

        // Amber reptilian eye
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(ox + 15, 9, 2, 2);
        ctx.fillStyle = '#111111';
        ctx.fillRect(ox + 16, 9, 1, 2);
        continue;
      }

      // ==========================================
      // FRAMES 2..5: CAIMAN HIGH-WALK ON GROUND
      // ==========================================
      const walkStep = f - 2; // 0, 1, 2, 3
      const bob = walkStep === 1 || walkStep === 3 ? 1 : 0;

      // Dark ground shadow under elevated body
      ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
      ctx.fillRect(ox + 3, 19, 18, 3);

      // Elevated Armored Body & Long Snout
      ctx.fillStyle = '#0b130e'; // Dark outline
      ctx.fillRect(ox + 2, 8 + bob, 20, 7);
      ctx.fillStyle = '#1e3a28'; // Dark olive hide
      ctx.fillRect(ox + 3, 9 + bob, 15, 5);
      ctx.fillStyle = '#27ae60'; // Olive-emerald dorsal scales
      ctx.fillRect(ox + 4, 9 + bob, 13, 3);
      ctx.fillStyle = '#a9dfbf'; // Pale jaw underside
      ctx.fillRect(ox + 15, 13 + bob, 6, 2);
      ctx.fillStyle = '#ffffff'; // White teeth along jawline
      ctx.fillRect(ox + 16, 13 + bob, 1, 1);
      ctx.fillRect(ox + 18, 13 + bob, 1, 1);
      ctx.fillRect(ox + 20, 13 + bob, 1, 1);

      // Amber reptilian eye atop head
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(ox + 15, 7 + bob, 2, 2);
      ctx.fillStyle = '#111111';
      ctx.fillRect(ox + 16, 7 + bob, 1, 2);

      // 4 Muscular Clawed Legs walking on ground
      let leg1X = 6,
        leg1Y = 14,
        leg2X = 10,
        leg2Y = 14,
        leg3X = 14,
        leg3Y = 14,
        leg4X = 18,
        leg4Y = 14;

      if (walkStep === 0) {
        leg1X = 5;
        leg1Y = 14;
        leg2X = 11;
        leg2Y = 13;
        leg3X = 13;
        leg3Y = 14;
        leg4X = 19;
        leg4Y = 13;
      } else if (walkStep === 1) {
        leg1X = 6;
        leg1Y = 14;
        leg2X = 10;
        leg2Y = 14;
        leg3X = 14;
        leg3Y = 14;
        leg4X = 18;
        leg4Y = 14;
      } else if (walkStep === 2) {
        leg1X = 7;
        leg1Y = 13;
        leg2X = 9;
        leg2Y = 14;
        leg3X = 15;
        leg3Y = 13;
        leg4X = 17;
        leg4Y = 14;
      } else {
        leg1X = 6;
        leg1Y = 14;
        leg2X = 10;
        leg2Y = 14;
        leg3X = 14;
        leg3Y = 14;
        leg4X = 18;
        leg4Y = 14;
      }

      const drawCaimanLeg = (lx: number, ly: number) => {
        ctx.fillStyle = '#0b130e';
        ctx.fillRect(ox + lx - 1, ly + bob, 4, 5);
        ctx.fillStyle = '#1e3a28';
        ctx.fillRect(ox + lx, ly + bob, 2, 4);
        ctx.fillStyle = '#d5bdaf'; // Claw tips on ground
        ctx.fillRect(ox + lx - 1, ly + 4 + bob, 3, 1);
      };

      drawCaimanLeg(leg1X, leg1Y);
      drawCaimanLeg(leg2X, leg2Y);
      drawCaimanLeg(leg3X, leg3Y);
      drawCaimanLeg(leg4X, leg4Y);

      // Dorsal osteoderm scutes along spine
      ctx.fillStyle = '#145a32';
      for (let x = 3; x <= 14; x += 3) {
        ctx.fillRect(ox + x, 7 + bob + ((x + walkStep) % 2), 2, 2);
      }
    }

    scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
      frameWidth: frameW,
      frameHeight: frameH
    });
  }

  /**
   * 4-Frame High-Detail Fer-de-Lance / Talla Equis Pit Viper (Bothrops atrox)
   */
  private static createSnakeSpritesheet(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const frameW = 24;
    const frameH = 24;
    const frames = 4;
    const canvas = document.createElement('canvas');
    canvas.width = frameW * frames;
    canvas.height = frameH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let f = 0; f < frames; f++) {
      const ox = f * frameW;
      const sway = f === 1 || f === 3 ? 1 : 0;
      const strikeShift = f === 2 ? 1 : 0;

      // Ground shadow under S-coils
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.fillRect(ox + 3, 19, 17, 3);

      // Vibrating tapered tail tip on left (x = 1..4)
      ctx.fillStyle = '#17120c';
      ctx.fillRect(ox + 1, 14 + (f % 2), 3, 3);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(ox + 2, 15 + (f % 2), 2, 1);

      // Lower Base Coil
      ctx.fillStyle = '#17120c';
      ctx.fillRect(ox + 4, 15, 15, 5);
      ctx.fillStyle = '#c29b61';
      ctx.fillRect(ox + 5, 16, 13, 3);
      ctx.fillStyle = '#f5cba7';
      ctx.fillRect(ox + 6, 18, 11, 1);
      ctx.fillStyle = '#2c1810';
      ctx.fillRect(ox + 6 + sway, 16, 2, 2);
      ctx.fillRect(ox + 10 + sway, 16, 3, 2);
      ctx.fillRect(ox + 15, 16, 2, 2);
      ctx.fillStyle = '#f9e79f';
      ctx.fillRect(ox + 9 + sway, 16, 1, 1);
      ctx.fillRect(ox + 14, 16, 1, 1);

      // Middle S-Curve Neck Loop
      ctx.fillStyle = '#17120c';
      ctx.fillRect(ox + 6, 10 + sway, 10, 6);
      ctx.fillStyle = '#b9935a';
      ctx.fillRect(ox + 7, 11 + sway, 8, 4);
      ctx.fillStyle = '#f5cba7';
      ctx.fillRect(ox + 8, 14 + sway, 6, 1);
      ctx.fillStyle = '#2c1810';
      ctx.fillRect(ox + 8, 11 + sway, 2, 3);
      ctx.fillRect(ox + 12, 11 + sway, 2, 3);
      ctx.fillStyle = '#f9e79f';
      ctx.fillRect(ox + 10, 12 + sway, 2, 1);

      // Raised Triangular Pit-Viper Head
      const hx = ox + 11 + strikeShift;
      const hy = 5 + sway;
      ctx.fillStyle = '#17120c';
      ctx.fillRect(hx, hy, 8, 5);
      ctx.fillRect(hx - 1, hy + 1, 2, 3);
      ctx.fillStyle = '#9c7844';
      ctx.fillRect(hx, hy + 1, 7, 3);
      ctx.fillStyle = '#2c1810';
      ctx.fillRect(hx + 1, hy + 2, 3, 1);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(hx + 4, hy + 1, 2, 2);
      ctx.fillStyle = '#111111';
      ctx.fillRect(hx + 5, hy + 1, 1, 2);

      if (f === 1 || f === 2) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx + 6, hy + 4, 1, 1);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(hx + 8, hy + 2, 3, 1);
        ctx.fillRect(hx + 11, hy + 1, 1, 1);
        ctx.fillRect(hx + 11, hy + 3, 1, 1);
      } else if (f === 3) {
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(hx + 8, hy + 2, 2, 1);
      }
    }

    scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
      frameWidth: frameW,
      frameHeight: frameH
    });
  }

  /**
   * Green Anaconda (Eunectes murinus):
   * Frames 0..3: Land Slither (terrestrial creeping along forest floor)
   * Frames 4..7: Water Swimming (undulating coils surrounded by river water wakes)
   */
  private static createAnacondaSpritesheet(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const frameW = 24;
    const frameH = 24;
    const frames = 8;
    const canvas = document.createElement('canvas');
    canvas.width = frameW * frames;
    canvas.height = frameH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let f = 0; f < frames; f++) {
      const ox = f * frameW;
      const isWater = f >= 4;
      const wave = f % 2;

      if (isWater) {
        // River water wake ripples around swimming coils
        ctx.fillStyle = 'rgba(21, 101, 192, 0.45)';
        ctx.fillRect(ox + 1, 15, 22, 6);
        ctx.fillStyle = '#5dade2';
        ctx.fillRect(ox + 2, 16 + wave, 20, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ox + (wave === 0 ? 3 : 15), 15, 4, 1);
      } else {
        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.fillRect(ox + 2, 18, 20, 4);
      }

      // Thick muscular coils
      ctx.fillStyle = '#0d1f12';
      ctx.fillRect(ox + 2, 13, 19, 6);
      ctx.fillStyle = '#1e8449';
      ctx.fillRect(ox + 3, 14, 17, 4);
      ctx.fillStyle = '#52be80';
      ctx.fillRect(ox + 4, 14, 15, 1);
      ctx.fillStyle = '#f7dc6f';
      ctx.fillRect(ox + 4, 17, 15, 1);

      // Black-rimmed ochre ocelli
      for (const sx of [5, 10, 15]) {
        ctx.fillStyle = '#111712';
        ctx.fillRect(ox + sx + wave, 14, 3, 3);
        ctx.fillStyle = '#d4ac0d';
        ctx.fillRect(ox + sx + 1 + wave, 15, 1, 1);
      }

      // Upper undulating coil
      ctx.fillStyle = '#0d1f12';
      ctx.fillRect(ox + 5, 9 + wave, 11, 5);
      ctx.fillStyle = '#229954';
      ctx.fillRect(ox + 6, 10 + wave, 9, 3);
      ctx.fillStyle = '#111712';
      ctx.fillRect(ox + 8, 10 + wave, 3, 2);

      // Anaconda Head with dorsal eyes
      ctx.fillStyle = '#0d1f12';
      ctx.fillRect(ox + 13, 5 + wave, 8, 5);
      ctx.fillStyle = '#196f3d';
      ctx.fillRect(ox + 14, 6 + wave, 6, 3);
      ctx.fillStyle = '#e67e22';
      ctx.fillRect(ox + 14, 7 + wave, 3, 1);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(ox + 17, 6 + wave, 2, 1);

      if (f % 2 === 1) {
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(ox + 21, 7 + wave, 2, 1);
      }
    }

    scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
      frameWidth: frameW,
      frameHeight: frameH
    });
  }

  /**
   * Pirarucú (Arapaima gigas):
   * Frames 0..1: Water Swimming
   * Frames 2..3: Land Flopping / Thrashing (if stranded out of water)
   */
  private static createFishSpritesheet(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 96; // 4 frames * 24
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let f = 0; f < 4; f++) {
      const ox = f * 24;
      if (f < 2) {
        // Water Swimming
        ctx.fillStyle = 'rgba(93, 173, 226, 0.45)';
        ctx.fillRect(ox + 3, 14, 18, 4);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(ox + 4, 9 + f, 16, 6);
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(ox + 5, 10 + f, 13, 3);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(ox + 5, 12 + f, 12, 2);
        ctx.fillRect(ox + 2, 9 + f, 3, 5);
      } else {
        // Land Flopping / Thrashing
        const flop = f === 2 ? 0 : 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(ox + 4, 18, 16, 3);
        // Arched body flopping on soil
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(ox + 4, 12 - flop, 15, 6);
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(ox + 5, 13 - flop, 12, 3);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(ox + 6, 14 - flop, 10, 2);
        // Thrashing tail fin upward
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(ox + 2, 9 - flop, 3, 6);
        // Dust flecks
        ctx.fillStyle = '#d5bdaf';
        ctx.fillRect(ox + 2, 17, 2, 2);
        ctx.fillRect(ox + 18, 17, 2, 2);
      }
    }

    scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
      frameWidth: 24,
      frameHeight: 24
    });
  }

  private static createNPCSpritesheet(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mentorAppearance: CharacterAppearance = {
      name: 'Mentor',
      bodyType: 'balanced',
      skinTone: '#c68652',
      hairStyle: 'braided',
      hairColor: '#1c1c1c',
      outfit: 'river_poncho',
      startingBackpack: 'fisher'
    };

    this.drawDetailedExplorerFrame(ctx, 0, 0, mentorAppearance, 13, 1);
    this.drawDetailedExplorerFrame(ctx, 24, 0, mentorAppearance, 15, 1);

    for (let f = 0; f < 2; f++) {
      const ox = f * 24;
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(ox + 5, 1 + f, 14, 2);
      ctx.fillStyle = '#d4ac0d';
      ctx.fillRect(ox + 7, 0 + f, 10, 2);
    }

    scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
      frameWidth: 24,
      frameHeight: 24
    });
  }

  private static registerGlobalAnimations(scene: Phaser.Scene): void {
    if (!scene.anims.exists('campfire_burn')) {
      scene.anims.create({
        key: 'campfire_burn',
        frames: scene.anims.generateFrameNumbers('structure_campfire', { start: 0, end: 3 }),
        frameRate: 7,
        repeat: -1
      });
    }
    if (!scene.anims.exists('jaguar_idle')) {
      scene.anims.create({
        key: 'jaguar_idle',
        frames: scene.anims.generateFrameNumbers('creature_jaguar', { frames: [0, 1] }),
        frameRate: 2.5,
        repeat: -1
      });
      scene.anims.create({
        key: 'jaguar_run',
        frames: scene.anims.generateFrameNumbers('creature_jaguar', { frames: [2, 3] }),
        frameRate: 9,
        repeat: -1
      });
      scene.anims.create({
        key: 'jaguar_swim',
        frames: scene.anims.generateFrameNumbers('creature_jaguar', { frames: [4, 5] }),
        frameRate: 5,
        repeat: -1
      });
    }
    if (!scene.anims.exists('caiman_swim')) {
      scene.anims.create({
        key: 'caiman_swim',
        frames: scene.anims.generateFrameNumbers('creature_caiman', { frames: [0, 1] }),
        frameRate: 3,
        repeat: -1
      });
      scene.anims.create({
        key: 'caiman_walk',
        frames: scene.anims.generateFrameNumbers('creature_caiman', { frames: [2, 3, 4, 5] }),
        frameRate: 5,
        repeat: -1
      });
      scene.anims.create({
        key: 'caiman_move',
        frames: scene.anims.generateFrameNumbers('creature_caiman', { frames: [2, 3, 4, 5] }),
        frameRate: 5,
        repeat: -1
      });
    }
    if (!scene.anims.exists('snake_coil')) {
      scene.anims.create({
        key: 'snake_coil',
        frames: scene.anims.generateFrameNumbers('creature_snake', { start: 0, end: 3 }),
        frameRate: 4.5,
        repeat: -1
      });
    }
    if (!scene.anims.exists('anaconda_slither')) {
      scene.anims.create({
        key: 'anaconda_slither',
        frames: scene.anims.generateFrameNumbers('creature_anaconda', { frames: [0, 1, 2, 3] }),
        frameRate: 4,
        repeat: -1
      });
      scene.anims.create({
        key: 'anaconda_swim',
        frames: scene.anims.generateFrameNumbers('creature_anaconda', { frames: [4, 5, 6, 7] }),
        frameRate: 5,
        repeat: -1
      });
    }
    if (!scene.anims.exists('fish_swim')) {
      scene.anims.create({
        key: 'fish_swim',
        frames: scene.anims.generateFrameNumbers('creature_fish', { frames: [0, 1] }),
        frameRate: 4,
        repeat: -1
      });
      scene.anims.create({
        key: 'fish_flop',
        frames: scene.anims.generateFrameNumbers('creature_fish', { frames: [2, 3] }),
        frameRate: 7,
        repeat: -1
      });
    }
    if (!scene.anims.exists('npc_idle')) {
      scene.anims.create({
        key: 'npc_idle',
        frames: scene.anims.generateFrameNumbers('npc_mentor', { start: 0, end: 1 }),
        frameRate: 2,
        repeat: -1
      });
    }
  }
}
