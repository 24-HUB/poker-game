import type { Db, Document } from 'mongodb';

export async function applyEmailCodesMigration(db: Db): Promise<void> {
  const definitions: Record<string, Document> = {
    emailCodeStates: { required: ['_id', 'revision', 'cleanupAt'], properties: {
      _id: { bsonType: 'string' }, revision: { bsonType: ['int', 'long', 'double'], minimum: 1 }, cleanupAt: { bsonType: 'date' },
    } },
    emailCodeRateLimits: { required: ['_id', 'attempts', 'cleanupAt'], properties: {
      _id: { bsonType: 'string' }, attempts: { bsonType: 'array', maxItems: 30, items: { bsonType: 'date' } }, cleanupAt: { bsonType: 'date' },
    } },
    emailCodeChallenges: { required: ['_id', 'addressKey', 'accountId', 'purpose', 'generation', 'digest', 'fingerprint', 'expiresAt', 'failures', 'status'], properties: {
      _id: { bsonType: 'string' }, addressKey: { bsonType: 'string' }, accountId: { bsonType: 'string' },
      purpose: { enum: ['email-verification', 'password-reset'] }, generation: { bsonType: 'string' },
      digest: { bsonType: 'string', pattern: '^[a-f0-9]{64}$' }, fingerprint: { bsonType: 'string', pattern: '^[a-f0-9]{64}$' },
      previousFingerprint: { bsonType: 'string', pattern: '^[a-f0-9]{64}$' }, expiresAt: { bsonType: 'date' },
      failures: { bsonType: ['int', 'long', 'double'], minimum: 0, maximum: 5 }, status: { enum: ['active', 'consumed', 'exhausted'] },
    } },
  };
  for (const [name, schema] of Object.entries(definitions)) {
    const validator = { $jsonSchema: { bsonType: 'object', additionalProperties: false, ...schema } };
    if (await db.listCollections({ name }, { nameOnly: true }).hasNext()) await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
    else await db.createCollection(name, { validator });
  }
  await db.collection('emailCodeStates').createIndex({ cleanupAt: 1 }, { expireAfterSeconds: 0, name: 'cleanup' });
  await db.collection('emailCodeRateLimits').createIndex({ cleanupAt: 1 }, { expireAfterSeconds: 0, name: 'cleanup' });
  // Keep at most two challenge/tombstone records per account so immediately
  // superseded codes cannot be generated again, even after a long idle period.
  await db.collection('emailCodeChallenges').createIndex({ addressKey: 1, purpose: 1 }, { unique: true, name: 'address_purpose' });
}
