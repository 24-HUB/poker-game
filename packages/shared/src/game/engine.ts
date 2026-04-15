import { Card, GameState, PlayerState, GamePhase, PlayerStatus } from '../types/game';
import { GameAction } from '../types/socket';
import { createDeck, shuffle } from './deck';
import { evaluateHand, HandResult, findWinner } from './hand';

export class GameEngine {
  private deck: Card[] = [];

  constructor(
    private players: { id: string; username: string; chips: number }[],
    private smallBlind: number,
    private bigBlind: number
  ) {}

  /**
   * Initializes a new game state.
   */
  startGame(dealerIndex: number = 0): GameState {
    this.deck = shuffle(createDeck());
    
    const players: PlayerState[] = this.players.map((p, i) => ({
      id: p.id,
      username: p.username,
      chips: p.chips,
      bet: 0,
      cards: [this.deck.pop()!, this.deck.pop()!],
      status: 'active',
      isDealer: i === dealerIndex,
      isTurn: false,
      hasActed: false,
      totalContributed: 0,
    }));

    const sbIndex = (dealerIndex + 1) % players.length;
    const bbIndex = (dealerIndex + 2) % players.length;
    const utgIndex = (dealerIndex + 3) % players.length;

    // Post blinds
    players[sbIndex].chips -= this.smallBlind;
    players[sbIndex].bet = this.smallBlind;
    players[sbIndex].totalContributed = this.smallBlind;
    players[bbIndex].chips -= this.bigBlind;
    players[bbIndex].bet = this.bigBlind;
    players[bbIndex].totalContributed = this.bigBlind;

    players[utgIndex].isTurn = true;

    return {
      phase: 'pre_flop',
      players,
      communityCards: [],
      pot: this.smallBlind + this.bigBlind,
      currentBet: this.bigBlind,
      activePlayerId: players[utgIndex].id,
      dealerIndex,
      round: 1,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
    };
  }

  /**
   * Applies a player action and returns the new state.
   */
  applyAction(state: GameState, playerId: string, action: GameAction): GameState {
    if (state.phase === 'showdown') {
      throw new Error('Game is over');
    }
    if (state.activePlayerId !== playerId) {
      throw new Error("Not your turn");
    }

    const newState = { ...state, players: state.players.map(p => ({ ...p })) };
    const player = newState.players.find(p => p.id === playerId)!;

    switch (action.type) {
      case 'fold':
        player.status = 'folded';
        break;
      case 'check':
        if (player.bet < newState.currentBet) {
          throw new Error("Cannot check, must call or fold");
        }
        break;
      case 'call':
        const callAmount = newState.currentBet - player.bet;
        if (player.chips <= callAmount) {
          // All-in call
          player.bet += player.chips;
          newState.pot += player.chips;
          player.totalContributed += player.chips;
          player.chips = 0;
          player.status = 'all_in';
        } else {
          player.bet += callAmount;
          newState.pot += callAmount;
          player.totalContributed += callAmount;
          player.chips -= callAmount;
        }
        break;
      case 'raise': {
        const minRaise = newState.currentBet * 2;
        if (action.amount < minRaise && action.amount < player.chips + player.bet) {
          throw new Error(`Minimum raise is ${minRaise}`);
        }
        const raiseAmount = action.amount - player.bet;
        if (player.chips <= raiseAmount) {
          // All-in raise: bet all remaining chips
          player.bet += player.chips;
          newState.pot += player.chips;
          player.totalContributed += player.chips;
          player.chips = 0;
          newState.currentBet = Math.max(newState.currentBet, player.bet);
        } else {
          player.bet += raiseAmount;
          newState.pot += raiseAmount;
          player.totalContributed += raiseAmount;
          player.chips -= raiseAmount;
          newState.currentBet = action.amount;
        }

        // Set all_in status if chips exhausted
        if (player.chips === 0) {
          player.status = 'all_in';
        }

        // After a raise everyone (including the raiser) must act again;
        // the raiser's turn will come back around and they'll check.
        newState.players.forEach(p => {
          if (p.status === 'active' || p.status === 'all_in') {
            p.hasActed = false;
          }
        });
        break;
      }
    }

    player.isTurn = false;
    // For raises, hasActed was reset to false for everyone (including raiser)
    // so the raiser comes back around to close action. For all other actions, mark as acted.
    if (action.type !== 'raise') {
      player.hasActed = true;
    }

    // Check if betting round is over
    if (this.isBettingRoundOver(newState)) {
      return this.advancePhase(newState);
    } else {
      const nextPlayer = this.getNextActivePlayer(newState, playerId);
      nextPlayer.isTurn = true;
      newState.activePlayerId = nextPlayer.id;
    }

    return newState;
  }

  /**
   * Advances the game to the next phase.
   */
  advancePhase(state: GameState): GameState {
    const newState = { ...state, players: state.players.map(p => ({ ...p, bet: 0, isTurn: false, hasActed: false })) };
    newState.currentBet = 0;
    
    // Fast-forward to showdown if 1 or 0 players left who haven't folded
    if (newState.players.filter(p => p.status !== 'folded').length <= 1) {
       newState.phase = 'showdown';
       return newState;
    }

    switch (state.phase) {
      case 'pre_flop':
        newState.phase = 'flop';
        newState.communityCards = [this.deck.pop()!, this.deck.pop()!, this.deck.pop()!];
        break;
      case 'flop':
        newState.phase = 'turn';
        newState.communityCards.push(this.deck.pop()!);
        break;
      case 'turn':
        newState.phase = 'river';
        newState.communityCards.push(this.deck.pop()!);
        break;
      case 'river':
        newState.phase = 'showdown';
        return newState;
    }

    // Set turn to first active player after dealer
    const firstPlayer = this.getNextActivePlayer(newState, newState.players[newState.dealerIndex].id);
    firstPlayer.isTurn = true;
    newState.activePlayerId = firstPlayer.id;

    // If only one player active or everyone all-in, skip betting
    if (this.countActivePlayers(newState) <= 1) {
       return this.advancePhase(newState);
    }

    return newState;
  }

  /**
   * Resolves the winners and payouts at showdown.
   */
  resolveShowdown(state: GameState): { winners: string[]; payouts: Map<string, number>; handResults: Map<string, HandResult> } {
    const activePlayers = state.players.filter(p => p.status !== 'folded');

    // Early return if only one player remains (everyone else folded — no hand eval needed)
    if (activePlayers.length === 1) {
      const payouts = new Map<string, number>();
      payouts.set(activePlayers[0].id, state.pot);
      return { winners: [activePlayers[0].id], payouts, handResults: new Map() };
    }

    const handResults = new Map<string, HandResult>();
    const hands = new Map<string, Card[]>();

    for (const p of activePlayers) {
      if (p.cards && p.cards.length > 0) {
        const result = evaluateHand([...p.cards, ...state.communityCards]);
        handResults.set(p.id, result);
        hands.set(p.id, p.cards);
      }
    }

    // Side pot algorithm based on totalContributed
    const payouts = new Map<string, number>();
    
    // Create an array of players who contributed to the pot
    let contributors = state.players
        .filter(p => p.totalContributed > 0)
        .sort((a, b) => a.totalContributed - b.totalContributed);
        
    let currentPotBase = 0;
    
    while (contributors.length > 0) {
       const smallestContribution = contributors[0].totalContributed - currentPotBase;
       if (smallestContribution > 0) {
           let sidePot = 0;
           for (const p of contributors) {
               sidePot += smallestContribution;
           }
           
           const activeInPot = contributors.filter(p => p.status !== 'folded');
           if (activeInPot.length > 0) {
               const potHands = new Map<string, Card[]>();
               for (const p of activeInPot) potHands.set(p.id, hands.get(p.id)!);
               const potWinners = findWinner(potHands, state.communityCards);
               
               const winAmount = Math.floor(sidePot / potWinners.length);
               for (const id of potWinners) {
                   payouts.set(id, (payouts.get(id) || 0) + winAmount);
               }
           }
           currentPotBase += smallestContribution;
       }
       contributors.shift();
    }

    const winners = Array.from(payouts.keys());
    return { winners, payouts, handResults };
  }

  private isBettingRoundOver(state: GameState): boolean {
    const activePlayers = state.players.filter(p => p.status === 'active' || p.status === 'all_in');
    const nonFolded = state.players.filter(p => p.status !== 'folded');
    
    // If only one player left who hasn't folded, round is over
    if (nonFolded.length <= 1) return true;

    // Check if everyone has acted and matched the current bet
    const allActed = activePlayers.every(p => p.hasActed || p.status === 'all_in');
    const allMatched = activePlayers.every(p => p.status === 'all_in' || p.bet === state.currentBet);
    
    return allActed && allMatched;
  }

  private getNextActivePlayer(state: GameState, currentId: string): PlayerState {
    const currentIndex = state.players.findIndex(p => p.id === currentId);
    let nextIndex = (currentIndex + 1) % state.players.length;

    while (state.players[nextIndex].status !== 'active' && nextIndex !== currentIndex) {
      nextIndex = (nextIndex + 1) % state.players.length;
    }

    return state.players[nextIndex];
  }

  private countActivePlayers(state: GameState): number {
    return state.players.filter(p => p.status === 'active').length;
  }
}
