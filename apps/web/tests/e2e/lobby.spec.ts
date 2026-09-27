import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'mobile', width: 360, height: 800 },
  { name: 'square', width: 900, height: 900 },
  { name: 'desktop', width: 1440, height: 1000 },
] as const;

for (const viewport of viewports) {
  test(`lobby fits the ${viewport.name} viewport`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Lobby' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Room' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join Room' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('Escape closes the room dialog and restores focus', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Create Room' });

  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Set your table.' })).toBeVisible();
  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(trigger).toBeFocused();
});
