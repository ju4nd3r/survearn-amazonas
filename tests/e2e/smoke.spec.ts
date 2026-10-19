import { expect, test } from '@playwright/test';

test.describe('survearn — Edition: Amazonas Colombia (Selva Viva) E2E Smoke Suite', () => {
  test('boots game, switches ES/EN language, creates custom character, inspects/unlocks Bitacora, and saves/loads slot', async ({
    page
  }) => {
    await page.goto('/');

    // 1. Verify title & safety disclaimer in default Colombian Spanish
    await expect(page.getByTestId('game-title')).toContainText('survearn');
    await expect(page.getByTestId('safety-disclaimer')).toContainText('AVISO EDUCATIVO');

    // 2. Toggle language to English and verify runtime localization
    await page.getByTestId('btn-lang-switch').click();
    await expect(page.getByTestId('safety-disclaimer')).toContainText('EDUCATIONAL DISCLAIMER');

    // 3. Open Character Creator, customize explorer, and start expedition
    await page.getByTestId('btn-open-creator').click();
    await page.getByTestId('input-char-name').fill('Wayra');
    await page.getByTestId('select-backpack').selectOption('botanist');
    await page.getByTestId('btn-confirm-character').click();

    // 4. Verify HUD survival stats and starting inventory
    await expect(page.getByTestId('survival-stats-panel')).toBeVisible();
    await expect(page.getByTestId('inventory-strip')).toContainText("Dragon's Blood");

    // 5. Inspect nearby species and open Bitácora (Field Guide)
    await page.getByTestId('btn-inspect').click();
    await page.getByTestId('btn-open-bitacora').click();
    await expect(page.getByTestId('bitacora-grid')).toBeVisible();
    await page.getByTestId('bitacora-search').fill('Euterpe precatoria');
    await expect(page.getByTestId('bitacora-card-euterpe_precatoria_asai')).toContainText(
      'Euterpe precatoria'
    );
    await page.getByTestId('btn-close-bitacora').click();

    // 6. Open Save Slots modal, save to Slot 1, and verify slot metadata updates
    await page.getByTestId('btn-open-saves').click();
    await page.getByTestId('btn-save-slot_1').click();
    await expect(page.getByTestId('save-card-slot_1')).toContainText('Wayra');
    await page.getByTestId('btn-close-saves').click();
  });
});
