import { createHash } from 'node:crypto';
import type { BannerVersion, CosmeticItem } from '@poker/contracts' with { 'resolution-mode': 'import' };
import type { Db } from 'mongodb';

const characters = [
  ['star-scout', 'Star Scout', 'R'], ['moon-courier', 'Moon Courier', 'R'],
  ['solar-knight', 'Solar Knight', 'R'], ['comet-mage', 'Comet Mage', 'SR'],
  ['eclipse-oracle', 'Eclipse Oracle', 'SR'], ['astral-empress', 'Astral Empress', 'SSR'],
] as const;

export const CELESTIAL_BANNER: BannerVersion = {
  id: 'celestial', version: 'celestial-v1', name: 'Celestial Companions',
  prices: { single: 5, ten: 50 }, weights: { R: 70, SR: 25, SSR: 5 }, guarantees: { sr: 10, ssr: 90 },
  items: characters.flatMap(([slug, name, rarity]) => (['avatar', 'cardBack'] as const).map((slot) => ({
    id: `${slug}-${slot}`, name: `${name}${slot === 'cardBack' ? ' Card Back' : ''}`, rarity, slot,
    assetUrl: `/art/cosmetics/${slug}-${slot === 'avatar' ? 'avatar' : 'back'}.svg`,
  }))),
};

export type BannerDocument = { _id: string; contentHash: string; config: BannerVersion };
export async function publishCatalogue(db: Db, input: BannerVersion): Promise<void> {
  const { bannerVersionSchema } = await import('@poker/contracts');
  const config = bannerVersionSchema.parse(input);
  const contentHash = createHash('sha256').update(JSON.stringify(config)).digest('hex');
  try {
    await db.collection<BannerDocument>('bannerVersions').insertOne({ _id: config.version, contentHash, config });
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 11000)) throw error;
    const existing = await db.collection<BannerDocument>('bannerVersions').findOne({ _id: config.version });
    if (existing?.contentHash !== contentHash) throw new Error('Published catalogue versions are immutable');
  }
}

export function findCosmetic(config: BannerVersion, itemId: string): CosmeticItem {
  const item = config.items.find((candidate) => candidate.id === itemId);
  if (!item) throw new Error('Unknown cosmetic item');
  return item;
}
