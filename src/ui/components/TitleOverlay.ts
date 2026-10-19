import { EventBus } from '../../core/events/EventBus';
import { i18n } from '../../i18n/I18nService';

export class TitleOverlay {
  private readonly root: HTMLElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('section');
    this.root.id = 'title-overlay';
    this.root.className = 'title-banner';
    parent.appendChild(this.root);

    this.render();
    EventBus.on('LANGUAGE_CHANGED', () => this.render());
  }

  public render(): void {
    this.root.innerHTML = `
      <div class="title-banner-inner">
        <div class="title-brand">
          <h1 data-testid="game-title">${i18n.t('app.title')}</h1>
          <p class="subtitle">${i18n.t('app.subtitle')}</p>
        </div>
        <div class="title-actions">
          <button type="button" id="btn-lang-switch" data-testid="btn-lang-switch" class="btn btn-secondary">
            🌐 ${i18n.t('menu.switchLanguage')}
          </button>
          <button type="button" id="btn-open-creator" data-testid="btn-open-creator" class="btn btn-primary">
            🧭 ${i18n.t('menu.newExpedition')}
          </button>
          <button type="button" id="btn-open-saves" data-testid="btn-open-saves" class="btn btn-secondary">
            💾 ${i18n.t('menu.continueExpedition')}
          </button>
        </div>
      </div>
      <div class="disclaimer-strip" role="note" data-testid="safety-disclaimer">
        ⚠️ ${i18n.t('app.disclaimer')}
      </div>
    `;

    this.root.querySelector('#btn-lang-switch')?.addEventListener('click', () => {
      i18n.toggleLanguage();
    });
    this.root.querySelector('#btn-open-creator')?.addEventListener('click', () => {
      EventBus.emit('OPEN_MODAL', { modal: 'creator' });
    });
    this.root.querySelector('#btn-open-saves')?.addEventListener('click', () => {
      EventBus.emit('OPEN_MODAL', { modal: 'saves' });
    });
  }
}
