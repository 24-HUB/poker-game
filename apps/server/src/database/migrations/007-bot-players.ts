import type { Db, Document } from 'mongodb';

const mode = { enum: ['standard', 'practice'] };
const kind = { enum: ['human', 'bot'] };
const botId = { bsonType: 'string', pattern: '^bot:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' };

/** Extend installed validators; historical migrations remain immutable. */
export async function applyBotPlayersMigration(db: Db): Promise<void> {
  const result = { bsonType: 'object', properties: { mode, presentation: { bsonType: 'object', properties: {
    participants: { bsonType: 'array', items: { bsonType: 'object', properties: { kind } } },
  } } } };
  const constraints: Record<string, Document> = {
    rooms: { $and: [
      { $jsonSchema: { bsonType: 'object', properties: { bots: { bsonType: 'array', maxItems: 5, items: {
        bsonType: 'object', required: ['botId', 'displayName', 'seat'], additionalProperties: false,
        properties: { botId, displayName: { bsonType: 'string', minLength: 1, maxLength: 128 }, seat: { bsonType: ['int', 'long'], minimum: 0, maximum: 5 } },
      } } } } },
      { $expr: { $and: ['botId', 'seat'].map((field) => ({ $eq: [
        { $size: { $ifNull: ['$bots', []] } }, { $size: { $setUnion: [{ $map: { input: { $ifNull: ['$bots', []] }, as: 'bot', in: `$$bot.${field}` } }, []] } },
      ] })) } },
    ] },
    gameSessions: { $jsonSchema: { bsonType: 'object', properties: { mode,
      participants: { bsonType: 'array', items: { bsonType: 'object', properties: { kind } } },
      result: { bsonType: 'object', properties: { mode, standings: { bsonType: 'array', items: { bsonType: 'object', properties: { kind } } } } },
    } } },
    hands: { $jsonSchema: { bsonType: 'object', properties: { result } } },
  };
  for (const [name, constraint] of Object.entries(constraints)) {
    const info = await db.listCollections({ name }).next();
    const previous = info && 'options' in info ? info.options?.validator : undefined;
    await db.command({ collMod: name, validator: previous ? { $and: [previous, constraint] } : constraint,
      validationLevel: 'strict', validationAction: 'error' });
  }
}
