import { describe, expect, it } from 'vitest';
import { bannerVersionSchema, pullRequestSchema, equipmentUpdateSchema } from './collection.js';

const items = ['avatar', 'cardBack'].flatMap((slot) =>
  ['R', 'R', 'R', 'SR', 'SR', 'SSR'].map((rarity, i) => ({
    id: `${slot}-${i}`, name: `Item ${i}`, slot, rarity, assetUrl: `/art/cosmetics/item-${i}.svg`,
  })),
);
const banner = {
  id: 'celestial', version: 'celestial-v1', name: 'Celestial Companions',
  prices: { single: 5, ten: 50 }, weights: { R: 70, SR: 25, SSR: 5 },
  guarantees: { sr: 10, ssr: 90 }, items,
};

describe('collection contracts', () => {
  it('accepts the launch catalogue and purchase sizes', () => {
    expect(bannerVersionSchema.safeParse(banner).success).toBe(true);
    expect(pullRequestSchema.safeParse({ requestId: crypto.randomUUID(), bannerVersion: 'celestial-v1', count: 10 }).success).toBe(true);
  });
  it('rejects duplicate IDs, unsafe URLs and incorrect pools', () => {
    expect(bannerVersionSchema.safeParse({ ...banner, items: [...items.slice(0, 11), items[0]] }).success).toBe(false);
    expect(bannerVersionSchema.safeParse({ ...banner, items: items.map((item) => ({ ...item, assetUrl: 'https://evil.example/a.svg' })) }).success).toBe(false);
    expect(bannerVersionSchema.safeParse({ ...banner, items: items.map((item) => ({ ...item, rarity: 'R' })) }).success).toBe(false);
  });
  it('rejects extra payload identity, unsafe prices and invalid equipment revision', () => {
    expect(pullRequestSchema.safeParse({ requestId: crypto.randomUUID(), bannerVersion: 'celestial-v1', count: 1, accountId: 'someone' }).success).toBe(false);
    expect(bannerVersionSchema.safeParse({ ...banner, prices: { single: Number.MAX_SAFE_INTEGER + 1, ten: 50 } }).success).toBe(false);
    expect(equipmentUpdateSchema.safeParse({ itemId: null, expectedRevision: -1 }).success).toBe(false);
  });
});
