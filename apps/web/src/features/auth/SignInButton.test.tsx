// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { signIn, signUp } from '../../lib/auth-client';
import { SignInButton } from './SignInButton';

vi.mock('../../lib/auth-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/auth-client')>();
  return { ...actual, signIn: vi.fn(), signUp: vi.fn() };
});

describe('SignInButton', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.mocked(signIn).mockReset();
    vi.mocked(signUp).mockReset();
  });

  it('opens an accessible sign-in form with recovery guidance', async () => {
    const user = userEvent.setup();
    render(createElement(SignInButton, { onAuthenticated: vi.fn() }));

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const dialog = screen.getByRole('dialog', { name: 'Welcome back' });
    expect(within(dialog).getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(within(dialog).getByLabelText('Password')).toHaveAttribute('minlength', '8');
    expect(within(dialog).getByRole('button', { name: 'Forgot password?' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Resend verification' })).toBeVisible();
  });

  it('submits invite-only account creation and never stores the code in browser state', async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    vi.mocked(signUp).mockResolvedValue();
    render(createElement(SignInButton, { onAuthenticated }));

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Create account' }));
    await user.type(within(dialog).getByLabelText('Display name'), 'Alice');
    await user.type(within(dialog).getByLabelText('Email'), 'alice@example.com');
    await user.type(within(dialog).getByLabelText('Password'), 'correct-horse-battery-staple');
    await user.type(within(dialog).getByLabelText('Registration code'), 'private-code');
    await user.click(within(dialog).getByRole('button', { name: 'Create private account' }));

    expect(signUp).toHaveBeenCalledWith({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'correct-horse-battery-staple',
      registrationCode: 'private-code',
    });
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('status')).toHaveTextContent('Check your email to verify it');
  });
});
