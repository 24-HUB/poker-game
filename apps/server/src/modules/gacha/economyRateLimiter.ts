import { HttpException, Injectable } from '@nestjs/common';

@Injectable()
export class EconomyRateLimiter {
  private readonly buckets = new Map<string, { at: number; used: number }>();
  public allow(accountId: string): void {
    const now = Date.now();
    const bucket = this.buckets.get(accountId);
    if (!bucket || now - bucket.at >= 60_000) {
      if (this.buckets.size >= 10_000) {
        for (const [key, entry] of this.buckets) if (now - entry.at >= 60_000) this.buckets.delete(key);
        if (this.buckets.size >= 10_000) throw new HttpException({ code: 'RATE_LIMITED', message: 'Please retry in a minute.' }, 429);
      }
      this.buckets.set(accountId, { at: now, used: 1 });
    } else if (bucket.used >= 30) throw new HttpException({ code: 'RATE_LIMITED', message: 'Please retry in a minute.' }, 429);
    else bucket.used += 1;
  }
}
