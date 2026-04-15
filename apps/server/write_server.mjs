import { writeFileSync } from "fs";
const content = `import express from 'express';
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
`;
writeFileSync("./src/server.js", content);
console.log("Written", content.length, "chars");
