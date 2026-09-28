import { GameShell } from '../../../components/shell/GameShell';
import { SessionBoundary } from '../../../features/auth/SessionBoundary';
import { RoomExperience } from '../../../features/rooms/RoomExperience';

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return (
    <GameShell>
      <SessionBoundary>
        <RoomExperience roomId={roomId} />
      </SessionBoundary>
    </GameShell>
  );
}
