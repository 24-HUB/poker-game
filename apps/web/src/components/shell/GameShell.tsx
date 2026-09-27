import { Club, Home } from 'lucide-react';
import type { ReactNode } from 'react';

import { Icon } from '../ui/Icon';

export function GameShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand" aria-label="Looking Glass Club">
            <span className="brand__mark"><Icon icon={Club} /></span>
            <span>Looking Glass <small>Club</small></span>
          </div>
          <span className="access-badge">Private playtest</span>
        </header>
        <aside className="sidebar">
          <nav aria-label="Main navigation">
            <a href="#main-content" aria-current="page"><Icon icon={Home} /><span>Lobby</span></a>
          </nav>
          <p>Your private<br />poker club.</p>
        </aside>
        <main id="main-content" tabIndex={-1}>{children}</main>
      </div>
    </>
  );
}
