import { EventBus } from '../../core/events/EventBus';
import { GameSettings } from '../../core/types/game.types';
import { i18n } from '../../i18n/I18nService';
import { SaveManager } from '../../persistence/SaveManager';
import {
  closeModalDialog,
  createAccessibleModalDialog,
  openModalDialog
} from '../utils/dialogHelpers';

export class SettingsModal {
  private readonly dialog: HTMLDialogElement;
  private settings: GameSettings = {
    language: 'es',
    volume: 0.7,
    leftHanded: false,
    colorblindMode: false,
    reduceMotion: false,
    textScale: 100,
    fpsCap: 60
  };

  constructor(parent: HTMLElement) {
    this.dialog = createAccessibleModalDialog('modal-settings', 'settings-dialog-title');
    parent.appendChild(this.dialog);

    void this.initFromStorage();

    EventBus.on('LANGUAGE_CHANGED', ({ language }) => {
      this.settings.language = language;
      const wasOpen = this.dialog.open;
      this.render();
      if (wasOpen) openModalDialog(this.dialog);
    });
  }

  private async initFromStorage(): Promise<void> {
    this.settings = await SaveManager.loadSettings();
    i18n.setLanguage(this.settings.language);
    this.applySettingsToDOM();
  }

  public open(): void {
    this.render();
    openModalDialog(this.dialog);
  }

  private applySettingsToDOM(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty(
      '--ui-font-scale',
      `${this.settings.textScale / 100}`
    );
    document.body.classList.toggle('colorblind-mode', this.settings.colorblindMode);
    document.body.classList.toggle('reduce-motion', this.settings.reduceMotion);
    EventBus.emit('SETTINGS_UPDATED', { settings: { ...this.settings } });
  }

  private async persistAndApply(): Promise<void> {
    this.applySettingsToDOM();
    await SaveManager.saveSettings(this.settings);
  }

  public render(): void {
    this.dialog.innerHTML = `
      <div class="modal-card">
        <header class="modal-header">
          <h2 id="settings-dialog-title">⚙️ ${i18n.t('settings.title')}</h2>
          <button type="button" class="btn-icon" id="close-settings" data-testid="btn-close-settings" aria-label="Close">✕</button>
        </header>

        <div class="settings-form">
          <label class="setting-row">
            <span>🌐 ${i18n.t('settings.language')}</span>
            <select id="setting-lang" data-testid="setting-lang">
              <option value="es" ${this.settings.language === 'es' ? 'selected' : ''}>Español (Colombia)</option>
              <option value="en" ${this.settings.language === 'en' ? 'selected' : ''}>English</option>
            </select>
          </label>

          <label class="setting-row">
            <span>🔊 ${i18n.t('settings.volume')} (${Math.round(this.settings.volume * 100)}%)</span>
            <input type="range" id="setting-volume" min="0" max="1" step="0.1" value="${this.settings.volume}" />
          </label>

          <label class="setting-row">
            <span>🔤 ${i18n.t('settings.textScale')}</span>
            <select id="setting-text-scale" data-testid="setting-text-scale">
              <option value="100" ${this.settings.textScale === 100 ? 'selected' : ''}>100%</option>
              <option value="115" ${this.settings.textScale === 115 ? 'selected' : ''}>115%</option>
              <option value="130" ${this.settings.textScale === 130 ? 'selected' : ''}>130%</option>
            </select>
          </label>

          <label class="setting-row">
            <span>🔋 ${i18n.t('settings.fpsCap')}</span>
            <select id="setting-fps">
              <option value="60" ${this.settings.fpsCap === 60 ? 'selected' : ''}>60 FPS</option>
              <option value="30" ${this.settings.fpsCap === 30 ? 'selected' : ''}>30 FPS</option>
            </select>
          </label>

          <label class="setting-row checkbox-row">
            <input type="checkbox" id="setting-left-handed" data-testid="setting-left-handed" ${this.settings.leftHanded ? 'checked' : ''} />
            <span>🤚 ${i18n.t('settings.leftHanded')}</span>
          </label>

          <label class="setting-row checkbox-row">
            <input type="checkbox" id="setting-colorblind" data-testid="setting-colorblind" ${this.settings.colorblindMode ? 'checked' : ''} />
            <span>👁️ ${i18n.t('settings.colorblind')}</span>
          </label>

          <label class="setting-row checkbox-row">
            <input type="checkbox" id="setting-reduce-motion" ${this.settings.reduceMotion ? 'checked' : ''} />
            <span>✨ ${i18n.t('settings.reduceMotion')}</span>
          </label>

          <div class="settings-footer-actions">
            <button type="button" id="btn-settings-open-saves" data-testid="btn-settings-open-saves" class="btn btn-secondary">
              💾 ${i18n.t('menu.continueExpedition')}
            </button>
            <button type="button" id="btn-settings-done" class="btn btn-primary">
              ✓ ${i18n.t('settings.close')}
            </button>
          </div>
        </div>
      </div>
    `;

    const close = () => closeModalDialog(this.dialog);
    this.dialog.querySelector('#close-settings')?.addEventListener('click', close);
    this.dialog.querySelector('#btn-settings-done')?.addEventListener('click', close);

    this.dialog.querySelector('#btn-settings-open-saves')?.addEventListener('click', () => {
      closeModalDialog(this.dialog);
      EventBus.emit('OPEN_MODAL', { modal: 'saves' });
    });

    this.dialog
      .querySelector<HTMLSelectElement>('#setting-lang')
      ?.addEventListener('change', (e) => {
        const lang = (e.target as HTMLSelectElement).value as 'es' | 'en';
        this.settings.language = lang;
        i18n.setLanguage(lang);
        void this.persistAndApply();
      });

    this.dialog
      .querySelector<HTMLInputElement>('#setting-volume')
      ?.addEventListener('input', (e) => {
        this.settings.volume = Number((e.target as HTMLInputElement).value);
        void this.persistAndApply();
      });

    this.dialog
      .querySelector<HTMLSelectElement>('#setting-text-scale')
      ?.addEventListener('change', (e) => {
        this.settings.textScale = Number(
          (e.target as HTMLSelectElement).value
        ) as GameSettings['textScale'];
        void this.persistAndApply();
      });

    this.dialog
      .querySelector<HTMLSelectElement>('#setting-fps')
      ?.addEventListener('change', (e) => {
        this.settings.fpsCap = Number(
          (e.target as HTMLSelectElement).value
        ) as GameSettings['fpsCap'];
        void this.persistAndApply();
      });

    this.dialog
      .querySelector<HTMLInputElement>('#setting-left-handed')
      ?.addEventListener('change', (e) => {
        this.settings.leftHanded = (e.target as HTMLInputElement).checked;
        void this.persistAndApply();
      });

    this.dialog
      .querySelector<HTMLInputElement>('#setting-colorblind')
      ?.addEventListener('change', (e) => {
        this.settings.colorblindMode = (e.target as HTMLInputElement).checked;
        void this.persistAndApply();
      });

    this.dialog
      .querySelector<HTMLInputElement>('#setting-reduce-motion')
      ?.addEventListener('change', (e) => {
        this.settings.reduceMotion = (e.target as HTMLInputElement).checked;
        void this.persistAndApply();
      });
  }
}
