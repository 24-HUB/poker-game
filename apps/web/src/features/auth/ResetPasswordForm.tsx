'use client';
import { useEffect, useState } from 'react';
import { EmailCodeForm } from './EmailCodeForm';
import { SignInButton } from './SignInButton';

export function ResetPasswordForm() {
  const [legacy, setLegacy] = useState(false);
  const [signInState, setSignInState] = useState<{ email: string; notice?: string } | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('token') || params.has('error') || params.get('notice') === 'link-replaced') {
      setLegacy(true); window.history.replaceState(null, '', '/reset-password');
    }
  }, []);
  return <section className="auth-dialog" aria-labelledby="reset-title">
    <h1 id="reset-title">Reset your password</h1>
    {signInState ? <>
      {signInState.notice ? <p role="status">{signInState.notice}</p> : null}
      <SignInButton autoOpen initialEmail={signInState.email} initialNotice={signInState.notice} onAuthenticated={() => window.location.assign('/')} />
    </> : <EmailCodeForm purpose="reset" initialNotice={legacy ? 'This link has been replaced. Request a new code.' : undefined}
      key={legacy ? 'legacy' : 'current'} onBack={(email, notice) => setSignInState({ email, notice })} />}
  </section>;
}
