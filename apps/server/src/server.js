import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { GameEngine } from '../../../packages/shared/src/game/engine.ts';

const HAND_NAMES = {
  1: 'High Card', 2: 'One Pair', 3: 'Two Pair', 4: 'Three of a Kind',
  5: 'Straight', 6: 'Flush', 7: 'Full House', 8: 'Four of a Kind',
  9: 'Straight Flush', 10: 'Royal Flush',
};

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mock auth endpoints
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  res.json({
    user: {
      id: Math.random().toString(36).substr(2, 9),
      username,
      email,
      chips: 1000,
    },
    session: { token: 'mock_token' },
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  res.json({
    user: {
      id: 'player1',
      username: 'TestPlayer',
      email,
      chips: 1000,
    },
    session: { token: 'mock_token' },
  });
});

// ─── In-memory game state keyed by roomId ────────────────────────────────────
// rooms[roomId] = { engine, state, readySet: Set, socketMap: Map<userId, socketId> }
const rooms = new Map();

function getPublicState(state) {
  return {
    ...state,
    players: state.players.map(p => ({ ...p, cards: [] })),
  };
}

// Socket.IO connection
io.on('connection', (socket) => {
  // Extract mock user from auth payload
  const mockUser = socket.handshake.auth?.mockUser;
  if (!mockUser) {
    console.log(`Client ${socket.id} connected without mockUser, assigning guest`);
  }
  const user = mockUser || { id: socket.id, username: `Guest_${socket.id.slice(0, 5)}`, chips: 1000 };
  socket.data.user = user;

  console.log(`User connected: ${user.username} (${socket.id})`);

  // ── room:join ──────────────────────────────────────────────────────────────
  socket.on('room:join', (roomId) => {
    socket.join(roomId);
    socket.data.roomId = roomId;

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { engine: null, state: null, readySet: new Set(), socketMap: new Map() });
    }
    const room = rooms.get(roomId);
    room.socketMap.set(user.id, socket.id);

    console.log(`${user.username} joined room ${roomId}`);
  });

  // ── room:ready ─────────────────────────────────────────────────────────────
  socket.on('room:ready', async () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    room.readySet.add(user.id);

    if (room.readySet.size >= 2) {
      // Build player list from the ready set (ignores stale/extra sockets in room)
      const socketsInRoom = await io.in(roomId).fetchSockets();
      const socketByUserId = new Map(socketsInRoom.map(s => [s.data.user?.id, s]));
      const players = [...room.readySet]
        .map(uid => {
          const s = socketByUserId.get(uid);
          return s ? { id: s.data.user.id, username: s.data.user.username, chips: s.data.user.chips ?? 1000 } : null;
        })
        .filter(Boolean);

      if (players.length < 2) return;

      // Guard against double-start from React StrictMode double-mount.
      const sessionKey = players.map(p => p.id).sort().join(',');
      if (room.currentSessionKey === sessionKey && room.state && room.state.phase !== 'showdown') {
        return;
      }
      room.currentSessionKey = sessionKey;

      const engine = new GameEngine(players, 10, 20);
      const state = engine.startGame();
      room.engine = engine;
      room.state = state;
      room.readySet.clear();

      console.log(`Game started in room ${roomId} with ${players.length} players`);

      io.to(roomId).emit('game:started');
      io.to(roomId).emit('game:stateUpdate', getPublicState(state));

      // Send private hole cards to each player
      for (const s of socketsInRoom) {
        const pid = s.data.user.id;
        const privateCards = state.players.find(p => p.id === pid)?.cards ?? [];
        s.emit('game:yourCards', privateCards);
      }

      if (state.activePlayerId) {
        io.to(roomId).emit('game:playerTurn', state.activePlayerId, 30000);
      }
    }
  });

  // ── game:action ────────────────────────────────────────────────────────────
  socket.on('game:action', (action) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room || !room.engine || !room.state) return;

    try {
      room.state = room.engine.applyAction(room.state, user.id, action);
      const newState = room.state;

      if (newState.phase === 'showdown') {
        // Always emit the showdown state first (reveals all hole cards to clients)
        io.to(roomId).emit('game:stateUpdate', newState);

        let winners = [];
        const handDescriptions = {};
        try {
          const result = room.engine.resolveShowdown(newState);
          if (result) {
            winners = Array.from(result.payouts.entries()).map(([playerId, amount]) => ({ playerId, amount }));
            for (const [pid, hr] of result.handResults.entries()) {
              handDescriptions[pid] = HAND_NAMES[hr.rank] ?? 'Unknown';
            }
          }
        } catch (resolveErr) {
          console.error(`Resolve error: ${resolveErr.message}`);
          // Fallback: last non-folded player wins the pot
          const lastStanding = newState.players.find(p => p.status !== 'folded');
          if (lastStanding) winners = [{ playerId: lastStanding.id, amount: newState.pot }];
        }

        io.to(roomId).emit('game:ended', { winners, handDescriptions });
        room.engine = null;
        room.state = null;
        return;
      }

      io.to(roomId).emit('game:stateUpdate', getPublicState(newState));

      if (newState.activePlayerId) {
        io.to(roomId).emit('game:playerTurn', newState.activePlayerId, 30000);
      }
    } catch (err) {
      console.error(`Action error: ${err.message}`);
      socket.emit('game:error', err.message);
    }
  });

  // ── game:chat ───────────────────────────────────────────────────────────────
  socket.on('game:chat', (message) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    io.to(roomId).emit('game:chatMessage', user.id, user.username, message);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${user.username}`);
    const roomId = socket.data.roomId;
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) room.socketMap.delete(user.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`✅ Poker Backend running on port ${PORT}`);
  console.log(`✅ Socket.IO ready at ws://localhost:${PORT}`);
  console.log(`✅ API endpoints ready`);
});

