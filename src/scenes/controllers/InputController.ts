import Phaser from 'phaser';
import { EventBus } from '../../core/events/EventBus';

export interface MovementVector {
  dx: number;
  dy: number;
  sprinting: boolean;
}

export class InputController {
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW?: Phaser.Input.Keyboard.Key;
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyS?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keyShift?: Phaser.Input.Keyboard.Key;

  private touchDx = 0;
  private touchDy = 0;

  constructor(scene: Phaser.Scene) {
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.keyW = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keyA = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyS = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.keyD = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyShift = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

      scene.input.keyboard.on('keydown-E', () => {
        if (this.isModalOpen()) return;
        EventBus.emit('PLAYER_INPUT_ACTION', { action: 'interact' });
      });
      scene.input.keyboard.on('keydown-SPACE', () => {
        if (this.isModalOpen()) return;
        EventBus.emit('PLAYER_INPUT_ACTION', { action: 'interact' });
      });
      scene.input.keyboard.on('keydown-I', () => {
        if (this.isModalOpen()) return;
        EventBus.emit('PLAYER_INPUT_ACTION', { action: 'inspect' });
      });
      scene.input.keyboard.on('keydown-R', () => {
        if (this.isModalOpen()) return;
        EventBus.emit('PLAYER_INPUT_ACTION', { action: 'rest' });
      });
      scene.input.keyboard.on('keydown-B', () => {
        if (this.isModalOpen()) return;
        EventBus.emit('OPEN_MODAL', { modal: 'bitacora' });
      });
      scene.input.keyboard.on('keydown-C', () => {
        if (this.isModalOpen()) return;
        EventBus.emit('OPEN_MODAL', { modal: 'crafting' });
      });
      scene.input.keyboard.on('keydown-G', () => {
        if (this.isModalOpen()) return;
        EventBus.emit('OPEN_MODAL', { modal: 'saves' });
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('survearn-joystick', ((ev: CustomEvent<{ dx: number; dy: number }>) => {
        this.touchDx = ev.detail.dx;
        this.touchDy = ev.detail.dy;
      }) as EventListener);
    }
  }

  private isModalOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.querySelector('dialog[open]') !== null;
  }

  public getMovement(): MovementVector {
    if (this.isModalOpen()) {
      return { dx: 0, dy: 0, sprinting: false };
    }

    let dx = this.touchDx;
    let dy = this.touchDy;

    if (this.cursors?.left.isDown || this.keyA?.isDown) dx -= 1;
    if (this.cursors?.right.isDown || this.keyD?.isDown) dx += 1;
    if (this.cursors?.up.isDown || this.keyW?.isDown) dy -= 1;
    if (this.cursors?.down.isDown || this.keyS?.isDown) dy += 1;

    const len = Math.hypot(dx, dy);
    if (len > 1) {
      dx /= len;
      dy /= len;
    }

    const sprinting = Boolean(this.keyShift?.isDown);
    return { dx, dy, sprinting };
  }
}
