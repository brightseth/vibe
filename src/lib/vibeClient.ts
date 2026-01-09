// /vibe API client for connecting to the multiplayer backend

const VIBE_API_URL = "https://vibecodings.vercel.app/api";
const USE_MOCK = true; // Set to false when backend is ready

interface VibeUser {
  handle: string;
  oneLiner: string;
  status?: string;
  lastSeen: string;
}

interface VibeMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
}

interface GameState {
  id: string;
  type: "tictactoe" | "hangman" | "wordassociation";
  players: string[];
  status: "active" | "completed" | "waiting";
  state: any; // Game-specific state
  created_at: string;
  updated_at: string;
}

interface TicTacToeState {
  board: (string | null)[];
  currentPlayer: "X" | "O";
  winner: string | null;
}

interface HangmanState {
  word: string;
  guessed: string[];
  remainingGuesses: number;
  revealed: string;
}

interface WordAssociationState {
  words: string[];
  currentPlayer: string;
  lastWord: string;
}

// Mock data for development
const MOCK_USERS: VibeUser[] = [
  { handle: "gene", oneLiner: "Building AI agents", lastSeen: new Date().toISOString() },
  { handle: "alex", oneLiner: "Writing a book on protocols", lastSeen: new Date().toISOString() },
  { handle: "sara", oneLiner: "Designing NFT platform", lastSeen: new Date().toISOString() },
];

const MOCK_GAMES: Map<string, GameState> = new Map();

class VibeClient {
  private handle: string | null = null;
  private oneLiner: string | null = null;

  async initialize(handle: string, oneLiner: string): Promise<boolean> {
    if (USE_MOCK) {
      // Mock mode - always succeed
      console.log("[MOCK] Initialized with handle:", handle);
      this.handle = handle;
      this.oneLiner = oneLiner;
      return true;
    }

    try {
      // Register/authenticate with /vibe backend
      const response = await fetch(`${VIBE_API_URL}/auth/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, oneLiner }),
      });

      if (response.ok) {
        this.handle = handle;
        this.oneLiner = oneLiner;
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to initialize /vibe:", error);
      return false;
    }
  }

  async getOnlineUsers(): Promise<VibeUser[]> {
    if (USE_MOCK) {
      // Return mock users
      return MOCK_USERS;
    }

    try {
      const response = await fetch(`${VIBE_API_URL}/presence/online`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error("Failed to get online users:", error);
      return [];
    }
  }

  async sendMessage(to: string, content: string): Promise<boolean> {
    if (!this.handle) return false;

    if (USE_MOCK) {
      // Mock mode - always succeed
      console.log("[MOCK] Sent message to", to, ":", content);
      return true;
    }

    try {
      const response = await fetch(`${VIBE_API_URL}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: this.handle,
          to,
          content,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to send message:", error);
      return false;
    }
  }

  async getMessages(): Promise<VibeMessage[]> {
    if (!this.handle) return [];

    if (USE_MOCK) {
      // Return mock messages (empty for now - messages will be added optimistically)
      return [];
    }

    try {
      const response = await fetch(`${VIBE_API_URL}/messages/inbox?handle=${this.handle}`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error("Failed to get messages:", error);
      return [];
    }
  }

  async setStatus(status: string): Promise<boolean> {
    if (!this.handle) return false;

    try {
      const response = await fetch(`${VIBE_API_URL}/presence/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle: this.handle,
          status,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Failed to set status:", error);
      return false;
    }
  }

  // Game methods
  async startGame(gameType: "tictactoe" | "hangman" | "wordassociation", opponent?: string): Promise<GameState | null> {
    if (!this.handle) return null;

    if (USE_MOCK) {
      // Create mock game
      const gameId = `game-${Date.now()}`;
      let initialState: any;

      if (gameType === "tictactoe") {
        initialState = {
          board: Array(9).fill(null),
          currentPlayer: "X",
          winner: null,
        } as TicTacToeState;
      } else if (gameType === "hangman") {
        const words = ["javascript", "terminal", "multiplayer", "protocol", "blockchain"];
        const word = words[Math.floor(Math.random() * words.length)];
        initialState = {
          word,
          guessed: [],
          remainingGuesses: 6,
          revealed: "_".repeat(word.length),
        } as HangmanState;
      } else if (gameType === "wordassociation") {
        initialState = {
          words: [],
          currentPlayer: this.handle,
          lastWord: "",
        } as WordAssociationState;
      }

      const game: GameState = {
        id: gameId,
        type: gameType,
        players: opponent ? [this.handle, opponent] : [this.handle],
        status: opponent ? "waiting" : "active",
        state: initialState,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      MOCK_GAMES.set(gameId, game);
      console.log("[MOCK] Started game:", gameId, gameType);
      return game;
    }

    // Real API call
    try {
      const response = await fetch(`${VIBE_API_URL}/games/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player: this.handle,
          gameType,
          opponent,
        }),
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error("Failed to start game:", error);
      return null;
    }
  }

  async makeMove(gameId: string, move: any): Promise<GameState | null> {
    if (!this.handle) return null;

    if (USE_MOCK) {
      const game = MOCK_GAMES.get(gameId);
      if (!game) return null;

      // Update game state based on move
      if (game.type === "tictactoe") {
        const state = game.state as TicTacToeState;
        if (typeof move === "number" && move >= 0 && move < 9 && !state.board[move]) {
          state.board[move] = state.currentPlayer;

          // Check winner
          const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
            [0, 4, 8], [2, 4, 6], // diagonals
          ];

          for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
              state.winner = state.board[a];
              game.status = "completed";
              break;
            }
          }

          // AI move (simple random)
          if (!state.winner && game.status === "active") {
            state.currentPlayer = "O";
            const emptySpots = state.board.map((v, i) => v === null ? i : -1).filter(i => i !== -1);
            if (emptySpots.length > 0) {
              const aiMove = emptySpots[Math.floor(Math.random() * emptySpots.length)];
              state.board[aiMove] = "O";
              state.currentPlayer = "X";

              // Check AI win
              for (const pattern of winPatterns) {
                const [a, b, c] = pattern;
                if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
                  state.winner = state.board[a];
                  game.status = "completed";
                  break;
                }
              }
            }
          }
        }
      } else if (game.type === "hangman") {
        const state = game.state as HangmanState;
        const letter = move.toLowerCase();

        if (!state.guessed.includes(letter)) {
          state.guessed.push(letter);

          if (state.word.includes(letter)) {
            // Reveal letters
            state.revealed = state.word.split("").map((char, i) =>
              state.guessed.includes(char) ? char : "_"
            ).join("");

            if (!state.revealed.includes("_")) {
              game.status = "completed";
            }
          } else {
            state.remainingGuesses--;
            if (state.remainingGuesses === 0) {
              game.status = "completed";
              state.revealed = state.word;
            }
          }
        }
      } else if (game.type === "wordassociation") {
        const state = game.state as WordAssociationState;
        state.words.push(move);
        state.lastWord = move;
      }

      game.updated_at = new Date().toISOString();
      MOCK_GAMES.set(gameId, game);
      return game;
    }

    // Real API call
    try {
      const response = await fetch(`${VIBE_API_URL}/games/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          player: this.handle,
          move,
        }),
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error("Failed to make move:", error);
      return null;
    }
  }

  async getActiveGames(): Promise<GameState[]> {
    if (!this.handle) return [];

    if (USE_MOCK) {
      return Array.from(MOCK_GAMES.values()).filter(
        game => game.players.includes(this.handle!) && game.status === "active"
      );
    }

    try {
      const response = await fetch(`${VIBE_API_URL}/games/active?player=${this.handle}`);
      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error("Failed to get active games:", error);
      return [];
    }
  }

  async getGameState(gameId: string): Promise<GameState | null> {
    if (USE_MOCK) {
      return MOCK_GAMES.get(gameId) || null;
    }

    try {
      const response = await fetch(`${VIBE_API_URL}/games/${gameId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error("Failed to get game state:", error);
      return null;
    }
  }
}

export const vibeClient = new VibeClient();
export type { VibeUser, VibeMessage, GameState, TicTacToeState, HangmanState, WordAssociationState };
