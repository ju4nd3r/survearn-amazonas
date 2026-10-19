import { EventBus } from '../../core/events/EventBus';
import { DiscoveryLevel } from '../../core/types/game.types';
import { i18n } from '../../i18n/I18nService';
import { FieldGuideFilter, FieldGuideSystem } from '../../systems/FieldGuideSystem';
import {
  closeModalDialog,
  createAccessibleModalDialog,
  openModalDialog
} from '../utils/dialogHelpers';

export class BitacoraModal {
  private readonly dialog: HTMLDialogElement;
  private discovered: Record<string, DiscoveryLevel> = {
    euterpe_precatoria_asai: 'observed'
  };
  private searchQuery = '';
  private categoryFilter: FieldGuideFilter['category'] = 'all';
  private statusFilter: FieldGuideFilter['statusFilter'] = 'all';

  constructor(parent: HTMLElement) {
    this.dialog = createAccessibleModalDialog('modal-bitacora', 'bitacora-dialog-title');
    parent.appendChild(this.dialog);

    EventBus.on('SPECIES_DISCOVERED', ({ discoveredAll }) => {
      this.discovered = { ...discoveredAll };
      if (this.dialog.open) {
        this.renderCardsList();
      }
    });

    EventBus.on('LANGUAGE_CHANGED', () => {
      const wasOpen = this.dialog.open;
      this.renderShell();
      if (wasOpen) openModalDialog(this.dialog);
    });

    this.renderShell();
  }

  public open(): void {
    this.renderShell();
    openModalDialog(this.dialog);
  }

  private renderShell(): void {
    this.dialog.innerHTML = `
      <div class="modal-card modal-wide">
        <header class="modal-header">
          <h2 id="bitacora-dialog-title">📖 ${i18n.t('bitacora.title')}</h2>
          <button type="button" class="btn-icon" id="close-bitacora" data-testid="btn-close-bitacora" aria-label="Close">✕</button>
        </header>

        <div class="bitacora-controls">
          <input
            type="search"
            id="bitacora-search"
            data-testid="bitacora-search"
            placeholder="${i18n.t('bitacora.searchPlaceholder')}"
            value="${this.searchQuery}"
          />

          <div class="filter-pills" role="group" aria-label="Category filter">
            <button type="button" class="pill ${this.categoryFilter === 'all' ? 'active' : ''}" data-cat="all">${i18n.t('bitacora.filterAll')}</button>
            <button type="button" class="pill ${this.categoryFilter === 'plants' ? 'active' : ''}" data-cat="plants">${i18n.t('bitacora.filterPlants')}</button>
            <button type="button" class="pill ${this.categoryFilter === 'animals' ? 'active' : ''}" data-cat="animals">${i18n.t('bitacora.filterAnimals')}</button>
            <button type="button" class="pill ${this.categoryFilter === 'materials' ? 'active' : ''}" data-cat="materials">${i18n.t('bitacora.filterMaterials')}</button>
          </div>

          <div class="filter-pills" role="group" aria-label="Edibility filter">
            <button type="button" class="pill ${this.statusFilter === 'edible' ? 'active' : ''}" data-status="edible">${i18n.t('bitacora.filterEdible')}</button>
            <button type="button" class="pill ${this.statusFilter === 'medicinal' ? 'active' : ''}" data-status="medicinal">${i18n.t('bitacora.filterMedicinal')}</button>
            <button type="button" class="pill ${this.statusFilter === 'toxic' ? 'active' : ''}" data-status="toxic">${i18n.t('bitacora.filterToxic')}</button>
          </div>
        </div>

        <div id="bitacora-cards-grid" class="bitacora-grid" data-testid="bitacora-grid"></div>
      </div>
    `;

    this.dialog.querySelector('#close-bitacora')?.addEventListener('click', () => {
      closeModalDialog(this.dialog);
    });

    this.dialog
      .querySelector<HTMLInputElement>('#bitacora-search')
      ?.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        this.renderCardsList();
      });

    this.dialog.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.categoryFilter = (btn.dataset.cat as FieldGuideFilter['category']) ?? 'all';
        this.statusFilter = 'all';
        this.renderShell();
      });
    });

    this.dialog.querySelectorAll<HTMLButtonElement>('[data-status]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextStatus = btn.dataset.status as FieldGuideFilter['statusFilter'];
        this.statusFilter = this.statusFilter === nextStatus ? 'all' : nextStatus;
        this.renderShell();
      });
    });

    this.renderCardsList();
  }

  private renderCardsList(): void {
    const grid = this.dialog.querySelector('#bitacora-cards-grid');
    if (!grid) return;

    const cards = FieldGuideSystem.buildFilteredCards(this.discovered, {
      query: this.searchQuery,
      category: this.categoryFilter,
      statusFilter: this.statusFilter,
      lang: i18n.getLanguage()
    });

    grid.innerHTML = cards
      .map((card) => {
        const isUnlocked = card.discoveryLevel !== 'unknown';
        const levelText =
          card.discoveryLevel === 'mastered'
            ? i18n.t('bitacora.statusMastered')
            : card.discoveryLevel === 'observed'
              ? i18n.t('bitacora.statusObserved')
              : i18n.t('bitacora.statusUnknown');

        return `
          <article class="bitacora-card ${isUnlocked ? 'unlocked' : 'locked'}" data-testid="bitacora-card-${card.id}">
            <div class="card-top">
              <span class="species-swatch" style="background:${card.spriteTint}"></span>
              <div>
                <h3>${card.commonName}</h3>
                <p class="latin-name"><em>${card.scientificName}</em></p>
              </div>
              <span class="badge badge-${card.badgeType}">${card.badgeLabel}</span>
            </div>

            <p class="discovery-tier"><strong>${levelText}</strong> • ${i18n.t('bitacora.habitat')}: ${card.habitatText}</p>
            <p class="card-hint">${card.hintText}</p>

            ${
              isUnlocked
                ? `
              <div class="card-details">
                <p><strong>${i18n.t('bitacora.howToUse')}:</strong> ${card.howToUseText}</p>
                <p><strong>${i18n.t('bitacora.funFact')}:</strong> ${card.funFactText}</p>
                <p class="sources-line"><small>📚 ${i18n.t('bitacora.sources')}: ${card.sources.join('; ')}</small></p>
              </div>
            `
                : ''
            }
          </article>
        `;
      })
      .join('');
  }
}
