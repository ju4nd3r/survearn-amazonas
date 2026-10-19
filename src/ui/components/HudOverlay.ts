import { EventBus } from '../../core/events/EventBus';
import { InventoryItemSlot, SurvivalStats, WeatherType } from '../../core/types/game.types';
import { ContentRegistry } from '../../data/ContentRegistry';
import { i18n } from '../../i18n/I18nService';
import { SurvivalSystem } from '../../systems/SurvivalSystem';
import { WeatherSystem } from '../../systems/WeatherSystem';

export class HudOverlay {
  private readonly root: HTMLElement;
  private readonly toastEl: HTMLElement;
  private readonly sleepCurtainEl: HTMLElement;
  private toastTimeoutId: number | null = null;

  private stats: SurvivalStats = SurvivalSystem.createInitialStats();
  private inventory: InventoryItemSlot[] = [];
  private dayCount = 1;
  private timeOfDayMinutes = 510;
  private weather: WeatherType = 'clear';
  private nearCampfire = false;
  private inShelter = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('aside');
    this.root.className = 'hud-overlay';
    parent.appendChild(this.root);

    this.toastEl = document.createElement('div');
    this.toastEl.className = 'toast-banner';
    this.toastEl.setAttribute('role', 'status');
    this.toastEl.setAttribute('aria-live', 'polite');
    parent.appendChild(this.toastEl);

    this.sleepCurtainEl = document.createElement('div');
    this.sleepCurtainEl.className = 'sleep-curtain';
    this.sleepCurtainEl.setAttribute('data-testid', 'sleep-curtain');
    this.sleepCurtainEl.setAttribute('aria-hidden', 'true');
    parent.appendChild(this.sleepCurtainEl);

    this.render();

    EventBus.on('STATS_UPDATED', (payload) => {
      this.stats = payload.stats;
      this.dayCount = payload.dayCount;
      this.timeOfDayMinutes = payload.timeOfDayMinutes;
      this.weather = payload.weather;
      this.nearCampfire = payload.nearCampfire;
      this.inShelter = payload.inShelter;
      this.updateBarsOnly();
    });

    EventBus.on('INVENTORY_UPDATED', ({ inventory }) => {
      this.inventory = inventory;
      this.renderInventoryStrip();
    });

    EventBus.on('LANGUAGE_CHANGED', () => {
      this.render();
    });

    EventBus.on('TOAST_MESSAGE', ({ text, type }) => {
      this.showToast(text, type);
    });

    EventBus.on(
      'SLEEP_TRANSITION_START',
      ({ dayCount, timeFormatted, healthRecovered, sheltered }) => {
        this.playSleepTransition(dayCount, timeFormatted, healthRecovered, sheltered);
      }
    );
  }

  private playSleepTransition(
    dayCount: number,
    timeFormatted: string,
    healthRecovered: number,
    sheltered: boolean
  ): void {
    const isEs = i18n.getLanguage() === 'es';
    const title = isEs
      ? sheltered
        ? '🌙 Descansando bajo refugio seguro...'
        : '🌙 Descansando en la selva...'
      : sheltered
        ? '🌙 Resting safely by shelter & fire...'
        : '🌙 Resting in the rainforest...';
    const subtitle = isEs
      ? `☀️ Amanece / Avanza a Día ${dayCount} (${timeFormatted}) • +${healthRecovered}% Salud y 100% Energía`
      : `☀️ Advancing to Day ${dayCount} (${timeFormatted}) • +${healthRecovered}% Health & 100% Stamina`;

    this.sleepCurtainEl.innerHTML = `
      <div class="sleep-curtain-card">
        <div class="sleep-moon-icon">🌙 ✨ 💤</div>
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
    `;
    this.sleepCurtainEl.classList.add('active');
    this.sleepCurtainEl.setAttribute('aria-hidden', 'false');

    window.setTimeout(() => {
      this.sleepCurtainEl.classList.remove('active');
      this.sleepCurtainEl.setAttribute('aria-hidden', 'true');
    }, 1450);
  }

  private showToast(text: string, type: string): void {
    this.toastEl.textContent = text;
    this.toastEl.dataset.type = type;
    this.toastEl.classList.add('visible');
    if (this.toastTimeoutId !== null) {
      window.clearTimeout(this.toastTimeoutId);
    }
    this.toastTimeoutId = window.setTimeout(() => {
      this.toastEl.classList.remove('visible');
    }, 4000);
  }

  public render(): void {
    this.root.innerHTML = `
      <div class="hud-top-row">
        <div class="stats-grid" data-testid="survival-stats-panel">
          <div class="stat-pill">
            <span>❤️ ${i18n.t('hud.health')}</span>
            <strong id="val-health">${Math.round(this.stats.health)}%</strong>
          </div>
          <div class="stat-pill">
            <span>🍍 ${i18n.t('hud.hunger')}</span>
            <strong id="val-hunger" data-testid="stat-hunger">${Math.round(this.stats.hunger)}%</strong>
          </div>
          <div class="stat-pill">
            <span>💧 ${i18n.t('hud.thirst')}</span>
            <strong id="val-thirst" data-testid="stat-thirst">${Math.round(this.stats.thirst)}%</strong>
          </div>
          <div class="stat-pill">
            <span>⚡ ${i18n.t('hud.stamina')}</span>
            <strong id="val-stamina">${Math.round(this.stats.stamina)}%</strong>
          </div>
          <div class="stat-pill">
            <span>🌡️ ${i18n.t('hud.temp')}</span>
            <strong id="val-temp">${this.stats.bodyTemp.toFixed(1)}°C</strong>
          </div>
          <div class="stat-pill">
            <span>🌧️ ${i18n.t('hud.wetness')}</span>
            <strong id="val-wet">${Math.round(this.stats.wetness)}%</strong>
          </div>
        </div>

        <div class="world-clock-panel">
          <span id="val-clock">☀️ ${i18n.t('hud.day')} ${this.dayCount} • ${WeatherSystem.formatClock(this.timeOfDayMinutes)}</span>
          <span id="val-weather" class="badge">${i18n.t(`hud.weather_${this.weather}`)}</span>
          <span id="val-status-effects" class="effects-strip"></span>
        </div>

        <div class="quick-modals-bar">
          <button type="button" id="hud-btn-bitacora" data-testid="btn-open-bitacora" class="btn btn-accent">
            📖 ${i18n.t('hud.btnBitacora')}
          </button>
          <button type="button" id="hud-btn-craft" data-testid="btn-open-crafting" class="btn btn-secondary">
            🔨 ${i18n.t('hud.btnCraft')}
          </button>
          <button type="button" id="hud-btn-settings" data-testid="btn-open-settings" class="btn btn-secondary">
            ⚙️ ${i18n.t('hud.btnSettings')}
          </button>
        </div>
      </div>

      <div class="hud-objective-strip">
        <span>🎯 ${i18n.t('hud.objective')}</span>
      </div>

      <div class="hud-inventory-strip" id="hud-inventory-strip" data-testid="inventory-strip"></div>
    `;

    this.root.querySelector('#hud-btn-bitacora')?.addEventListener('click', () => {
      EventBus.emit('OPEN_MODAL', { modal: 'bitacora' });
    });
    this.root.querySelector('#hud-btn-craft')?.addEventListener('click', () => {
      EventBus.emit('OPEN_MODAL', { modal: 'crafting' });
    });
    this.root.querySelector('#hud-btn-settings')?.addEventListener('click', () => {
      EventBus.emit('OPEN_MODAL', { modal: 'settings' });
    });

    this.renderInventoryStrip();
    this.updateBarsOnly();
  }

  private updateBarsOnly(): void {
    const setTxt = (sel: string, txt: string) => {
      const el = this.root.querySelector(sel);
      if (el) el.textContent = txt;
    };
    setTxt('#val-health', `${Math.round(this.stats.health)}%`);
    setTxt('#val-hunger', `${Math.round(this.stats.hunger)}%`);
    setTxt('#val-thirst', `${Math.round(this.stats.thirst)}%`);
    setTxt('#val-stamina', `${Math.round(this.stats.stamina)}%`);
    setTxt('#val-temp', `${this.stats.bodyTemp.toFixed(1)}°C`);
    setTxt('#val-wet', `${Math.round(this.stats.wetness)}%`);
    setTxt(
      '#val-clock',
      `${WeatherSystem.isNight(this.timeOfDayMinutes) ? '🌙' : '☀️'} ${i18n.t('hud.day')} ${this.dayCount} • ${WeatherSystem.formatClock(this.timeOfDayMinutes)}`
    );
    setTxt('#val-weather', i18n.t(`hud.weather_${this.weather}`));

    const effectsEl = this.root.querySelector('#val-status-effects');
    if (effectsEl) {
      const tags = this.stats.activeEffects.map((e) => i18n.t(`status.${e.id}`));
      if (this.nearCampfire) tags.push('🔥 Fogata');
      if (this.inShelter) tags.push('🛖 Tambo');
      effectsEl.textContent = tags.join(' | ');
    }
  }

  private renderInventoryStrip(): void {
    const container = this.root.querySelector('#hud-inventory-strip');
    if (!container) return;
    const lang = i18n.getLanguage();

    if (this.inventory.length === 0) {
      container.innerHTML = `<span class="inv-empty">🎒 —</span>`;
      return;
    }

    container.innerHTML = this.inventory
      .map((slot) => {
        const name = ContentRegistry.getItemDisplayName(slot.itemId, lang);
        const plant = ContentRegistry.getPlant(slot.itemId);
        const mat = ContentRegistry.getMaterial(slot.itemId);
        const canConsume = Boolean(plant || mat?.effectsOnConsume);
        return `
          <button
            type="button"
            class="inv-chip ${canConsume ? 'consumable' : ''}"
            data-item-id="${slot.itemId}"
            data-testid="inv-item-${slot.itemId}"
            title="${canConsume ? 'Click to consume / Clic para usar' : name}"
          >
            <span>${name}</span>
            <strong>×${slot.count}</strong>
          </button>
        `;
      })
      .join('');

    container.querySelectorAll<HTMLButtonElement>('.inv-chip.consumable').forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.itemId;
        if (itemId) {
          EventBus.emit('CONSUME_INVENTORY_ITEM', { itemId });
        }
      });
    });
  }
}
