'use client';

import { KeyRound, X } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';

import { Icon } from '../../components/ui/Icon';
import { AuthRequestError, requestPasswordReset, resendVerification, signIn, signUp } from '../../lib/auth-client';

type AuthMode = 'sign-in' | 'sign-up' | 'reset' | 'verify';

export function SignInButton({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open) emailInput.current?.focus();
  }, [open, mode]);

  function close() {
    setOpen(false);
    setPending(false);
    setError(null);
    setNotice(null);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');

    try {
      if (mode === 'reset') {
        await requestPasswordReset(email);
        setNotice('If that address has an account, a reset link is on its way.');
      } else if (mode === 'verify') {
        await resendVerification(email);
        setNotice('If that address needs verification, a new link is on its way.');
      } else if (mode === 'sign-up') {
        await signUp({
          name: String(form.get('name') ?? ''),
          email,
          password,
          registrationCode: String(form.get('registrationCode') ?? ''),
        });
        setMode('verify');
        setNotice('Account created. Check your email to verify it before signing in.');
      } else {
        await signIn({ email, password });
        close();
        onAuthenticated();
      }
    } catch (cause) {
      setError(cause instanceof AuthRequestError ? cause.message : 'Sign-in could not be completed. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button ref={trigger} className="sign-in-trigger" type="button" onClick={() => setOpen(true)}>
        <Icon icon={KeyRound} /> Sign in
      </button>
      {open ? (
        <div
          className="auth-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            ref={dialog}
            className="auth-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') close();
              if (event.key !== 'Tab') return;
              const focusable = dialog.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), input:not([disabled])',
              );
              if (!focusable?.length) return;
              const first = focusable.item(0);
              const last = focusable.item(focusable.length - 1);
              if (!first || !last) return;
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}
          >
            <div className="auth-dialog__heading">
              <span className="auth-dialog__mark"><Icon icon={KeyRound} /></span>
              <button className="icon-button" type="button" onClick={close} aria-label="Close sign-in">
                <Icon icon={X} />
              </button>
            </div>
            <h2 id="auth-title">{{ 'sign-in': 'Welcome back', 'sign-up': 'Join the private playtest', reset: 'Reset your password', verify: 'Verify your email' }[mode]}</h2>
            <p>{mode === 'sign-up' ? 'Your host will share the registration code.' : mode === 'sign-in' ? 'Return to your private tables.' : 'We will send a secure link to your account email.'}</p>

            <div className="auth-mode" aria-label="Account action">
              <button
                type="button"
                aria-pressed={mode === 'sign-in'}
                onClick={() => { setMode('sign-in'); setError(null); setNotice(null); }}
              >
                Sign in
              </button>
              <button
                type="button"
                aria-pressed={mode === 'sign-up'}
                onClick={() => { setMode('sign-up'); setError(null); setNotice(null); }}
              >
                Create account
              </button>
            </div>

            <form className="auth-form" onSubmit={submit}>
              {mode === 'sign-up' ? (
                <label>
                  <span>Display name</span>
                  <input name="name" autoComplete="nickname" maxLength={40} required />
                </label>
              ) : null}
              <label>
                <span>Email</span>
                <input ref={emailInput} name="email" type="email" autoComplete="email" required />
              </label>
              {mode === 'sign-in' || mode === 'sign-up' ? <label>
                <span>Password</span>
                <input
                  name="password"
                  type="password"
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  minLength={8}
                  maxLength={128}
                  required
                />
              </label> : null}
              {mode === 'sign-up' ? (
                <label>
                  <span>Registration code</span>
                  <input name="registrationCode" type="password" autoComplete="off" required />
                </label>
              ) : null}

              {error ? <p className="auth-error" role="alert">{error}</p> : null}
              {notice ? <p className="auth-recovery" role="status">{notice}</p> : null}
              <button className="primary-button" type="submit" disabled={pending}>
                {pending
                  ? 'Checking…'
                  : mode === 'sign-in'
                    ? 'Sign in to your club'
                    : mode === 'sign-up' ? 'Create private account' : mode === 'reset' ? 'Send reset link' : 'Send verification link'}
              </button>
            </form>
            <p className="auth-recovery">
              {mode === 'reset' || mode === 'verify' ? (
                <button type="button" onClick={() => { setMode('sign-in'); setError(null); setNotice(null); }}>Back to sign in</button>
              ) : (
                <>
                  <button type="button" onClick={() => { setMode('reset'); setError(null); setNotice(null); }}>Forgot password?</button>
                  {' · '}
                  <button type="button" onClick={() => { setMode('verify'); setError(null); setNotice(null); }}>Resend verification</button>
                </>
              )}
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}
