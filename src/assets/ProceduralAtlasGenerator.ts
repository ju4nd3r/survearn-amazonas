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
    if (kind === 'water' || itemId.includes('agua')) return 'scoop_water';
    if (kind === 'material') {
      if (itemId.includes('madera') || itemId.includes('bambu') || itemId.includes('resina')) {
        return 'chop_wood';
      }
      return 'gather_ground';
    }
    if (itemId.includes('manihot') || itemId.includes('yuca')) {
      return 'dig_tuber';
    }
    if (
      itemId.includes('sangre_drago') ||
      itemId.includes('quina') ||
      itemId.includes('una_gato') ||
      itemId.includes('castana')
    ) {
      return 'chop_wood';
    }
    return 'pick_fruit';
  }

  /**
   * Generates a 13-frame (24x24 per frame = 312x24 strip) character spritesheet:
   * Frame 0: Idle 1 (Planted neutral stance)
   * Frame 1: Idle 2 (Breathing torso bob)
   * Frame 2: Walk Contact A (Left leg strides forward/down, Right leg pushes back/up)
   * Frame 3: Walk Passing A (Right knee lifts & passes forward, torso rises)
   * Frame 4: Walk Contact B (Right leg strides forward/down, Left leg pushes back/up)
   * Frame 5: Walk Passing B (Left knee lifts & passes forward, torso rises)
   * Frame 6: Chop Windup (Machete raised high overhead)
   * Frame 7: Chop Cleave (Machete slashes downward with silver motion arc)
   * Frame 8: Pick Reach (Both arms reach high into palm/tree canopy)
   * Frame 9: Dig / Crouch Gather (Deep knee bend reaching into soil/roots)
   * Frame 10: Scoop Water (Kneeling at river edge holding totuma gourd bowl)
   * Frame 11: Celebrate Hold-Up (Both arms raise collected item overhead, Zelda-style)
   * Frame 12: Inspect Magnifying Glass Pose
   */
  public static getOrCreateCharacterTexture(
    scene: Phaser.Scene,
    appearance: CharacterAppearance
  ): string {
    const key = `char_v4_${appearance.bodyType}_${appearance.skinTone}_${appearance.hairStyle}_${appearance.hairColor}_${appearance.outfit}_${appearance.startingBackpack}`;
    if (scene.textures.exists(key)) {
      return key;
    }

    const frameW = 24;
    const frameH = 24;
    const totalFrames = 13;
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

    // Register character-specific animations
    if (!scene.anims.exists(`${key}_idle`)) {
      scene.anims.create({
        key: `${key}_idle`,
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
    this.drawDetailedExplorerFrame(ctx, 0, 0, appearance, 0, scale);
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

    // Crouch / dip offsets per pose
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

    // 1. Backpack Layer
    const packMain =
      appearance.startingBackpack === 'botanist'
        ? '#2e7d32'
        : appearance.startingBackpack === 'fisher'
          ? '#1565c0'
          : '#d35400';
    const packTrim = '#f39c12';
    px(leftX - 2, 8 + bobY, bodyW + 4, 8, '#111914');
    px(leftX - 1, 9 + bobY, bodyW + 2, 6, packMain);
    px(leftX - 1, 10 + bobY, 1, 2, packTrim);
    px(leftX + bodyW, 10 + bobY, 1, 2, packTrim);

    // 2. Biomechanical Walk & Crouch Legs
    let leftLegX = 8;
    let leftLegY = 16;
    let leftSoleUp = false;

    let rightLegX = 13;
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

    // 3. Torso Outfit & Belt
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

    px(leftX - 1, 8 + bobY, bodyW + 2, 8, '#141e18');
    px(leftX, 9 + bobY, bodyW, 6, outfitMain);
    px(leftX, 13 + bobY, bodyW, 2, outfitShade);
    px(11, 9 + bobY, 2, 2, '#1e4d2b');
    px(leftX, 14 + bobY, bodyW, 1, '#4a2f1d');
    px(11, 14 + bobY, 2, 1, '#f1c40f');

    // 4. Arms & Specialized Harvest / Action Poses
    const armSwingLeftX = frameIdx === 2 ? 1 : frameIdx === 4 ? -1 : 0;
    const armSwingLeftY = frameIdx === 2 ? 1 : frameIdx === 4 ? -1 : 0;
    const armSwingRightX = frameIdx === 2 ? -1 : frameIdx === 4 ? 1 : 0;
    const armSwingRightY = frameIdx === 2 ? -1 : frameIdx === 4 ? 1 : 0;

    if (frameIdx === 6) {
      // Frame 6: Chop Windup — Machete raised high overhead
      px(leftX - 2, 9 + bobY, 2, 5, appearance.skinTone);
      px(leftX + bodyW, 4 + bobY, 2, 6, appearance.skinTone);
      px(leftX + bodyW + 1, 0, 2, 6, '#ecf0f1'); // Raised blade
      px(leftX + bodyW + 2, 0, 1, 5, '#ffffff');
    } else if (frameIdx === 7) {
      // Frame 7: Chop Cleave — Downward machete slash with motion arc
      px(leftX - 2, 10 + bobY, 2, 5, appearance.skinTone);
      px(leftX + bodyW, 10 + bobY, 3, 3, appearance.skinTone);
      px(leftX + bodyW + 2, 11 + bobY, 5, 2, '#ecf0f1'); // Forward blade
      // Silver slash arc
      px(leftX + bodyW + 4, 4, 2, 3, 'rgba(255, 255, 255, 0.85)');
      px(leftX + bodyW + 5, 7, 2, 5, 'rgba(174, 214, 241, 0.9)');
      px(leftX + bodyW + 3, 12, 3, 2, 'rgba(255, 255, 255, 0.85)');
    } else if (frameIdx === 8) {
      // Frame 8: Pick Fruit — Both arms reaching high into canopy
      px(leftX - 2, 4 + bobY, 2, 6, appearance.skinTone);
      px(leftX + bodyW, 3 + bobY, 2, 7, appearance.skinTone);
      px(leftX - 2, 8 + bobY, 2, 2, outfitMain);
      px(leftX + bodyW, 8 + bobY, 2, 2, outfitMain);
    } else if (frameIdx === 9) {
      // Frame 9: Dig Tuber / Gather Ground — Arms reaching down into soil/roots
      px(leftX - 2, 12 + bobY, 2, 6, appearance.skinTone);
      px(leftX + bodyW, 12 + bobY, 3, 6, appearance.skinTone);
      px(leftX + bodyW + 1, 16 + bobY, 3, 2, '#935116'); // Digging stick / root pull
    } else if (frameIdx === 10) {
      // Frame 10: Scoop Water — Holding carved Totuma gourd forward into river
      px(leftX - 2, 11 + bobY, 2, 5, appearance.skinTone);
      px(leftX + bodyW, 11 + bobY, 3, 4, appearance.skinTone);
      px(leftX + bodyW + 2, 12 + bobY, 5, 4, '#ca6f1e'); // Totuma gourd bowl
      px(leftX + bodyW + 3, 12 + bobY, 3, 2, '#5dade2'); // Sparkling water inside gourd
    } else if (frameIdx === 11) {
      // Frame 11: Celebrate Hold-Up — Both arms raise golden glow overhead
      px(leftX - 2, 4 + bobY, 2, 6, appearance.skinTone);
      px(leftX + bodyW, 4 + bobY, 2, 6, appearance.skinTone);
      px(9, 0, 6, 2, '#f1c40f'); // Golden discovery sparkle above hands
    } else if (frameIdx === 12) {
      // Frame 12: Inspect Magnifying Glass Pose
      px(leftX - 2, 9 + bobY, 2, 5, appearance.skinTone);
      px(leftX + bodyW, 7 + bobY, 3, 3, appearance.skinTone);
      px(leftX + bodyW + 2, 5, 4, 4, '#f1c40f');
      px(leftX + bodyW + 3, 6, 2, 2, '#85c1e9');
    } else {
      // Standard Idle / Walk arms
      px(leftX - 2 + armSwingLeftX, 9 + bobY + armSwingLeftY, 2, 5, appearance.skinTone);
      px(leftX - 2 + armSwingLeftX, 9 + bobY + armSwingLeftY, 2, 2, outfitMain);
      px(leftX + bodyW + armSwingRightX, 9 + bobY + armSwingRightY, 2, 5, appearance.skinTone);
      px(leftX + bodyW + armSwingRightX, 9 + bobY + armSwingRightY, 2, 2, outfitMain);
    }

    // 5. Head, Face, Eyes & Shading
    px(7, 2 + bobY, 10, 8, '#141e18');
    px(8, 3 + bobY, 8, 7, appearance.skinTone);
    px(8, 9 + bobY, 8, 1, 'rgba(0,0,0,0.14)');
    px(9, 6 + bobY, 1, 2, '#ffffff');
    px(10, 6 + bobY, 1, 2, '#111111');
    px(14, 6 + bobY, 1, 2, '#111111');
    px(15, 6 + bobY, 1, 2, '#ffffff');
    px(9, 5 + bobY, 2, 1, appearance.hairColor);
    px(14, 5 + bobY, 2, 1, appearance.hairColor);

    // 6. Hair Style & Color
    px(7, 2 + bobY, 10, 2, appearance.hairColor);
    px(8, 1 + bobY, 8, 2, appearance.hairColor);
    px(10, 2 + bobY, 4, 1, 'rgba(255,255,255,0.16)');

    if (appearance.hairStyle === 'braided') {
      px(6, 4 + bobY, 2, 8, appearance.hairColor);
      px(16, 4 + bobY, 2, 8, appearance.hairColor);
      px(6, 11 + bobY, 2, 1, '#e74c3c');
      px(16, 11 + bobY, 2, 1, '#e74c3c');
    } else if (appearance.hairStyle === 'curly') {
      px(6, 2 + bobY, 12, 4, appearance.hairColor);
      px(6, 5 + bobY, 2, 3, appearance.hairColor);
      px(16, 5 + bobY, 2, 3, appearance.hairColor);
    } else if (appearance.hairStyle === 'bun') {
      px(10, 0 + bobY, 4, 2, appearance.hairColor);
      px(10, 1 + bobY, 4, 1, '#f1c40f');
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
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(2, 15, 20, 4);
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(1, 9, 22, 7);
    ctx.fillStyle = '#a04000';
    ctx.fillRect(2, 10, 20, 5);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(5, 11, 14, 3);
    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(8, 11, 2, 3);
    ctx.fillRect(14, 11, 2, 3);
    tex.refresh();
  }

  private static createJaguarSpritesheet(scene: Phaser.Scene, key: string): void {
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

  private static createCaimanSpritesheet(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let f = 0; f < 2; f++) {
      const ox = f * 24;
      ctx.fillStyle = '#1b2631';
      ctx.fillRect(ox + 1, 10, 22, 7);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(ox + 2, 11, 19, 4);
      ctx.fillStyle = '#145a32';
      for (let x = 3; x <= 17; x += 3) {
        ctx.fillRect(ox + x, 9 + (f % 2), 2, 2);
      }
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(ox + 18, 9, 2, 2);
    }

    scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
      frameWidth: 24,
      frameHeight: 24
    });
  }

  private static createSnakeSpritesheet(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let f = 0; f < 2; f++) {
      const ox = f * 24;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(ox + 4, 17, 16, 4);
      ctx.fillStyle = '#4a235a';
      ctx.fillRect(ox + 4, 11, 16, 7);
      ctx.fillStyle = '#b9770e';
      ctx.fillRect(ox + 5, 12, 14, 5);
      ctx.fillStyle = '#1c2833';
      ctx.fillRect(ox + 7, 13, 2, 2);
      ctx.fillRect(ox + 12, 13, 2, 2);
      ctx.fillStyle = '#935116';
      ctx.fillRect(ox + 14, 8, 5, 4);
      if (f === 1) {
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(ox + 19, 9, 3, 1);
      }
    }

    scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
      frameWidth: 24,
      frameHeight: 24
    });
  }

  private static createFishSpritesheet(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 24;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (let f = 0; f < 2; f++) {
      const ox = f * 24;
      ctx.fillStyle = 'rgba(93, 173, 226, 0.45)';
      ctx.fillRect(ox + 3, 14, 18, 4);
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(ox + 4, 9 + f, 16, 6);
      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(ox + 5, 10 + f, 13, 3);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(ox + 5, 12 + f, 12, 2);
      ctx.fillRect(ox + 2, 9 + f, 3, 5);
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

    this.drawDetailedExplorerFrame(ctx, 0, 0, mentorAppearance, 0, 1);
    this.drawDetailedExplorerFrame(ctx, 24, 0, mentorAppearance, 1, 1);

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
    }
    if (!scene.anims.exists('caiman_move')) {
      scene.anims.create({
        key: 'caiman_move',
        frames: scene.anims.generateFrameNumbers('creature_caiman', { start: 0, end: 1 }),
        frameRate: 3,
        repeat: -1
      });
    }
    if (!scene.anims.exists('snake_coil')) {
      scene.anims.create({
        key: 'snake_coil',
        frames: scene.anims.generateFrameNumbers('creature_snake', { start: 0, end: 1 }),
        frameRate: 2.5,
        repeat: -1
      });
    }
    if (!scene.anims.exists('fish_swim')) {
      scene.anims.create({
        key: 'fish_swim',
        frames: scene.anims.generateFrameNumbers('creature_fish', { start: 0, end: 1 }),
        frameRate: 4,
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
