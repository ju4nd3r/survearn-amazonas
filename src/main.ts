import Phaser from 'phaser';
import './styles/main.css';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { UIManager } from './ui/UIManager';

function bootstrapGame(): void {
  const uiRoot = document.getElementById('ui-overlay-root');
  if (!uiRoot) {
    throw new Error('Missing #ui-overlay-root container');
  }

  new UIManager(uiRoot);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'phaser-viewport',
    backgroundColor: '#09170e',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.innerWidth,
      height: window.innerHeight
    },
    scene: [BootScene, WorldScene]
  };

  new Phaser.Game(config);
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', bootstrapGame);
}
