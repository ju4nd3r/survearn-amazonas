import { EventBus } from '../core/events/EventBus';
import { BitacoraModal } from './components/BitacoraModal';
import { CharacterCreatorModal } from './components/CharacterCreatorModal';
import { CraftingModal } from './components/CraftingModal';
import { DialogueModal } from './components/DialogueModal';
import { HudOverlay } from './components/HudOverlay';
import { SaveSlotsModal } from './components/SaveSlotsModal';
import { SettingsModal } from './components/SettingsModal';
import { TitleOverlay } from './components/TitleOverlay';
import { TouchControlsOverlay } from './components/TouchControlsOverlay';

export class UIManager {
  public readonly titleOverlay: TitleOverlay;
  public readonly hudOverlay: HudOverlay;
  public readonly touchControls: TouchControlsOverlay;
  public readonly creatorModal: CharacterCreatorModal;
  public readonly bitacoraModal: BitacoraModal;
  public readonly craftingModal: CraftingModal;
  public readonly dialogueModal: DialogueModal;
  public readonly settingsModal: SettingsModal;
  public readonly saveSlotsModal: SaveSlotsModal;

  constructor(uiRoot: HTMLElement) {
    this.titleOverlay = new TitleOverlay(uiRoot);
    this.hudOverlay = new HudOverlay(uiRoot);
    this.touchControls = new TouchControlsOverlay(uiRoot);
    this.creatorModal = new CharacterCreatorModal(uiRoot);
    this.bitacoraModal = new BitacoraModal(uiRoot);
    this.craftingModal = new CraftingModal(uiRoot);
    this.dialogueModal = new DialogueModal(uiRoot);
    this.settingsModal = new SettingsModal(uiRoot);
    this.saveSlotsModal = new SaveSlotsModal(uiRoot);

    EventBus.on('OPEN_MODAL', ({ modal }) => {
      if (modal === 'bitacora') this.bitacoraModal.open();
      else if (modal === 'crafting') this.craftingModal.open();
      else if (modal === 'settings') this.settingsModal.open();
      else if (modal === 'saves') void this.saveSlotsModal.open();
      else if (modal === 'creator') this.creatorModal.open();
    });
  }
}
