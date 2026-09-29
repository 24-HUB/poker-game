import { GameShell } from '../components/shell/GameShell';
import { LobbyExperience } from '../features/rooms/LobbyExperience';

export default function HomePage() {
  return (
    <GameShell>
      <LobbyExperience />
    </GameShell>
  );
}
