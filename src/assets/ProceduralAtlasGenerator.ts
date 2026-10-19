import Phaser from 'phaser';
import { CharacterAppearance } from '../core/types/game.types';

export class ProceduralAtlasGenerator {
  public static registerBaseTextures(scene: Phaser.Scene): void {
    // 1. Terrain Biome Tiles (16x16)
    this.createTileTexture(scene, 'tile_terra_firme', '#1e4d2b', '#14381e', '#2d6a3e');
    this.createTileTexture(scene, 'tile_varzea', '#235347', '#163832', '#357a68');
    this.createTileTexture(scene, 'tile_riverbank', '#785f41', '#5c472e', '#947855');
    this.createTileTexture(scene, 'tile_aquatic', '#1b4f72', '#154360', '#2980b9');
    this.createPierTexture(scene, 'tile_pier');

    // 2. Flora & Material Sprites (16x16)
    this.createPalmSprite(scene, 'node_plant', '#2ecc71', '#6c3483');
    this.createRootSprite(scene, 'node_tuber', '#27ae60', '#a04000');
    this.createMaterialSprite(scene, 'node_material', '#bdc3c7', '#8d6e63');

    // 3. Structures (Campfire, Tambo Shelter, Curiara Canoe)
    this.createCampfireSprite(scene, 'structure_campfire');
    this.createTamboSprite(scene, 'structure_tambo');
    this.createCanoeSprite(scene, 'structure_canoe');

    // 4. Wildlife & NPCs
    this.createJaguarSprite(scene, 'creature_jaguar');
    this.createReptileSprite(scene, 'creature_reptile');
    this.createFishSprite(scene, 'creature_fish');
    this.createNPCSprite(scene, 'npc_mentor');
  }

  public static getOrCreateCharacterTexture(
    scene: Phaser.Scene,
    appearance: CharacterAppearance
  ): string {
    const key = `char_${appearance.bodyType}_${appearance.skinTone}_${appearance.hairStyle}_${appearance.hairColor}_${appearance.outfit}_${appearance.startingBackpack}`;
    if (scene.textures.exists(key)) {
      return key;
    }

    const canvasTex = scene.textures.createCanvas(key, 16, 16);
    if (!canvasTex) return key;
    const ctx = canvasTex.getContext();
    ctx.imageSmoothingEnabled = false;

    const widthMod =
      appearance.bodyType === 'sturdy' ? 8 : appearance.bodyType === 'agile' ? 6 : 7;
    const leftX = Math.floor((16 - widthMod) / 2);

    // Layer 1: Backpack (behind torso)
    const packColor =
      appearance.startingBackpack === 'botanist'
        ? '#2e7d32'
        : appearance.startingBackpack === 'fisher'
          ? '#1565c0'
          : '#d35400';
    ctx.fillStyle = packColor;
    ctx.fillRect(leftX - 1, 6, widthMod + 2, 6);

    // Layer 2: Skin Tone (head, arms, legs)
    ctx.fillStyle = appearance.skinTone;
    ctx.fillRect(5, 2, 6, 5); // Head
    ctx.fillRect(leftX - 1, 7, 1, 4); // Left arm
    ctx.fillRect(leftX + widthMod, 7, 1, 4); // Right arm
    ctx.fillRect(6, 12, 2, 3); // Left leg
    ctx.fillRect(9, 12, 2, 3); // Right leg

    // Eyes
    ctx.fillStyle = '#111111';
    ctx.fillRect(6, 4, 1, 1);
    ctx.fillRect(9, 4, 1, 1);

    // Layer 3: Outfit (torso & shorts)
    const outfitColor =
      appearance.outfit === 'expedition_vest'
        ? '#c29b61'
        : appearance.outfit === 'river_poncho'
          ? '#1abc9c'
          : '#ecf0f1';
    ctx.fillStyle = outfitColor;
    ctx.fillRect(leftX, 7, widthMod, 5);
    ctx.fillStyle = '#34495e';
    ctx.fillRect(leftX, 11, widthMod, 2);

    // Layer 4: Hair style & color
    ctx.fillStyle = appearance.hairColor;
    ctx.fillRect(5, 1, 6, 2);
    if (appearance.hairStyle === 'braided') {
      ctx.fillRect(4, 2, 1, 6);
      ctx.fillRect(11, 2, 1, 6);
    } else if (appearance.hairStyle === 'curly') {
      ctx.fillRect(4, 1, 8, 3);
    } else if (appearance.hairStyle === 'bun') {
      ctx.fillRect(7, 0, 2, 1);
    }

    canvasTex.refresh();
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

    // Draw background jungle badge
    ctx.fillStyle = '#14381e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scale = Math.floor(canvas.width / 16);
    const px = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
    };

    const widthMod =
      appearance.bodyType === 'sturdy' ? 8 : appearance.bodyType === 'agile' ? 6 : 7;
    const leftX = Math.floor((16 - widthMod) / 2);

    const packColor =
      appearance.startingBackpack === 'botanist'
        ? '#2e7d32'
        : appearance.startingBackpack === 'fisher'
          ? '#1565c0'
          : '#d35400';
    px(leftX - 1, 6, widthMod + 2, 6, packColor);
    px(5, 2, 6, 5, appearance.skinTone);
    px(leftX - 1, 7, 1, 4, appearance.skinTone);
    px(leftX + widthMod, 7, 1, 4, appearance.skinTone);
    px(6, 12, 2, 3, appearance.skinTone);
    px(9, 12, 2, 3, appearance.skinTone);
    px(6, 4, 1, 1, '#111111');
    px(9, 4, 1, 1, '#111111');

    const outfitColor =
      appearance.outfit === 'expedition_vest'
        ? '#c29b61'
        : appearance.outfit === 'river_poncho'
          ? '#1abc9c'
          : '#ecf0f1';
    px(leftX, 7, widthMod, 5, outfitColor);
    px(leftX, 11, widthMod, 2, '#34495e');

    px(5, 1, 6, 2, appearance.hairColor);
    if (appearance.hairStyle === 'braided') {
      px(4, 2, 1, 6, appearance.hairColor);
      px(11, 2, 1, 6, appearance.hairColor);
    } else if (appearance.hairStyle === 'curly') {
      px(4, 1, 8, 3, appearance.hairColor);
    } else if (appearance.hairStyle === 'bun') {
      px(7, 0, 2, 1, appearance.hairColor);
    }
  }

  private static createTileTexture(
    scene: Phaser.Scene,
    key: string,
    base: string,
    speckDark: string,
    speckLight: string
  ): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 16, 16);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = speckDark;
    ctx.fillRect(2, 3, 2, 1);
    ctx.fillRect(11, 12, 2, 2);
    ctx.fillStyle = speckLight;
    ctx.fillRect(7, 6, 2, 1);
    ctx.fillRect(13, 4, 1, 2);
    tex.refresh();
  }

  private static createPierTexture(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 16, 16);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#5d4037';
    for (let y = 0; y < 16; y += 4) {
      ctx.fillRect(0, y, 16, 1);
    }
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(6, 6, 4, 4);
    tex.refresh();
  }

  private static createPalmSprite(
    scene: Phaser.Scene,
    key: string,
    frond: string,
    fruit: string
  ): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 16, 16);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.fillStyle = '#6e4726';
    ctx.fillRect(7, 6, 2, 9);
    ctx.fillStyle = frond;
    ctx.fillRect(2, 2, 12, 4);
    ctx.fillRect(4, 0, 8, 2);
    ctx.fillStyle = fruit;
    ctx.fillRect(5, 6, 2, 2);
    ctx.fillRect(9, 6, 2, 2);
    tex.refresh();
  }

  private static createRootSprite(
    scene: Phaser.Scene,
    key: string,
    leaf: string,
    stem: string
  ): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 16, 16);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.fillStyle = stem;
    ctx.fillRect(6, 8, 4, 6);
    ctx.fillStyle = leaf;
    ctx.fillRect(3, 3, 10, 5);
    tex.refresh();
  }

  private static createMaterialSprite(
    scene: Phaser.Scene,
    key: string,
    stone: string,
    wood: string
  ): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 16, 16);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.fillStyle = wood;
    ctx.fillRect(3, 9, 10, 4);
    ctx.fillStyle = stone;
    ctx.fillRect(5, 6, 6, 4);
    tex.refresh();
  }

  private static createCampfireSprite(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 16, 16);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(3, 11, 10, 3);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(5, 5, 6, 6);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(6, 3, 4, 5);
    tex.refresh();
  }

  private static createTamboSprite(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 16, 16);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.fillStyle = '#d35400';
    ctx.fillRect(1, 2, 14, 6);
    ctx.fillStyle = '#6e4726';
    ctx.fillRect(2, 8, 2, 7);
    ctx.fillRect(12, 8, 2, 7);
    ctx.fillRect(2, 11, 12, 2);
    tex.refresh();
  }

  private static createCanoeSprite(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 16, 16);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(1, 6, 14, 5);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(3, 7, 10, 3);
    tex.refresh();
  }

  private static createJaguarSprite(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 16, 16);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(2, 5, 11, 6);
    ctx.fillRect(11, 3, 4, 4);
    ctx.fillRect(3, 11, 2, 4);
    ctx.fillRect(10, 11, 2, 4);
    ctx.fillStyle = '#111111';
    ctx.fillRect(4, 6, 2, 2);
    ctx.fillRect(8, 7, 2, 2);
    ctx.fillRect(13, 4, 1, 1);
    tex.refresh();
  }

  private static createReptileSprite(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 16, 16);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(2, 8, 12, 4);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(12, 7, 2, 2);
    tex.refresh();
  }

  private static createFishSprite(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 16, 16);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(3, 6, 9, 4);
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(4, 6, 7, 2);
    tex.refresh();
  }

  private static createNPCSprite(scene: Phaser.Scene, key: string): void {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, 16, 16);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.fillStyle = '#c68652';
    ctx.fillRect(5, 2, 6, 5);
    ctx.fillStyle = '#1f618d';
    ctx.fillRect(4, 7, 8, 6);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(4, 1, 8, 2);
    tex.refresh();
  }
}
