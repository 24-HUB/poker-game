import type { BannerVersion, BannerProgress, DrawResult } from '@poker/contracts' with { 'resolution-mode': 'import' };

export function drawOne(
  config: BannerVersion, progress: BannerProgress, ownedIds: ReadonlySet<string>,
  randomInt: (maxExclusive: number) => number,
): DrawResult {
  if (!Number.isSafeInteger(progress.sinceSr) || !Number.isSafeInteger(progress.sinceSsr)
    || progress.sinceSr < 0 || progress.sinceSr >= config.guarantees.sr
    || progress.sinceSsr < 0 || progress.sinceSsr >= config.guarantees.ssr) throw new Error('Invalid banner progress');
  const random = (max: number) => {
    const value = randomInt(max);
    if (!Number.isSafeInteger(value) || value < 0 || value >= max) throw new Error('Invalid random integer');
    return value;
  };
  let rarity: DrawResult['rarity'];
  if (progress.sinceSsr + 1 >= config.guarantees.ssr) rarity = 'SSR';
  else {
    const roll = random(100);
    rarity = roll < config.weights.R ? 'R' : roll < config.weights.R + config.weights.SR ? 'SR' : 'SSR';
    if (rarity === 'R' && progress.sinceSr + 1 >= config.guarantees.sr) rarity = 'SR';
  }
  let eligible = config.items.filter((item) => item.rarity === rarity);
  if (rarity === 'SSR') {
    const unowned = eligible.filter((item) => !ownedIds.has(item.id));
    if (unowned.length) eligible = unowned;
  }
  if (!eligible.length) throw new Error('Empty rarity pool');
  const item = eligible[random(eligible.length)]!;
  return {
    itemId: item.id, item: { ...item }, rarity, duplicate: ownedIds.has(item.id),
    progress: { sinceSr: rarity === 'R' ? progress.sinceSr + 1 : 0, sinceSsr: rarity === 'SSR' ? 0 : progress.sinceSsr + 1 },
  };
}
