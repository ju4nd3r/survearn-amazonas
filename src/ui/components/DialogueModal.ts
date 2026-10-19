import { EventBus } from '../../core/events/EventBus';
import { InventoryItemSlot } from '../../core/types/game.types';
import { ContentRegistry } from '../../data/ContentRegistry';
import { i18n } from '../../i18n/I18nService';
import { DialogueSystem } from '../../systems/DialogueSystem';
import {
  closeModalDialog,
  createAccessibleModalDialog,
  openModalDialog
} from '../utils/dialogHelpers';

export class DialogueModal {
  private readonly dialog: HTMLDialogElement;
  private activeNpcId = 'abuela_sabina';
  private activeResponseText = '';
  private inventory: InventoryItemSlot[] = [];

  constructor(parent: HTMLElement) {
    this.dialog = createAccessibleModalDialog('modal-dialogue', 'dialogue-dialog-title');
    parent.appendChild(this.dialog);

    EventBus.on('INVENTORY_UPDATED', ({ inventory }) => {
      this.inventory = inventory;
    });

    EventBus.on('OPEN_NPC_DIALOGUE', ({ npcId }) => {
      this.activeNpcId = npcId;
      this.activeResponseText = '';
      this.open();
    });
  }

  public open(): void {
    this.render();
    openModalDialog(this.dialog);
  }

  public render(): void {
    const npc = DialogueSystem.getNPC(this.activeNpcId);
    if (!npc) return;
    const lang = i18n.getLanguage();
    const speech = this.activeResponseText || npc.greeting[lang];

    this.dialog.innerHTML = `
      <div class="modal-card">
        <header class="modal-header">
          <div>
            <h2 id="dialogue-dialog-title">💬 ${npc.name}</h2>
            <p class="subtitle">${npc.role[lang]} • ${npc.community}</p>
          </div>
          <button type="button" class="btn-icon" id="close-dialogue" aria-label="Close">✕</button>
        </header>

        <blockquote class="npc-speech-bubble">
          “${speech}”
        </blockquote>

        <div class="dialogue-options">
          ${npc.dialogueNodes
            .map(
              (node) => `
            <button type="button" class="btn btn-secondary btn-block" data-node-id="${node.id}">
              ❓ ${node.prompt[lang]}
            </button>
          `
            )
            .join('')}
        </div>

        <div class="trades-section">
          <h3>🤝 Trueque Comunitario / Barter</h3>
          ${npc.trades
            .map((t, idx) => {
              const giveName = ContentRegistry.getItemDisplayName(t.giveItemId, lang);
              const recName = ContentRegistry.getItemDisplayName(t.receiveItemId, lang);
              return `
                <button type="button" class="btn btn-accent btn-block" data-trade-idx="${idx}">
                  🔄 Dar ${t.giveCount}× ${giveName} ➔ Recibir ${t.receiveCount}× ${recName}
                </button>
              `;
            })
            .join('')}
        </div>
      </div>
    `;

    this.dialog.querySelector('#close-dialogue')?.addEventListener('click', () => {
      closeModalDialog(this.dialog);
    });

    this.dialog.querySelectorAll<HTMLButtonElement>('[data-node-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const node = npc.dialogueNodes.find((n) => n.id === btn.dataset.nodeId);
        if (node) {
          this.activeResponseText = node.response[lang];
          this.render();
        }
      });
    });

    this.dialog.querySelectorAll<HTMLButtonElement>('[data-trade-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.tradeIdx);
        const res = DialogueSystem.executeTrade(npc, idx, this.inventory);
        if (res.success) {
          EventBus.emit('INVENTORY_UPDATED', { inventory: res.inventory });
          EventBus.emit('TOAST_MESSAGE', {
            text: '🤝 Trueque realizado con éxito / Trade completed!',
            type: 'success'
          });
        } else {
          EventBus.emit('TOAST_MESSAGE', {
            text: i18n.t('crafting.missingIngredients'),
            type: 'warning'
          });
        }
      });
    });
  }
}
