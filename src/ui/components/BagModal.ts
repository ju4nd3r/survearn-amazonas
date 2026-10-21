import { EventBus } from '../../core/events/EventBus';
import { InventoryItemSlot } from '../../core/types/game.types';
import { ContentRegistry } from '../../data/ContentRegistry';
import { i18n } from '../../i18n/I18nService';
import { ProceduralAtlasGenerator } from '../../assets/ProceduralAtlasGenerator';
import {
  closeModalDialog,
  createAccessibleModalDialog,
  openModalDialog
} from '../utils/dialogHelpers';

export class BagModal {
  private readonly dialog: HTMLDialogElement;
  private inventory: InventoryItemSlot[] = [];
  private searchQuery = '';
  private categoryFilter: 'all' | 'plants' | 'materials' | 'processed' = 'all';

  constructor(parent: HTMLElement) {
    this.dialog = createAccessibleModalDialog('modal-bag', 'bag-dialog-title');
    parent.appendChild(this.dialog);

    EventBus.on('INVENTORY_UPDATED', ({ inventory }) => {
      this.inventory = [...inventory];
      if (this.dialog.open) {
        this.renderShell();
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

  public close(): void {
    closeModalDialog(this.dialog);
  }

  private renderShell(): void {
    const totalCount = this.inventory.reduce((sum, slot) => sum + slot.count, 0);
    const typesCount = this.inventory.length;

    this.dialog.innerHTML = `
      <div class="modal-card modal-wide bag-modal-card">
        <header class="modal-header">
          <div class="modal-title-group">
            <h2 id="bag-dialog-title">🎒 ${i18n.t('bag.title')}</h2>
            <p class="modal-subtitle">${i18n.t('bag.subtitle')} • <strong>${totalCount}</strong> ${i18n.t('bag.totalCount')} (${typesCount} ${i18n.t('bag.typesCount')})</p>
          </div>
          <button type="button" class="btn-icon" id="close-bag" data-testid="btn-close-bag" aria-label="Close">✕</button>
        </header>

        <div class="bag-controls-bar">
          <input
            type="search"
            id="bag-search-input"
            data-testid="bag-search-input"
            class="bag-search-field"
            placeholder="${i18n.t('bag.searchPlaceholder')}"
            value="${this.searchQuery}"
          />

          <div class="filter-pills" role="group" aria-label="Category filter">
            <button type="button" class="pill ${this.categoryFilter === 'all' ? 'active' : ''}" data-cat="all">
              ${i18n.t('bag.filterAll')} (${typesCount})
            </button>
            <button type="button" class="pill ${this.categoryFilter === 'plants' ? 'active' : ''}" data-cat="plants">
              🌿 ${i18n.t('bag.filterPlants')}
            </button>
            <button type="button" class="pill ${this.categoryFilter === 'materials' ? 'active' : ''}" data-cat="materials">
              🪵 ${i18n.t('bag.filterMaterials')}
            </button>
            <button type="button" class="pill ${this.categoryFilter === 'processed' ? 'active' : ''}" data-cat="processed">
              🍲 ${i18n.t('bag.filterProcessed')}
            </button>
          </div>
        </div>

        <div id="bag-cards-grid" class="bag-grid" data-testid="bag-cards-grid"></div>
      </div>
    `;

    this.dialog.querySelector('#close-bag')?.addEventListener('click', () => {
      this.close();
    });

    const searchInput = this.dialog.querySelector<HTMLInputElement>('#bag-search-input');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.renderCardsList();
    });

    this.dialog.querySelectorAll<HTMLButtonElement>('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.categoryFilter = (btn.dataset.cat as 'all' | 'plants' | 'materials' | 'processed') ?? 'all';
        this.renderShell();
      });
    });

    this.renderCardsList();
  }

  private renderCardsList(): void {
    const gridEl = this.dialog.querySelector('#bag-cards-grid');
    if (!gridEl) return;

    const lang = i18n.getLanguage();
    const query = this.searchQuery.trim().toLowerCase();

    const filteredSlots = this.inventory.filter((slot) => {
      const plant = ContentRegistry.getPlant(slot.itemId);
      const material = ContentRegistry.getMaterial(slot.itemId);
      const displayName = ContentRegistry.getItemDisplayName(slot.itemId, lang).toLowerCase();
      const scientific = (plant?.scientificName ?? material?.scientificName ?? '').toLowerCase();
      const biomeHint = ProceduralAtlasGenerator.getItemBiomeLocationHint(slot.itemId, lang).toLowerCase();

      // Category match
      if (this.categoryFilter === 'plants' && !plant) return false;
      if (this.categoryFilter === 'materials' && (!material || material.category !== 'material')) return false;
      if (this.categoryFilter === 'processed') {
        const isProcessed =
          (material && (material.category === 'processed_food' || material.category === 'water' || material.category === 'tool')) ||
          (plant && (plant.edibility === 'medicinal' || plant.edibility === 'edible_processed'));
        if (!isProcessed) return false;
      }

      // Search match
      if (query.length > 0) {
        return displayName.includes(query) || scientific.includes(query) || biomeHint.includes(query);
      }
      return true;
    });

    if (filteredSlots.length === 0) {
      const isTotalEmpty = this.inventory.length === 0;
      gridEl.innerHTML = `
        <div class="bag-empty-state" data-testid="bag-empty-state">
          <div class="bag-empty-icon">🎒 🍃</div>
          <h3>${isTotalEmpty ? i18n.t('bag.emptyTitle') : (lang === 'es' ? 'No se encontraron objetos' : 'No matching items')}</h3>
          <p>${isTotalEmpty ? i18n.t('bag.emptyDesc') : (lang === 'es' ? 'Prueba cambiando los filtros o el término de búsqueda.' : 'Try changing your search query or category filters.')}</p>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = filteredSlots
      .map((slot) => {
        const plant = ContentRegistry.getPlant(slot.itemId);
        const material = ContentRegistry.getMaterial(slot.itemId);
        const displayName = ContentRegistry.getItemDisplayName(slot.itemId, lang);
        const thumbUrl = ProceduralAtlasGenerator.getItemThumbnailDataUrl(slot.itemId);
        const biomeHint = ProceduralAtlasGenerator.getItemBiomeLocationHint(slot.itemId, lang);
        const scientificName = plant?.scientificName ?? material?.scientificName;

        // Determine consumable state & nutrition
        const canConsume = Boolean(plant || material?.effectsOnConsume);
        let edibilityTagHtml = '';
        let nutritionPillsHtml = '';

        if (plant) {
          if (plant.edibility === 'edible_raw') {
            edibilityTagHtml = `<span class="badge badge-edible">🍏 ${i18n.t('bag.edibleRaw')}</span>`;
          } else if (plant.edibility === 'edible_processed') {
            edibilityTagHtml = `<span class="badge badge-needs-cook">🔥 ${i18n.t('bag.needsCooking')}</span>`;
          } else if (plant.edibility === 'medicinal') {
            edibilityTagHtml = `<span class="badge badge-medicinal">💊 ${i18n.t('bag.medicinal')}</span>`;
          } else {
            edibilityTagHtml = `<span class="badge badge-toxic">⚠️ ${i18n.t('bag.toxic')}</span>`;
          }

          const raw = plant.effectsOnConsumeRaw;
          const pills: string[] = [];
          if (raw.hungerDelta !== 0) pills.push(`🍍 ${raw.hungerDelta > 0 ? '+' : ''}${raw.hungerDelta}%`);
          if (raw.thirstDelta !== 0) pills.push(`💧 ${raw.thirstDelta > 0 ? '+' : ''}${raw.thirstDelta}%`);
          if (raw.staminaDelta !== 0) pills.push(`⚡ ${raw.staminaDelta > 0 ? '+' : ''}${raw.staminaDelta}%`);
          if (raw.healthDelta !== 0) pills.push(`❤️ ${raw.healthDelta > 0 ? '+' : ''}${raw.healthDelta}%`);
          if (raw.cureStatusEffect) pills.push(`🛡️ ${i18n.t(`status.${raw.cureStatusEffect}`)}`);

          if (pills.length > 0) {
            nutritionPillsHtml = `
              <div class="bag-nutrition-row">
                <small class="nutrition-label">${i18n.t('bag.nutrition')}:</small>
                <div class="nutrition-pills">${pills.map((p) => `<span class="stat-mini-pill">${p}</span>`).join('')}</div>
              </div>
            `;
          }
        } else if (material?.effectsOnConsume) {
          const eff = material.effectsOnConsume;
          const pills: string[] = [];
          if (eff.hungerDelta !== 0) pills.push(`🍍 ${eff.hungerDelta > 0 ? '+' : ''}${eff.hungerDelta}%`);
          if (eff.thirstDelta !== 0) pills.push(`💧 ${eff.thirstDelta > 0 ? '+' : ''}${eff.thirstDelta}%`);
          if (eff.staminaDelta !== 0) pills.push(`⚡ ${eff.staminaDelta > 0 ? '+' : ''}${eff.staminaDelta}%`);
          if (eff.healthDelta !== 0) pills.push(`❤️ ${eff.healthDelta > 0 ? '+' : ''}${eff.healthDelta}%`);
          if (eff.cureStatusEffect) pills.push(`🛡️ ${i18n.t(`status.${eff.cureStatusEffect}`)}`);

          if (pills.length > 0) {
            nutritionPillsHtml = `
              <div class="bag-nutrition-row">
                <small class="nutrition-label">${i18n.t('bag.nutrition')}:</small>
                <div class="nutrition-pills">${pills.map((p) => `<span class="stat-mini-pill">${p}</span>`).join('')}</div>
              </div>
            `;
          }
        }

        // Recipes that use this ingredient
        const usedInRecipes = ContentRegistry.recipes.filter((r) =>
          r.ingredients.some((ing) => ing.itemId === slot.itemId)
        );
        let craftUtilityHtml = '';
        if (usedInRecipes.length > 0) {
          const names = usedInRecipes.map((r) => r.name[lang]).join(', ');
          craftUtilityHtml = `
            <div class="bag-craft-utility">
              <span class="utility-icon">🔨</span>
              <span class="utility-text"><strong>${i18n.t('bag.craftUtility')}:</strong> ${names}</span>
            </div>
          `;
        }

        const description = plant?.howToUse[lang] ?? material?.description[lang] ?? '';

        return `
          <article class="bag-card" data-testid="bag-item-${slot.itemId}">
            <div class="bag-card-header">
              <div class="bag-thumb-container">
                <img class="item-miniature" src="${thumbUrl}" alt="${displayName}" width="32" height="32" />
                <span class="badge-count" title="${slot.count} unidades">×${slot.count}</span>
              </div>
              <div class="bag-card-titles">
                <h3 class="bag-item-name">${displayName}</h3>
                ${scientificName ? `<p class="bag-item-latin">${scientificName}</p>` : ''}
                <div class="bag-tags-row">
                  ${edibilityTagHtml}
                  <span class="bag-biome-tag">📍 ${biomeHint}</span>
                </div>
              </div>
            </div>

            <div class="bag-card-body">
              ${description ? `<p class="bag-item-desc">${description}</p>` : ''}
              ${nutritionPillsHtml}
              ${craftUtilityHtml}
            </div>

            <div class="bag-card-actions">
              ${
                canConsume
                  ? `<button type="button" class="btn btn-primary btn-sm btn-bag-consume" data-item-id="${slot.itemId}" title="${i18n.t('bag.btnConsume')}">
                      🍽️ ${i18n.t('bag.btnConsume')}
                    </button>`
                  : ''
              }
              ${
                usedInRecipes.length > 0
                  ? `<button type="button" class="btn btn-secondary btn-sm btn-bag-craft" data-item-id="${slot.itemId}" title="${i18n.t('bag.btnCraftWith')}">
                      🔨 ${i18n.t('bag.btnCraftWith')}
                    </button>`
                  : ''
              }
            </div>
          </article>
        `;
      })
      .join('');

    // Wire up Consume buttons
    gridEl.querySelectorAll<HTMLButtonElement>('.btn-bag-consume').forEach((btn) => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.itemId;
        if (itemId) {
          EventBus.emit('CONSUME_INVENTORY_ITEM', { itemId });
        }
      });
    });

    // Wire up Craft with buttons (opens crafting modal)
    gridEl.querySelectorAll<HTMLButtonElement>('.btn-bag-craft').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.close();
        EventBus.emit('OPEN_MODAL', { modal: 'crafting' });
      });
    });
  }
}
