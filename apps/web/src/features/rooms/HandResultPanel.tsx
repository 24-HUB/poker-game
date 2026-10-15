import type { CommittedHandResult } from '@poker/contracts';
import { Crown } from 'lucide-react';
import { HiddenCards, PlayingCard } from './PlayingCard';

const format = (amount: number) => amount.toLocaleString('en-US');
const rankNames: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'jack', 12: 'queen', 13: 'king', 14: 'ace' };
export function WinnerBadge() { return <span className="poker-winner"><Crown aria-hidden="true" />Winner</span>; }

export function resultNames(result: CommittedHandResult, names: Record<string, string> = {}) {
  return { ...names, ...Object.fromEntries(result.presentation?.participants.map((player) => [player.accountId, `${player.displayName}${player.kind === 'bot' ? ' (Bot)' : ''}`]) ?? []) };
}
export function resultSummary(result: CommittedHandResult, names: Record<string, string> = {}) {
  const players = resultNames(result, names);
  if (result.winners.length > 1) return result.presentation?.pots.some((pot) => pot.winners.length === 1) ? 'Multiple pot winners' : 'Split pot';
  const id = result.winners[0]!;
  const detail = result.presentation?.rankings.find((rank) => rank.accountId === id);
  if (result.presentation?.outcomeReason === 'fold') {
    const award = result.presentation.pots.flatMap((pot) => pot.payouts).filter((entry) => entry.accountId === id).reduce((sum, entry) => sum + entry.amount, 0);
    return `${players[id] ?? id} wins ${format(award)} chips`;
  }
  return `${players[id] ?? id} wins${detail ? ` · ${detail.handName}` : ''}`;
}

export function HandResultPanel({ result, names = {}, history = false }: { result: CommittedHandResult; names?: Record<string, string>; history?: boolean }) {
  const detail = result.presentation;
  const players = resultNames(result, names);
  const ordered = [...result.finalStacks].sort((a, b) => Number(result.winners.includes(b.accountId)) - Number(result.winners.includes(a.accountId)));
  const Heading = history ? 'h3' : 'h2';
  return <section className="hand-result" aria-label={`Hand ${result.handNumber} result`}>
    <header className="hand-result__header"><Heading>{history ? `Hand ${result.handNumber}` : `Hand ${result.handNumber} result`}</Heading>
      {detail ? <span className="hand-result__reason">{detail.outcomeReason === 'fold' ? 'Won by fold' : 'Showdown'}</span> : null}</header>
    <p className="hand-result__outcome">Winner: {result.winners.map((id) => players[id] ?? id).join(', ')}</p>
    {detail?.outcomeReason === 'fold' ? <p>All opponents folded · No showdown</p> : null}
    {!detail ? <p>Detailed cards unavailable</p> : null}
    <div className="hand-result__players">{ordered.map(({ accountId, amount: stack }) => {
      const participant = detail?.participants.find((player) => player.accountId === accountId);
      const rank = detail?.rankings.find((entry) => entry.accountId === accountId);
      const revealed = result.revealedCards.find((entry) => entry.accountId === accountId);
      const payout = result.payouts.find((entry) => entry.accountId === accountId)?.amount ?? 0;
      const returned = detail?.uncalledReturns.filter((entry) => entry.accountId === accountId).reduce((sum, entry) => sum + entry.amount, 0) ?? 0;
      const contribution = result.contributions.find((entry) => entry.accountId === accountId)?.amount ?? 0;
      const winner = result.winners.includes(accountId);
      return <article key={accountId} aria-label={`${players[accountId] ?? accountId} result`} className={`hand-result__player${winner ? ' hand-result__player--winner' : ''}`}>
        <div className="hand-result__identity"><img src={participant?.equipment?.avatar?.assetUrl ?? '/art/hostess.png'} alt="" width="48" height="48" />
          <strong className="hand-result__name">{players[accountId] ?? accountId}</strong>{winner ? <WinnerBadge /> : null}</div>
        <div className="hand-result__accounting"><span>{detail ? `Awarded ${format(payout - returned)} chips` : `Payout ${format(payout)} chips (includes any returned chips)`}</span>
          {returned > 0 ? <span>Returned {format(returned)} chips</span> : null}
          <span>Net {payout - contribution > 0 ? '+' : ''}{format(payout - contribution)}</span><span>Stack {format(stack)}</span></div>
        {rank ? <div className="hand-result__hand"><strong>{rank.handName}</strong><p>Best five cards</p>
          <div className="hand-result__cards" role="group" aria-label={`${players[accountId]} best five cards`}>{rank.bestFive.map((card) => <PlayingCard key={card} card={card} highlighted={rank.combinationCards.includes(card)} />)}</div>
          {rank.kickers.length ? <p>Kickers: {rank.kickers.map((value) => rankNames[value]).join(', ')}</p> : null}
          {rank.playsBoard ? <p>Plays the board</p> : null}</div> : revealed ? <div className="hand-result__hand"><p>Revealed cards · Detailed ranking unavailable</p><div className="hand-result__cards">{revealed.cards.map((card) => <PlayingCard key={card} card={card} />)}</div></div> : <div className="hand-result__hand"><p>{participant?.folded ? 'Folded · Cards not revealed' : 'Cards not revealed'}</p><HiddenCards assetUrl={participant?.equipment?.cardBack?.assetUrl} /></div>}
      </article>;
    })}</div>
    {detail ? <div className="hand-result__pots" aria-label="Pot awards">{detail.pots.map((pot, index) => {
      const winningRank = detail.rankings.find((rank) => rank.accountId === pot.winners[0]);
      const runnerRanks = detail.rankings.filter((rank) => pot.eligibleAccountIds.includes(rank.accountId) && !pot.winners.includes(rank.accountId));
      const kicker = winningRank && runnerRanks.length && runnerRanks.every((rank) => rank.rank.category === winningRank.rank.category)
        ? winningRank.rank.tiebreak.find((value, i) => runnerRanks.some((rank) => rank.rank.tiebreak[i] !== value)) : undefined;
      const boardTie = pot.winners.length > 1 && pot.winners.every((id) => detail.rankings.find((rank) => rank.accountId === id)?.playsBoard);
      return <p key={index}><strong>{index === 0 ? 'Main pot' : `Side pot ${index}`} · {format(pot.amount)} chips</strong> — {pot.payouts.map((entry) => `${players[entry.accountId] ?? entry.accountId}: ${format(entry.amount)}`).join(' · ')}
        {boardTie ? ` · ${pot.winners.length === 2 ? 'Both players' : 'All winners'} play the board` : pot.winners.length > 1 ? ' · Split pot' : null}
        {kicker && winningRank?.kickers.includes(kicker) ? ` · ${players[winningRank.accountId]} wins with ${rankNames[kicker]} kicker` : null}</p>;
    })}</div> : null}
  </section>;
}
