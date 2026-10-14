const ranks = '23456789TJQKA';
const rankNames = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
const suits = ['♣', '♦', '♥', '♠'];
const suitNames = ['clubs', 'diamonds', 'hearts', 'spades'];

export function PlayingCard({ card, community = false, highlighted = false }: { card: number; community?: boolean; highlighted?: boolean }) {
  const suit = Math.floor(card / 13);
  return <span role="img" aria-label={`${rankNames[card % 13]} of ${suitNames[suit]}`}
    className={`poker-card poker-card--${suit === 1 || suit === 2 ? 'red' : 'black'} poker-card--suit-${suit}${community ? ' poker-card--dealt' : ''}${highlighted ? ' poker-card--combination' : ''}`}>
    <span aria-hidden="true">{ranks[card % 13]}</span><span aria-hidden="true">{suits[suit]}</span>
  </span>;
}

export function HiddenCards({ assetUrl }: { assetUrl?: string }) {
  return <span role="group" className="poker-seat__cards" aria-label="Cards not revealed">{[0, 1].map((index) =>
    <span className="poker-card poker-card--back" key={index} aria-hidden="true">{assetUrl ? <img src={assetUrl} alt="" width="35" height="48" /> : <span>✦</span>}</span>)}</span>;
}
