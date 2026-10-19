import Phaser from 'phaser';
import { ProceduralAtlasGenerator } from '../assets/ProceduralAtlasGenerator';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public create(): void {
    ProceduralAtlasGenerator.registerBaseTextures(this);
    this.scene.start('WorldScene');
  }
}
