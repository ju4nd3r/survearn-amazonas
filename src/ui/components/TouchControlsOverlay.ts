import { EventBus } from '../../core/events/EventBus';
import { i18n } from '../../i18n/I18nService';

export class TouchControlsOverlay {
  private readonly root: HTMLElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'touch-controls-bar';
    parent.appendChild(this.root);

    this.render();
    EventBus.on('LANGUAGE_CHANGED', () => this.render());
    EventBus.on('SETTINGS_UPDATED', ({ settings }) => {
      this.root.classList.toggle('left-handed', settings.leftHanded);
    });
    EventBus.on('NPC_PROXIMITY_CHANGED', (payload) => {
      const btn = this.root.querySelector<HTMLButtonElement>('#btn-touch-interact');
      if (!btn) return;
      const isEs = i18n.getLanguage() === 'es';
      if (payload.nearbyNpcId) {
        btn.classList.add('npc-talk-active');
        btn.innerHTML = `ℹ️ ${isEs ? '[E] Hablar' : '[E] Talk'}`;
      } else {
        btn.classList.remove('npc-talk-active');
        btn.innerHTML = `🖐️ ${i18n.t('hud.btnAction')}`;
      }
    });
  }

  private emitJoystick(dx: number, dy: number): void {
    window.dispatchEvent(new CustomEvent('survearn-joystick', { detail: { dx, dy } }));
  }

  public render(): void {
    this.root.innerHTML = `
      <div class="dpad-cluster" role="group" aria-label="Directional Controls">
        <button type="button" class="dpad-btn" data-dir="up" aria-label="Up">▲</button>
        <div class="dpad-mid-row">
          <button type="button" class="dpad-btn" data-dir="left" aria-label="Left">◀</button>
          <button type="button" class="dpad-btn" data-dir="stop" aria-label="Stop">●</button>
          <button type="button" class="dpad-btn" data-dir="right" aria-label="Right">▶</button>
        </div>
        <button type="button" class="dpad-btn" data-dir="down" aria-label="Down">▼</button>
      </div>

      <div class="context-actions-cluster">
        <button type="button" id="btn-touch-inspect" data-testid="btn-inspect" class="btn btn-action">
          🔍 ${i18n.t('hud.btnInspect')}
        </button>
        <button type="button" id="btn-touch-interact" data-testid="btn-interact" class="btn btn-primary">
          🖐️ ${i18n.t('hud.btnAction')}
        </button>
        <button type="button" id="btn-touch-rest" data-testid="btn-rest" class="btn btn-secondary">
          ⛺ ${i18n.t('hud.btnRest')}
        </button>
      </div>
    `;

    const bindDir = (dir: string, dx: number, dy: number) => {
      const btn = this.root.querySelector(`[data-dir="${dir}"]`);
      if (!btn) return;
      const start = (ev: Event) => {
        ev.preventDefault();
        this.emitJoystick(dx, dy);
      };
      const stop = (ev: Event) => {
        ev.preventDefault();
        this.emitJoystick(0, 0);
      };
      btn.addEventListener('pointerdown', start);
      btn.addEventListener('pointerup', stop);
      btn.addEventListener('pointerleave', stop);
    };

    bindDir('up', 0, -1);
    bindDir('down', 0, 1);
    bindDir('left', -1, 0);
    bindDir('right', 1, 0);
    bindDir('stop', 0, 0);

    this.root.querySelector('#btn-touch-inspect')?.addEventListener('click', () => {
      EventBus.emit('PLAYER_INPUT_ACTION', { action: 'inspect' });
    });
    this.root.querySelector('#btn-touch-interact')?.addEventListener('click', () => {
      EventBus.emit('PLAYER_INPUT_ACTION', { action: 'interact' });
    });
    this.root.querySelector('#btn-touch-rest')?.addEventListener('click', () => {
      EventBus.emit('PLAYER_INPUT_ACTION', { action: 'rest' });
    });
  }
}
