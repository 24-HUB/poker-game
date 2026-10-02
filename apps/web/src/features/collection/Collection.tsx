'use client';

import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { bannerVersionSchema, collectionViewSchema, equipmentViewSchema, resultSchema, type CollectionView, type CosmeticItem, type CosmeticSlot } from '@poker/contracts';
import Link from 'next/link';
import { UserRound, Club } from 'lucide-react';
import { apiGet } from '../../lib/api';
import { economyMutation } from '../../lib/economy-api';
import { SessionBoundary, useSession } from '../auth/SessionBoundary';
import { useAccountSync } from './useAccountSync';

const collectionResponse = resultSchema(collectionViewSchema);
const bannerResponse = resultSchema(bannerVersionSchema);
const equipmentResponse = resultSchema(equipmentViewSchema);

export function Collection() {
  const { session, refresh } = useSession();
  const accountId = session.status === 'authenticated' ? session.account.accountId : null;
  const activeAccount = useRef(accountId); activeAccount.current = accountId;
  useAccountSync(accountId);
  const queryClient = useQueryClient();
  const owned = useInfiniteQuery<CollectionView, Error, InfiniteData<CollectionView>, (string | null)[], string | null>({ queryKey: ['collection', accountId], enabled: Boolean(accountId), initialPageParam: null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    queryFn: async ({ pageParam }) => {
      const result = await apiGet(`/api/collection${pageParam ? `?after=${encodeURIComponent(pageParam)}` : ''}`, collectionResponse);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    }, refetchOnWindowFocus: true,
  });
  const banner = useQuery({ queryKey: ['banner'], enabled: Boolean(accountId), queryFn: async () => {
    const result = await apiGet('/api/banner', bannerResponse);
    if (result.error) throw new Error(result.error.message);
    return result.data;
  } });
  const [slot, setSlot] = useState<CosmeticSlot>('avatar');
  const [selection, setSelection] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const preview = useRef<HTMLElement>(null);
  const selectItem = (itemId: string | null) => {
    setSelection(itemId); setMessage(null);
    if (window.matchMedia('(max-width: 767px)').matches) {
      preview.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
      preview.current?.focus({ preventScroll: true });
    }
  };
  useEffect(() => { setSelection(null); setWorking(false); setMessage(null); }, [accountId]);
  const inventory = owned.data?.pages.flatMap((page) => page.items) ?? [];
  const ownedIds = new Set(inventory.map((entry) => entry.item.id));
  const combined = new Map<string, CosmeticItem>((banner.data?.items ?? []).map((item) => [item.id, item]));
  for (const entry of inventory) combined.set(entry.item.id, entry.item);
  const items = [...combined.values()].filter((item) => item.slot === slot)
    .sort((a, b) => Number(ownedIds.has(b.id)) - Number(ownedIds.has(a.id)) || a.name.localeCompare(b.name));
  const selected = selection ? items.find((item) => item.id === selection) : null;
  const equipment = owned.data?.pages[0]?.equipment;
  const equipped = equipment?.[slot].itemId ?? null;

  const equip = async () => {
    if (!accountId || !equipment || working || (selection && !ownedIds.has(selection))) return;
    const owner = accountId; setWorking(true); setMessage(null);
    const result = await economyMutation(`/api/equipment/${slot}`, 'PUT', { itemId: selection, expectedRevision: equipment[slot].revision }, equipmentResponse);
    void queryClient.invalidateQueries({ queryKey: ['collection', owner] });
    void queryClient.invalidateQueries({ queryKey: ['equipment', owner] });
    if (activeAccount.current !== owner) return;
    setWorking(false);
    setMessage(result.error ? result.error.message : 'Selection saved. It applies at the next hand; the current hand stays unchanged.');
    if (result.error?.code === 'UNAUTHENTICATED') void refresh();
  };
  const changeSlot = (next: CosmeticSlot) => { setSlot(next); setSelection(null); setMessage(null); };

  return <SessionBoundary><section className="collection-page" aria-label="Cosmetic collection">
    <header className="page-heading"><div><h1>Collection</h1><p>Your companions and card backs, ready for the next deal.</p></div>
      <Link className="secondary-button" href="/pulls">Open invitations</Link></header>
    <div className="collection-tabs" role="tablist" aria-label="Cosmetic type">
      {(['avatar', 'cardBack'] as const).map((value, index) => <button key={value} type="button" role="tab" id={`tab-${value}`}
        aria-selected={slot === value} aria-controls={`panel-${value}`} tabIndex={slot === value ? 0 : -1}
        ref={(element) => { tabs.current[index] = element; }} onClick={() => changeSlot(value)} onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
          changeSlot(next === 0 ? 'avatar' : 'cardBack'); tabs.current[next]?.focus();
        }}>{value === 'avatar' ? 'Avatars' : 'Card backs'}</button>)}
    </div>
    <p className="equipment-explanation">Equipment changes apply at the next hand. Every cosmetic is appearance only.</p>
    {owned.error || banner.error ? <p role="alert">Collection data is unavailable. <button type="button" onClick={() => { void owned.refetch(); void banner.refetch(); }}>Retry collection</button></p> : null}
    {message ? <p className="collection-notice" role="status">{message}</p> : null}
    {!owned.data ? <p role="status">Loading your collection…</p> : <div className="collection-layout" role="tabpanel" id={`panel-${slot}`} aria-labelledby={`tab-${slot}`}>
      <div><p>{inventory.length ? `${inventory.filter((entry) => entry.item.slot === slot).length} owned ${slot === 'avatar' ? 'avatars' : 'card backs'}` : 'Your free defaults are ready. Earn tickets at the poker table to collect more.'}</p>
        <ul className="cosmetic-grid cosmetic-grid--collection">
          <li className="cosmetic-item"><button className="cosmetic-choice" type="button" aria-pressed={selection === null} onClick={() => selectItem(null)}>
            <span className="cosmetic-default">{slot === 'avatar' ? <UserRound size={64} aria-hidden="true" /> : <Club size={64} aria-hidden="true" />}</span>
            <h3>Club default</h3><p>Free · {equipped === null ? 'Equipped' : 'Available'}</p></button></li>
          {items.map((item) => <li className="cosmetic-item" key={item.id}><button className="cosmetic-choice" type="button"
            aria-pressed={selection === item.id} onClick={() => selectItem(item.id)}>
            <img src={item.assetUrl} alt="" width="160" height="160" loading="lazy" />
            <span className={`rarity rarity--${item.rarity.toLowerCase()}`}>{item.rarity}</span><h3>{item.name}</h3>
            <p>{equipped === item.id ? 'Equipped' : ownedIds.has(item.id) ? 'Owned' : 'Not owned'}</p></button></li>)}
        </ul>{owned.hasNextPage ? <button className="secondary-button" type="button" disabled={owned.isFetchingNextPage} onClick={() => void owned.fetchNextPage()}>Load more owned items</button> : null}
      </div>
      <aside ref={preview} tabIndex={-1} className="equipment-preview" aria-label="Equipment preview">
        {selected ? <img src={selected.assetUrl} alt={selected.name} width="256" height="256" /> : <div className="cosmetic-default">{slot === 'avatar' ? <UserRound size={96} aria-hidden="true" /> : <Club size={96} aria-hidden="true" />}</div>}
        <h2>{selected?.name ?? 'Club default'}</h2><p>{selected ? `${selected.rarity} · ${ownedIds.has(selected.id) ? 'Owned' : 'Not owned'}` : 'Always available. No invitation needed.'}</p>
        <button className="primary-button" type="button" disabled={working || owned.isFetching || (selection !== null && !ownedIds.has(selection)) || equipped === selection}
          onClick={() => void equip()}>{working ? 'Saving selection…' : equipped === selection ? 'Equipped' : slot === 'avatar' ? 'Equip avatar' : 'Equip card back'}</button>
        {selected && !ownedIds.has(selected.id) ? <p>Find this cosmetic through invitations before equipping it.</p> : null}
      </aside>
    </div>}
  </section></SessionBoundary>;
}
