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
  }
}

export function closeModalDialog(dialog: HTMLDialogElement): void {
  if (dialog.open) {
    dialog.close();
  }
}
