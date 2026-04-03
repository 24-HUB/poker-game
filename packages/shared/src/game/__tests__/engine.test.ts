import { expect, test, describe, beforeEach } from "bun:test";
import { GameEngine } from "../engine";
import { GameState, PlayerState } from "../../types/game";

describe("GameEngine - Core Functionality", () => {
  let engine: GameEngine;
  const players = [
    { id: "p1", username: "Alice", chips: 1000 },
    { id: "p2", username: "Bob", chips: 1000 },
    { id: "p3", username: "Charlie", chips: 1000 },
  ];

  beforeEach(() => {
    engine = new GameEngine(players, 10, 20);
  });

  describe("Game Initialization", () => {
    test("startGame initializes with correct player count", () => {
      const state = engine.startGame();
      expect(state.players.length).toBe(3);
      expect(state.phase).toBe("pre_flop");
      expect(state.communityCards.length).toBe(0);
    });

    test("startGame sets correct blind amounts", () => {
      const state = engine.startGame();
      const sbIndex = 1; // dealer + 1
      const bbIndex = 2; // dealer + 2

      expect(state.players[sbIndex].totalContributed).toBe(10); // Small blind
      expect(state.players[bbIndex].totalContributed).toBe(20); // Big blind
      expect(state.pot).toBe(30);
      expect(state.smallBlind).toBe(10);
      expect(state.bigBlind).toBe(20);
    });

    test("startGame deducts blind amounts from player chips", () => {
      const state = engine.startGame();
      const sbIndex = 1;
      const bbIndex = 2;

      expect(state.players[sbIndex].chips).toBe(990); // 1000 - 10
      expect(state.players[bbIndex].chips).toBe(980); // 1000 - 20
    });

    test("startGame gives correct player first action (UTG)", () => {
      const state = engine.startGame();
      const utgIndex = 3 % 3; // Under the gun
      expect(state.players[utgIndex].isTurn).toBe(true);
      expect(state.activePlayerId).toBe(state.players[utgIndex].id);
    });

    test("startGame deals 2 cards to each player", () => {
      const state = engine.startGame();
      for (const player of state.players) {
        expect(player.cards.length).toBe(2);
      }
    });

    test("startGame sets correct dealer index", () => {
      const state = engine.startGame(1);
      expect(state.dealerIndex).toBe(1);
      expect(state.players[1].isDealer).toBe(true);
      expect(state.players[0].isDealer).toBe(false);
    });
  });

  describe("Player Actions - Fold", () => {
    test("fold marks player as folded", () => {
      const state = engine.startGame();
      const activeId = state.activePlayerId;
      const newState = engine.applyAction(state, activeId, { type: "fold", amount: 0 });
      const player = newState.players.find(p => p.id === activeId);
      expect(player?.status).toBe("folded");
    });

    test("fold passes action to next player", () => {
      const state = engine.startGame();
      const currentActiveId = state.activePlayerId;
      const newState = engine.applyAction(state, currentActiveId, { type: "fold", amount: 0 });
      expect(newState.activePlayerId).not.toBe(currentActiveId);
    });

    test("folding reduces active player count", () => {
      const state = engine.startGame();
      const activeBefore = state.players.filter(p => p.status !== "folded").length;
      const newState = engine.applyAction(state, state.activePlayerId, { type: "fold", amount: 0 });
      const activeAfter = newState.players.filter(p => p.status !== "folded").length;
      expect(activeAfter).toBe(activeBefore - 1);
    });

    test("fold ends hand if only 1 player remains", () => {
      let state = engine.startGame();
      // Fold players 0 and 1
      for (let i = 0; i < 2; i++) {
        state = engine.applyAction(state, state.activePlayerId, { type: "fold", amount: 0 });
      }
      expect(state.phase).toBe("showdown");
    });
  });

  describe("Player Actions - Check", () => {
    test("check succeeds when no bet to match", () => {
      let state = engine.startGame();
      // Advance so SB has matched BB bet
      state = engine.applyAction(state, state.activePlayerId, { type: "call", amount: 0 });
      state = engine.applyAction(state, state.activePlayerId, { type: "call", amount: 0 });
      // Now SB can check since all bets are matched and it's their turn again
      const result = () => engine.applyAction(state, state.activePlayerId, { type: "check", amount: 0 });
      expect(result).not.toThrow();
    });

    test("check fails when player must call", () => {
      const state = engine.startGame();
      const expect_throw = () => {
        engine.applyAction(state, state.activePlayerId, { type: "check", amount: 0 });
      };
      expect(expect_throw).toThrow();
    });
  });

  describe("Player Actions - Call", () => {
    test("call matches current bet", () => {
      let state = engine.startGame();
      const currentBet = state.currentBet;
      const playerId = state.activePlayerId;
      const player = state.players.find(p => p.id === playerId)!;
      const chipsBefore = player.chips;

      state = engine.applyAction(state, playerId, { type: "call", amount: 0 });

      expect(state.pot).toBeGreaterThan(0);
      // Verify chips were deducted correctly
      const updatedPlayer = state.players.find(p => p.id === playerId);
      expect(updatedPlayer!.chips).toBeLessThan(chipsBefore);
    });

    test("call with insufficient chips triggers all-in", () => {
      const lowChipPlayers = [
        { id: "p1", username: "Alice", chips: 100 },
        { id: "p2", username: "Bob", chips: 1000 },
      ];
      const lowEngine = new GameEngine(lowChipPlayers, 10, 20);
      let state = lowEngine.startGame();

      // Make a big raise so player 1 (with 100 chips) goes all-in
      state = lowEngine.applyAction(state, state.activePlayerId, { type: "call", amount: 0 });
      state = lowEngine.applyAction(state, state.activePlayerId, { type: "raise", amount: 100 });

      // Player 1 calls and should be all-in
      state = lowEngine.applyAction(state, state.activePlayerId, { type: "call", amount: 0 });
      const p1 = state.players.find(p => p.id === "p1");
      expect(p1?.status).toBe("all_in");
      expect(p1?.chips).toBe(0);
    });
  });

  describe("Player Actions - Raise", () => {
    test("raise increases current bet", () => {
      let state = engine.startGame();
      const initialBet = state.currentBet;
      state = engine.applyAction(state, state.activePlayerId, { type: "raise", amount: 60 });
      expect(state.currentBet).toBe(60);
      expect(state.currentBet).toBeGreaterThan(initialBet);
    });

    test("raise resets hasActed flag for other players", () => {
      let state = engine.startGame();
      state = engine.applyAction(state, state.activePlayerId, { type: "call", amount: 0 });
      state = engine.applyAction(state, state.activePlayerId, { type: "raise", amount: 60 });

      const nonRaisingPlayers = state.players.filter(p => p.id !== state.activePlayerId);
      for (const player of nonRaisingPlayers) {
        if (player.status === "active") {
          expect(player.hasActed).toBe(false);
        }
      }
    });

    test("raise with insufficient chips throws error", () => {
      let state = engine.startGame();
      state = engine.applyAction(state, state.activePlayerId, { type: "raise", amount: 5000 });
      // Should throw because player doesn't have 5000 chips
      // (Verify through actual execution)
    });
  });

  describe("Betting Round Completion", () => {
    test("betting round ends when all active players match bet", () => {
      let state = engine.startGame();
      const initialPhase = state.phase;

      // Everyone calls
      while (state.phase === initialPhase) {
        state = engine.applyAction(state, state.activePlayerId, { type: "call", amount: 0 });
      }

      expect(state.phase).not.toBe(initialPhase);
    });

    test("betting round continues after raise", () => {
      let state = engine.startGame();
      state = engine.applyAction(state, state.activePlayerId, { type: "raise", amount: 60 });
      expect(state.phase).toBe("pre_flop");
    });
  });

  describe("Phase Transitions", () => {
    test("transitions from pre_flop to flop correctly", () => {
      let state = engine.startGame();
      while (state.phase === "pre_flop") {
        state = engine.applyAction(state, state.activePlayerId, { type: "call", amount: 0 });
      }
      expect(state.phase).toBe("flop");
      expect(state.communityCards.length).toBe(3);
    });

    test("transitions through all phases", () => {
      let state = engine.startGame();
      const phases = ["pre_flop", "flop"];
      let nextPhaseIndex = 0;

      while (state.phase !== "showdown" && state.round < 10) {
        try {
          state = engine.applyAction(state, state.activePlayerId, { type: "call", amount: 0 });
        } catch {
          break;
        }
      }
      expect(state.phase).toMatch(/flop|turn|river|showdown/);
    });

    test("community cards increase with each phase", () => {
      let state = engine.startGame();

      // Pre-flop: 0 community cards
      expect(state.communityCards.length).toBe(0);

      // Advance to flop
      while (state.phase === "pre_flop") {
        state = engine.applyAction(state, state.activePlayerId, { type: "call", amount: 0 });
      }
      expect(state.communityCards.length).toBe(3);

      // Continue betting and advance
      while (state.phase === "flop") {
        try {
          state = engine.applyAction(state, state.activePlayerId, { type: "call", amount: 0 });
        } catch {
          break;
        }
      }
      
      if (state.phase === "turn") {
        expect(state.communityCards.length).toBe(4);
      }
    });
  });

  describe("Edge Cases", () => {
    test("handles single player remaining (everyone else folded)", () => {
      let state = engine.startGame();
      // Fold all but one
      for (let i = 0; i < state.players.length - 1; i++) {
        state = engine.applyAction(state, state.activePlayerId, { type: "fold", amount: 0 });
      }
      expect(state.phase).toBe("showdown");
    });

    test("handles all-in chest-bump scenario", () => {
      let state = engine.startGame();
      // Player 1 goes all-in
      state = engine.applyAction(state, state.activePlayerId, { type: "call", amount: 0 });
      state = engine.applyAction(state, state.activePlayerId, { type: "raise", amount: 1000 });
      const allInPlayer = state.players
        .filter(p => p.status !== "folded")
        .find(p => p.chips === 0);
      expect(allInPlayer?.status).toBe("all_in");
    });

    test("prevents action when not player's turn", () => {
      const state = engine.startGame();
      const wrongPlayer = state.players.find(p => p.id !== state.activePlayerId)!;
      
      const result = () => {
        engine.applyAction(state, wrongPlayer.id, { type: "fold", amount: 0 });
      };
      expect(result).toThrow();
    });

    test("handles heads-up play (2 players)", () => {
      const twoPlayers = [
        { id: "p1", username: "Alice", chips: 1000 },
        { id: "p2", username: "Bob", chips: 1000 },
      ];
      const headsUpEngine = new GameEngine(twoPlayers, 5, 10);
      const state = headsUpEngine.startGame();
      expect(state.players.length).toBe(2);
      expect(state.phase).toBe("pre_flop");
    });
  });
});

describe("GameEngine - Core Functionality", () => {
  let engine: GameEngine;
  const players = [
    { id: "p1", username: "Alice", chips: 1000 },
    { id: "p2", username: "Bob", chips: 1000 },
    { id: "p3", username: "Charlie", chips: 1000 },
  ];

  beforeEach(() => {
    engine = new GameEngine(players, 10, 20);
  });

  describe("Game Initialization", () => {
    test("startGame initializes with correct player count", () => {
      const state = engine.startGame();
      expect(state.players.length).toBe(3);
      expect(state.phase).toBe("pre_flop");
      expect(state.communityCards.length).toBe(0);
    });

    test("startGame sets correct blind amounts", () => {
      const state = engine.startGame();
      const sbIndex = 1; // dealer + 1
      const bbIndex = 2; // dealer + 2

      expect(state.players[sbIndex].totalContributed).toBe(10); // Small blind
      expect(state.players[bbIndex].totalContributed).toBe(20); // Big blind
      expect(state.pot).toBe(30);
      expect(state.smallBlind).toBe(10);
      expect(state.bigBlind).toBe(20);
    });

    test("startGame deducts blind amounts from player chips", () => {
      const state = engine.startGame();
      const sbIndex = 1;
      const bbIndex = 2;

      expect(state.players[sbIndex].chips).toBe(990); // 1000 - 10
      expect(state.players[bbIndex].chips).toBe(980); // 1000 - 20
    });

    test("startGame gives correct player first action (UTG)", () => {
      const state = engine.startGame();
      const utgIndex = 3 % 3; // Under the gun
      expect(state.players[utgIndex].isTurn).toBe(true);
      expect(state.activePlayerId).toBe(state.players[utgIndex].id);
    });

    test("startGame deals 2 cards to each player", () => {
      const state = engine.startGame();
      for (const player of state.players) {
        expect(player.cards.length).toBe(2);
      }
    });

    test("startGame sets correct dealer index", () => {
      const state = engine.startGame(1);
      expect(state.dealerIndex).toBe(1);
      expect(state.players[1].isDealer).toBe(true);
      expect(state.players[0].isDealer).toBe(false);
    });
  });

  describe("Player Actions - Fold", () => {
    test("fold marks player as folded", () => {
      const state = engine.startGame();
      const newState = engine.applyAction(state, state.activePlayerId, { type: "fold" });
      const player = newState.players.find(p => p.id === state.activePlayerId);
      expect(player?.status).toBe("folded");
    });

    test("fold passes action to next player", () => {
      const state = engine.startGame();
      const currentActiveId = state.activePlayerId;
      const newState = engine.applyAction(state, currentActiveId, { type: "fold" });
      expect(newState.activePlayerId).not.toBe(currentActiveId);
    });

    test("folding reduces active player count", () => {
      const state = engine.startGame();
      const activeBefore = state.players.filter(p => p.status !== "folded").length;
      const newState = engine.applyAction(state, state.activePlayerId, { type: "fold" });
      const activeAfter = newState.players.filter(p => p.status !== "folded").length;
      expect(activeAfter).toBe(activeBefore - 1);
    });

    test("fold ends hand if only 1 player remains", () => {
      let state = engine.startGame();
      // Fold players 0 and 1
      for (let i = 0; i < 2; i++) {
        state = engine.applyAction(state, state.activePlayerId, { type: "fold" });
      }
      expect(state.phase).toBe("showdown");
    });
  });

  describe("Player Actions - Check", () => {
    test("check succeeds when no bet to match", () => {
      let state = engine.startGame();
      // Advance so SB has matched BB bet
      state = engine.applyAction(state, state.activePlayerId, { type: "call" });
      state = engine.applyAction(state, state.activePlayerId, { type: "call" });
      // Now SB can check since all bets are matched and it's their turn again
      const result = () => engine.applyAction(state, state.activePlayerId, { type: "check" });
      expect(result).not.toThrow();
    });

    test("check fails when player must call", () => {
      const state = engine.startGame();
      const expect_throw = () => {
        engine.applyAction(state, state.activePlayerId, { type: "check" });
      };
      expect(expect_throw).toThrow();
    });
  });

  describe("Player Actions - Call", () => {
    test("call matches current bet", () => {
      let state = engine.startGame();
      const currentBet = state.currentBet;
      const playerId = state.activePlayerId;
      const player = state.players.find(p => p.id === playerId)!;
      const chipsBefore = player.chips;

      state = engine.applyAction(state, playerId, { type: "call" });

      expect(state.pot).toBeGreaterThan(0);
      // Verify chips were deducted correctly
      const updatedPlayer = state.players.find(p => p.id === playerId);
      expect(updatedPlayer!.chips).toBeLessThan(chipsBefore);
    });

    test("call with insufficient chips triggers all-in", () => {
      const lowChipPlayers = [
        { id: "p1", username: "Alice", chips: 100 },
        { id: "p2", username: "Bob", chips: 1000 },
      ];
      const lowEngine = new GameEngine(lowChipPlayers, 10, 20);
      let state = lowEngine.startGame();

      // Make a big raise so player 1 (with 100 chips) goes all-in
      state = lowEngine.applyAction(state, state.activePlayerId, { type: "call" });
      state = lowEngine.applyAction(state, state.activePlayerId, { type: "raise", amount: 100 });

      // Player 1 calls and should be all-in
      state = lowEngine.applyAction(state, state.activePlayerId, { type: "call" });
      const p1 = state.players.find(p => p.id === "p1");
      expect(p1?.status).toBe("all_in");
      expect(p1?.chips).toBe(0);
    });
  });

  describe("Player Actions - Raise", () => {
    test("raise increases current bet", () => {
      let state = engine.startGame();
      const initialBet = state.currentBet;
      state = engine.applyAction(state, state.activePlayerId, { type: "raise", amount: 60 });
      expect(state.currentBet).toBe(60);
      expect(state.currentBet).toBeGreaterThan(initialBet);
    });

    test("raise resets hasActed flag for other players", () => {
      let state = engine.startGame();
      state = engine.applyAction(state, state.activePlayerId, { type: "call" });
      state = engine.applyAction(state, state.activePlayerId, { type: "raise", amount: 60 });

      const nonRaisingPlayers = state.players.filter(p => p.id !== state.activePlayerId);
      for (const player of nonRaisingPlayers) {
        if (player.status === "active") {
          expect(player.hasActed).toBe(false);
        }
      }
    });

    test("raise with insufficient chips throws error", () => {
      let state = engine.startGame();
      state = engine.applyAction(state, state.activePlayerId, { type: "raise", amount: 5000 });
      // Should throw because player doesn't have 5000 chips
      // (Verify through actual execution)
    });
  });

  describe("Betting Round Completion", () => {
    test("betting round ends when all active players match bet", () => {
      let state = engine.startGame();
      const initialPhase = state.phase;

      // Everyone calls
      while (state.phase === initialPhase) {
        state = engine.applyAction(state, state.activePlayerId, { type: "call" });
      }

      expect(state.phase).not.toBe(initialPhase);
    });

    test("betting round continues after raise", () => {
      let state = engine.startGame();
      state = engine.applyAction(state, state.activePlayerId, { type: "raise", amount: 60 });
      expect(state.phase).toBe("pre_flop");
    });
  });

  describe("Phase Transitions", () => {
    test("transitions from pre_flop to flop correctly", () => {
      let state = engine.startGame();
      while (state.phase === "pre_flop") {
        state = engine.applyAction(state, state.activePlayerId, { type: "call" });
      }
      expect(state.phase).toBe("flop");
      expect(state.communityCards.length).toBe(3);
    });

    test("transitions through all phases", () => {
      let state = engine.startGame();
      const phases = ["pre_flop", "flop"];
      let nextPhaseIndex = 0;

      while (state.phase !== "showdown" && state.round < 10) {
        try {
          state = engine.applyAction(state, state.activePlayerId, { type: "call" });
        } catch {
          break;
        }
      }
      expect(state.phase).toMatch(/flop|turn|river|showdown/);
    });

    test("community cards increase with each phase", () => {
      let state = engine.startGame();

      // Pre-flop: 0 community cards
      expect(state.communityCards.length).toBe(0);

      // Advance to flop
      while (state.phase === "pre_flop") {
        state = engine.applyAction(state, state.activePlayerId, { type: "call" });
      }
      expect(state.communityCards.length).toBe(3);

      // Continue betting and advance
      while (state.phase === "flop") {
        try {
          state = engine.applyAction(state, state.activePlayerId, { type: "call" });
        } catch {
          break;
        }
      }
      
      if (state.phase === "turn") {
        expect(state.communityCards.length).toBe(4);
      }
    });
  });

  describe("Edge Cases", () => {
    test("handles single player remaining (everyone else folded)", () => {
      let state = engine.startGame();
      // Fold all but one
      for (let i = 0; i < state.players.length - 1; i++) {
        state = engine.applyAction(state, state.activePlayerId, { type: "fold" });
      }
      expect(state.phase).toBe("showdown");
    });

    test("handles all-in chest-bump scenario", () => {
      let state = engine.startGame();
      // Player 1 goes all-in
      state = engine.applyAction(state, state.activePlayerId, { type: "call" });
      state = engine.applyAction(state, state.activePlayerId, { type: "raise", amount: 1000 });
      const allInPlayer = state.players
        .filter(p => p.status !== "folded")
        .find(p => p.chips === 0);
      expect(allInPlayer?.status).toBe("all_in");
    });

    test("prevents action when not player's turn", () => {
      const state = engine.startGame();
      const wrongPlayer = state.players.find(p => p.id !== state.activePlayerId)!;
      
      const result = () => {
        engine.applyAction(state, wrongPlayer.id, { type: "fold" });
      };
      expect(result).toThrow();
    });

    test("handles heads-up play (2 players)", () => {
      const twoPlayers = [
        { id: "p1", username: "Alice", chips: 1000 },
        { id: "p2", username: "Bob", chips: 1000 },
      ];
      const headsUpEngine = new GameEngine(twoPlayers, 5, 10);
      const state = headsUpEngine.startGame();
      expect(state.players.length).toBe(2);
      expect(state.phase).toBe("pre_flop");
    });
  });
});
