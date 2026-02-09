import { test, expect } from '@playwright/test';

test.describe('NeuronLink Smoke Test', () => {
  test('Full Flow: Connect -> Model -> Analyze -> Chat', async ({ page }) => {
    // 1. Navigate to the app
    await page.goto('/');

    // 2. Handle AuthModal: Continue as Guest
    const guestButton = page.getByRole('button', { name: /Continue as Guest/i });
    await expect(guestButton).toBeVisible();
    await guestButton.click();

    // 3. Handle DbCredentialsModal: Save & Connect
    // The modal should open automatically.
    const saveButton = page.getByRole('button', { name: /Save & Connect/i });
    if (await saveButton.isVisible()) {
      if (await saveButton.isEnabled()) {
        await saveButton.click();
      } else {
        // If disabled but connection is verified (as seen in status), just close the modal
        const closeModal = page.getByRole('button', { name: /Close modal/i });
        if (await closeModal.isVisible()) {
          await closeModal.click();
        }
      }
    }

    // Wait for the configuration modal to close
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 });

    // 4. Verify Modeling view is active and tables are loaded
    // We wait for the 'Structure' button to be visible and functional
    const structureBtn = page.getByRole('button', { name: /Structure/i });
    await expect(structureBtn).toBeVisible({ timeout: 20000 });

    // Wait for a table to appear in the list. 'actor' is a common table in dvdrental.
    const actorTable = page.locator('div, section, group, .group').filter({ hasText: /^actor$/i }).first();
    await expect(actorTable).toBeVisible({ timeout: 30000 });

    // 5. Select a table
    // Try to find the checkbox within the actor table group
    const actorCheckbox = actorTable.locator('input[type="checkbox"]').first();
    await actorCheckbox.click();

    // 6. Switch to Analysis view via Header toggle
    // The button has title "Back to Table View" when in modeling view
    const analysisToggle = page.getByTitle(/Back to Table View/i);
    await expect(analysisToggle).toBeVisible();
    await analysisToggle.click();

    // Verify view switch (Check for Chat tab or Metrics panel)
    const chatTab = page.getByRole('button', { name: /Chat/i });
    await expect(chatTab).toBeVisible({ timeout: 15000 });
    await chatTab.click();

    // Verify AI Chat is visible (if not locked for guests)
    // For smoke testing, we'll try to input a message. 
    // If it's locked, we might need to handle it or bypass it.
    const chatInput = page.getByLabel('Chat input');
    if (await chatInput.isVisible()) {
      await chatInput.fill('Create a metric for total sales');
      await page.keyboard.press('Enter');

      // Wait for AI response (log container should have messages)
      const chatLog = page.getByRole('log');
      await expect(chatLog).toBeVisible();

      // We wait for the model's response. The first message is user, second is model.
      // We use a longer timeout for AI responses
      await expect(chatLog.getByText(/total sales/i)).toHaveCount(2, { timeout: 30000 });
    } else {
      // If locked, we at least verify the lock message
      await expect(page.getByText(/AI Access Restricted/i)).toBeVisible();
    }
  });
});
