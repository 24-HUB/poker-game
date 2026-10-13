// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { Lobby } from './Lobby';
import { LobbyDraftProvider } from './LobbyDraftProvider';

afterEach(cleanup);
function AccessCheck() {
  const [checking, setChecking] = useState(false);
  return <><button onClick={() => setChecking(!checking)}>Toggle access check</button>
    {checking ? <p>Checking current room…</p> : <Lobby onCreate={vi.fn()} onJoin={vi.fn()} pending={false} error={null} />}</>;
}

it.each([
  ['Create Room', 'Room title', 'Friday table'],
  ['Join Room', 'Invite code', 'a'.repeat(43)],
])('preserves the %s draft through the authentication boundary remount', (action, label, value) => {
  render(<LobbyDraftProvider><AccessCheck /></LobbyDraftProvider>);
  fireEvent.click(screen.getByRole('button', { name: action }));
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Toggle access check' }));
  expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Toggle access check' }));
  expect(screen.getByLabelText(label)).toHaveValue(value);
});
