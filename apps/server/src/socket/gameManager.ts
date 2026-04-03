import { Server } from "socket.io";
import { GameEngine } from "../../../../packages/shared/src/game/engine";
import { GameState, Card } from "../../../../packages/shared/src/types/game";
import { GameAction, ServerToClientEvents, ClientToServerEvents } from "../../../../packages/shared/src/types/socket";

export class GameManager {
  private activeGames: Map<string, { engine: GameEngine; state: GameState; timers: Map<string, ReturnType<typeof setTimeout>> }> = new Map();
  private io?: Server<ClientToServerEvents, ServerToClientEvents>;

  setIo(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
  }

  startGame(roomId: string, players: { id: string; username: string; chips: number }[], smallBlind: number, bigBlind: number) {
    const engine = new GameEngine(players, smallBlind, bigBlind);
    const state = engine.startGame();
    
    this.activeGames.set(roomId, {
      engine,
      state,
      timers: new Map(),
    });

    this.startTurnTimer(roomId, state.activePlayerId!);
    return state;
  }

  handleAction(roomId: string, playerId: string, action: GameAction): GameState {
    const game = this.activeGames.get(roomId);
    if (!game) throw new Error("Game not found");

    this.clearTurnTimer(roomId, playerId);

    game.state = game.engine.applyAction(game.state, playerId, action);

    if (game.state.phase !== 'showdown' && game.state.activePlayerId) {
      this.startTurnTimer(roomId, game.state.activePlayerId);
    }

    return game.state;
  }

  getPrivateCards(roomId: string, playerId: string): Card[] {
    const game = this.activeGames.get(roomId);
    if (!game) return [];
    return game.state.players.find(p => p.id === playerId)?.cards || [];
  }

  private startTurnTimer(roomId: string, playerId: string) {
    const game = this.activeGames.get(roomId);
    if (!game) return;

    this.clearTurnTimer(roomId, playerId);

    const timeout = setTimeout(() => {
      console.log(`Auto-folding player ${playerId} in room ${roomId}`);
      try {
        this.handleAction(roomId, playerId, { type: 'fold', amount: 0 });
        // Emit updated state via io if available
        if (this.io) {
          const updatedGame = this.activeGames.get(roomId);
          if (updatedGame) {
            this.io.to(roomId).emit('game:stateUpdate', updatedGame.state);
            if (updatedGame.state.activePlayerId) {
               this.io.to(roomId).emit('game:playerTurn', updatedGame.state.activePlayerId, 30000);
            }
          }
        }
      } catch (e) {
        console.error("Auto-fold failed", e);
      }
    }, 30000);

    game.timers.set(playerId, timeout as any);
  }

  private clearTurnTimer(roomId: string, playerId: string) {
    const game = this.activeGames.get(roomId);
    if (!game) return;
    const timer = game.timers.get(playerId);
    if (timer) {
      clearTimeout(timer as any);
      game.timers.delete(playerId);
    }
  }

  getGameState(roomId: string): GameState | undefined {
    return this.activeGames.get(roomId)?.state;
  }

  resolveShowdown(roomId: string) {
    const game = this.activeGames.get(roomId);
    if (!game) return null;
    const result = game.engine.resolveShowdown(game.state);
    // In a real app, you'd probably remove the game or prepare for next round
    return result;
  }
}

export const gameManager = new GameManager();
