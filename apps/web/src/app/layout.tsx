import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import '../styles/tokens.css';
import { SessionProvider } from '../features/auth/SessionBoundary';
import { QueryProvider } from '../providers/QueryProvider';
import { ActiveRoomBoundary } from '../features/rooms/ActiveRoomBoundary';

export const metadata: Metadata = {
  title: 'Looking Glass Club',
  description: 'Private poker for friends.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider><SessionProvider><ActiveRoomBoundary>{children}</ActiveRoomBoundary></SessionProvider></QueryProvider>
      </body>
    </html>
  );
}
