import Phaser from 'phaser';
import { CharacterAppearance } from '../core/types/game.types';

/**
 * Generates high-detail 24x24 pixel-art sprite sheets, multi-frame animations,
 * shaded terrain tiles, and botanical/material icons at runtime.
 */
export class ProceduralAtlasGenerator {
  public static registerBaseTextures(scene: Phaser.Scene): void {
    // 1. Shaded 16x16 Terrain Biome Tiles (4 variants each to break grid repetition)
    this.createTerrainVariants(scene);
    this.createPierTexture(scene, 'tile_pier');

    // 2. Detailed 24x24 Botanical & Material Sprites
    this.createDetailedPalmTexture(scene, 'node_palm_asai', '#2ecc71', '#4a1f5c', '#6e4726');
    this.createDetailedPalmTexture(scene, 'node_palm_chontaduro', '#27ae60', '#e65c22', '#5c3c1e');
    this.createDetailedPalmTexture(scene, 'node_palm_moriche', '#1e8449', '#a93226', '#6e4726');
    this.createDetailedShrubTexture(scene, 'node_tuber_brava', '#2ecc71', '#a93226', '#784212');
    this.createDetailedShrubTexture(scene, 'node_tuber_dulce', '#58d68d', '#d4ac0d', '#935116');
    this.createDetailedTreeFruitTexture(scene, 'node_fruit_tree', '#229954', '#f1c40f', '#5d4037');
    this.createDetailedMedicinalTreeTexture(scene, 'node_medicinal', '#1abc9c', '#c0392b', '#7f8c8d');
    this.createDetailedToxicVineTexture(scene, 'node_toxic', '#196f3d', '#8e44ad');

    // Detailed Materials (Wood logs, Flint stones, Chambira fibers, Bijao leaves, Bamboo, Resin/Clay)
    this.createDetailedWoodTexture(scene, 'node_mat_wood');
    this.createDetailedStoneTexture(scene, 'node_mat_stone');
    this.createDetailedFiberTexture(scene, 'node_mat_fiber');
    this.createDetailedLeafTexture(scene, 'node_mat_leaf');
    this.createDetailedBambooTexture(scene, 'node_mat_bamboo');
    this.createDetailedResinTexture(scene, 'node_mat_resin');

    // Legacy alias fallbacks so any external callers remain compatible
    this.createDetailedPalmTexture(scene, 'node_plant', '#2ecc71', '#6c3483', '#6e4726');
    this.createDetailedShrubTexture(scene, 'node_tuber', '#27ae60', '#a04000', '#6e4726');
    this.createDetailedStoneTexture(scene, 'node_material');

    // 3. Animated & Detailed Structures (Campfire 4 frames, Tambo 24x24, Curiara Canoe 24x24)
    this.createAnimatedCampfireSpritesheet(scene, 'structure_campfire');
    this.createDetailedTamboTexture(scene, 'structure_tambo');
    this.createDetailedCanoeTexture(scene, 'structure_canoe');

    // 4. Multi-Frame Wildlife & Mentor Spritesheets (24x24 per frame)
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

  /**
   * Generates an 8-frame (24x24 per frame = 192x24 strip) character spritesheet:
   * Frame 0: Idle 1 (Planted neutral stance)
   * Frame 1: Idle 2 (Breathing torso bob)
   * Frame 2: Walk Contact A (Left leg strides forward/down, Right leg pushes back/up)
   * Frame 3: Walk Passing A (Right knee lifts & passes forward, torso rises)
   * Frame 4: Walk Contact B (Right leg strides forward/down, Left leg pushes back/up)
   * Frame 5: Walk Passing B (Left knee lifts & passes forward, torso rises)
   * Frame 6: Action / Harvest Tool Swing
   * Frame 7: Inspect Magnifying Glass Pose
   */
  public static getOrCreateCharacterTexture(
    scene: Phaser.Scene,
    appearance: CharacterAppearance
  ): string {
    const key = `char_v3_${appearance.bodyType}_${appearance.skinTone}_${appearance.hairStyle}_${appearance.hairColor}_${appearance.outfit}_${appearance.startingBackpack}`;
    if (scene.textures.exists(key)) {
      return key;
    }

    const frameW = 24;
    const frameH = 24;
    const totalFrames = 8;
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
      scene.anims.create({
        key: `${key}_action`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [6, 0] }),
        frameRate: 6,
        repeat: 0
      });
      scene.anims.create({
        key: `${key}_inspect`,
        frames: scene.anims.generateFrameNumbers(key, { frames: [7, 7, 0] }),
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

    // Rich jungle backdrop inside preview box
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

    // Torso dips 1px on wide contact strides (frames 2 & 4) and rises on passing steps (frames 3 & 5)
    const bobY = frameIdx === 1 || frameIdx === 2 || frameIdx === 4 ? 1 : 0;

    // Ground drop shadow (widens during contact stride, narrows during passing step)
    const shadowW = frameIdx === 2 || frameIdx === 4 ? 14 : 11;
    const shadowX = Math.floor((24 - shadowW) / 2);
    px(shadowX, 21, shadowW, 2, 'rgba(0, 0, 0, 0.4)');

    // 1. Backpack Layer (with straps & flap detail)
    const packMain =
      appearance.startingBackpack === 'botanist'
        ? '#2e7d32'
        : appearance.startingBackpack === 'fisher'
          ? '#1565c0'
          : '#d35400';
    const packTrim = '#f39c12';
    px(leftX - 2, 8 + bobY, bodyW + 4, 8, '#111914'); // Outline
    px(leftX - 1, 9 + bobY, bodyW + 2, 6, packMain);
    px(leftX - 1, 10 + bobY, 1, 2, packTrim);
    px(leftX + bodyW, 10 + bobY, 1, 2, packTrim);

    // 2. Biomechanical Walk Cycle: Legs, Knees & Field Boots
    // Compute horizontal (X), vertical (Y), and lifted-sole states for Left & Right legs
    let leftLegX = 8;
    let leftLegY = 16;
    let leftSoleUp = false;

    let rightLegX = 13;
    let rightLegY = 16;
    let rightSoleUp = false;

    if (frameIdx === 2) {
      // Contact A: Left foot steps forward & plants; Right foot pushes back & lifts heel
      leftLegX = 6;
      leftLegY = 16;
      rightLegX = 15;
      rightLegY = 14;
      rightSoleUp = true;
    } else if (frameIdx === 3) {
      // Passing A: Left leg supports upright; Right knee swings forward lifted off ground
      leftLegX = 9;
      leftLegY = 16;
      rightLegX = 12;
      rightLegY = 14;
      rightSoleUp = true;
    } else if (frameIdx === 4) {
      // Contact B: Right foot steps forward & plants; Left foot pushes back & lifts heel
      leftLegX = 6;
      leftLegY = 14;
      leftSoleUp = true;
      rightLegX = 15;
      rightLegY = 16;
    } else if (frameIdx === 5) {
      // Passing B: Right leg supports upright; Left knee swings forward lifted off ground
      leftLegX = 9;
      leftLegY = 14;
      leftSoleUp = true;
      rightLegX = 12;
      rightLegY = 16;
    }

    const drawLeg = (lx: number, ly: number, isLifted: boolean, isFrontLeg: boolean) => {
      const trouserColor = isFrontLeg ? '#34495e' : '#1f2d3a';
      const bootColor = isFrontLeg ? '#6e4726' : '#4e342e';
      // Dark outline around leg & boot
      px(lx - 1, ly, 5, 6, '#101712');
      // Thigh & knee trousers
      px(lx, ly, 3, 3, trouserColor);
      // Field boot upper + toe cap extending 1px forward
      px(lx, ly + 3, 4, 2, bootColor);
      // Boot sole (bright mud-tread highlight when foot is lifted in mid-stride)
      px(lx, ly + 5, 4, 1, isLifted ? '#d5bdaf' : '#2c1d14');
    };

    // Render back leg first, then front leg for natural depth overlap during stride
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

    px(leftX - 1, 8 + bobY, bodyW + 2, 8, '#141e18'); // Torso dark outline
    px(leftX, 9 + bobY, bodyW, 6, outfitMain);
    px(leftX, 13 + bobY, bodyW, 2, outfitShade);
    // Collar / V-neck & utility belt
    px(11, 9 + bobY, 2, 2, '#1e4d2b');
    px(leftX, 14 + bobY, bodyW, 1, '#4a2f1d');
    px(11, 14 + bobY, 2, 1, '#f1c40f'); // Belt buckle

    // 4. Arms & Counter-Swinging Walk / Action Poses
    const armSwingLeftX = frameIdx === 2 ? 1 : frameIdx === 4 ? -1 : 0;
    const armSwingLeftY = frameIdx === 2 ? 1 : frameIdx === 4 ? -1 : 0;
    const armSwingRightX = frameIdx === 2 ? -1 : frameIdx === 4 ? 1 : 0;
    const armSwingRightY = frameIdx === 2 ? -1 : frameIdx === 4 ? 1 : 0;

    // Left arm
    px(leftX - 2 + armSwingLeftX, 9 + bobY + armSwingLeftY, 2, 5, appearance.skinTone);
    px(leftX - 2 + armSwingLeftX, 9 + bobY + armSwingLeftY, 2, 2, outfitMain); // Sleeve

    // Right arm (swings tool on frame 6, holds lens on frame 7, or counter-swings while walking)
    if (frameIdx === 6) {
      // Raised arm swinging machete / harvesting stick
      px(leftX + bodyW, 7 + bobY, 3, 3, appearance.skinTone);
      px(leftX + bodyW + 2, 3, 2, 6, '#ecf0f1');
      px(leftX + bodyW + 3, 2, 2, 4, '#ffffff');
      px(leftX + bodyW + 1, 8, 2, 2, '#6e4726');
    } else if (frameIdx === 7) {
      // Holding magnifying glass up to inspect flora/fauna
      px(leftX + bodyW, 7 + bobY, 3, 3, appearance.skinTone);
      px(leftX + bodyW + 2, 5, 4, 4, '#f1c40f'); // Brass rim
      px(leftX + bodyW + 3, 6, 2, 2, '#85c1e9'); // Glass lens glint
    } else {
      px(leftX + bodyW + armSwingRightX, 9 + bobY + armSwingRightY, 2, 5, appearance.skinTone);
      px(leftX + bodyW + armSwingRightX, 9 + bobY + armSwingRightY, 2, 2, outfitMain);
    }

    // 5. Head, Face, Eyes & Shading
    px(7, 2 + bobY, 10, 8, '#141e18'); // Head outline
    px(8, 3 + bobY, 8, 7, appearance.skinTone);
    // Cheek / chin warm shading
    px(8, 9 + bobY, 8, 1, 'rgba(0,0,0,0.14)');
    // Crisp expressive eyes with white scleras
    px(9, 6 + bobY, 1, 2, '#ffffff');
    px(10, 6 + bobY, 1, 2, '#111111');
    px(14, 6 + bobY, 1, 2, '#111111');
    px(15, 6 + bobY, 1, 2, '#ffffff');
    // Eyebrows
    px(9, 5 + bobY, 2, 1, appearance.hairColor);
    px(14, 5 + bobY, 2, 1, appearance.hairColor);

    // 6. Hair Style & Color
    px(7, 2 + bobY, 10, 2, appearance.hairColor);
    px(8, 1 + bobY, 8, 2, appearance.hairColor);
    // Hair highlight
    px(10, 2 + bobY, 4, 1, 'rgba(255,255,255,0.16)');

    if (appearance.hairStyle === 'braided') {
      px(6, 4 + bobY, 2, 8, appearance.hairColor);
      px(16, 4 + bobY, 2, 8, appearance.hairColor);
      px(6, 11 + bobY, 2, 1, '#e74c3c'); // Woven hair tie
      px(16, 11 + bobY, 2, 1, '#e74c3c');
    } else if (appearance.hairStyle === 'curly') {
      px(6, 2 + bobY, 12, 4, appearance.hairColor);
      px(6, 5 + bobY, 2, 3, appearance.hairColor);
      px(16, 5 + bobY, 2, 3, appearance.hairColor);
    } else if (appearance.hairStyle === 'bun') {
      px(10, 0 + bobY, 4, 2, appearance.hairColor);
      px(10, 1 + bobY, 4, 1, '#f1c40f'); // Hair band
    }
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

        // Organic grass blades / ripples offset by variant index
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
    // Lantern beacon glow
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

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(6, 20, 12, 3);

    // Ringed palm trunk with outline
    ctx.fillStyle = '#1b120c';
    ctx.fillRect(9, 8, 6, 14);
    ctx.fillStyle = trunkColor;
    ctx.fillRect(10, 8, 4, 13);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = 10; y <= 18; y += 3) {
      ctx.fillRect(10, y, 4, 1);
    }

    // Hanging fruit clusters (Asaí / Chontaduro / Moriche)
    ctx.fillStyle = fruitColor;
    ctx.fillRect(7, 8, 3, 4);
    ctx.fillRect(14, 8, 3, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(7, 8, 1, 1);
    ctx.fillRect(14, 8, 1, 1);

    // Arching pinnate palm fronds
    ctx.fillStyle = '#0e2f18';
    ctx.fillRect(2, 3, 20, 6);
    ctx.fillStyle = frondColor;
    ctx.fillRect(3, 4, 18, 4);
    ctx.fillRect(6, 2, 12, 3);
    ctx.fillRect(1, 6, 4, 3);
    ctx.fillRect(19, 6, 4, 3);
    ctx.fillStyle = '#abebc6';
    ctx.fillRect(8, 2, 8, 1);

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

    // Ground shadow & exposed tuber roots
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(5, 19, 14, 3);
    ctx.fillStyle = '#1b120c';
    ctx.fillRect(7, 15, 10, 6);
    ctx.fillStyle = tuberColor;
    ctx.fillRect(8, 16, 4, 4);
    ctx.fillRect(12, 17, 4, 3);

    // Reddish or green petioles (distinguishing Yuca Brava vs Yuca Dulce)
    ctx.fillStyle = petioleColor;
    ctx.fillRect(11, 9, 2, 7);
    ctx.fillRect(8, 10, 3, 2);
    ctx.fillRect(13, 10, 3, 2);

    // Palmate cassava leaves
    ctx.fillStyle = '#0e2f18';
    ctx.fillRect(4, 3, 16, 8);
    ctx.fillStyle = leafColor;
    ctx.fillRect(5, 4, 14, 6);
    ctx.fillRect(8, 2, 8, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(9, 3, 6, 1);

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

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(5, 20, 14, 3);
    ctx.fillStyle = trunkColor;
    ctx.fillRect(9, 11, 6, 10);
    ctx.fillStyle = '#14381e';
    ctx.fillRect(3, 2, 18, 11);
    ctx.fillStyle = canopyColor;
    ctx.fillRect(4, 3, 16, 9);
    // Hanging tropical fruits
    ctx.fillStyle = fruitColor;
    ctx.fillRect(6, 9, 3, 3);
    ctx.fillRect(14, 8, 3, 3);
    ctx.fillRect(10, 5, 3, 3);
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

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(6, 20, 12, 3);
    // Pale mottled bark with crimson Sangre de Drago sap streak
    ctx.fillStyle = '#1c2833';
    ctx.fillRect(8, 10, 8, 12);
    ctx.fillStyle = barkColor;
    ctx.fillRect(9, 10, 6, 11);
    ctx.fillStyle = sapColor;
    ctx.fillRect(11, 12, 2, 6);

    // Heart-shaped medicinal crown
    ctx.fillStyle = '#0e3d2f';
    ctx.fillRect(3, 2, 18, 10);
    ctx.fillStyle = canopyColor;
    ctx.fillRect(4, 3, 16, 8);
    ctx.fillStyle = sapColor;
    ctx.fillRect(7, 5, 2, 2);
    ctx.fillRect(15, 6, 2, 2);
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

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(5, 19, 14, 3);
    ctx.fillStyle = '#111111';
    ctx.fillRect(4, 5, 16, 15);
    ctx.fillStyle = leafColor;
    ctx.fillRect(5, 6, 14, 13);
    // Variegated cream spots & warning berries
    ctx.fillStyle = '#fcf3cf';
    ctx.fillRect(7, 8, 2, 3);
    ctx.fillRect(14, 10, 2, 3);
    ctx.fillStyle = berryColor;
    ctx.fillRect(10, 13, 4, 4);
    tex.refresh();
  }

  private static createDetailedWoodTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(3, 17, 18, 4);
    // Stacked Capirona hardwood logs with end-grain rings
    ctx.fillStyle = '#2e1c10';
    ctx.fillRect(3, 10, 18, 9);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(4, 11, 14, 3);
    ctx.fillRect(5, 15, 14, 3);
    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(17, 11, 3, 3);
    ctx.fillRect(18, 15, 2, 3);
    tex.refresh();
  }

  private static createDetailedStoneTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(4, 17, 16, 4);
    ctx.fillStyle = '#1c2833';
    ctx.fillRect(4, 9, 16, 10);
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(5, 10, 14, 8);
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(6, 10, 8, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(7, 11, 3, 1);
    tex.refresh();
  }

  private static createDetailedFiberTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(5, 17, 14, 4);
    // Coiled golden chambira palm cordage
    ctx.fillStyle = '#4a3519';
    ctx.fillRect(5, 7, 14, 12);
    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(6, 8, 12, 10);
    ctx.fillStyle = '#9c640c';
    ctx.fillRect(9, 11, 6, 4);
    ctx.fillRect(6, 12, 12, 2);
    tex.refresh();
  }

  private static createDetailedLeafTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(4, 18, 16, 3);
    ctx.fillStyle = '#0e3d1f';
    ctx.fillRect(3, 5, 18, 14);
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(4, 6, 16, 12);
    // Central leaf midrib and veins
    ctx.fillStyle = '#abebc6';
    ctx.fillRect(5, 11, 14, 2);
    ctx.fillRect(9, 8, 2, 8);
    ctx.fillRect(14, 8, 2, 8);
    tex.refresh();
  }

  private static createDetailedBambooTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(5, 19, 14, 3);
    ctx.fillStyle = '#145a32';
    ctx.fillRect(6, 3, 12, 18);
    ctx.fillStyle = '#58d68d';
    ctx.fillRect(7, 4, 3, 16);
    ctx.fillRect(13, 4, 3, 16);
    // Bamboo nodes
    ctx.fillStyle = '#1e8449';
    ctx.fillRect(6, 8, 12, 1);
    ctx.fillRect(6, 14, 12, 1);
    tex.refresh();
  }

  private static createDetailedResinTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 24, 24);
    if (!tex) return;
    const ctx = tex.getContext();

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(5, 17, 14, 4);
    ctx.fillStyle = '#7d6608';
    ctx.fillRect(6, 7, 12, 12);
    ctx.fillStyle = '#f9e79f';
    ctx.fillRect(7, 8, 10, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 9, 3, 3);
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
      // Warm ground glow ring
      ctx.fillStyle = f % 2 === 0 ? 'rgba(243, 156, 18, 0.28)' : 'rgba(231, 76, 60, 0.34)';
      ctx.fillRect(ox + 2, 6, 20, 16);

      // Stone ring & crossed Capirona logs
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(ox + 4, 16, 16, 4);
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(ox + 3, 18, 4, 3);
      ctx.fillRect(ox + 17, 18, 4, 3);
      ctx.fillRect(ox + 10, 19, 4, 3);

      // Flickering outer crimson flame
      const flameHeight = f === 1 ? 11 : f === 3 ? 9 : 10;
      const flameShiftX = f === 1 ? 1 : f === 2 ? -1 : 0;
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(ox + 7 + flameShiftX, 17 - flameHeight, 10, flameHeight);

      // Inner amber & white-hot core
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(ox + 8 + flameShiftX, 17 - flameHeight + 2, 8, flameHeight - 2);
      ctx.fillStyle = '#fef9e7';
      ctx.fillRect(ox + 10, 13, 4, 4);

      // Rising ember sparks
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

    // Stilt shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(2, 20, 20, 3);

    // Elevated palafito wooden stilts & platform
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(4, 12, 2, 10);
    ctx.fillRect(18, 12, 2, 10);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(3, 15, 18, 3);

    // Woven chambira hammock slung inside shelter
    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(6, 12, 12, 2);
    ctx.fillRect(8, 13, 8, 2);

    // Layered palm-thatch pitched roof
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
    // Wooden cross benches & paddle
    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(8, 11, 2, 3);
    ctx.fillRect(14, 11, 2, 3);
    tex.refresh();
  }

  /**
   * 4-Frame Jaguar Spritesheet (24x24 per frame):
   * Frame 0: Idle / Alert
   * Frame 1: Stalking Crouch
   * Frame 2: Running Stride Extended
   * Frame 3: Running Stride Gathered / Pounce
   */
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

      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(ox + 3, 19, 18, 3);

      // Tail (curves and whips during run)
      ctx.fillStyle = '#111111';
      ctx.fillRect(ox + 1, 10 + crouchY + (f % 2), 4, 3);
      ctx.fillStyle = '#d68910';
      ctx.fillRect(ox + 2, 11 + crouchY + (f % 2), 3, 1);

      // Legs (animated bounding stride on frames 2 & 3)
      ctx.fillStyle = '#111111';
      if (f === 2) {
        // Extended leap
        ctx.fillRect(ox + 3, 14, 3, 5);
        ctx.fillRect(ox + 7, 15, 3, 4);
        ctx.fillRect(ox + 15, 15, 3, 4);
        ctx.fillRect(ox + 19, 13, 3, 5);
      } else if (f === 3) {
        // Gathered stride
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

      // Muscular torso with dark outline
      ctx.fillStyle = '#111111';
      ctx.fillRect(ox + 4, 8 + crouchY, 15, 8);
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(ox + 5, 9 + crouchY, 13, 6);
      // White underbelly highlight
      ctx.fillStyle = '#fef9e7';
      ctx.fillRect(ox + 7, 14 + crouchY, 9, 1);

      // Authentic black rosettes with tawny centers
      ctx.fillStyle = '#111111';
      ctx.fillRect(ox + 6, 10 + crouchY, 3, 3);
      ctx.fillRect(ox + 10, 11 + crouchY, 3, 3);
      ctx.fillRect(ox + 14, 10 + crouchY, 3, 3);
      ctx.fillStyle = '#d35400';
      ctx.fillRect(ox + 7, 11 + crouchY, 1, 1);
      ctx.fillRect(ox + 11, 12 + crouchY, 1, 1);
      ctx.fillRect(ox + 15, 11 + crouchY, 1, 1);

      // Head, rounded ears, glowing amber eyes & fangs when running/chasing
      ctx.fillStyle = '#111111';
      ctx.fillRect(ox + 16, 5 + crouchY, 7, 7);
      ctx.fillStyle = '#f39c12';
      ctx.fillRect(ox + 17, 6 + crouchY, 5, 5);
      // Rounded ears
      ctx.fillStyle = '#111111';
      ctx.fillRect(ox + 16, 4 + crouchY, 2, 2);
      ctx.fillRect(ox + 20, 4 + crouchY, 2, 2);
      // Piercing emerald/amber eye
      ctx.fillStyle = f >= 2 ? '#e74c3c' : '#a9dfbf';
      ctx.fillRect(ox + 20, 7 + crouchY, 2, 1);
      // White muzzle / fang glint
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
      // Armored scutes along back
      ctx.fillStyle = '#145a32';
      for (let x = 3; x <= 17; x += 3) {
        ctx.fillRect(ox + x, 9 + (f % 2), 2, 2);
      }
      // Yellow reptile eye
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
      // Coiled lancehead viper (Bothrops atrox) with X pattern
      ctx.fillStyle = '#4a235a';
      ctx.fillRect(ox + 4, 11, 16, 7);
      ctx.fillStyle = '#b9770e';
      ctx.fillRect(ox + 5, 12, 14, 5);
      ctx.fillStyle = '#1c2833';
      ctx.fillRect(ox + 7, 13, 2, 2);
      ctx.fillRect(ox + 12, 13, 2, 2);
      // Raised lance-shaped head & flicking red tongue on frame 1
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
      // Water ripple ring
      ctx.fillStyle = 'rgba(93, 173, 226, 0.45)';
      ctx.fillRect(ox + 3, 14, 18, 4);
      // Pirarucú silver-red armored body
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(ox + 4, 9 + f, 16, 6);
      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(ox + 5, 10 + f, 13, 3);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(ox + 5, 12 + f, 12, 2);
      ctx.fillRect(ox + 2, 9 + f, 3, 5); // Scarlet tail
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

    // Add woven straw hat crown on mentor
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
