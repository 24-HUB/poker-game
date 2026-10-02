import { z } from 'zod';

const id = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);
const count = z.number().int().nonnegative().safe();
export const cosmeticSlotSchema = z.enum(['avatar', 'cardBack']);
export type CosmeticSlot = z.infer<typeof cosmeticSlotSchema>;
export const cosmeticItemSchema = z.object({
  id, name: z.string().min(1).max(80), slot: cosmeticSlotSchema,
  rarity: z.enum(['R', 'SR', 'SSR']),
  assetUrl: z.string().regex(/^\/art\/cosmetics\/[a-z0-9-]+\.svg$/),
}).strict();
export type CosmeticItem = z.infer<typeof cosmeticItemSchema>;

export const bannerVersionSchema = z.object({
  id, version: id, name: z.string().min(1).max(80),
  prices: z.object({ single: count.positive(), ten: count.positive() }).strict(),
  weights: z.object({ R: count.positive(), SR: count.positive(), SSR: count.positive() }).strict(),
  guarantees: z.object({ sr: count.positive(), ssr: count.positive() }).strict(),
  items: z.array(cosmeticItemSchema).length(12),
}).strict().superRefine((banner, ctx) => {
  const reject = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (new Set(banner.items.map((item) => item.id)).size !== banner.items.length) reject('Item IDs must be unique');
  if (banner.weights.R + banner.weights.SR + banner.weights.SSR !== 100) reject('Rarity weights must total 100');
  if (banner.guarantees.sr >= banner.guarantees.ssr) reject('SSR guarantee must follow SR guarantee');
  for (const slot of ['avatar', 'cardBack'] as const) {
    for (const [rarity, expected] of [['R', 3], ['SR', 2], ['SSR', 1]] as const) {
      if (banner.items.filter((item) => item.slot === slot && item.rarity === rarity).length !== expected) {
        reject('Each slot requires three R, two SR and one SSR');
      }
    }
  }
});
export type BannerVersion = z.infer<typeof bannerVersionSchema>;
export const bannerProgressSchema = z.object({ sinceSr: count, sinceSsr: count }).strict();
export type BannerProgress = z.infer<typeof bannerProgressSchema>;
export const drawResultSchema = z.object({
  itemId: id, item: cosmeticItemSchema, rarity: z.enum(['R', 'SR', 'SSR']), duplicate: z.boolean(), progress: bannerProgressSchema,
}).strict();
export type DrawResult = z.infer<typeof drawResultSchema>;
export const pullRequestSchema = z.object({ requestId: z.uuid(), bannerVersion: id, count: z.union([z.literal(1), z.literal(10)]) }).strict();
export type PullRequest = z.infer<typeof pullRequestSchema>;
export const pullReceiptSchema = z.object({
  requestId: z.uuid(), bannerVersion: id, count: z.union([z.literal(1), z.literal(10)]),
  cost: count.positive(), results: z.array(drawResultSchema).min(1).max(10),
  progress: bannerProgressSchema, committedAt: z.iso.datetime(), walletRevision: count,
}).strict().refine((receipt) => receipt.results.length === receipt.count, 'Receipt result count must match purchase');
export type PullReceipt = z.infer<typeof pullReceiptSchema>;
export const equipmentUpdateSchema = z.object({ itemId: id.nullable(), expectedRevision: count }).strict();
export const equipmentSelectionSchema = z.object({ itemId: id.nullable(), revision: count }).strict();
export const equipmentViewSchema = z.object({ avatar: equipmentSelectionSchema, cardBack: equipmentSelectionSchema }).strict();
export type EquipmentView = z.infer<typeof equipmentViewSchema>;
export const handEquipmentSchema = z.object({ avatar: cosmeticItemSchema.nullable(), cardBack: cosmeticItemSchema.nullable() }).strict();
export type HandEquipment = z.infer<typeof handEquipmentSchema>;
export const collectionViewSchema = z.object({
  items: z.array(z.object({ item: cosmeticItemSchema, acquiredAt: z.iso.datetime() }).strict()).max(100),
  nextCursor: id.nullable(), equipment: equipmentViewSchema,
}).strict();
export type CollectionView = z.infer<typeof collectionViewSchema>;
