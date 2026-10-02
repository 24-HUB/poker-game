import { CELESTIAL_BANNER } from './catalogue';
import { drawOne } from './drawPolicy';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('celestial draw policy', () => {
  const draw = (sr: number, ssr: number, rolls: number[], owned = new Set<string>()) =>
    drawOne(CELESTIAL_BANNER, { sinceSr: sr, sinceSsr: ssr }, owned, (max) => {
      const value = rolls.shift();
      if (value === undefined || value >= max) throw new Error('Unexpected random bound');
      return value;
    });

  it('publishes exactly the original optimized assets listed in the web manifest', () => {
    const root = resolve(__dirname, '../../../../web/public');
    const manifest = JSON.parse(readFileSync(resolve(root, 'art/cosmetics/manifest.json'), 'utf8')) as { items: unknown[] };
    expect(manifest.items).toEqual(CELESTIAL_BANNER.items);
    for (const item of CELESTIAL_BANNER.items) {
      const svg = readFileSync(resolve(root, item.assetUrl.slice(1)), 'utf8');
      expect(svg.length).toBeLessThan(5000);
      expect(svg).toContain('<svg');
      expect(svg).not.toMatch(/<script|<foreignObject|href=["']https?:/i);
    }
  });

  it.each([[0, 'R'], [69, 'R'], [70, 'SR'], [94, 'SR'], [95, 'SSR'], [99, 'SSR']])(
    'maps rarity boundary %s to %s', (roll, rarity) => {
      expect(draw(0, 0, [Number(roll), 0]).rarity).toBe(rarity);
    },
  );
  it('guarantees SR on the tenth failure while retaining the base SSR chance', () => {
    expect(draw(8, 8, [0, 0]).rarity).toBe('R');
    expect(draw(9, 9, [0, 0])).toMatchObject({ rarity: 'SR', progress: { sinceSr: 0, sinceSsr: 10 } });
    expect(draw(9, 9, [95, 0])).toMatchObject({ rarity: 'SSR', progress: { sinceSr: 0, sinceSsr: 0 } });
  });
  it('gives the SSR guarantee priority at pull 90', () => {
    expect(draw(9, 89, [0])).toMatchObject({ rarity: 'SSR', progress: { sinceSr: 0, sinceSsr: 0 } });
    expect(draw(0, 88, [0, 0])).toMatchObject({ rarity: 'R', progress: { sinceSr: 1, sinceSsr: 89 } });
  });
  it('resets only the SR counter for an SR result', () => {
    expect(draw(3, 40, [70, 0]).progress).toEqual({ sinceSr: 0, sinceSsr: 41 });
  });
  it('excludes owned SSRs until the SSR pool is complete', () => {
    const first = draw(0, 0, [95, 0]);
    const second = draw(0, 0, [95, 0], new Set([first.itemId]));
    expect(second.itemId).not.toBe(first.itemId);
    expect(second.duplicate).toBe(false);
    expect(draw(0, 0, [95, 0], new Set([first.itemId, second.itemId])).duplicate).toBe(true);
  });
  it('marks lower rarity duplicates while still updating pity', () => {
    const first = draw(0, 0, [0, 0]);
    expect(draw(2, 4, [0, 0], new Set([first.itemId]))).toMatchObject({ duplicate: true, progress: { sinceSr: 3, sinceSsr: 5 } });
  });
  it('does not mutate progress or ownership and rejects invalid randomness', () => {
    const progress = { sinceSr: 0, sinceSsr: 0 };
    const owned = new Set<string>();
    drawOne(CELESTIAL_BANNER, progress, owned, () => 0);
    expect(progress).toEqual({ sinceSr: 0, sinceSsr: 0 });
    expect(owned.size).toBe(0);
    expect(() => drawOne(CELESTIAL_BANNER, progress, owned, () => 100)).toThrow();
  });
});
