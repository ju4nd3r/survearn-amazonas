import { EventBus } from '../../core/events/EventBus';

/**
 * Applies progressive enhancement and Safari fallback for light-dismiss (`closedby="any"`)
 * on native HTML5 `<dialog>` modal elements.
 */
export function createAccessibleModalDialog(
  id: string,
  labelledById: string
): HTMLDialogElement {
  const dialog = document.createElement('dialog');
  dialog.id = id;
  dialog.className = 'survearn-dialog';
  dialog.setAttribute('closedby', 'any');
  dialog.setAttribute('aria-labelledby', labelledById);

  // Sync game pause state when modal dialog closes (via Esc, backdrop click, or close button)
  dialog.addEventListener('close', () => {
    const anyOpen = document.querySelectorAll('dialog[open]').length > 0;
    EventBus.emit('GAME_PAUSE_CHANGED', { paused: anyOpen });
  });

  // Fallback for browsers without native `closedBy` support (e.g., Safari)
  if (typeof HTMLDialogElement !== 'undefined' && !('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (isDialogContent) return;
      dialog.close();
    });
  }

  return dialog;
}

export function openModalDialog(dialog: HTMLDialogElement): void {
  if (!dialog.open) {
    dialog.showModal();
    EventBus.emit('GAME_PAUSE_CHANGED', { paused: true });
  }
}

export function closeModalDialog(dialog: HTMLDialogElement): void {
  if (dialog.open) {
    dialog.close();
    const anyOpen = document.querySelectorAll('dialog[open]').length > 0;
    EventBus.emit('GAME_PAUSE_CHANGED', { paused: anyOpen });
  }
}
