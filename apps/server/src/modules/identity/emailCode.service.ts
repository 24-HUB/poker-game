import { randomUUID, timingSafeEqual } from 'node:crypto';
import { ObjectId, type ClientSession, type Db, type MongoClient } from 'mongodb';
import { EmailCodeError, emailCodeHasher, generateEmailCode, normalizeCodeEmail, parseEmailCode, type EmailCodePurpose } from './emailCodePolicy';
import { EmailCodeRepository } from './emailCodeRepository';

type CodeChallenge = {
  _id: string; addressKey: string; accountId: string; purpose: EmailCodePurpose;
  generation: string; digest: string; fingerprint: string; previousFingerprint?: string;
  expiresAt: Date; failures: number; status: 'active' | 'consumed' | 'exhausted';
};
type CodeOptions = {
  secret: string; hashPassword: (password: string) => Promise<string>;
  deliver: (email: string, purpose: EmailCodePurpose, code: string) => Promise<void>;
  now?: () => Date; generateCode?: () => string;
  deliveryWindowMs?: number; wait?: (milliseconds: number) => Promise<void>;
  afterWrite?: (stage: 'consume' | 'password' | 'verify' | 'sessions') => Promise<void>;
};

export class EmailCodeService {
  private readonly repository: EmailCodeRepository;
  private readonly hash: ReturnType<typeof emailCodeHasher>;
  private readonly now: () => Date;
  constructor(private readonly db: Db, client: MongoClient, private readonly options: CodeOptions) {
    this.repository = new EmailCodeRepository(db, client); this.hash = emailCodeHasher(options.secret);
    this.now = options.now ?? (() => new Date());
  }

  async issueSignup(email: string, accountId: string, clientIp: string): Promise<{ status: true }> {
    const user = await this.db.collection('user').findOne({ email: normalizeCodeEmail(email) });
    // Better Auth deliberately returns a synthetic ID for duplicate signup.
    // Only a response referring to the committed account can trigger issuance.
    if (!user || String(user._id) !== accountId) { await this.waitForDelivery(); return { status: true }; }
    return this.issue(email, 'email-verification', clientIp);
  }

  async issue(rawEmail: string, purpose: EmailCodePurpose, clientIp: string): Promise<{ status: true }> {
    const email = normalizeCodeEmail(rawEmail);
    await this.admitIp(clientIp, 'send');
    const addressKey = this.hash('address', email);
    const generation = randomUUID();
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = parseEmailCode((this.options.generateCode ?? generateEmailCode)());
      const fingerprint = this.hash('fingerprint', JSON.stringify([addressKey, code]));
      const outcome = await this.repository.run(async (session) => {
        const now = this.now();
        await this.repository.lock(addressKey, now, session);
        const collection = this.db.collection<CodeChallenge>('emailCodeChallenges');
        const existing = await collection.find({ addressKey }, { session }).toArray();
        if (existing.some((entry) => entry.fingerprint === fingerprint || entry.previousFingerprint === fingerprint)) return 'collision' as const;
        const limited = await this.repository.rate(`${addressKey}:${purpose}`, now, 3_600_000, 5, session, 60_000);
        if (limited) return limited;
        const user = await this.db.collection('user').findOne({ email }, { session });
        if (!user || (purpose === 'email-verification' && user.emailVerified)) return 'ineligible' as const;
        if (purpose === 'password-reset' && !await this.db.collection('account').findOne({ userId: { $in: this.userIds(String(user._id)) }, providerId: 'credential' }, { session })) return 'ineligible' as const;
        const previous = existing.find((entry) => entry.purpose === purpose);
        await collection.replaceOne({ _id: `${addressKey}:${purpose}` }, {
          addressKey, accountId: String(user._id), purpose,
          generation, digest: this.hash('challenge', JSON.stringify([addressKey, String(user._id), purpose, generation, code])),
          fingerprint, ...(previous ? { previousFingerprint: previous.fingerprint } : {}),
          expiresAt: new Date(now.getTime() + 600_000), failures: 0, status: 'active',
        }, { upsert: true, session });
        return 'issued' as const;
      });
      if (outcome instanceof EmailCodeError) throw outcome;
      if (outcome === 'collision') continue;
      // Both eligibility outcomes share the bounded delivery response window.
      // Real Brevo delivery has its own five-second abort; memory transport uses
      // zero latency in the isolated test stack. External effects occur once.
      await this.waitForDelivery(outcome === 'issued' ? () => this.options.deliver(email, purpose, code) : undefined);
      return { status: true };
    }
    throw new EmailCodeError('SERVICE_UNAVAILABLE');
  }

  async verify(email: string, otp: string, clientIp: string): Promise<{ status: true }> {
    return this.confirm(email, otp, 'email-verification', clientIp);
  }

  async reset(email: string, otp: string, password: string, clientIp: string): Promise<{ status: true }> {
    if (password.length < 8 || password.length > 128) throw new EmailCodeError('INVALID_PASSWORD');
    return this.confirm(email, otp, 'password-reset', clientIp, password);
  }

  private async confirm(rawEmail: string, rawCode: string, purpose: EmailCodePurpose, clientIp: string, password?: string): Promise<{ status: true }> {
    const email = normalizeCodeEmail(rawEmail);
    await this.admitIp(clientIp, 'confirm');
    const code = parseEmailCode(rawCode);
    // Admit/validate before expensive hashing, once outside retry callbacks.
    const passwordHash = password !== undefined ? await this.options.hashPassword(password) : undefined;
    const addressKey = this.hash('address', email);
    const outcome = await this.repository.run(async (session) => {
      const now = this.now();
      await this.repository.lock(addressKey, now, session);
      const collection = this.db.collection<CodeChallenge>('emailCodeChallenges');
      const challenge = await collection.findOne({ _id: `${addressKey}:${purpose}` }, { session });
      if (!challenge || challenge.status !== 'active' || challenge.failures >= 5 || challenge.expiresAt.getTime() <= now.getTime()) return false;
      const digest = this.hash('challenge', JSON.stringify([addressKey, challenge.accountId, purpose, challenge.generation, code]));
      if (!timingSafeEqual(Buffer.from(challenge.digest, 'hex'), Buffer.from(digest, 'hex'))) {
        await collection.updateOne({ _id: challenge._id, generation: challenge.generation }, {
          $inc: { failures: 1 }, ...(challenge.failures === 4 ? { $set: { status: 'exhausted' } } : {}),
        }, { session });
        return false;
      }
      const ids = this.userIds(challenge.accountId);
      const user = await this.db.collection<{ _id: string | ObjectId; email: string }>('user').findOne({ _id: { $in: ids }, email }, { session });
      if (!user) return false;
      await collection.updateMany({ addressKey, status: 'active' }, { $set: { status: 'consumed' } }, { session });
      await this.options.afterWrite?.('consume');
      if (passwordHash !== undefined) {
        const credential = await this.db.collection('account').updateOne({ userId: { $in: ids }, providerId: 'credential' }, {
          $set: { password: passwordHash, updatedAt: now },
        }, { session });
        if (credential.matchedCount !== 1) throw new EmailCodeError('SERVICE_UNAVAILABLE');
        await this.options.afterWrite?.('password');
      }
      await this.db.collection<{ _id: string | ObjectId }>('user').updateOne({ _id: user._id }, { $set: { emailVerified: true, updatedAt: now } }, { session });
      await this.options.afterWrite?.('verify');
      if (passwordHash !== undefined) {
        await this.db.collection('session').deleteMany({ userId: { $in: ids } }, { session });
        await this.options.afterWrite?.('sessions');
      }
      return true;
    });
    if (!outcome) throw new EmailCodeError('INVALID_CODE');
    return { status: true };
  }

  private userIds(id: string): Array<string | ObjectId> { return ObjectId.isValid(id) ? [id, new ObjectId(id)] : [id]; }
  private async waitForDelivery(delivery?: () => Promise<void>): Promise<void> {
    const duration = this.options.deliveryWindowMs ?? 0;
    const wait = this.options.wait ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
    await Promise.all([
      duration > 0 ? wait(duration) : Promise.resolve(),
      delivery ? delivery().catch(() => {}) : Promise.resolve(),
    ]);
  }
  private async admitIp(ip: string, operation: 'send' | 'confirm'): Promise<void> {
    const key = this.hash('ip', `${operation}:${ip}`);
    const outcome = await this.repository.run(async (session: ClientSession) => {
      const now = this.now();
      await this.repository.lock(key, now, session);
      return this.repository.rate(key, now, operation === 'send' ? 3_600_000 : 600_000, operation === 'send' ? 20 : 30, session);
    });
    if (outcome) throw outcome;
  }
}
