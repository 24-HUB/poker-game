'use client';

import { type FormEvent, useEffect, useState } from 'react';

import { AuthRequestError, resetPassword } from '../../lib/auth-client';

export function ResetPasswordForm() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token'));
    if (params.has('error')) setError('This reset link has expired or is invalid. Request a new link from sign in.');
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setPending(true);
    setError(null);
    const password = String(new FormData(event.currentTarget).get('password') ?? '');
    try {
      await resetPassword(token, password);
      window.history.replaceState(null, '', '/reset-password');
      setToken(null);
      setDone(true);
    } catch (cause) {
      setError(cause instanceof AuthRequestError ? cause.message : 'The password could not be changed. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-dialog" aria-labelledby="reset-title">
      <h1 id="reset-title">Set a new password</h1>
      {done ? <p role="status">Your password has changed. All older sessions have been signed out. <a href="/">Sign in</a>.</p> : null}
      {!done && !token ? <p>Open a current reset link from your email, or request a new one from <a href="/">sign in</a>.</p> : null}
      {!done && token ? (
        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>New password</span>
            <input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
          </label>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <button className="primary-button" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Change password'}</button>
        </form>
      ) : error ? <p className="auth-error" role="alert">{error}</p> : null}
    </section>
  );
}
