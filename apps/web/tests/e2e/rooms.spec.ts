import { expect, test } from '@playwright/test';

import { createAccount, createAccountThroughNativeApi } from './support/accounts';

test('two accounts join one room and explicit takeover disables the old tab', async ({ browser }, testInfo) => {
  test.setTimeout(60_000);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const hostContext = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const guestContext = await browser.newContext();

  try {
    const host = await hostContext.newPage();
    await host.goto('/');
    await createAccount(host, { displayName: 'Alice Host', email: `alice-${suffix}@example.test` });
    await host.getByRole('button', { name: 'Create Room' }).click();
    await host.getByLabel('Room title').fill('Friday table');
    await host.getByRole('button', { name: 'Create private room' }).click();
    await expect(host).toHaveURL(/\/rooms\/[^/]+$/);
    await expect(host.getByRole('heading', { name: 'Friday table' })).toBeVisible();

    for (const viewport of [
      { name: 'mobile', width: 360, height: 800 },
      { name: 'square', width: 900, height: 900 },
      { name: 'desktop', width: 1440, height: 1000 },
    ]) {
      await host.setViewportSize(viewport);
      await expect(host.getByRole('listitem')).toHaveCount(6);
      await expect(host.getByText('Connected', { exact: true })).toBeVisible();
      await expect.poll(() => host.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await host.screenshot({ path: testInfo.outputPath(`room-${viewport.name}.png`), fullPage: true });
    }

    await host.getByRole('button', { name: 'Copy room link' }).click();
    const invitationUrl = await host.evaluate(() => navigator.clipboard.readText());
    expect(invitationUrl).toMatch(/^http:\/\/127\.0\.0\.1:3100\/#invite=/);
    expect(invitationUrl).not.toContain('?');

    const guest = await guestContext.newPage();
    await guest.goto(invitationUrl);
    await expect(guest).toHaveURL('http://127.0.0.1:3100/');
    await createAccount(guest, { displayName: 'Bob Guest', email: `bob-${suffix}@example.test` });
    await expect(guest).toHaveURL(/\/rooms\/[^/]+$/);
    await expect(guest.getByRole('heading', { name: 'Friday table' })).toBeVisible();
    await guest.reload();
    await expect(guest.getByRole('heading', { name: 'Friday table' })).toBeVisible();

    await expect(host.getByRole('listitem').filter({ hasText: 'Alice Host' })).toHaveCount(1);
    await expect(host.getByRole('listitem').filter({ hasText: 'Bob Guest' })).toHaveCount(1);
    await expect(host.getByRole('button', { name: 'Rotate room invitation' })).toBeVisible();
    await expect(guest.getByRole('button', { name: 'Rotate room invitation' })).toHaveCount(0);

    const roomUrl = host.url();
    const newerHostTab = await hostContext.newPage();
    await newerHostTab.goto(roomUrl);
    await newerHostTab.getByRole('button', { name: 'Claim control in this tab' }).click();
    await expect(newerHostTab.getByRole('button', { name: 'Claim control in this tab' })).toHaveCount(0);

    await expect(host.getByRole('button', { name: 'Rotate room invitation' })).toBeDisabled();
    await expect(host.getByRole('button', { name: 'Take seat 3' })).toBeDisabled();
    await expect(newerHostTab.getByRole('button', { name: 'Take seat 3' })).toBeEnabled();
    await newerHostTab.getByRole('button', { name: 'Take seat 3' }).click();
    await expect(newerHostTab.getByRole('listitem').filter({ hasText: 'Seat 3' })).toContainText('Alice Host');

    const revocation = await guestContext.request.post('/api/auth/sign-out', {
      headers: { origin: 'http://127.0.0.1:3100' },
    });
    expect(revocation.ok(), await revocation.text()).toBe(true);
    await guest.getByRole('button', { name: 'Claim control in this tab' }).click();
    await expect(guest.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(guest.getByRole('heading', { name: 'Friday table' })).toHaveCount(0);
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});

test('a six-seat room rejects a seventh authenticated account without leaking the invitation', async ({ browser }) => {
  test.setTimeout(90_000);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const contexts = [];

  try {
    const hostContext = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
    contexts.push(hostContext);
    await createAccountThroughNativeApi(hostContext, { displayName: 'Full Host', email: `full-host-${suffix}@example.test` });
    const host = await hostContext.newPage();
    await host.goto('/');
    await host.getByRole('button', { name: 'Create Room' }).click();
    await host.getByLabel('Room title').fill('Six seat table');
    await host.getByRole('button', { name: 'Create private room' }).click();
    await expect(host).toHaveURL(/\/rooms\/[^/]+$/);
    await host.getByRole('button', { name: 'Copy room link' }).click();
    const invitationUrl = await host.evaluate(() => navigator.clipboard.readText());

    for (let index = 1; index <= 5; index += 1) {
      const context = await browser.newContext();
      contexts.push(context);
      await createAccountThroughNativeApi(context, {
        displayName: `Guest ${index}`,
        email: `guest-${index}-${suffix}@example.test`,
      });
      const page = await context.newPage();
      await page.goto(invitationUrl);
      await expect(page).toHaveURL(/\/rooms\/[^/]+$/);
    }

    await expect(host.getByText('6 of 6 members')).toBeVisible();
    const overflowContext = await browser.newContext();
    contexts.push(overflowContext);
    await createAccountThroughNativeApi(overflowContext, {
      displayName: 'Guest 7',
      email: `guest-7-${suffix}@example.test`,
    });
    const overflow = await overflowContext.newPage();
    await overflow.goto(invitationUrl);

    await expect(overflow).toHaveURL('http://127.0.0.1:3100/');
    await expect(overflow.getByText('The room already has six seated members.')).toBeVisible();
    await expect(overflow.evaluate(() => window.location.hash)).resolves.toBe('');
    await expect(overflow.evaluate(() => sessionStorage.getItem('poker.pending-invitation'))).resolves.toBeNull();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
