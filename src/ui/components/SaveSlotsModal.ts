import { EventBus } from '../../core/events/EventBus';
import { i18n } from '../../i18n/I18nService';
import { SaveManager, SaveSlotId } from '../../persistence/SaveManager';
import {
  closeModalDialog,
  createAccessibleModalDialog,
  openModalDialog
} from '../utils/dialogHelpers';

export class SaveSlotsModal {
  private readonly dialog: HTMLDialogElement;

  constructor(parent: HTMLElement) {
    this.dialog = createAccessibleModalDialog('modal-saves', 'saves-dialog-title');
    parent.appendChild(this.dialog);

    EventBus.on('LANGUAGE_CHANGED', () => {
      if (this.dialog.open) {
        void this.render();
      }
    });
  }

  public async open(): Promise<void> {
    await this.render();
    openModalDialog(this.dialog);
  }

  public async render(): Promise<void> {
    const slots = await SaveManager.listSlots();
    const slotIds: SaveSlotId[] = ['autosave', 'slot_1', 'slot_2', 'slot_3'];

    const rowsHtml = slotIds
      .map((slotId) => {
        const data = slots[slotId];
        const info = data
          ? `<strong>${data.character.name}</strong> • ${i18n.t('hud.day')} ${data.dayCount} • Seed: ${data.worldSeed} <br/><small>${new Date(data.savedAtISO).toLocaleString()}</small>`
          : `<em>${i18n.t('saves.emptySlot')}</em>`;

        return `
          <div class="save-slot-card" data-testid="save-card-${slotId}">
            <div class="slot-meta">
              <span class="badge">${slotId.toUpperCase()}</span>
              <div>${info}</div>
            </div>
            <div class="slot-buttons">
              <button type="button" class="btn btn-primary" data-save-slot="${slotId}" data-testid="btn-save-${slotId}">
                💾 ${i18n.t('saves.saveNow')}
              </button>
              <button type="button" class="btn btn-secondary" data-load-slot="${slotId}" data-testid="btn-load-${slotId}" ${data ? '' : 'disabled'}>
                📂 ${i18n.t('saves.loadNow')}
              </button>
              <button type="button" class="btn btn-secondary" data-export-slot="${slotId}" ${data ? '' : 'disabled'}>
                ⬇️ ${i18n.t('saves.exportJson')}
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    this.dialog.innerHTML = `
      <div class="modal-card modal-wide">
        <header class="modal-header">
          <h2 id="saves-dialog-title">💾 ${i18n.t('saves.title')}</h2>
          <button type="button" class="btn-icon" id="close-saves" data-testid="btn-close-saves" aria-label="Close">✕</button>
        </header>

        <div class="saves-list">
          ${rowsHtml}
        </div>

        <div class="saves-footer">
          <label class="btn btn-secondary">
            ⬆️ ${i18n.t('saves.importJson')}
            <input type="file" id="import-save-input" accept="application/json" hidden />
          </label>
          <button type="button" id="btn-reset-all-saves" class="btn btn-danger">
            🗑️ ${i18n.t('saves.resetData')}
          </button>
        </div>
      </div>
    `;

    this.dialog.querySelector('#close-saves')?.addEventListener('click', () => {
      closeModalDialog(this.dialog);
    });

    this.dialog.querySelectorAll<HTMLButtonElement>('[data-save-slot]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const slotId = btn.dataset.saveSlot as SaveSlotId;
        EventBus.emit('TRIGGER_MANUAL_SAVE', { slotId });
        setTimeout(() => void this.render(), 120);
      });
    });

    this.dialog.querySelectorAll<HTMLButtonElement>('[data-load-slot]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slotId = btn.dataset.loadSlot as SaveSlotId;
        EventBus.emit('LOAD_SAVED_GAME', { slotId });
        closeModalDialog(this.dialog);
      });
    });

    this.dialog.querySelectorAll<HTMLButtonElement>('[data-export-slot]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const slotId = btn.dataset.exportSlot as SaveSlotId;
        const save = await SaveManager.loadGame(slotId);
        if (!save) return;
        const json = SaveManager.exportSaveToString(save);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survearn-${slotId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });

    this.dialog
      .querySelector<HTMLInputElement>('#import-save-input')
      ?.addEventListener('change', async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          await SaveManager.importSaveFromString(text, 'slot_1');
          EventBus.emit('LOAD_SAVED_GAME', { slotId: 'slot_1' });
          await this.render();
        } catch {
          EventBus.emit('TOAST_MESSAGE', {
            text: 'Error: Invalid or corrupted save file.',
            type: 'danger'
          });
        }
      });

    this.dialog.querySelector('#btn-reset-all-saves')?.addEventListener('click', async () => {
      await SaveManager.resetAllData();
      await this.render();
    });
  }
}
