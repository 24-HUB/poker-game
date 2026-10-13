'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { AuthRequestError, requestPasswordReset, resendVerification, resetPassword, verifyEmail } from '../../lib/auth-client';

export function EmailCodeForm({ purpose, initialEmail = '', initialCodeSent = false, initialNotice,
  onBack }: { purpose: 'verify' | 'reset'; initialEmail?: string; initialCodeSent?: boolean; initialNotice?: string;
    onBack: (email: string, notice?: string) => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(''); const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState('');
  const [codeSent, setCodeSent] = useState(initialCodeSent);
  const [sending, setSending] = useState(false); const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState(initialNotice ?? null);
  const [remaining, setRemaining] = useState(initialCodeSent ? 60 : 0);
  const version = useRef(0); const codeInput = useRef<HTMLInputElement>(null); const emailInput = useRef<HTMLInputElement>(null);
  const hasCodeForm = purpose === 'verify' || codeSent;
  useEffect(() => { (hasCodeForm && email ? codeInput : emailInput).current?.focus(); }, [hasCodeForm]);
  useEffect(() => () => { version.current++; }, []);
  useEffect(() => {
    if (!remaining) return;
    const timer = setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  function changeEmail(value: string) {
    version.current++; setEmail(value); setCode(''); setPassword(''); setConfirmation('');
    setCodeSent(false); setRemaining(0); setSending(false); setConfirming(false); setError(null); setNotice(null);
  }
  function showError(cause: unknown) {
    const message = cause instanceof AuthRequestError ? cause.message : 'The request could not be confirmed. Try again shortly.';
    setError(message);
    if (cause instanceof AuthRequestError && cause.retryAfterSeconds) setRemaining(cause.retryAfterSeconds);
  }
  async function send() {
    if (!emailInput.current?.reportValidity() || sending || confirming) return;
    const requestVersion = version.current; setSending(true); setError(null);
    try {
      if (purpose === 'verify') await resendVerification(email); else await requestPasswordReset(email);
      if (requestVersion !== version.current) return;
      setCode(''); setCodeSent(true); setRemaining(60);
      setNotice(purpose === 'verify' ? 'If that address needs verification, a code is on its way. Use the latest email.'
        : 'If that address has an account, a reset code is on its way.');
      codeInput.current?.focus();
    } catch (cause) { if (requestVersion === version.current) showError(cause); }
    finally { if (requestVersion === version.current) setSending(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasCodeForm) { await send(); return; }
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) { setError('Enter the six-digit code from your latest email.'); return; }
    if (purpose === 'reset' && (password.length < 8 || password.length > 128)) { setError('Use a password with 8–128 characters.'); return; }
    if (purpose === 'reset' && password !== confirmation) { setError('Passwords do not match. Check the confirmation.'); return; }
    const requestVersion = version.current; setConfirming(true); setError(null);
    try {
      if (purpose === 'verify') await verifyEmail(email, trimmed); else await resetPassword(email, trimmed, password);
      if (requestVersion !== version.current) return;
      setCode(''); setPassword(''); setConfirmation('');
      onBack(email, purpose === 'verify' ? 'Email verified. Sign in with your password.' : 'Password changed. All previous sessions have been signed out.');
    } catch (cause) { if (requestVersion === version.current) showError(cause); }
    finally { if (requestVersion === version.current) setConfirming(false); }
  }
  return <>
    <p>{purpose === 'verify' ? 'Check your email. Enter the six-digit code. It expires in 10 minutes. Use the latest email if you resend.'
      : 'Reset codes expire in 10 minutes. Use the latest code. Do not share it.'}</p>
    <form className="auth-form" onSubmit={submit}>
      <label><span>Email</span><input ref={emailInput} name="email" type="email" autoComplete="email" value={email} onChange={(event) => changeEmail(event.target.value)} required /></label>
      {hasCodeForm ? <>
        <label><span>Email code</span><input ref={codeInput} name="otp" type="text" inputMode="numeric" autoComplete="one-time-code"
          value={code} onChange={(event) => setCode(event.target.value)} aria-describedby="code-help" required /></label>
        <p id="code-help" className="auth-recovery">Six digits, including any leading zeroes.</p>
        {purpose === 'reset' ? <>
          <label><span>New password</span><input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128}
            value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <label><span>Confirm new password</span><input name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128}
            value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
        </> : null}
      </> : null}
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {notice ? <p className="auth-recovery" role="status">{notice}</p> : null}
      <button className="primary-button" type="submit" disabled={sending || confirming}>
        {confirming ? 'Checking…' : sending ? 'Sending…' : !hasCodeForm ? 'Send reset code' : purpose === 'verify' ? 'Verify email' : 'Change password'}
      </button>
      {hasCodeForm ? <button type="button" onClick={() => void send()} disabled={sending || confirming || remaining > 0}>
        {sending ? 'Sending…' : remaining > 0 ? `Resend code (${remaining}s)` : 'Resend code'}
      </button> : <button type="button" onClick={() => setCodeSent(true)}>I already have a code</button>}
      <button type="button" onClick={() => { version.current++; onBack(email); }}>Back to sign in</button>
    </form>
  </>;
}
