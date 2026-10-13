'use client';

import { Club, Home, Images, Mail } from 'lucide-react';
import type { ReactNode } from 'react';
import Link from 'next/link';

import { AccountAccess } from '../../features/auth/AccountAccess';
import { Icon } from '../ui/Icon';
import { useActiveRoom } from '../../features/rooms/ActiveRoomBoundary';

export function GameShell({ children, active = 'lobby' }: { children: ReactNode; active?: 'lobby' | 'pulls' | 'collection' }) {
  const boundary = useActiveRoom();
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className={boundary?.locked ? 'app-shell app-shell--playing' : 'app-shell'}>
        <header className="topbar">
          <div className="brand" aria-label="Looking Glass Club">
            <span className="brand__mark"><Icon icon={Club} /></span>
            <span>Looking Glass <small>Club</small></span>
          </div>
          <AccountAccess />
        </header>
        {boundary?.locked ? null : <aside className="sidebar">
          <nav aria-label="Main navigation">
            <Link href="/" aria-current={active === 'lobby' ? 'page' : undefined}><Icon icon={Home} /><span>Lobby</span></Link>
            <Link href="/collection" aria-current={active === 'collection' ? 'page' : undefined}><Icon icon={Images} /><span>Collection</span></Link>
            <Link href="/pulls" aria-current={active === 'pulls' ? 'page' : undefined}><Icon icon={Mail} /><span>Cosmetic pulls</span></Link>
          </nav>
          <p>Your private<br />poker club.</p>
        </aside>}
        <main id="main-content" tabIndex={-1}>{children}</main>
      </div>
    </>
  );
}
