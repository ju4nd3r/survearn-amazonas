import { describe, expect, it } from 'vitest';
import { CraftingSystem } from '../../src/systems/CraftingSystem';

describe('CraftingSystem', () => {
  it('builds a Capirona Campfire when wood and flint cobble are present', () => {
    const inv = [
      { itemId: 'madera_capirona', count: 2 },
      { itemId: 'piedra_rio_silex', count: 1 }
    ];
    const res = CraftingSystem.executeCraft('fogata_campamento', inv, false, false);

    expect(res.success).toBe(true);
    expect(res.placedStructureRecipeId).toBe('fogata_campamento');
    expect(res.inventory.length).toBe(0);
  });

  it('requires a lit campfire to detoxify Yuca Brava into Casabe', () => {
    const inv = [
      { itemId: 'manihot_esculenta_brava', count: 1 },
      { itemId: 'fibra_chambira', count: 1 }
    ];

    const withoutFire = CraftingSystem.executeCraft('procesar_casabe_yuca', inv, false, false);
    expect(withoutFire.success).toBe(false);
    expect(withoutFire.reason).toBe('needs_campfire');

    const withFire = CraftingSystem.executeCraft('procesar_casabe_yuca', inv, true, false);
    expect(withFire.success).toBe(true);
    expect(withFire.inventory.find((s) => s.itemId === 'casabe_tostado')?.count).toBe(2);
  });
});
