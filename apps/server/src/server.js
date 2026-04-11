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

// Parse CORS origins from env or fall back to localhost dev defaults
const CORS_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:5174'];

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CORS_ORIGINS,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Middleware
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ─── In-memory stores ────────────────────────────────────────────────────────
const usersStore    = new Map();   // email  → user object
const sessionsStore = new Map();   // token  → userId
const lobbyRooms    = new Map();   // id     → room metadata

function genId()    { return Math.random().toString(36).substr(2, 12); }
function genToken() { return genId() + genId(); }

/** Parse 'session_token' from Cookie header */
function getTokenFromReq(req) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === 'session_token') return decodeURIComponent(v);
  }
  return null;
}

function getUserFromReq(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  const userId = sessionsStore.get(token);
  if (!userId) return null;
  return [...usersStore.values()].find(u => u.id === userId) || null;
}

// ─── Auth endpoints ─────────────────────────────────────────────────────────

app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'Missing fields' } });

  if (usersStore.has(email))
    return res.status(400).json({ error: { code: 'USER_EXISTS', message: 'User already exists' } });

  const user = { id: genId(), username, email, chips: 1000, avatarUrl: null };
  usersStore.set(email, user);

  const token = genToken();
  sessionsStore.set(token, user.id);
  res.cookie('session_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ user, session: { token } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = usersStore.get(email);
  // For dev: accept any password as long as user exists
  // If user doesn't exist yet, auto-create for convenience
  if (!user) {
    const autoUser = { id: genId(), username: email.split('@')[0], email, chips: 1000, avatarUrl: null };
    usersStore.set(email, autoUser);
    const token = genToken();
    sessionsStore.set(token, autoUser.id);
    res.cookie('session_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
    return res.json({ user: autoUser, session: { token } });
  }
  const token = genToken();
  sessionsStore.set(token, user.id);
  res.cookie('session_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ user, session: { token } });
});

app.post('/api/auth/logout', (req, res) => {
  const token = getTokenFromReq(req);
  if (token) sessionsStore.delete(token);
  res.clearCookie('session_token');
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = getUserFromReq(req);
  if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
  res.json({ user });
});

// ─── Rooms endpoints ─────────────────────────────────────────────────────────

app.get('/api/rooms', (req, res) => {
  const waiting = [...lobbyRooms.values()].filter(r => r.status === 'waiting');
  res.json(waiting);
});

app.post('/api/rooms', (req, res) => {
  const user = getUserFromReq(req);
  if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
  const { name, maxPlayers = 6, minBet = 10 } = req.body;
  if (!name || name.length < 3)
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'Room name must be at least 3 characters' } });
  const room = {
    id: genId(),
    name,
    hostId: user.id,
    maxPlayers,
    minBet,
    status: 'waiting',
    playerCount: 0,
    createdAt: new Date().toISOString(),
  };
  lobbyRooms.set(room.id, room);
  res.json(room);
});

app.get('/api/rooms/:id', (req, res) => {
  const room = lobbyRooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Room not found' } });
  res.json(room);
});

app.delete('/api/rooms/:id', (req, res) => {
  const user = getUserFromReq(req);
  if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
  const room = lobbyRooms.get(req.params.id);
  if (!room) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Room not found' } });
  if (room.hostId !== user.id)
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the host can delete this room' } });
  lobbyRooms.delete(req.params.id);
  res.json({ success: true });
});

// ─── In-memory game state keyed by roomId ────────────────────────────────────
// rooms[roomId] = { engine, state, readySet: Set, socketMap, dealerIndex, roundNumber }
const rooms = new Map();

function getPublicState(state) {
  return {
    ...state,
    players: state.players.map(p => ({ ...p, cards: [] })),
  };
}

// Socket.IO connection
io.on('connection', (socket) => {
  // Accept both auth formats:
  //   1. { userId, username }  — from real login (GamePage.tsx)
  //   2. { mockUser: {...} }   — legacy dev format
  const auth = socket.handshake.auth || {};
  let user;
  if (auth.mockUser) {
    user = auth.mockUser;
  } else if (auth.userId) {
    // Look up real user from sessions store, fall back to the provided fields
    const found = [...usersStore.values()].find(u => u.id === auth.userId);
    user = found || { id: auth.userId, username: auth.username || `Player_${auth.userId.slice(0, 5)}`, chips: auth.chips || 1000 };
  }
  // Final fallback — guest with stable socket id
  if (!user) user = { id: socket.id, username: `Guest_${socket.id.slice(0, 5)}`, chips: 1000 };
  socket.data.user = user;

  console.log(`User connected: ${user.username} (${socket.id})`);

  // ── room:join ──────────────────────────────────────────────────────────────
  socket.on('room:join', (roomId) => {
    socket.join(roomId);
    socket.data.roomId = roomId;

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        engine: null,
        state: null,
        readySet: new Set(),
        socketMap: new Map(),
        dealerIndex: 0,
        roundNumber: 0,
      });
    }
    const room = rooms.get(roomId);
    room.socketMap.set(user.id, socket.id);

    // If reconnecting mid-game, send current public state + private cards
    if (room.state) {
      socket.emit('game:stateUpdate', getPublicState(room.state));
      const privateCards = room.state.players.find(p => p.id === user.id)?.cards ?? [];
      if (privateCards.length) socket.emit('game:yourCards', privateCards);
    }

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
      // Build player list from the ready set, using chips from last game state if available
      const socketsInRoom = await io.in(roomId).fetchSockets();
      const socketByUserId = new Map(socketsInRoom.map(s => [s.data.user?.id, s]));
      const players = [...room.readySet]
        .map(uid => {
          const s = socketByUserId.get(uid);
          if (!s) return null;
          // Use socket.data.user.chips which is updated after each round
          return { id: s.data.user.id, username: s.data.user.username, chips: s.data.user.chips ?? 1000 };
        })
        .filter(p => p && p.chips > 0); // exclude players who are broke

      if (players.length < 2) return;

      // Guard against double-start from React StrictMode double-mount.
      const sessionKey = players.map(p => p.id).sort().join(',');
      if (room.currentSessionKey === sessionKey && room.state && room.state.phase !== 'showdown') {
        return;
      }
      room.currentSessionKey = sessionKey;

      const engine = new GameEngine(players, 10, 20);
      const state = engine.startGame(room.dealerIndex);
      room.engine = engine;
      room.state = state;
      room.roundNumber = (room.roundNumber || 0) + 1;
      room.readySet.clear();

      console.log(`Game started in room ${roomId} with ${players.length} players`);

      // Update lobby room status
      if (lobbyRooms.has(roomId)) {
        lobbyRooms.get(roomId).status = 'playing';
      }

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

        // ── Persist updated chips into socket.data so next round uses correct values ──
        const socketsInRoom = await io.in(roomId).fetchSockets();
        const chipUpdates = {};
        for (const p of newState.players) {
          // newState.players already have chips deducted by bets but payout must be added
          const payout = winners.find(w => w.playerId === p.id)?.amount ?? 0;
          const finalChips = p.chips + payout;
          chipUpdates[p.id] = finalChips;
          // Update the connected socket's user object
          const s = socketsInRoom.find(s => s.data.user?.id === p.id);
          if (s) s.data.user.chips = finalChips;
        }

        // Rotate dealer for next round
        room.dealerIndex = (room.dealerIndex + 1) % newState.players.length;

        io.to(roomId).emit('game:ended', { winners, handDescriptions, chipUpdates });
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

// ─── Gacha Data ───────────────────────────────────────────────────────────────

const GACHA_ITEMS = [
  // R rarity — card skins
  { id: 'r001', name: 'Classic Red', type: 'card_skin', rarity: 'R', imageUrl: '/assets/gacha/r001.png', description: 'A clean crimson card back.' },
  { id: 'r002', name: 'Ocean Blue', type: 'card_skin', rarity: 'R', imageUrl: '/assets/gacha/r002.png', description: 'Deep sea inspired design.' },
  { id: 'r003', name: 'Forest Night', type: 'card_skin', rarity: 'R', imageUrl: '/assets/gacha/r003.png', description: 'Dark emerald card back.' },
  { id: 'r004', name: 'Starfall', type: 'card_skin', rarity: 'R', imageUrl: '/assets/gacha/r004.png', description: 'Night sky with falling stars.' },
  { id: 'r005', name: 'Sandstorm', type: 'card_skin', rarity: 'R', imageUrl: '/assets/gacha/r005.png', description: 'Desert dunes in gold.' },
  // SR rarity — avatars
  { id: 'sr001', name: 'Kitsune Miko', type: 'avatar', rarity: 'SR', imageUrl: '/assets/gacha/sr001.png', description: 'Fox shrine maiden with silver ears.' },
  { id: 'sr002', name: 'Shadow Assassin', type: 'avatar', rarity: 'SR', imageUrl: '/assets/gacha/sr002.png', description: 'Masked figure with dark cape.' },
  { id: 'sr003', name: 'Sunlit Idol', type: 'avatar', rarity: 'SR', imageUrl: '/assets/gacha/sr003.png', description: 'Radiant idol in golden outfit.' },
  { id: 'sr004', name: 'Thunder Ronin', type: 'avatar', rarity: 'SR', imageUrl: '/assets/gacha/sr004.png', description: 'Storm-wielding samurai.' },
  // SSR rarity — table themes + rare avatars
  { id: 'ssr001', name: 'Celestial Dragon', type: 'table_theme', rarity: 'SSR', imageUrl: '/assets/gacha/ssr001.png', description: 'Legendary dragon felt with starlight chips.' },
  { id: 'ssr002', name: 'Void Phoenix', type: 'avatar', rarity: 'SSR', imageUrl: '/assets/gacha/ssr002.png', description: 'A reborn phoenix emerging from the void.' },
  { id: 'ssr003', name: 'Sakura Storm', type: 'table_theme', rarity: 'SSR', imageUrl: '/assets/gacha/ssr003.png', description: 'Cherry blossom petals swirl around the table.' },
];

// Pull rates: R=85%, SR=12%, SSR=3%
const RATES = { R: 0.85, SR: 0.12, SSR: 0.03 };
const PITY_SR  = 10;   // guaranteed SR+ at 10 pulls
const PITY_SSR = 90;   // guaranteed SSR  at 90 pulls
const SINGLE_COST = 150;
const TEN_COST    = 1350;

// userGacha: userId -> { collection: Set<itemId>, pityCountSR, pityCountSSR }
const userGacha = new Map();

function getOrInitGacha(userId) {
  if (!userGacha.has(userId)) {
    userGacha.set(userId, { collection: new Set(), pityCountSR: 0, pityCountSSR: 0 });
  }
  return userGacha.get(userId);
}

function rollRarity(pityCountSR, pityCountSSR) {
  if (pityCountSSR >= PITY_SSR - 1) return 'SSR';
  if (pityCountSR  >= PITY_SR  - 1) return 'SR';
  const r = Math.random();
  if (r < RATES.SSR) return 'SSR';
  if (r < RATES.SSR + RATES.SR) return 'SR';
  return 'R';
}

function pickItem(rarity, ownedIds) {
  const pool = GACHA_ITEMS.filter(i => i.rarity === rarity);
  // For SSR: no dupe until full pool collected
  if (rarity === 'SSR') {
    const unowned = pool.filter(i => !ownedIds.has(i.id));
    if (unowned.length > 0) return unowned[Math.floor(Math.random() * unowned.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function doPull(userId, count) {
  const user = [...usersStore.values()].find(u => u.id === userId);
  if (!user) return { error: 'User not found' };

  const cost = count === 10 ? TEN_COST : SINGLE_COST;
  if ((user.chips || 0) < cost) return { error: 'Not enough chips' };

  user.chips = (user.chips || 0) - cost;

  const gacha = getOrInitGacha(userId);
  const results = [];

  for (let i = 0; i < count; i++) {
    const rarity = rollRarity(gacha.pityCountSR, gacha.pityCountSSR);

    if (rarity === 'SSR') {
      gacha.pityCountSR  = 0;
      gacha.pityCountSSR = 0;
    } else if (rarity === 'SR') {
      gacha.pityCountSR  = 0;
      gacha.pityCountSSR += 1;
    } else {
      gacha.pityCountSR  += 1;
      gacha.pityCountSSR += 1;
    }

    const item = pickItem(rarity, gacha.collection);
    gacha.collection.add(item.id);
    results.push({ ...item, isNew: true }); // mark all as new for now
  }

  return { results, chips: user.chips };
}

// ─── Gacha REST endpoints ─────────────────────────────────────────────────────

app.get('/api/gacha/banners', (_req, res) => {
  res.json([
    {
      id: 'standard',
      name: 'Standard Banner',
      description: 'All items available. Pity resets every 90 pulls.',
      featuredItem: GACHA_ITEMS.find(i => i.rarity === 'SSR'),
      rates: RATES,
    }
  ]);
});

app.get('/api/gacha/rates/:bannerId', (_req, res) => {
  res.json({ rates: RATES, pitySR: PITY_SR, pitySSR: PITY_SSR, singleCost: SINGLE_COST, tenCost: TEN_COST });
});

app.post('/api/gacha/pull', (req, res) => {
  const user = getUserFromReq(req);
  if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });

  const count = req.body?.count === 10 ? 10 : 1;
  const outcome = doPull(user.id, count);

  if (outcome.error) {
    return res.status(400).json({ error: { code: 'GACHA_ERROR', message: outcome.error } });
  }

  return res.json({ items: outcome.results, chips: outcome.chips });
});

// ─── Collection endpoints ─────────────────────────────────────────────────────

app.get('/api/collection', (req, res) => {
  const user = getUserFromReq(req);
  if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });

  const gacha = getOrInitGacha(user.id);
  const items = [...gacha.collection].map(id => GACHA_ITEMS.find(i => i.id === id)).filter(Boolean);
  return res.json({ items });
});


