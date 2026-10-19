import { DiscoveryLevel, InventoryItemSlot } from '../core/types/game.types';
import { ContentRegistry } from '../data/ContentRegistry';
import { NPCDefinition } from '../data/schemas';
import { CraftingSystem } from './CraftingSystem';
import { FieldGuideSystem } from './FieldGuideSystem';

export class DialogueSystem {
  public static getNPC(npcId: string): NPCDefinition | undefined {
    return ContentRegistry.npcs.find((n) => n.id === npcId);
  }

  public static applyConversationUnlocks(
    npc: NPCDefinition,
    discovered: Record<string, DiscoveryLevel>
  ): Record<string, DiscoveryLevel> {
    let next = { ...discovered };
    for (const speciesId of npc.unlocksSpeciesIds) {
      next = FieldGuideSystem.unlockSpecies(next, speciesId, 'mastered');
    }
    return next;
  }

  public static executeTrade(
    npc: NPCDefinition,
    tradeIndex: number,
    inventory: readonly InventoryItemSlot[]
  ): { success: boolean; inventory: InventoryItemSlot[] } {
    const trade = npc.trades[tradeIndex];
    if (!trade) {
      return { success: false, inventory: inventory.map((s) => ({ ...s })) };
    }

    const owned = inventory.find((s) => s.itemId === trade.giveItemId);
    if (!owned || owned.count < trade.giveCount) {
      return { success: false, inventory: inventory.map((s) => ({ ...s })) };
    }

    let updated = CraftingSystem.removeItem(inventory, trade.giveItemId, trade.giveCount);
    updated = CraftingSystem.addItem(updated, trade.receiveItemId, trade.receiveCount);
    return { success: true, inventory: updated };
  }
}
