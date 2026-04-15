import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { createHash } from 'crypto';
import { GameEngine } from '../../../packages/shared/src/game/engine.ts';
import { initDb } from './db/init.ts';
import { db } from './db/index.ts';
import {
  users,
  sessions,
  rooms as roomsTable,
  gachaItems as gachaItemsTable,
  userCollection,
  gameHistory as gameHistoryTable,
} from './db/schema.ts';
import { eq, and, gt, desc, sql } from 'drizzle-orm';

const HAND_NAMES = {
  1: 'High Card', 2: 'One Pair', 3: 'Two Pair', 4: 'Three of a Kind',
  5: 'Straight', 6: 'Flush', 7: 'Full House', 8: 'Four of a Kind',
  9: 'Straight Flush', 10: 'Royal Flush',
};

const CORS_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://localhost:5174'];

const GACHA_ITEMS = [
  { id: 'r001',   name: 'Classic Red',      type: 'card_skin',   rarity: 'R',   imageUrl: '/assets/gacha/r001.png',  description: 'A clean crimson card back.' },
  { id: 'r002',   name: 'Ocean Blue',       type: 'card_skin',   rarity: 'R',   imageUrl: '/assets/gacha/r002.png',  description: 'Deep sea inspired design.' },
  { id: 'r003',   name: 'Forest Night',     type: 'card_skin',   rarity: 'R',   imageUrl: '/assets/gacha/r003.png',  description: 'Dark emerald card back.' },
  { id: 'r004',   name: 'Starfall',         type: 'card_skin',   rarity: 'R',   imageUrl: '/assets/gacha/r004.png',  description: 'Night sky with falling stars.' },
  { id: 'r005',   name: 'Sandstorm',        type: 'card_skin',   rarity: 'R',   imageUrl: '/assets/gacha/r005.png',  description: 'Desert dunes in gold.' },
  { id: 'sr001',  name: 'Kitsune Miko',     type: 'avatar',      rarity: 'SR',  imageUrl: '/assets/gacha/sr001.png', description: 'Fox shrine maiden with silver ears.' },
  { id: 'sr002',  name: 'Shadow Assassin',  type: 'avatar',      rarity: 'SR',  imageUrl: '/assets/gacha/sr002.png', description: 'Masked figure with dark cape.' },
  { id: 'sr003',  name: 'Sunlit Idol',      type: 'avatar',      rarity: 'SR',  imageUrl: '/assets/gacha/sr003.png', description: 'Radiant idol in golden outfit.' },
  { id: 'sr004',  name: 'Thunder Ronin',    type: 'avatar',      rarity: 'SR',  imageUrl: '/assets/gacha/sr004.png', description: 'Storm-wielding samurai.' },
  { id: 'ssr001', name: 'Celestial Dragon', type: 'table_theme', rarity: 'SSR', imageUrl: '/assets/gacha/ssr001.png',description: 'Legendary dragon felt with starlight chips.' },
  { id: 'ssr002', name: 'Void Phoenix',     type: 'avatar',      rarity: 'SSR', imageUrl: '/assets/gacha/ssr002.png',description: 'A reborn phoenix emerging from the void.' },
  { id: 'ssr003', name: 'Sakura Storm',     type: 'table_theme', rarity: 'SSR', imageUrl: '/assets/gacha/ssr003.png',description: 'Cherry blossom petals swirl around the table.' },
];

const RATES       = { R: 0.85, SR: 0.12, SSR: 0.03 };
const PITY_SR     = 10;
const PITY_SSR    = 90;
const SINGLE_COST = 150;
const TEN_COST    = 1350;

const app        = express();
const httpServer = createServer(app);
const io         = new SocketIOServer(httpServer, {
  cors: { origin: CORS_ORIGINS, credentials: true },
  transports: ['websocket', 'polling'],
});
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

function genId()    { return Math.random().toString(36).substring(2, 14); }
function genToken() { return genId() + genId(); }
const hashPassword = (pass) =>
  createHash('sha256').update(pass + 'poker-gacha-dev-salt').digest('hex');

function getTokenFromReq(req) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, v] = part.trim().split('=');
    if (k === 'session_token') return decodeURIComponent(v ?? '');
  }
  return null;
}

async function getUserFromReq(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  const [session] = await db.select().from(sessions)
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!session) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user ?? null;
}

const gameRooms = new Map();

function getPublicState(state) {
  return { ...state, players: state.players.map(p => ({ ...p, cards: [] })) };
}

async function seedGachaItems() {
  for (const item of GACHA_ITEMS) {
    await db.insert(gachaItemsTable).values(item).onConflictDoNothing();
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'Missing fields' } });
    if (username.length < 3)
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'Username must be at least 3 characters' } });
    if (password.length < 6)
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'Password must be at least 6 characters' } });
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0)
      return res.status(409).json({ error: { code: 'USER_EXISTS', message: 'User already exists' } });
    const existingUsername = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (existingUsername.length > 0)
      return res.status(409).json({ error: { code: 'USER_EXISTS', message: 'Username already taken' } });
    const [user] = await db.insert(users)
      .values({ username, email, passwordHash: hashPassword(password) })
      .returning();
    const token = genToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    await db.insert(sessions).values({ id: genId(), token, userId: user.id, expiresAt });
    res.cookie('session_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
    const { passwordHash: _ph, ...safeUser } = user;
    res.json({ user: safeUser, session: { token } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.passwordHash !== hashPassword(password))
      return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    const token = genToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    await db.insert(sessions).values({ id: genId(), token, userId: user.id, expiresAt });
    res.cookie('session_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
    const { passwordHash: _ph, ...safeUser } = user;
    res.json({ user: safeUser, session: { token } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = getTokenFromReq(req);
    if (token) await db.delete(sessions).where(eq(sessions.token, token));
  } catch { /* best-effort */ }
  res.clearCookie('session_token');
  res.json({ success: true });
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    let dailyReward = null;
    const today = new Date().toLocaleDateString('en-CA');
    if (user.lastDailyReward !== today) {
      await db.update(users)
        .set({ chips: user.chips + 200, lastDailyReward: today })
        .where(eq(users.id, user.id));
      user.chips += 200;
      dailyReward = { chips: 200 };
    }
    const { passwordHash: _ph, ...safeUser } = user;
    res.json({ user: safeUser, dailyReward });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

// ─── Rooms ────────────────────────────────────────────────────────────────────

app.get('/api/rooms', async (_req, res) => {
  try {
    const waiting = await db.select().from(roomsTable).where(eq(roomsTable.status, 'waiting'));
    res.json(waiting.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      playerCount: gameRooms.get(r.id)?.socketMap.size ?? 0,
    })));
  } catch (err) {
    console.error('Rooms list error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    const { name, maxPlayers = 6, minBet = 10 } = req.body;
    if (!name || name.length < 3)
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'Room name must be at least 3 characters' } });
    const [room] = await db.insert(roomsTable)
      .values({ name, hostId: user.id, maxPlayers, minBet })
      .returning();
    res.json({ ...room, createdAt: room.createdAt.toISOString(), playerCount: 0 });
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

app.get('/api/rooms/:id', async (req, res) => {
  try {
    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, req.params.id)).limit(1);
    if (!room) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Room not found' } });
    res.json({ ...room, createdAt: room.createdAt.toISOString() });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, req.params.id)).limit(1);
    if (!room) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Room not found' } });
    if (room.hostId !== user.id)
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the host can delete this room' } });
    await db.delete(roomsTable).where(eq(roomsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────

io.on('connection', async (socket) => {
  const auth = socket.handshake.auth || {};
  let user;
  if (auth.mockUser) {
    user = auth.mockUser;
  } else if (auth.userId) {
    const [found] = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);
    user = found ?? { id: auth.userId, username: auth.username || 'Player_' + auth.userId.slice(0, 5), chips: auth.chips || 1000 };
  }
  if (!user) user = { id: socket.id, username: 'Guest_' + socket.id.slice(0, 5), chips: 1000 };
  socket.data.user = user;
  console.log('Connected:', user.username, '(' + socket.id + ')');

  socket.on('room:join', async (roomId) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, { engine: null, state: null, readySet: new Set(), socketMap: new Map(), dealerIndex: 0, roundNumber: 0 });
    }
    const room = gameRooms.get(roomId);
    room.socketMap.set(user.id, socket.id);
    if (room.state) {
      socket.emit('game:stateUpdate', getPublicState(room.state));
      const privateCards = room.state.players.find(p => p.id === user.id)?.cards ?? [];
      if (privateCards.length) socket.emit('game:yourCards', privateCards);
    }
    // Broadcast updated waiting room player list to everyone in the room
    const socketsInRoom = await io.in(roomId).fetchSockets();
    const waitingPlayers = socketsInRoom
      .map(s => ({ id: s.data.user?.id, username: s.data.user?.username, chips: s.data.user?.chips ?? 1000 }))
      .filter(p => p.id);
    io.to(roomId).emit('room:updated', waitingPlayers);
    console.log(user.username, 'joined room', roomId);
  });

  socket.on('room:ready', async () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = gameRooms.get(roomId);
    if (!room) return;
    room.readySet.add(user.id);
    if (room.readySet.size >= 2) {
      const socketsInRoom = await io.in(roomId).fetchSockets();
      const socketByUserId = new Map(socketsInRoom.map(s => [s.data.user?.id, s]));
      const players = [...room.readySet]
        .map(uid => {
          const s = socketByUserId.get(uid);
          if (!s) return null;
          return { id: s.data.user.id, username: s.data.user.username, chips: s.data.user.chips ?? 1000 };
        })
        .filter(p => p && p.chips > 0);
      if (players.length < 2) return;
      const sessionKey = players.map(p => p.id).sort().join(',');
      if (room.currentSessionKey === sessionKey && room.state && room.state.phase !== 'showdown') return;
      room.currentSessionKey = sessionKey;
      const engine = new GameEngine(players, 10, 20);
      const state  = engine.startGame(room.dealerIndex);
      room.engine  = engine;
      room.state   = state;
      room.roundNumber = (room.roundNumber || 0) + 1;
      room.readySet.clear();
      await db.update(roomsTable).set({ status: 'playing' }).where(eq(roomsTable.id, roomId)).catch(() => {});
      console.log('Game started in room', roomId, 'with', players.length, 'players');
      io.to(roomId).emit('game:started');
      io.to(roomId).emit('game:stateUpdate', getPublicState(state));
      for (const s of socketsInRoom) {
        const pid = s.data.user.id;
        const privateCards = state.players.find(p => p.id === pid)?.cards ?? [];
        s.emit('game:yourCards', privateCards);
      }
      if (state.activePlayerId) io.to(roomId).emit('game:playerTurn', state.activePlayerId, 30000);
    }
  });

  socket.on('game:action', async (action) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = gameRooms.get(roomId);
    if (!room || !room.engine || !room.state) return;
    try {
      room.state = room.engine.applyAction(room.state, user.id, action);
      const newState = room.state;
      if (newState.phase === 'showdown') {
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
          console.error('Resolve error:', resolveErr.message);
          const lastStanding = newState.players.find(p => p.status !== 'folded');
          if (lastStanding) winners = [{ playerId: lastStanding.id, amount: newState.pot }];
        }
        const socketsInRoom = await io.in(roomId).fetchSockets();
        const chipUpdates   = {};
        for (const p of newState.players) {
          const payout      = winners.find(w => w.playerId === p.id)?.amount ?? 0;
          const finalChips  = p.chips + payout;
          chipUpdates[p.id] = finalChips;
          const s = socketsInRoom.find(s => s.data.user?.id === p.id);
          if (s) s.data.user.chips = finalChips;
          // Fetch current DB user stats, then persist updated values
          db.select({ handsPlayed: users.handsPlayed, wins: users.wins })
            .from(users).where(eq(users.id, p.id)).limit(1)
            .then(([dbUser]) => {
              if (!dbUser) return;
              const isWinner = payout > 0;
              return db.update(users).set({
                chips: finalChips,
                handsPlayed: dbUser.handsPlayed + 1,
                ...(isWinner ? { wins: dbUser.wins + 1 } : {}),
              }).where(eq(users.id, p.id));
            })
            .catch(err => console.error('Chip update error:', err));
        }
        room.dealerIndex = (room.dealerIndex + 1) % newState.players.length;
        io.to(roomId).emit('game:ended', { winners, handDescriptions, chipUpdates });
        db.insert(gameHistoryTable).values({
          roomId,
          roundNumber: room.roundNumber,
          pot: newState.pot,
          winners,
          playerSummary: newState.players.map(p => ({
            id: p.id,
            username: p.username ?? p.id,
            finalChips: chipUpdates[p.id] ?? p.chips,
            status: p.status,
          })),
          handDescriptions,
        }).catch(err => console.error('History save error:', err));
        await db.update(roomsTable).set({ status: 'waiting' }).where(eq(roomsTable.id, roomId)).catch(() => {});
        room.engine = null;
        room.state  = null;
        return;
      }
      io.to(roomId).emit('game:stateUpdate', getPublicState(newState));
      if (newState.activePlayerId) io.to(roomId).emit('game:playerTurn', newState.activePlayerId, 30000);
    } catch (err) {
      console.error('Action error:', err.message);
      socket.emit('game:error', err.message);
    }
  });

  socket.on('game:chat', (message) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    io.to(roomId).emit('game:chatMessage', user.id, user.username, message);
  });

  socket.on('room:leave', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.leave(roomId);
    const room = gameRooms.get(roomId);
    if (room) room.socketMap.delete(user.id);
    socket.data.roomId = null;
    // Broadcast updated player list
    io.in(roomId).fetchSockets().then(sockets => {
      const waitingPlayers = sockets
        .map(s => ({ id: s.data.user?.id, username: s.data.user?.username, chips: s.data.user?.chips ?? 1000 }))
        .filter(p => p.id);
      io.to(roomId).emit('room:updated', waitingPlayers);
    });
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', user.username);
    const roomId = socket.data.roomId;
    if (roomId) {
      const room = gameRooms.get(roomId);
      if (room) room.socketMap.delete(user.id);
      // Broadcast updated player list after disconnect
      io.in(roomId).fetchSockets().then(sockets => {
        const waitingPlayers = sockets
          .map(s => ({ id: s.data.user?.id, username: s.data.user?.username, chips: s.data.user?.chips ?? 1000 }))
          .filter(p => p.id);
        io.to(roomId).emit('room:updated', waitingPlayers);
      });
    }
  });
});

// ─── Gacha ────────────────────────────────────────────────────────────────────

function rollRarity(pityCountSR, pityCountSSR) {
  if (pityCountSSR >= PITY_SSR - 1) return 'SSR';
  if (pityCountSR  >= PITY_SR  - 1) return 'SR';
  const r = Math.random();
  if (r < RATES.SSR)              return 'SSR';
  if (r < RATES.SSR + RATES.SR)  return 'SR';
  return 'R';
}

function pickItem(rarity, ownedIds) {
  const pool = GACHA_ITEMS.filter(i => i.rarity === rarity);
  if (rarity === 'SSR') {
    const unowned = pool.filter(i => !ownedIds.has(i.id));
    if (unowned.length > 0) return unowned[Math.floor(Math.random() * unowned.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

app.get('/api/gacha/banners', (_req, res) => {
  res.json([{
    id: 'standard',
    name: 'Standard Banner',
    description: 'All items available. Pity resets every 90 pulls.',
    featuredItem: GACHA_ITEMS.find(i => i.rarity === 'SSR'),
    rates: RATES,
  }]);
});

app.get('/api/gacha/rates/:bannerId', (_req, res) => {
  res.json({ rates: RATES, pitySR: PITY_SR, pitySSR: PITY_SSR, singleCost: SINGLE_COST, tenCost: TEN_COST });
});

app.post('/api/gacha/pull', async (req, res) => {
  try {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    const count = req.body?.count === 10 ? 10 : 1;
    const cost  = count === 10 ? TEN_COST : SINGLE_COST;
    if (user.chips < cost)
      return res.status(400).json({ error: { code: 'GACHA_ERROR', message: 'Not enough chips' } });
    const ownedRows = await db.select({ itemId: userCollection.itemId }).from(userCollection).where(eq(userCollection.userId, user.id));
    const ownedIds = new Set(ownedRows.map(r => r.itemId));
    let { pityCountSR, pityCountSSR } = user;
    const results = [];
    for (let i = 0; i < count; i++) {
      const rarity = rollRarity(pityCountSR, pityCountSSR);
      if (rarity === 'SSR')     { pityCountSR = 0; pityCountSSR = 0; }
      else if (rarity === 'SR') { pityCountSR = 0; pityCountSSR += 1; }
      else                      { pityCountSR += 1; pityCountSSR += 1; }
      const item = pickItem(rarity, ownedIds);
      ownedIds.add(item.id);
      await db.insert(userCollection).values({ userId: user.id, itemId: item.id }).onConflictDoNothing();
      results.push({ ...item, isNew: true });
    }
    await db.update(users).set({ chips: user.chips - cost, pityCountSR, pityCountSSR }).where(eq(users.id, user.id));
    res.json({ items: results, chips: user.chips - cost });
  } catch (err) {
    console.error('Gacha pull error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

// ─── Collection ───────────────────────────────────────────────────────────────

app.get('/api/collection', async (req, res) => {
  try {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    const rows = await db
      .select({
        id: gachaItemsTable.id,
        name: gachaItemsTable.name,
        type: gachaItemsTable.type,
        rarity: gachaItemsTable.rarity,
        imageUrl: gachaItemsTable.imageUrl,
        description: gachaItemsTable.description,
        isEquipped: userCollection.isEquipped,
      })
      .from(userCollection)
      .innerJoin(gachaItemsTable, eq(userCollection.itemId, gachaItemsTable.id))
      .where(eq(userCollection.userId, user.id));
    const equipped = rows.find(r => r.isEquipped);
    res.json({ items: rows, equippedCardSkin: equipped?.id ?? null });
  } catch (err) {
    console.error('Collection list error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

app.patch('/api/collection/:itemId/equip', async (req, res) => {
  try {
    const user = await getUserFromReq(req);
    if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    const { itemId } = req.params;
    const [row] = await db.select().from(userCollection)
      .where(and(eq(userCollection.userId, user.id), eq(userCollection.itemId, itemId)))
      .limit(1);
    if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Item not in collection' } });
    const item = GACHA_ITEMS.find(i => i.id === itemId);
    if (!item || item.type !== 'card_skin')
      return res.status(400).json({ error: { code: 'INVALID', message: 'Only card_skin items can be equipped' } });
    const wasEquipped = row.isEquipped;
    await db.update(userCollection).set({ isEquipped: false }).where(eq(userCollection.userId, user.id));
    if (!wasEquipped) {
      await db.update(userCollection).set({ isEquipped: true })
        .where(and(eq(userCollection.userId, user.id), eq(userCollection.itemId, itemId)));
    }
    res.json({ equipped: !wasEquipped, itemId, equippedCardSkin: wasEquipped ? null : itemId });
  } catch (err) {
    console.error('Equip error:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

// ─── History ──────────────────────────────────────────────────────────────────

app.get('/api/history', async (_req, res) => {
  try {
    const history = await db.select().from(gameHistoryTable)
      .orderBy(desc(gameHistoryTable.playedAt)).limit(50);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

app.get('/api/history/:id', async (req, res) => {
  try {
    const [entry] = await db.select().from(gameHistoryTable)
      .where(eq(gameHistoryTable.id, req.params.id)).limit(1);
    if (!entry) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Game not found' } });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

// ─── Leaderboard + Profile ────────────────────────────────────────────────────

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const leaderboard = await db
      .select({ id: users.id, username: users.username, chips: users.chips, wins: users.wins, handsPlayed: users.handsPlayed })
      .from(users).orderBy(desc(users.chips)).limit(50);
    res.json({ leaderboard });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const [target] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!target) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    const collRows = await db.select({ c: sql.raw('count(*)') })
      .from(userCollection).where(eq(userCollection.userId, target.id));
    const collectionCount = Number(collRows[0]?.c ?? 0);
    res.json({
      user: { id: target.id, username: target.username, chips: target.chips, avatarUrl: target.avatarUrl ?? null },
      stats: { wins: target.wins, handsPlayed: target.handsPlayed, collectionCount },
    });
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function startServer() {
  await initDb();
  await seedGachaItems();
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log('Poker Backend running on port ' + PORT);
    console.log('Socket.IO ready');
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});