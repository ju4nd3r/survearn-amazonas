import { DiscoveryLevel, InventoryItemSlot, WorldResourceNode } from '../core/types/game.types';
import { ContentRegistry } from '../data/ContentRegistry';
import { CraftingSystem } from './CraftingSystem';
import { FieldGuideSystem } from './FieldGuideSystem';

export class ForagingSystem {
  public static findNearestNode(
    nodes: readonly WorldResourceNode[],
    playerX: number,
    playerY: number,
    maxDistancePx = 28
  ): WorldResourceNode | null {
    let best: WorldResourceNode | null = null;
    let bestDist = maxDistancePx;

    for (const node of nodes) {
      if (node.harvested) continue;
      const dist = Math.hypot(node.x - playerX, node.y - playerY);
      if (dist <= bestDist) {
        bestDist = dist;
        best = node;
      }
    }
    return best;
  }

  public static harvestNode(
    node: WorldResourceNode,
    inventory: readonly InventoryItemSlot[],
    discovered: Record<string, DiscoveryLevel>
  ): {
    inventory: InventoryItemSlot[];
    discovered: Record<string, DiscoveryLevel>;
    itemNameEs: string;
    itemNameEn: string;
  } {
    node.harvested = true;
    const nextInv = CraftingSystem.addItem(inventory, node.itemId, 1);
    const nextDisc = FieldGuideSystem.unlockSpecies(discovered, node.itemId, 'mastered');

    return {
      inventory: nextInv,
      discovered: nextDisc,
      itemNameEs: ContentRegistry.getItemDisplayName(node.itemId, 'es'),
      itemNameEn: ContentRegistry.getItemDisplayName(node.itemId, 'en')
    };
  }
}
