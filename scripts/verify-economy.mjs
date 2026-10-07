import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import { MongoClient } from 'mongodb';
import { bannerVersionSchema, pullReceiptSchema, rewardReceiptSchema } from '../packages/contracts/dist/index.js';

const fields = {
  ticketWallets: { balance: 1, revision: 1 },
  ticketLedger: { accountId: 1, delta: 1, reason: 1, sourceId: 1 },
  rewardReceipts: { handId: 1, accountId: 1, policyVersion: 1, completedDateUtc: 1, qualified: 1,
    reason: 1, requestedParticipation: 1, requestedBonus: 1, grantedParticipation: 1, grantedBonus: 1 },
  hands: { status: 1, completedAt: 1, 'result.rewardReceipts': 1 },
  dailyEarnings: { accountId: 1, utcDate: 1, earned: 1 },
  bannerVersions: { contentHash: 1, config: 1 },
  pullReceipts: { accountId: 1, requestId: 1, payloadHash: 1, receipt: 1 },
  ownedCosmetics: { accountId: 1, itemId: 1, bannerVersion: 1, requestId: 1 },
  bannerProgress: { accountId: 1, bannerId: 1, sinceSr: 1, sinceSsr: 1 },
  equipment: { accountId: 1, slot: 1, itemId: 1, revision: 1 },
};
const key = (...parts) => JSON.stringify(parts);
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const withoutId = ({ _id, ...value }) => value;
const progressOf = ({ sinceSr, sinceSsr }) => ({ sinceSr, sinceSsr });

/** Read-only snapshot. Caller supplies a Db backed by a replica set and read credentials.
 * Reports counts only; never returns identifiers, documents, credentials or repair actions.
 * Intended for the small private-release dataset; rows are held in memory.
 */
export async function verifyEconomy(db) {
  const session = db.client.startSession({ snapshot: true });
  const rows = {};
  const mismatches = {};
  const bad = (category) => { mismatches[category] = (mismatches[category] ?? 0) + 1; };
  try {
    // Metadata is not part of the data snapshot: prohibit migrations during verification.
    const available = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((row) => row.name));
    for (const [name, projection] of Object.entries(fields)) {
      if (!available.has(name)) { bad('collectionMissing'); rows[name] = []; continue; }
      rows[name] = await db.collection(name).find({}, { projection, session, maxTimeMS: 30000 }).toArray();
    }
  } finally { await session.endSession(); }

  const index = (documents, getKey) => {
    const map = new Map();
    for (const row of documents) {
      const id = getKey(row);
      if (map.has(id)) bad('duplicateKey');
      map.set(id, row);
    }
    return map;
  };
  const wallets = index(rows.ticketWallets, (row) => row._id);
  const ledger = index(rows.ticketLedger, (row) => key(row.accountId, row.reason, row.sourceId));
  const rewards = index(rows.rewardReceipts, (row) => key(row.accountId, row.handId));
  const hands = index(rows.hands, (row) => row._id);
  const pulls = index(rows.pullReceipts, (row) => key(row.accountId, row.requestId));
  const banners = index(rows.bannerVersions, (row) => row._id);
  const ownership = index(rows.ownedCosmetics, (row) => key(row.accountId, row.itemId));
  const progress = index(rows.bannerProgress, (row) => key(row.accountId, row.bannerId));
  index(rows.equipment, (row) => key(row.accountId, row.slot));
  const daily = index(rows.dailyEarnings, (row) => key(row.accountId, row.utcDate));
  const sums = new Map();
  const earned = new Map();
  const requireWallet = (accountId) => { if (!wallets.has(accountId)) bad('walletMissing'); };
  for (const entry of rows.ticketLedger) {
    requireWallet(entry.accountId);
    if (!Number.isSafeInteger(entry.delta) || !['HAND_REWARD', 'PULL'].includes(entry.reason)) { bad('ledgerInvalid'); continue; }
    sums.set(entry.accountId, (sums.get(entry.accountId) ?? 0n) + BigInt(entry.delta));
    if (entry.reason === 'HAND_REWARD') {
      const receipt = rewards.get(key(entry.accountId, entry.sourceId));
      if (!receipt) bad('rewardReceipt');
      if (entry.delta <= 0 || entry.delta !== receipt?.grantedParticipation + receipt?.grantedBonus) bad('rewardLedger');
    } else {
      const purchase = pulls.get(key(entry.accountId, entry.sourceId));
      if (!purchase) bad('pullReceipt');
      if (entry.delta >= 0 || entry.delta !== -purchase?.receipt?.cost) bad('pullLedger');
    }
  }
  for (const wallet of rows.ticketWallets) {
    if (!count(wallet.balance) || !count(wallet.revision)) bad('walletInvalid');
    else if (BigInt(wallet.balance) !== (sums.get(wallet._id) ?? 0n)) bad('walletBalance');
  }
  for (const row of rows.rewardReceipts) {
    requireWallet(row.accountId);
    if (!rewardReceiptSchema.safeParse(withoutId(row)).success) { bad('rewardInvalid'); continue; }
    const amount = row.grantedParticipation + row.grantedBonus;
    // Only policy v1 exists. Unknown policies require updating this audit explicitly.
    if (row.policyVersion !== 1 || row.requestedParticipation > 1 || row.requestedBonus > 1
      || row.grantedParticipation > row.requestedParticipation || row.grantedBonus > row.requestedBonus
      || (!row.qualified && amount !== 0)) bad('rewardInvalid');
    const hand = hands.get(row.handId);
    if (hand?.status !== 'COMPLETED' || !(hand.completedAt instanceof Date)
      || hand.completedAt.toISOString().slice(0, 10) !== row.completedDateUtc
      || !hand.result?.rewardReceipts?.some((receipt) => isDeepStrictEqual(withoutId(receipt), withoutId(row)))) bad('rewardHand');
    const entry = ledger.get(key(row.accountId, 'HAND_REWARD', row.handId));
    if ((amount > 0 && entry?.delta !== amount) || (amount === 0 && entry)) bad('rewardLedger');
    const dailyKey = key(row.accountId, row.completedDateUtc);
    earned.set(dailyKey, (earned.get(dailyKey) ?? 0n) + BigInt(amount));
  }
  for (const hand of rows.hands) {
    for (const receipt of hand.result?.rewardReceipts ?? []) {
      if (hand.status !== 'COMPLETED' || receipt.handId !== hand._id
        || !isDeepStrictEqual(withoutId(rewards.get(key(receipt.accountId, hand._id)) ?? {}), withoutId(receipt))) bad('rewardReceipt');
    }
  }
  for (const [id, amount] of earned) {
    const stored = daily.get(id)?.earned;
    if (amount > 20n || (amount > 0n && (!count(stored) || BigInt(stored) !== amount))) bad('dailyEarnings');
  }
  for (const row of rows.dailyEarnings) {
    requireWallet(row.accountId);
    if (!count(row.earned) || BigInt(row.earned) !== (earned.get(key(row.accountId, row.utcDate)) ?? 0n)) bad('dailyEarnings');
  }
  for (const banner of rows.bannerVersions) {
    if (!bannerVersionSchema.safeParse(banner.config).success || banner._id !== banner.config?.version
      || banner.contentHash !== hash(banner.config)) bad('catalogueInvalid');
  }
  const asset = (version, itemId) => {
    const banner = banners.get(version);
    if (!banner) { bad('catalogueReference'); return undefined; }
    return banner.config?.items?.find((item) => item.id === itemId);
  };
  const history = new Map();
  const acquired = new Map();
  // Wallet revision, unlike timestamps, serializes each account's committed purchases.
  const orderedPulls = [...rows.pullReceipts].sort((a, b) => (a.receipt?.walletRevision ?? 0) - (b.receipt?.walletRevision ?? 0));
  for (const document of orderedPulls) {
    const { accountId, requestId, receipt } = document;
    requireWallet(accountId);
    if (!pullReceiptSchema.safeParse(receipt).success) { bad('pullInvalid'); continue; }
    const banner = banners.get(receipt.bannerVersion)?.config;
    if (!banner) bad('catalogueReference');
    if (requestId !== receipt.requestId || document.payloadHash !== hash([receipt.bannerVersion, receipt.count])
      || (banner && receipt.cost !== (receipt.count === 1 ? banner.prices.single : banner.prices.ten))
      || receipt.walletRevision > (wallets.get(accountId)?.revision ?? -1)) bad('pullInvalid');
    if (ledger.get(key(accountId, 'PULL', requestId))?.delta !== -receipt.cost) bad('pullLedger');
    const historyKey = key(accountId, banner?.id ?? receipt.bannerVersion);
    const previous = history.get(historyKey);
    if (previous && receipt.walletRevision <= previous.walletRevision) bad('pullHistory');
    let current = previous?.progress ?? { sinceSr: 0, sinceSsr: 0 };
    for (const result of receipt.results) {
      const item = asset(receipt.bannerVersion, result.itemId);
      if (!item || !isDeepStrictEqual(item, result.item) || result.rarity !== item.rarity) bad('pullInvalid');
      if (banner && ((current.sinceSsr + 1 >= banner.guarantees.ssr && result.rarity !== 'SSR')
        || (current.sinceSr + 1 >= banner.guarantees.sr && result.rarity === 'R'))) bad('pullHistory');
      current = { sinceSr: result.rarity === 'R' ? current.sinceSr + 1 : 0,
        sinceSsr: result.rarity === 'SSR' ? 0 : current.sinceSsr + 1 };
      if (!isDeepStrictEqual(current, result.progress)) bad('pullHistory');
      const ownedKey = key(accountId, result.itemId);
      if (result.duplicate !== acquired.has(ownedKey)) bad('pullHistory');
      if (!acquired.has(ownedKey)) acquired.set(ownedKey, { requestId, bannerVersion: receipt.bannerVersion });
      if (!ownership.has(ownedKey)) bad('ownershipMissing');
    }
    if (!isDeepStrictEqual(current, receipt.progress)) bad('pullHistory');
    history.set(historyKey, { progress: current, walletRevision: receipt.walletRevision });
  }
  for (const row of rows.ownedCosmetics) {
    requireWallet(row.accountId);
    const origin = acquired.get(key(row.accountId, row.itemId));
    if (!asset(row.bannerVersion, row.itemId) || origin?.requestId !== row.requestId
      || origin?.bannerVersion !== row.bannerVersion) bad('ownershipReference');
  }
  for (const [id, state] of history) {
    if (!progress.has(id)) bad('progressMissing');
    else if (!isDeepStrictEqual(progressOf(progress.get(id)), state.progress)) bad('progressReference');
  }
  for (const row of rows.bannerProgress) {
    requireWallet(row.accountId);
    const banner = rows.bannerVersions.find((candidate) => candidate.config?.id === row.bannerId)?.config;
    const expected = history.get(key(row.accountId, row.bannerId));
    if (!banner || !expected || !count(row.sinceSr) || !count(row.sinceSsr)
      || row.sinceSr >= banner.guarantees.sr || row.sinceSsr >= banner.guarantees.ssr
      || !isDeepStrictEqual(progressOf(row), expected.progress)) bad('progressReference');
  }
  for (const row of rows.equipment) {
    if (!['avatar', 'cardBack'].includes(row.slot) || !count(row.revision)) bad('equipmentReference');
    if (row.itemId === null) continue; // Free default selection, outside the pull pool.
    requireWallet(row.accountId);
    const owned = ownership.get(key(row.accountId, row.itemId));
    if (!owned || asset(owned.bannerVersion, row.itemId)?.slot !== row.slot) bad('equipmentReference');
  }
  return { ok: Object.keys(mismatches).length === 0,
    counts: Object.fromEntries(Object.entries(rows).map(([name, documents]) => [name, documents.length])), mismatches };
}

export function verifyTarget(environment) {
  const { MONGODB_URI: uri, MONGODB_DATABASE: database, ECONOMY_VERIFY_MODE: mode } = environment;
  if (!uri || !database || !/^[A-Za-z0-9_-]+$/.test(database) || ['admin', 'local', 'config'].includes(database)) {
    throw new Error('Explicit application database and URI required');
  }
  if (mode && mode !== 'operator-read-only') throw new Error('Unknown verification mode');
  // An explicit mode is mandatory for every target outside disposable loopback tests.
  const local = /^mongodb:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/(?:\?[^@]*)?$/.test(uri);
  if ((!local || !/^poker_test_[a-zA-Z0-9_]+$/.test(database)) && mode !== 'operator-read-only') {
    throw new Error('Operator read-only mode required for non-test targets');
  }
  return { uri, database };
}

async function main() {
  let client;
  try {
    const { uri, database } = verifyTarget(process.env);
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000,
      socketTimeoutMS: 30000, maxPoolSize: 2, retryWrites: false, readPreference: 'primary' });
    await client.connect();
    const report = await verifyEconomy(client.db(database));
    console.log(JSON.stringify(report));
    if (!report.ok) process.exitCode = 1;
  } catch {
    console.error('Economy verification failed: check explicit target, read-only access, replica-set availability and stored data.');
    process.exitCode = 1;
  } finally { await client?.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
