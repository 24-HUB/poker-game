import { expect, test } from '@playwright/test';
import { createAccountThroughNativeApi } from './support/accounts';

test('protected destinations retain context and inline authentication is keyboard accessible', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const [path, title, copy] of [
    ['/collection', 'Collection', 'owned avatars'],
    ['/pulls', 'Cosmetic pulls', 'earned tickets'],
  ]) {
    await page.goto(path!);
    await expect(page.getByRole('heading', { name: title!, exact: true })).toBeVisible();
    await expect(page.locator('main')).toContainText(copy!);
    await page.locator('main').getByRole('button', { name: 'Sign in', exact: true }).click();
    const recovery = page.getByRole('button', { name: 'Forgot password?' });
    const target = await recovery.boundingBox();
    expect(target!.height).toBeGreaterThanOrEqual(44);
    expect(target!.width).toBeGreaterThanOrEqual(44);
    await page.keyboard.press('Escape');
    await expect(page.locator('main').getByRole('button', { name: 'Sign in', exact: true })).toBeFocused();
  }
});

test('invalid server invitation stays editable and zero-ticket guidance leads to play', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
  try {
    await createAccountThroughNativeApi(context, { displayName: 'Audit Player', email: `audit-${Date.now()}@example.test` });
    const page = await context.newPage();
    await page.goto('/');
    await page.getByRole('button', { name: 'Join Room' }).click();
    const input = page.getByLabel('Invite code');
    await input.fill('z'.repeat(43));
    await page.getByRole('button', { name: 'Join private room' }).click();
    await expect(page.locator('main').getByRole('alert')).toBeVisible();
    await expect(page.locator('main').getByRole('alert')).toBeFocused();
    await expect(input).toHaveValue('z'.repeat(43));
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await input.fill('short');
    await page.getByRole('button', { name: 'Join private room' }).click();
    await expect(page.locator('main').getByRole('alert')).toContainText('complete invite code');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Join Room' })).toBeFocused();
    await page.goto('/pulls');
    await expect(page.getByRole('button', { name: 'Open 1 — 5 tickets' })).toBeDisabled();
    await expect(page.getByText(/manual action in a completed hand/)).toBeVisible();
    await expect(page.getByText('20 tickets remain in your UTC daily earning allowance.')).toBeVisible();
    await page.getByRole('link', { name: 'Play poker with friends' }).click();
    await expect(page.getByRole('heading', { name: 'Lobby', exact: true })).toBeVisible();
  } finally { await context.close(); }
});

for (const mode of ['create', 'join'] as const) {
  test(`${mode} draft survives failed, cancelled and successful inline sign-in with a delayed access check`, async ({ browser }) => {
    const context = await browser.newContext();
    const email = `audit-draft-${mode}-${Date.now()}@example.test`;
    try {
      await createAccountThroughNativeApi(context, { displayName: 'Draft Player', email });
      await context.request.post('/api/auth/sign-out', { headers: { origin: 'http://127.0.0.1:3100' } });
      const page = await context.newPage();
      await page.goto('/');
      await page.getByRole('button', { name: mode === 'create' ? 'Create Room' : 'Join Room' }).click();
      const label = mode === 'create' ? 'Room title' : 'Invite code';
      const value = mode === 'create' ? 'Retained draft table' : 'z'.repeat(43);
      await page.getByLabel(label).fill(value);
      const signIn = page.locator('.room-entry-access').getByRole('button', { name: 'Sign in', exact: true });
      await expect(signIn).toHaveCount(1);
      await signIn.click();
      let dialog = page.getByRole('dialog');
      await dialog.getByLabel('Email', { exact: true }).fill(email);
      await dialog.getByLabel('Password', { exact: true }).fill('wrong-password');
      await dialog.getByRole('button', { name: 'Sign in to your club' }).click();
      await expect(dialog.getByRole('alert')).toBeVisible();
      await dialog.getByRole('button', { name: 'Close sign-in' }).click();
      await expect(page.getByLabel(label)).toHaveValue(value);
      await signIn.click();
      dialog = page.getByRole('dialog');
      await dialog.getByLabel('Email', { exact: true }).fill(email);
      await dialog.getByLabel('Password', { exact: true }).fill('private-test-password');
      let release!: () => void;
      const delay = new Promise<void>((resolve) => { release = resolve; });
      await page.route('**/api/rooms/current', async (route) => { await delay; await route.continue(); });
      await dialog.getByRole('button', { name: 'Sign in to your club' }).click();
      try { await expect(page.getByText('Recovering your current room…')).toBeVisible(); }
      finally { release(); }
      await expect(page.getByLabel(label)).toHaveValue(value);
      await page.unroute('**/api/rooms/current');
      if (mode === 'create') {
        await page.getByRole('button', { name: 'Create private room' }).click();
        await expect(page.getByRole('heading', { name: value })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Use this tab to play' })).toHaveCount(0);
      } else {
        await page.getByRole('button', { name: 'Join private room' }).click();
        await expect(page.locator('main').getByRole('alert')).toBeVisible();
        await expect(page.getByLabel(label)).toHaveValue(value);
      }
    } finally { await context.close(); }
  });
}
