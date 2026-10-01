'use client';

import { useEffect, useRef, useState } from 'react';
import type { PullReceipt } from '@poker/contracts';
import Link from 'next/link';

export function PullReveal({ receipt, onContinue }: { receipt: PullReceipt; onContinue: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [revealed]);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setRevealed(true); return; }
    const timer = window.setTimeout(() => setRevealed(true), 900);
    return () => window.clearTimeout(timer);
  }, [receipt.requestId]);
  return <section className="pull-reveal" aria-label="Committed invitation results">
    <header><h2 ref={heading} tabIndex={-1}>{revealed ? 'Your invitations' : 'Your invitations are ready'}</h2>
      <p>{receipt.cost} tickets spent · results saved to your collection</p></header>
    {!revealed ? <div className="invitation-envelope"><svg viewBox="0 0 260 190" aria-hidden="true">
      <circle cx="130" cy="94" r="88" fill="none" stroke="var(--accent)" strokeWidth="1" strokeDasharray="2 9" />
      <path d="M34 45h192v111H34z" fill="var(--surface)" stroke="var(--brand)" strokeWidth="2" />
      <path d="m34 45 96 66 96-66M34 156l73-61m119 61-73-61" fill="none" stroke="var(--line)" strokeWidth="2" />
      <path d="m34 45 96-30 96 30-96 66z" fill="var(--surface-soft)" stroke="var(--brand)" strokeWidth="2" />
      <g className="invitation-envelope__seal">
        <circle cx="130" cy="92" r="24" fill="var(--brand)" stroke="var(--accent)" strokeWidth="2" />
        <path d="M119 94c-8-15-6-23-2-22 4 1 8 10 9 17 3-8 8-18 12-16 5 3-1 15-4 19 8 4 10 13 5 17-5 5-20 5-24-1-4-5-1-11 4-14Z" fill="var(--surface)" />
        <circle cx="135" cy="99" r="1.5" fill="var(--brand)" />
      </g>
      <path d="m130 0 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="var(--accent)" />
    </svg>
      <p>The celestial seal opens…</p><button className="secondary-button" type="button" onClick={() => setRevealed(true)}>Skip reveal</button></div>
      : <><ul className="cosmetic-grid" aria-label="Pull results">{receipt.results.map((result, index) => <li className="cosmetic-item" key={`${receipt.requestId}-${index}`}>
        <img src={result.item.assetUrl} alt="" width="160" height="160" />
        <span className={`rarity rarity--${result.rarity.toLowerCase()}`}>{result.rarity}</span>
        <h3>{result.item.name}</h3><p>{result.item.slot === 'avatar' ? 'Avatar' : 'Card back'} · {result.duplicate ? 'Duplicate · no refund' : 'New'}</p>
      </li>)}</ul><div className="collection-actions"><button className="primary-button" type="button" onClick={onContinue}>Continue</button>
        <Link className="secondary-button" href="/collection">View in Collection</Link></div></>}
  </section>;
}
