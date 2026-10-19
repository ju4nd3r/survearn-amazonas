import { ProceduralAtlasGenerator } from '../../assets/ProceduralAtlasGenerator';
import { EventBus } from '../../core/events/EventBus';
import { CharacterAppearance, DifficultyMode } from '../../core/types/game.types';
import { i18n } from '../../i18n/I18nService';
import {
  closeModalDialog,
  createAccessibleModalDialog,
  openModalDialog
} from '../utils/dialogHelpers';

const SKIN_TONES = ['#f4d2b5', '#e0ac82', '#c68652', '#9d6134', '#75421e', '#4e2a11'];
const HAIR_COLORS = ['#1c1c1c', '#4a2f1d', '#8c3b20', '#95a5a6'];

export class CharacterCreatorModal {
  private readonly dialog: HTMLDialogElement;
  private appearance: CharacterAppearance = {
    name: 'Amaru',
    bodyType: 'balanced',
    skinTone: '#c68652',
    hairStyle: 'braided',
    hairColor: '#1c1c1c',
    outfit: 'expedition_vest',
    startingBackpack: 'botanist'
  };
  private seed = 'AMAZONAS-2026';
  private difficulty: DifficultyMode = 'survivalist';

  constructor(parent: HTMLElement) {
    this.dialog = createAccessibleModalDialog('modal-creator', 'creator-dialog-title');
    parent.appendChild(this.dialog);
    this.render();

    EventBus.on('LANGUAGE_CHANGED', () => {
      const wasOpen = this.dialog.open;
      this.render();
      if (wasOpen) openModalDialog(this.dialog);
    });
  }

  public open(): void {
    this.render();
    openModalDialog(this.dialog);
  }

  public render(): void {
    this.dialog.innerHTML = `
      <div class="modal-card">
        <header class="modal-header">
          <h2 id="creator-dialog-title">${i18n.t('creator.title')}</h2>
          <button type="button" class="btn-icon" id="close-creator" aria-label="Close">✕</button>
        </header>

        <div class="creator-layout">
          <div class="creator-preview-box">
            <canvas id="char-preview-canvas" width="96" height="96"></canvas>
            <strong id="preview-name-label">${this.appearance.name}</strong>
          </div>

          <form id="creator-form" class="creator-form">
            <label>
              <span>${i18n.t('creator.nameLabel')}</span>
              <input type="text" id="input-char-name" data-testid="input-char-name" maxlength="24" value="${this.appearance.name}" required />
            </label>

            <label>
              <span>${i18n.t('menu.seedLabel')}</span>
              <input type="text" id="input-world-seed" data-testid="input-world-seed" maxlength="24" value="${this.seed}" required />
            </label>

            <label>
              <span>${i18n.t('creator.bodyTypeLabel')}</span>
              <select id="select-body-type" data-testid="select-body-type">
                <option value="agile" ${this.appearance.bodyType === 'agile' ? 'selected' : ''}>${i18n.t('creator.body_agile')}</option>
                <option value="balanced" ${this.appearance.bodyType === 'balanced' ? 'selected' : ''}>${i18n.t('creator.body_balanced')}</option>
                <option value="sturdy" ${this.appearance.bodyType === 'sturdy' ? 'selected' : ''}>${i18n.t('creator.body_sturdy')}</option>
              </select>
            </label>

            <label>
              <span>${i18n.t('creator.skinToneLabel')}</span>
              <div class="swatch-row" id="skin-swatches">
                ${SKIN_TONES.map(
                  (tone) => `
                  <button type="button" class="color-swatch ${this.appearance.skinTone === tone ? 'active' : ''}" data-tone="${tone}" style="background:${tone}" aria-label="Skin tone ${tone}"></button>
                `
                ).join('')}
              </div>
            </label>

            <label>
              <span>${i18n.t('creator.hairStyleLabel')}</span>
              <select id="select-hair-style" data-testid="select-hair-style">
                <option value="short" ${this.appearance.hairStyle === 'short' ? 'selected' : ''}>${i18n.t('creator.hair_short')}</option>
                <option value="braided" ${this.appearance.hairStyle === 'braided' ? 'selected' : ''}>${i18n.t('creator.hair_braided')}</option>
                <option value="curly" ${this.appearance.hairStyle === 'curly' ? 'selected' : ''}>${i18n.t('creator.hair_curly')}</option>
                <option value="bun" ${this.appearance.hairStyle === 'bun' ? 'selected' : ''}>${i18n.t('creator.hair_bun')}</option>
              </select>
            </label>

            <label>
              <span>${i18n.t('creator.hairColorLabel')}</span>
              <div class="swatch-row" id="hair-swatches">
                ${HAIR_COLORS.map(
                  (col) => `
                  <button type="button" class="color-swatch ${this.appearance.hairColor === col ? 'active' : ''}" data-hair-color="${col}" style="background:${col}" aria-label="Hair color ${col}"></button>
                `
                ).join('')}
              </div>
            </label>

            <label>
              <span>${i18n.t('creator.outfitLabel')}</span>
              <select id="select-outfit" data-testid="select-outfit">
                <option value="expedition_vest" ${this.appearance.outfit === 'expedition_vest' ? 'selected' : ''}>${i18n.t('creator.outfit_expedition_vest')}</option>
                <option value="river_poncho" ${this.appearance.outfit === 'river_poncho' ? 'selected' : ''}>${i18n.t('creator.outfit_river_poncho')}</option>
                <option value="botanist_shirt" ${this.appearance.outfit === 'botanist_shirt' ? 'selected' : ''}>${i18n.t('creator.outfit_botanist_shirt')}</option>
              </select>
            </label>

            <label>
              <span>${i18n.t('creator.backpackLabel')}</span>
              <select id="select-backpack" data-testid="select-backpack">
                <option value="botanist" ${this.appearance.startingBackpack === 'botanist' ? 'selected' : ''}>${i18n.t('creator.pack_botanist')}</option>
                <option value="fisher" ${this.appearance.startingBackpack === 'fisher' ? 'selected' : ''}>${i18n.t('creator.pack_fisher')}</option>
                <option value="pathfinder" ${this.appearance.startingBackpack === 'pathfinder' ? 'selected' : ''}>${i18n.t('creator.pack_pathfinder')}</option>
              </select>
            </label>

            <label>
              <span>${i18n.t('creator.difficultyLabel')}</span>
              <select id="select-difficulty">
                <option value="explorer" ${this.difficulty === 'explorer' ? 'selected' : ''}>${i18n.t('creator.diff_explorer')}</option>
                <option value="survivalist" ${this.difficulty === 'survivalist' ? 'selected' : ''}>${i18n.t('creator.diff_survivalist')}</option>
                <option value="amazon_realist" ${this.difficulty === 'amazon_realist' ? 'selected' : ''}>${i18n.t('creator.diff_amazon_realist')}</option>
              </select>
            </label>

            <button type="submit" id="btn-confirm-character" data-testid="btn-confirm-character" class="btn btn-primary btn-block">
              🌿 ${i18n.t('creator.startButton')}
            </button>
          </form>
        </div>
      </div>
    `;

    const updatePreview = () => {
      const canvas = this.dialog.querySelector<HTMLCanvasElement>('#char-preview-canvas');
      if (canvas) {
        ProceduralAtlasGenerator.renderCharacterPreviewToCanvas(canvas, this.appearance);
      }
      const nameLbl = this.dialog.querySelector('#preview-name-label');
      if (nameLbl) nameLbl.textContent = this.appearance.name;
    };

    updatePreview();

    this.dialog.querySelector('#close-creator')?.addEventListener('click', () => {
      closeModalDialog(this.dialog);
    });

    this.dialog
      .querySelector<HTMLInputElement>('#input-char-name')
      ?.addEventListener('input', (e) => {
        this.appearance.name = (e.target as HTMLInputElement).value.trim() || 'Amaru';
        updatePreview();
      });

    this.dialog
      .querySelector<HTMLInputElement>('#input-world-seed')
      ?.addEventListener('input', (e) => {
        this.seed = (e.target as HTMLInputElement).value.trim() || 'AMAZONAS-2026';
      });

    this.dialog
      .querySelector<HTMLSelectElement>('#select-body-type')
      ?.addEventListener('change', (e) => {
        this.appearance.bodyType = (e.target as HTMLSelectElement)
          .value as CharacterAppearance['bodyType'];
        updatePreview();
      });

    this.dialog
      .querySelector<HTMLSelectElement>('#select-hair-style')
      ?.addEventListener('change', (e) => {
        this.appearance.hairStyle = (e.target as HTMLSelectElement)
          .value as CharacterAppearance['hairStyle'];
        updatePreview();
      });

    this.dialog
      .querySelector<HTMLSelectElement>('#select-outfit')
      ?.addEventListener('change', (e) => {
        this.appearance.outfit = (e.target as HTMLSelectElement)
          .value as CharacterAppearance['outfit'];
        updatePreview();
      });

    this.dialog
      .querySelector<HTMLSelectElement>('#select-backpack')
      ?.addEventListener('change', (e) => {
        this.appearance.startingBackpack = (e.target as HTMLSelectElement)
          .value as CharacterAppearance['startingBackpack'];
        updatePreview();
      });

    this.dialog
      .querySelector<HTMLSelectElement>('#select-difficulty')
      ?.addEventListener('change', (e) => {
        this.difficulty = (e.target as HTMLSelectElement).value as DifficultyMode;
      });

    this.dialog.querySelectorAll<HTMLButtonElement>('[data-tone]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.appearance.skinTone = btn.dataset.tone ?? '#c68652';
        this.render();
      });
    });

    this.dialog.querySelectorAll<HTMLButtonElement>('[data-hair-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.appearance.hairColor = btn.dataset.hairColor ?? '#1c1c1c';
        this.render();
      });
    });

    this.dialog.querySelector('#creator-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      EventBus.emit('START_NEW_GAME', {
        character: { ...this.appearance },
        seed: this.seed,
        difficulty: this.difficulty
      });
      closeModalDialog(this.dialog);
    });
  }
}
