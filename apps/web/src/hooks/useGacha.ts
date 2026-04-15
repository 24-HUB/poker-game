import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gachaApi, type GachaItem } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useCollectionStore } from '../stores/collectionStore';

const PITY_SR  = 10;
const PITY_SSR = 90;

export function useGacha() {
  const qc = useQueryClient();
  const { updateChips } = useAuthStore();
  const { pityCountSR, pityCountSSR, setPityCountSR, setPityCountSSR, setLastPullResults } =
    useCollectionStore();

  const { data: banners, isLoading: bannersLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: gachaApi.banners,
  });

  const { mutate: pull, isPending: isPulling } = useMutation({
    mutationFn: (count: 1 | 10) => gachaApi.pull(count),
    onSuccess: (data, count) => {
      setLastPullResults(data.items);
      updateChips(data.chips);

      // Update local pity counters based on results
      let sr = pityCountSR;
      let ssr = pityCountSSR;
      for (const item of data.items) {
        if (item.rarity === 'SSR') {
          sr = 0;
          ssr = 0;
        } else if (item.rarity === 'SR') {
          sr = 0;
          ssr += 1;
        } else {
          sr += 1;
          ssr += 1;
        }
      }
      setPityCountSR(sr);
      setPityCountSSR(ssr);

      qc.invalidateQueries({ queryKey: ['collection'] });
    },
  });

  const banner = banners?.[0];

  /** How many pulls until guaranteed SR */
  const untilSR  = Math.max(0, PITY_SR  - pityCountSR);
  /** How many pulls until guaranteed SSR */
  const untilSSR = Math.max(0, PITY_SSR - pityCountSSR);

  return {
    banner,
    bannersLoading,
    pull,
    isPulling,
    pityCountSR,
    pityCountSSR,
    untilSR,
    untilSSR,
  };
}
