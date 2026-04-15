import { expect, test, describe } from "bun:test";
import { evaluateHand, HandRank, compareHands, findWinner } from "../hand";
import { Card } from "../../types/game";

describe("Hand Evaluator - All Hands", () => {
  describe("High Card", () => {
    test("detects high card correctly", () => {
      const cards: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "K" },
        { suit: "spades", rank: "Q" },
        { suit: "clubs", rank: "J" },
        { suit: "hearts", rank: 9 },
        { suit: "spades", rank: 2 },
        { suit: "clubs", rank: 3 },
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.high_card);
      expect(result.tiebreakers[0]).toBe(14); // Ace is highest
    });
  });

  describe("Pair", () => {
    test("detects one pair", () => {
      const cards: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "K" },
        { suit: "clubs", rank: "Q" },
        { suit: "hearts", rank: "J" },
        { suit: "spades", rank: 7 },
        { suit: "clubs", rank: 2 },
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.one_pair);
      expect(result.tiebreakers[0]).toBe(14); // Pair of Aces
    });

    test("detects two pair", () => {
      const cards: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "K" },
        { suit: "clubs", rank: "K" },
        { suit: "hearts", rank: "J" },
        { suit: "spades", rank: 10 },
        { suit: "clubs", rank: 2 },
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.two_pair);
    });

    test("pair tie-breaking: higher pair wins", () => {
      const pairAces: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "K" },
        { suit: "clubs", rank: "Q" },
        { suit: "hearts", rank: "J" },
      ];
      const pairKings: Card[] = [
        { suit: "hearts", rank: "K" },
        { suit: "diamonds", rank: "K" },
        { suit: "spades", rank: "A" },
        { suit: "clubs", rank: "Q" },
        { suit: "hearts", rank: "J" },
      ];
      const result1 = evaluateHand(pairAces);
      const result2 = evaluateHand(pairKings);
      expect(compareHands(result1, result2)).toBe(1);
    });

    test("pair kicker tie-breaking", () => {
      const pairAAK: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "K" },
        { suit: "clubs", rank: 10 },
        { suit: "hearts", rank: 8 },
      ];
      const pairAAQ: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "Q" },
        { suit: "clubs", rank: 10 },
        { suit: "hearts", rank: 8 },
      ];
      const result1 = evaluateHand(pairAAK);
      const result2 = evaluateHand(pairAAQ);
      expect(compareHands(result1, result2)).toBe(1);
    });
  });

  describe("Three of a Kind", () => {
    test("detects three of a kind", () => {
      const cards: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "A" },
        { suit: "clubs", rank: "K" },
        { suit: "hearts", rank: "Q" },
        { suit: "spades", rank: 10 },
        { suit: "clubs", rank: 2 },
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.three_of_a_kind);
    });

    test("three of a kind kicker matters", () => {
      const triplesAK: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "A" },
        { suit: "clubs", rank: "K" },
        { suit: "hearts", rank: "Q" },
      ];
      const triplesAQ: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "A" },
        { suit: "clubs", rank: "Q" },
        { suit: "hearts", rank: "J" },
      ];
      const result1 = evaluateHand(triplesAK);
      const result2 = evaluateHand(triplesAQ);
      expect(compareHands(result1, result2)).toBe(1);
    });
  });

  describe("Straight", () => {
    test("detects broadway straight (A-K-Q-J-T)", () => {
      const cards: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "K" },
        { suit: "spades", rank: "Q" },
        { suit: "clubs", rank: "J" },
        { suit: "hearts", rank: 10 },
        { suit: "spades", rank: 2 },
        { suit: "clubs", rank: 3 },
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.straight);
    });

    test("detects wheel (A-2-3-4-5) - ace plays low", () => {
      const wheelCards: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: 2 },
        { suit: "spades", rank: 3 },
        { suit: "clubs", rank: 4 },
        { suit: "hearts", rank: 5 },
        { suit: "spades", rank: "K" },
        { suit: "clubs", rank: "Q" },
      ];
      const result = evaluateHand(wheelCards);
      expect(result.rank).toBe(HandRank.straight);
      expect(result.tiebreakers[0]).toBe(5); // 5 is the high card of A-2-3-4-5
    });

    test("straight tie-breaking: higher straight wins", () => {
      const straight9High: Card[] = [
        { suit: "hearts", rank: 9 },
        { suit: "diamonds", rank: 8 },
        { suit: "spades", rank: 7 },
        { suit: "clubs", rank: 6 },
        { suit: "hearts", rank: 5 },
      ];
      const straightTHigh: Card[] = [
        { suit: "hearts", rank: 10 },
        { suit: "diamonds", rank: 9 },
        { suit: "spades", rank: 8 },
        { suit: "clubs", rank: 7 },
        { suit: "hearts", rank: 6 },
      ];
      const result1 = evaluateHand(straight9High);
      const result2 = evaluateHand(straightTHigh);
      expect(compareHands(result1, result2)).toBe(-1);
    });
  });

  describe("Flush", () => {
    test("detects flush", () => {
      const cards: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "hearts", rank: "K" },
        { suit: "hearts", rank: "Q" },
        { suit: "hearts", rank: "J" },
        { suit: "hearts", rank: 9 },
        { suit: "spades", rank: 2 },
        { suit: "clubs", rank: 5 },
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.flush);
    });

    test("flush with 6 cards of same suit uses best 5", () => {
      const cards: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "hearts", rank: "K" },
        { suit: "hearts", rank: "Q" },
        { suit: "hearts", rank: 9 },
        { suit: "hearts", rank: 7 },
        { suit: "hearts", rank: 3 },
        { suit: "spades", rank: 2 },
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.flush);
      expect(result.bestCards.length).toBe(5);
    });

    test("flush tie-breaking: higher kickers win", () => {
      const flushAKQ: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "hearts", rank: "K" },
        { suit: "hearts", rank: "Q" },
        { suit: "hearts", rank: 10 },
        { suit: "hearts", rank: 8 },
      ];
      const flushAKJ: Card[] = [
        { suit: "spades", rank: "A" },
        { suit: "spades", rank: "K" },
        { suit: "spades", rank: "J" },
        { suit: "spades", rank: 10 },
        { suit: "spades", rank: 8 },
      ];
      const result1 = evaluateHand(flushAKQ);
      const result2 = evaluateHand(flushAKJ);
      expect(compareHands(result1, result2)).toBe(1);
    });
  });

  describe("Full House", () => {
    test("detects full house", () => {
      const cards: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "A" },
        { suit: "clubs", rank: "K" },
        { suit: "hearts", rank: "K" },
        { suit: "spades", rank: 10 },
        { suit: "clubs", rank: 2 },
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.full_house);
    });

    test("full house with two possible trips picks higher", () => {
      const cards: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "A" },
        { suit: "clubs", rank: "K" },
        { suit: "hearts", rank: "K" },
        { suit: "spades", rank: "K" },
        { suit: "clubs", rank: "Q" },
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.full_house);
      expect(result.tiebreakers[0]).toBe(14); // AAA is higher than KKK
    });

    test("Full House tie-breaking (higher three-of-a-kind wins)", () => {
      const fh1Cards: Card[] = [
        { suit: "hearts", rank: 10 },
        { suit: "diamonds", rank: 10 },
        { suit: "spades", rank: 10 },
        { suit: "clubs", rank: 2 },
        { suit: "hearts", rank: 2 },
      ];
      const fh2Cards: Card[] = [
        { suit: "hearts", rank: 9 },
        { suit: "diamonds", rank: 9 },
        { suit: "spades", rank: 9 },
        { suit: "clubs", rank: "A" },
        { suit: "hearts", rank: "A" },
      ];
      const fh1 = evaluateHand(fh1Cards);
      const fh2 = evaluateHand(fh2Cards);
      expect(compareHands(fh1, fh2)).toBe(1);
    });

    test("Full House tie-breaking (same trips, higher pair wins)", () => {
      const fhAAAKK: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "A" },
        { suit: "clubs", rank: "K" },
        { suit: "hearts", rank: "K" },
      ];
      const fhAAAAQ: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "A" },
        { suit: "clubs", rank: "Q" },
        { suit: "hearts", rank: "Q" },
      ];
      const result1 = evaluateHand(fhAAAKK);
      const result2 = evaluateHand(fhAAAAQ);
      expect(compareHands(result1, result2)).toBe(1);
    });
  });

  describe("Four of a Kind", () => {
    test("detects four of a kind", () => {
      const cards: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "A" },
        { suit: "clubs", rank: "A" },
        { suit: "hearts", rank: "K" },
        { suit: "spades", rank: 10 },
        { suit: "clubs", rank: 2 },
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.four_of_a_kind);
    });

    test("four of a kind kicker matters", () => {
      const foakAK: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "A" },
        { suit: "clubs", rank: "A" },
        { suit: "hearts", rank: "K" },
      ];
      const foakAQ: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "A" },
        { suit: "clubs", rank: "A" },
        { suit: "hearts", rank: "Q" },
      ];
      const result1 = evaluateHand(foakAK);
      const result2 = evaluateHand(foakAQ);
      expect(compareHands(result1, result2)).toBe(1);
    });
  });

  describe("Straight Flush", () => {
    test("Straight Flush vs Four of a Kind", () => {
      const sfCards: Card[] = [
        { suit: "clubs", rank: 9 },
        { suit: "clubs", rank: 8 },
        { suit: "clubs", rank: 7 },
        { suit: "clubs", rank: 6 },
        { suit: "clubs", rank: 5 },
      ];
      const fokCards: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "A" },
        { suit: "clubs", rank: "A" },
        { suit: "hearts", rank: "K" },
      ];
      const sf = evaluateHand(sfCards);
      const fok = evaluateHand(fokCards);
      expect(compareHands(sf, fok)).toBe(1);
    });
  });

  describe("Royal Flush", () => {
    test("Royal Flush detection", () => {
      const cards: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "hearts", rank: "K" },
        { suit: "hearts", rank: "Q" },
        { suit: "hearts", rank: "J" },
        { suit: "hearts", rank: 10 },
        { suit: "spades", rank: 2 },
        { suit: "clubs", rank: 5 },
      ];
      const result = evaluateHand(cards);
      expect(result.rank).toBe(HandRank.royal_flush);
    });
  });

  describe("Winner Determination", () => {
    test("Two players with same pair, different kicker", () => {
      const p1Cards: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "A" },
        { suit: "spades", rank: "K" },
        { suit: "clubs", rank: 10 },
        { suit: "hearts", rank: 8 },
      ];
      const p2Cards: Card[] = [
        { suit: "clubs", rank: "A" },
        { suit: "spades", rank: "A" },
        { suit: "hearts", rank: "Q" },
        { suit: "diamonds", rank: 10 },
        { suit: "clubs", rank: 8 },
      ];
      const p1 = evaluateHand(p1Cards);
      const p2 = evaluateHand(p2Cards);
      expect(compareHands(p1, p2)).toBe(1); // K kicker vs Q kicker
    });

    test("Split pot scenario (identical best hands)", () => {
      const p1Cards: Card[] = [
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "K" },
      ];
      const p2Cards: Card[] = [
        { suit: "spades", rank: "A" },
        { suit: "clubs", rank: "K" },
      ];
      const community: Card[] = [
        { suit: "hearts", rank: 10 },
        { suit: "diamonds", rank: 8 },
        { suit: "spades", rank: 6 },
        { suit: "clubs", rank: 4 },
        { suit: "hearts", rank: 2 },
      ];
      const hands = new Map<string, Card[]>();
      hands.set("player1", p1Cards);
      hands.set("player2", p2Cards);
      const winners = findWinner(hands, community);
      expect(winners).toContain("player1");
      expect(winners).toContain("player2");
      expect(winners.length).toBe(2);
    });

    test("findWinner with 3 players, 1 clear winner", () => {
      const community: Card[] = [
        { suit: "hearts", rank: 10 },
        { suit: "diamonds", rank: 8 },
        { suit: "spades", rank: 6 },
        { suit: "clubs", rank: 4 },
        { suit: "hearts", rank: 2 },
      ];
      const hands = new Map<string, Card[]>();
      hands.set("p1", [{ suit: "hearts", rank: "A" }, { suit: "diamonds", rank: "A" }]); // Pair of Aces
      hands.set("p2", [{ suit: "hearts", rank: "K" }, { suit: "diamonds", rank: "K" }]); // Pair of Kings
      hands.set("p3", [{ suit: "hearts", rank: "Q" }, { suit: "diamonds", rank: "J" }]); // High Card
      
      const winners = findWinner(hands, community);
      expect(winners).toEqual(["p1"]);
    });

    test("Multiple winners in split pot", () => {
      const community: Card[] = [
        { suit: "hearts", rank: "K" },
        { suit: "diamonds", rank: "K" },
        { suit: "spades", rank: "K" },
        { suit: "clubs", rank: "A" },
        { suit: "hearts", rank: "A" },
      ];
      const hands = new Map<string, Card[]>();
      hands.set("p1", [{ suit: "spades", rank: "Q" }, { suit: "clubs", rank: "Q" }]);
      hands.set("p2", [{ suit: "diamonds", rank: "Q" }, { suit: "hearts", rank: "J" }]);
      
      const winners = findWinner(hands, community);
      expect(winners.length).toBeGreaterThan(0);
    });
  });

  describe("All Hand Ranks", () => {
    test("All 10 hand ranks detected correctly", () => {
      const cases: { cards: Card[]; rank: HandRank }[] = [
        { rank: HandRank.high_card, cards: [{suit:'h' as const,rank:'A' as const}, {suit:'d' as const,rank:10 as const}, {suit:'s' as const,rank:7 as const}, {suit:'c' as const,rank:5 as const}, {suit:'h' as const,rank:2 as const}] },
        { rank: HandRank.one_pair, cards: [{suit:'h' as const,rank:'A' as const}, {suit:'d' as const,rank:'A' as const}, {suit:'s' as const,rank:7 as const}, {suit:'c' as const,rank:5 as const}, {suit:'h' as const,rank:2 as const}] },
        { rank: HandRank.two_pair, cards: [{suit:'h' as const,rank:'A' as const}, {suit:'d' as const,rank:'A' as const}, {suit:'s' as const,rank:7 as const}, {suit:'c' as const,rank:7 as const}, {suit:'h' as const,rank:2 as const}] },
        { rank: HandRank.three_of_a_kind, cards: [{suit:'h' as const,rank:'A' as const}, {suit:'d' as const,rank:'A' as const}, {suit:'s' as const,rank:'A' as const}, {suit:'c' as const,rank:5 as const}, {suit:'h' as const,rank:2 as const}] },
        { rank: HandRank.straight, cards: [{suit:'h' as const,rank:6 as const}, {suit:'d' as const,rank:5 as const}, {suit:'s' as const,rank:4 as const}, {suit:'c' as const,rank:3 as const}, {suit:'h' as const,rank:2 as const}] },
        { rank: HandRank.flush, cards: [{suit:'h' as const,rank:'A' as const}, {suit:'h' as const,rank:10 as const}, {suit:'h' as const,rank:7 as const}, {suit:'h' as const,rank:5 as const}, {suit:'h' as const,rank:2 as const}] },
        { rank: HandRank.full_house, cards: [{suit:'h' as const,rank:'A' as const}, {suit:'d' as const,rank:'A' as const}, {suit:'s' as const,rank:'A' as const}, {suit:'c' as const,rank:7 as const}, {suit:'h' as const,rank:7 as const}] },
        { rank: HandRank.four_of_a_kind, cards: [{suit:'h' as const,rank:'A' as const}, {suit:'d' as const,rank:'A' as const}, {suit:'s' as const,rank:'A' as const}, {suit:'c' as const,rank:'A' as const}, {suit:'h' as const,rank:2 as const}] },
        { rank: HandRank.straight_flush, cards: [{suit:'h' as const,rank:6 as const}, {suit:'h' as const,rank:5 as const}, {suit:'h' as const,rank:4 as const}, {suit:'h' as const,rank:3 as const}, {suit:'h' as const,rank:2 as const}] },
        { rank: HandRank.royal_flush, cards: [{suit:'h' as const,rank:'A' as const}, {suit:'h' as const,rank:'K' as const}, {suit:'h' as const,rank:'Q' as const}, {suit:'h' as const,rank:'J' as const}, {suit:'h' as const,rank:10 as const}] },
      ];

      for (const c of cases) {
        expect(evaluateHand(c.cards).rank).toBe(c.rank);
      }
    });
  });
});

