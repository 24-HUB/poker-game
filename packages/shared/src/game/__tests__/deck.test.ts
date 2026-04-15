import { expect, test, describe } from "bun:test";
import { createDeck, shuffle, SUITS, RANKS } from "../deck";
import { Card } from "../../types/game";

describe("Deck Management", () => {
  describe("createDeck", () => {
    test("creates exactly 52 cards", () => {
      const deck = createDeck();
      expect(deck.length).toBe(52);
    });

    test("contains all four suits", () => {
      const deck = createDeck();
      const suits = new Set(deck.map(c => c.suit));
      expect(suits.size).toBe(4);
      SUITS.forEach(suit => {
        expect(suits.has(suit)).toBe(true);
      });
    });

    test("contains all 13 ranks per suit", () => {
      const deck = createDeck();
      for (const suit of SUITS) {
        const suitCards = deck.filter(c => c.suit === suit);
        expect(suitCards.length).toBe(13);
      }
    });

    test("contains no duplicate cards", () => {
      const deck = createDeck();
      const cardStrings = new Set();
      for (const card of deck) {
        const key = `${card.suit}_${card.rank}`;
        expect(cardStrings.has(key)).toBe(false);
        cardStrings.add(key);
      }
      expect(cardStrings.size).toBe(52);
    });

    test("contains all 13 ranks in each suit", () => {
      const deck = createDeck();
      for (const suit of SUITS) {
        const suitCards = deck.filter(c => c.suit === suit);
        const ranks = new Set(suitCards.map(c => c.rank));
        expect(ranks.size).toBe(13);
        RANKS.forEach(rank => {
          expect(ranks.has(rank)).toBe(true);
        });
      }
    });
  });

  describe("shuffle", () => {
    test("returns a deck of same size", () => {
      const deck = createDeck();
      const shuffled = shuffle(deck);
      expect(shuffled.length).toBe(deck.length);
    });

    test("preserves all cards (no duplicates, no missing)", () => {
      const deck = createDeck();
      const shuffled = shuffle(deck);
      const originalSet = new Set(deck.map(c => `${c.suit}_${c.rank}`));
      const shuffledSet = new Set(shuffled.map(c => `${c.suit}_${c.rank}`));
      expect(originalSet.size).toBe(shuffledSet.size);
      originalSet.forEach(card => {
        expect(shuffledSet.has(card)).toBe(true);
      });
    });

    test("doesn't modify original deck (pure function)", () => {
      const deck = createDeck();
      const deckBefore = JSON.parse(JSON.stringify(deck));
      shuffle(deck);
      expect(deck).toEqual(deckBefore);
    });

    test("produces statistically random order", () => {
      // Shuffle same deck 100 times and check variance
      const deck = createDeck();
      const shuffles = [];
      for (let i = 0; i < 100; i++) {
        const shuffled = shuffle(deck);
        shuffles.push(shuffled[0].rank); // Track first card rank
      }
      const uniqueFirstCards = new Set(shuffles).size;
      // Should have many different cards in first position (not just one)
      expect(uniqueFirstCards).toBeGreaterThan(10);
    });

    test("deterministic shuffle with seed", () => {
      const deck = createDeck();
      const seed = 42;
      const shuffled1 = shuffle(deck, seed);
      const shuffled2 = shuffle(createDeck(), seed);
      
      for (let i = 0; i < shuffled1.length; i++) {
        expect(shuffled1[i]).toEqual(shuffled2[i]);
      }
    });

    test("different seeds produce different results", () => {
      const deck1 = createDeck();
      const deck2 = createDeck();
      const shuffled1 = shuffle(deck1, 1);
      const shuffled2 = shuffle(deck2, 2);
      
      let differences = 0;
      for (let i = 0; i < shuffled1.length; i++) {
        if (shuffled1[i].rank !== shuffled2[i].rank) {
          differences++;
        }
      }
      expect(differences).toBeGreaterThan(0);
    });
  });

  describe("Deck for Game Simulation", () => {
    test("can simulate dealing hole cards and community cards", () => {
      const deck = shuffle(createDeck());
      const deckCopy = [...deck];

      // Deal 2 hole cards to 3 players
      const holecards = [];
      for (let i = 0; i < 3; i++) {
        holecards.push([deckCopy.pop(), deckCopy.pop()]);
      }

      // Deal 5 community cards
      const community = [deckCopy.pop(), deckCopy.pop(), deckCopy.pop(), deckCopy.pop(), deckCopy.pop()];

      expect(holecards.length).toBe(3);
      expect(holecards[0].length).toBe(2);
      expect(community.length).toBe(5);
      expect(deckCopy.length).toBe(52 - 6 - 5); // 52 - 3 players * 2 cards - 5 community
    });

    test("demonstrates correct game card count", () => {
      // Standard hold'em: 7 players, 2 hole + 5 community = 19 cards used
      const deck = shuffle(createDeck());
      const deckCopy = [...deck];

      // 7 players get 2 cards each
      for (let i = 0; i < 7 * 2; i++) {
        deckCopy.pop();
      }

      // 5 community cards
      for (let i = 0; i < 5; i++) {
        deckCopy.pop();
      }

      expect(deckCopy.length).toBe(52 - 19);
    });
  });
});
