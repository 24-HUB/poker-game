import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import '../styles/tokens.css';
import { SessionProvider } from '../features/auth/SessionBoundary';
import { QueryProvider } from '../providers/QueryProvider';
import { RoomConnectionProvider } from '../features/rooms/RoomConnectionProvider';
import { LobbyDraftProvider } from '../features/rooms/LobbyDraftProvider';
import { ActiveRoomBoundary } from '../features/rooms/ActiveRoomBoundary';

export const metadata: Metadata = {
  title: 'Looking Glass Club',
  description: 'Private poker for friends.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider><SessionProvider><RoomConnectionProvider><LobbyDraftProvider><ActiveRoomBoundary>{children}</ActiveRoomBoundary></LobbyDraftProvider></RoomConnectionProvider></SessionProvider></QueryProvider>
      </body>
    </html>
  );
}
