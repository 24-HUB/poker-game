'use client';
import { KeyRound, X } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { AuthRequestError, signIn, signUp } from '../../lib/auth-client';
import { EmailCodeForm } from './EmailCodeForm';

type AuthMode = 'sign-in' | 'sign-up' | 'reset' | 'verify';
export function SignInButton({ onAuthenticated, initialEmail = '', initialNotice, autoOpen = false }: {
  onAuthenticated: () => void; initialEmail?: string; initialNotice?: string; autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen); const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState(initialEmail); const [codeSent, setCodeSent] = useState(false);
  const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(initialNotice ?? null);
  const trigger = useRef<HTMLButtonElement>(null); const emailInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLElement>(null); const version = useRef(0);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('recovery') === 'verification') {
      setOpen(true); setMode('verify'); setNotice('This link has been replaced. Request a new code.');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);
  useEffect(() => { if (open) emailInput.current?.focus(); }, [open, mode]);
  useEffect(() => () => { version.current++; }, []);
  function changeMode(value: AuthMode) { version.current++; setMode(value); setError(null); setNotice(null); setPending(false); setCodeSent(false); }
  function close() {
    version.current++; setOpen(false); setPending(false); setError(null); setNotice(null); setCodeSent(false); setMode('sign-in');
    requestAnimationFrame(() => trigger.current?.focus());
  }
  function back(retainedEmail: string, message?: string) { changeMode('sign-in'); setEmail(retainedEmail); setNotice(message ?? null); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const requestVersion = version.current;
    setPending(true); setError(null); setNotice(null); const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    try {
      if (mode === 'sign-up') {
        await signUp({ name: String(form.get('name') ?? ''), email, password, registrationCode: String(form.get('registrationCode') ?? '') });
        if (version.current !== requestVersion) return;
        setMode('verify'); setCodeSent(true);
      } else {
        await signIn({ email, password }); if (version.current !== requestVersion) return;
        close(); onAuthenticated();
      }
    } catch (cause) {
      if (version.current !== requestVersion) return;
      if (cause instanceof AuthRequestError && cause.code === 'EMAIL_NOT_VERIFIED') { setMode('verify'); setCodeSent(false); }
      else setError(cause instanceof AuthRequestError ? cause.message : 'Sign-in could not be completed. Try again.');
    } finally { if (version.current === requestVersion) setPending(false); }
  }
  return <>
    <button ref={trigger} className="sign-in-trigger" type="button" onClick={() => setOpen(true)}><Icon icon={KeyRound} /> Sign in</button>
    {open ? <div className="auth-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section ref={dialog} className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title" onKeyDown={(event) => {
        if (event.key === 'Escape') close();
        if (event.key !== 'Tab') return;
        const elements = dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])');
        const first = elements?.item(0); const last = elements?.item(elements.length - 1);
        if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
      }}>
        <div className="auth-dialog__heading"><span className="auth-dialog__mark"><Icon icon={KeyRound} /></span>
          <button className="icon-button" type="button" onClick={close} aria-label="Close sign-in"><Icon icon={X} /></button></div>
        <h2 id="auth-title">{{ 'sign-in': 'Welcome back', 'sign-up': 'Join the private playtest', reset: 'Reset your password', verify: 'Verify your email' }[mode]}</h2>
        {mode === 'verify' || mode === 'reset' ? <EmailCodeForm key={mode} purpose={mode} initialEmail={email} initialCodeSent={codeSent}
          initialNotice={mode === 'verify' && codeSent ? 'Account created. Check your email. Enter the six-digit code.' : notice ?? undefined} onBack={back} /> : <>
          <p>{mode === 'sign-up' ? 'Your host will share the registration code.' : 'Return to your private tables.'}</p>
          <div className="auth-mode" aria-label="Account action">
            <button type="button" aria-pressed={mode === 'sign-in'} onClick={() => changeMode('sign-in')}>Sign in</button>
            <button type="button" aria-pressed={mode === 'sign-up'} onClick={() => changeMode('sign-up')}>Create account</button></div>
          <form key={mode} className="auth-form" onSubmit={submit}>
            {mode === 'sign-up' ? <label><span>Display name</span><input name="name" autoComplete="nickname" maxLength={40} required /></label> : null}
            <label><span>Email</span><input ref={emailInput} name="email" type="email" autoComplete="email" value={email} onChange={(event) => { version.current++; setEmail(event.target.value); setPending(false); }} required /></label>
            <label><span>Password</span><input name="password" type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} maxLength={128} required /></label>
            {mode === 'sign-up' ? <label><span>Registration code</span><input name="registrationCode" type="password" autoComplete="off" required /></label> : null}
            {error ? <p className="auth-error" role="alert">{error}</p> : null}{notice ? <p className="auth-recovery" role="status">{notice}</p> : null}
            <button className="primary-button" type="submit" disabled={pending}>{pending ? 'Checking…' : mode === 'sign-in' ? 'Sign in to your club' : 'Create private account'}</button>
          </form>
          <p className="auth-recovery"><button type="button" onClick={() => changeMode('reset')}>Forgot password?</button>{' · '}
            <button type="button" onClick={() => changeMode('verify')}>Resend verification</button></p>
        </>}
      </section>
    </div> : null}
  </>;
}
