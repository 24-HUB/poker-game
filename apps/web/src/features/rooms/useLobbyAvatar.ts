'use client';

import { useQuery } from '@tanstack/react-query';
import { bannerVersionSchema, equipmentViewSchema, resultSchema } from '@poker/contracts';
import { apiGet } from '../../lib/api';

const equipmentResponse = resultSchema(equipmentViewSchema);
const bannerResponse = resultSchema(bannerVersionSchema);

export function useLobbyAvatar(accountId: string | null) {
  const equipment = useQuery({ queryKey: ['equipment', accountId], enabled: Boolean(accountId), queryFn: async () => {
    const result = await apiGet('/api/equipment', equipmentResponse);
    if (result.error) throw new Error(result.error.message);
    return result.data;
  } });
  const banner = useQuery({ queryKey: ['banner'], enabled: Boolean(accountId), queryFn: async () => {
    const result = await apiGet('/api/banner', bannerResponse);
    if (result.error) throw new Error(result.error.message);
    return result.data;
  } });
  const itemId = equipment.data?.avatar.itemId;
  const avatar = itemId ? banner.data?.items.find((item) => item.id === itemId && item.slot === 'avatar') : null;
  return { avatar: avatar ?? null, pending: Boolean(accountId) && (!equipment.data || Boolean(itemId) && !avatar) };
}
