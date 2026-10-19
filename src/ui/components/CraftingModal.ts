import { EventBus } from '../../core/events/EventBus';
import { InventoryItemSlot } from '../../core/types/game.types';
import { ContentRegistry } from '../../data/ContentRegistry';
import { i18n } from '../../i18n/I18nService';
import { CraftingSystem } from '../../systems/CraftingSystem';
import { ProceduralAtlasGenerator } from '../../assets/ProceduralAtlasGenerator';
import {
  closeModalDialog,
  createAccessibleModalDialog,
  openModalDialog
} from '../utils/dialogHelpers';

export class CraftingModal {
  private readonly dialog: HTMLDialogElement;
  private inventory: InventoryItemSlot[] = [];
  private nearCampfire = false;
  private inShelter = false;

  constructor(parent: HTMLElement) {
    this.dialog = createAccessibleModalDialog('modal-crafting', 'crafting-dialog-title');
    parent.appendChild(this.dialog);

    EventBus.on('INVENTORY_UPDATED', ({ inventory }) => {
      this.inventory = inventory;
      if (this.dialog.open) this.render();
    });

    EventBus.on('STATS_UPDATED', ({ nearCampfire, inShelter }) => {
      this.nearCampfire = nearCampfire;
      this.inShelter = inShelter;
      if (this.dialog.open) this.render();
    });

    EventBus.on('LANGUAGE_CHANGED', () => {
      const wasOpen = this.dialog.open;
      this.render();
      if (wasOpen) openModalDialog(this.dialog);
    });

    this.render();
  }

  public open(): void {
    this.render();
    openModalDialog(this.dialog);
  }

  public render(): void {
    const lang = i18n.getLanguage();
    const fireBanner = this.nearCampfire
      ? `🔥 ${i18n.t('crafting.campfireStatus_yes')}`
      : `🪵 ${i18n.t('crafting.campfireStatus_no')}`;

    const recipesHtml = ContentRegistry.recipes
      .map((recipe) => {
        const check = CraftingSystem.canCraft(
          recipe,
          this.inventory,
          this.nearCampfire,
          this.inShelter
        );
        const outputThumb = ProceduralAtlasGenerator.getItemThumbnailDataUrl(recipe.outputItemId);

        const ingredientsCards = recipe.ingredients
          .map((ing) => {
            const owned = this.inventory.find((s) => s.itemId === ing.itemId)?.count ?? 0;
            const isMet = owned >= ing.count;
            const itemName = ContentRegistry.getItemDisplayName(ing.itemId, lang);
            const thumbUrl = ProceduralAtlasGenerator.getItemThumbnailDataUrl(ing.itemId);
            const biomeHint = ProceduralAtlasGenerator.getItemBiomeLocationHint(ing.itemId, lang);

            return `
              <div class="ing-thumb-card ${isMet ? 'is-met' : 'is-missing'}" title="${itemName}: ${owned}/${ing.count}">
                <img class="item-miniature" src="${thumbUrl}" alt="${itemName}" width="24" height="24" />
                <div class="ing-meta">
                  <span class="ing-name">${itemName}</span>
                  <span class="ing-count-badge ${isMet ? 'badge-ok' : 'badge-need'}">${owned}/${ing.count}</span>
                  <span class="ing-biome-hint">📍 ${biomeHint}</span>
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <article class="recipe-card ${check.allowed ? 'craftable' : 'disabled'}" data-testid="recipe-card-${recipe.id}">
            <div class="recipe-main">
              <div class="recipe-header-row">
                <img class="item-miniature output-icon" src="${outputThumb}" alt="${recipe.name[lang]}" width="28" height="28" />
                <div class="recipe-title-block">
                  <h3>${recipe.name[lang]}</h3>
                  <p class="recipe-desc">${recipe.description[lang]}</p>
                </div>
              </div>
              <div class="crafting-materials-section">
                <span class="materials-header-label"><strong>${lang === 'es' ? 'Materiales necesarios a buscar en el mapa:' : 'Materials needed to forage on map:'}</strong></span>
                <div class="ingredients-thumbs-row">
                  ${ingredientsCards}
                </div>
              </div>
              <p class="cultural-note"><small>🌿 ${recipe.culturalNote[lang]}</small></p>
            </div>
            <div class="recipe-action">
              <button
                type="button"
                class="btn ${check.allowed ? 'btn-primary' : 'btn-disabled'}"
                data-craft-id="${recipe.id}"
                data-testid="btn-craft-${recipe.id}"
                ${check.allowed ? '' : 'disabled'}
              >
                🔨 ${i18n.t('crafting.craftButton')}
              </button>
            </div>
          </article>
        `;
      })
      .join('');

    this.dialog.innerHTML = `
      <div class="modal-card modal-wide">
        <header class="modal-header">
          <h2 id="crafting-dialog-title">🔨 ${i18n.t('crafting.title')}</h2>
          <button type="button" class="btn-icon" id="close-crafting" aria-label="Close">✕</button>
        </header>

        <div class="campfire-banner ${this.nearCampfire ? 'active' : ''}">
          ${fireBanner}
        </div>

        <div class="recipes-list">
          ${recipesHtml}
        </div>
      </div>
    `;

    this.dialog.querySelector('#close-crafting')?.addEventListener('click', () => {
      closeModalDialog(this.dialog);
    });

    this.dialog.querySelectorAll<HTMLButtonElement>('[data-craft-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const recipeId = btn.dataset.craftId;
        if (recipeId) {
          EventBus.emit('CRAFT_RECIPE', { recipeId });
        }
      });
    });
  }
}
