import { InventoryItemSlot } from '../core/types/game.types';
import { ContentRegistry } from '../data/ContentRegistry';
import { RecipeDefinition } from '../data/schemas';

export class CraftingSystem {
  public static canCraft(
    recipe: RecipeDefinition,
    inventory: readonly InventoryItemSlot[],
    nearLitCampfire: boolean,
    insideShelter: boolean
  ): { allowed: boolean; reason?: 'missing_ingredients' | 'needs_campfire' | 'needs_shelter' } {
    if (recipe.requiredStation === 'campfire' && !nearLitCampfire) {
      return { allowed: false, reason: 'needs_campfire' };
    }
    if (recipe.requiredStation === 'shelter_workbench' && !insideShelter) {
      return { allowed: false, reason: 'needs_shelter' };
    }

    for (const req of recipe.ingredients) {
      const slot = inventory.find((s) => s.itemId === req.itemId);
      if (!slot || slot.count < req.count) {
        return { allowed: false, reason: 'missing_ingredients' };
      }
    }

    return { allowed: true };
  }

  public static executeCraft(
    recipeId: string,
    inventory: readonly InventoryItemSlot[],
    nearLitCampfire: boolean,
    insideShelter: boolean
  ): {
    success: boolean;
    inventory: InventoryItemSlot[];
    placedStructureRecipeId?: string;
    reason?: 'missing_ingredients' | 'needs_campfire' | 'needs_shelter' | 'unknown_recipe';
  } {
    const recipe = ContentRegistry.getRecipe(recipeId);
    if (!recipe) {
      return {
        success: false,
        inventory: inventory.map((s) => ({ ...s })),
        reason: 'unknown_recipe'
      };
    }

    const check = this.canCraft(recipe, inventory, nearLitCampfire, insideShelter);
    if (!check.allowed) {
      return {
        success: false,
        inventory: inventory.map((s) => ({ ...s })),
        reason: check.reason
      };
    }

    let updated = inventory.map((s) => ({ ...s }));
    for (const req of recipe.ingredients) {
      updated = this.removeItem(updated, req.itemId, req.count);
    }

    if (recipe.placesStructure) {
      return {
        success: true,
        inventory: updated,
        placedStructureRecipeId: recipe.id
      };
    }

    updated = this.addItem(updated, recipe.outputItemId, recipe.outputCount);
    return {
      success: true,
      inventory: updated
    };
  }

  public static addItem(
    inventory: readonly InventoryItemSlot[],
    itemId: string,
    count: number
  ): InventoryItemSlot[] {
    const next = inventory.map((s) => ({ ...s }));
    const existing = next.find((s) => s.itemId === itemId);
    if (existing) {
      existing.count += count;
    } else {
      next.push({ itemId, count });
    }
    return next;
  }

  public static removeItem(
    inventory: readonly InventoryItemSlot[],
    itemId: string,
    count: number
  ): InventoryItemSlot[] {
    const next: InventoryItemSlot[] = [];
    for (const slot of inventory) {
      if (slot.itemId === itemId) {
        const remaining = slot.count - count;
        if (remaining > 0) {
          next.push({ itemId: slot.itemId, count: remaining });
        }
      } else {
        next.push({ ...slot });
      }
    }
    return next;
  }
}
