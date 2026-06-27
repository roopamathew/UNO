import { create } from 'zustand';
import type { CardColor, GameMovePayload, GameState } from '@uno/shared';
import { getSocket } from '../services/socketService';

interface GameStoreState {
  gameState: GameState | null;
  myPlayerId: string | null;
  error: string | null;
  isMyTurn: boolean;
  selectedColor: CardColor | null;
  pendingWildCardId: string | null;

  setGameState: (state: GameState) => void;
  setMyPlayerId: (id: string) => void;
  clearGame: () => void;
  playCard: (cardId: string, chosenColor?: CardColor) => void;
  drawCard: () => void;
  callUno: () => void;
  catchUno: (targetPlayerId: string) => void;
  chooseColor: (color: CardColor) => void;
  nextRound: () => void;
  requestSync: () => void;
  clearError: () => void;
  setPendingWild: (cardId: string | null) => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  myPlayerId: null,
  error: null,
  isMyTurn: false,
  selectedColor: null,
  pendingWildCardId: null,

  setGameState: (state) => {
    const myId = get().myPlayerId;
    const currentPlayer = state.players[state.currentPlayerIndex];
    set({
      gameState: state,
      isMyTurn: myId === currentPlayer?.playerId && (state.phase === 'playing' || state.phase === 'choosing_color'),
    });
  },

  setMyPlayerId: (id) => set({ myPlayerId: id }),

  clearGame: () =>
    set({
      gameState: null,
      error: null,
      isMyTurn: false,
      selectedColor: null,
      pendingWildCardId: null,
    }),

  playCard: (cardId, chosenColor) => {
    const card = get().gameState?.players
      .flatMap((p) => p.hand ?? [])
      .find((c) => c.id === cardId);

    if (card?.color === 'wild' && !chosenColor) {
      set({ pendingWildCardId: cardId });
      return;
    }

    const move: GameMovePayload = { type: 'play', cardId, chosenColor };
    getSocket()?.emit('game:move', move);
    set({ pendingWildCardId: null, selectedColor: null });
  },

  drawCard: () => {
    getSocket()?.emit('game:move', { type: 'draw' });
  },

  callUno: () => {
    getSocket()?.emit('game:move', { type: 'call_uno' });
  },

  catchUno: (targetPlayerId) => {
    getSocket()?.emit('game:move', { type: 'catch_uno', targetPlayerId });
  },

  chooseColor: (color) => {
    const state = get().gameState;
    if (state?.phase === 'choosing_color') {
      getSocket()?.emit('game:move', { type: 'choose_color', chosenColor: color });
    } else if (get().pendingWildCardId) {
      get().playCard(get().pendingWildCardId!, color);
    }
    set({ selectedColor: color, pendingWildCardId: null });
  },

  nextRound: () => {
    getSocket()?.emit('game:next_round');
  },

  requestSync: () => {
    getSocket()?.emit('game:sync');
  },

  clearError: () => set({ error: null }),
  setPendingWild: (cardId) => set({ pendingWildCardId: cardId }),
}));

export function setupGameSocketListeners(
  socket: NonNullable<ReturnType<typeof getSocket>>,
  myPlayerId: string,
) {
  const store = useGameStore.getState();
  store.setMyPlayerId(myPlayerId);

  socket.off('game:state');
  socket.off('game:started');
  socket.off('game:error');

  socket.on('game:state', (state) => {
    useGameStore.getState().setGameState(state);
  });

  socket.on('game:error', ({ message }) => {
    useGameStore.setState({ error: message });
  });
}
