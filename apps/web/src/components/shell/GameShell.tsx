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
        {boundary?.locked ? <aside className="active-room-navigation">
          <details><summary>Leave table to navigate</summary>
            <p>Leave the room to visit another destination. Your session seat follows the room’s leave rules.</p>
            <nav aria-label="Main navigation">
              <button type="button" onClick={() => boundary.navigate('/')}>Lobby</button>
              <button type="button" onClick={() => boundary.navigate('/collection')}>Collection</button>
              <button type="button" onClick={() => boundary.navigate('/pulls')}>Pulls</button>
            </nav>
          </details>
        </aside> : <aside className="sidebar">
          <nav aria-label="Main navigation">
            <Link href="/" aria-current={active === 'lobby' ? 'page' : undefined}><Icon icon={Home} /><span>Lobby</span></Link>
            <Link href="/collection" aria-current={active === 'collection' ? 'page' : undefined}><Icon icon={Images} /><span>Collection</span></Link>
            <Link href="/pulls" aria-current={active === 'pulls' ? 'page' : undefined}><Icon icon={Mail} /><span>Invitations</span></Link>
          </nav>
          <p>Your private<br />poker club.</p>
        </aside>}
        <main id="main-content" tabIndex={-1}>{children}</main>
      </div>
    </>
  );
}
