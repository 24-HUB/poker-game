import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import '../styles/tokens.css';

export const metadata: Metadata = {
  title: 'Looking Glass Club',
  description: 'Private poker for friends.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
