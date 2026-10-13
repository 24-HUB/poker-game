// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetPassword, verifyEmail, requestPasswordReset, resendVerification, AuthRequestError } from '../../lib/auth-client';
import { EmailCodeForm } from './EmailCodeForm';
vi.mock('../../lib/auth-client', async (original) => ({ ...await original<typeof import('../../lib/auth-client')>(),
  resetPassword: vi.fn(), verifyEmail: vi.fn(), requestPasswordReset: vi.fn(), resendVerification: vi.fn(),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('email code forms', () => {
  it('retains email, accepts a leading-zero pasted code and returns to password sign-in', async () => {
    const user = userEvent.setup(); const done = vi.fn();
    vi.mocked(verifyEmail).mockResolvedValue();
    render(createElement(EmailCodeForm, { purpose: 'verify', initialEmail: 'a@example.com', onBack: done }));
    expect(screen.getByLabelText('Email')).toHaveValue('a@example.com');
    const input = screen.getByLabelText('Email code'); expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    await user.click(input); await user.paste('000042'); await user.click(screen.getByRole('button', { name: 'Verify email' }));
    expect(verifyEmail).toHaveBeenCalledWith('a@example.com', '000042');
    expect(done).toHaveBeenCalledWith('a@example.com', 'Email verified. Sign in with your password.');
  });
  it('checks mismatch locally and preserves code/password on wrong code', async () => {
    const user = userEvent.setup(); vi.mocked(resetPassword).mockRejectedValue(new AuthRequestError('INVALID_CODE', 'Request a new code.'));
    render(createElement(EmailCodeForm, { purpose: 'reset', initialEmail: 'a@example.com', initialCodeSent: true, onBack: vi.fn() }));
    await user.type(screen.getByLabelText('Email code'), '000042');
    await user.type(screen.getByLabelText('New password', { exact: true }), 'new-password');
    await user.type(screen.getByLabelText('Confirm new password'), 'other-password');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(resetPassword).not.toHaveBeenCalled(); expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
    await user.clear(screen.getByLabelText('Confirm new password')); await user.type(screen.getByLabelText('Confirm new password'), 'new-password');
    await user.click(screen.getByRole('button', { name: 'Change password' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Request a new code'); expect(screen.getByLabelText('Email code')).toHaveValue('000042');
    expect(screen.getByLabelText('New password', { exact: true })).toHaveValue('new-password');
  });
  it('clears secrets and ignores late responses after the email changes', async () => {
    const user = userEvent.setup(); let complete!: () => void; const done = vi.fn();
    vi.mocked(verifyEmail).mockImplementation(() => new Promise<void>((resolve) => { complete = resolve; }));
    render(createElement(EmailCodeForm, { purpose: 'verify', initialEmail: 'a@example.com', onBack: done }));
    await user.type(screen.getByLabelText('Email code'), '000042'); await user.click(screen.getByRole('button', { name: 'Verify email' }));
    await user.clear(screen.getByLabelText('Email')); await user.type(screen.getByLabelText('Email'), 'b@example.com');
    complete(); await vi.waitFor(() => expect(screen.getByLabelText('Email code')).toHaveValue(''));
    expect(done).not.toHaveBeenCalled();
  });
  it('ignores a late reset confirmation after the form closes', async () => {
    const user = userEvent.setup(); let complete!: () => void; const done = vi.fn();
    vi.mocked(resetPassword).mockImplementation(() => new Promise<void>((resolve) => { complete = resolve; }));
    const view = render(createElement(EmailCodeForm, { purpose: 'reset', initialEmail: 'a@example.com', initialCodeSent: true, onBack: done }));
    await user.type(screen.getByLabelText('Email code'), '000042');
    await user.type(screen.getByLabelText('New password', { exact: true }), 'new-password'); await user.type(screen.getByLabelText('Confirm new password'), 'new-password');
    await user.click(screen.getByRole('button', { name: 'Change password' })); view.unmount();
    await act(async () => { complete(); }); expect(done).not.toHaveBeenCalled();
  });
});
