import { useState, useEffect } from "react";
import { vibeClient, type GameState, type TicTacToeState, type HangmanState } from "../lib/vibeClient";
import { track } from "../lib/tracking";

export default function GamesPanel() {
  const [activeGames, setActiveGames] = useState<GameState[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [showNewGame, setShowNewGame] = useState(false);

  useEffect(() => {
    loadGames();
    const interval = setInterval(loadGames, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadGames = async () => {
    const games = await vibeClient.getActiveGames();
    setActiveGames(games);
  };

  const startNewGame = async (gameType: "tictactoe" | "hangman" | "wordassociation") => {
    const game = await vibeClient.startGame(gameType);
    if (game) {
      setActiveGames([...activeGames, game]);
      setSelectedGame(game.id);
      setShowNewGame(false);

      // Track interaction
      const sessionId = localStorage.getItem("vibe_current_session") || "unknown";
      track.gameStarted(sessionId, gameType);
    }
  };

  const makeMove = async (gameId: string, move: any) => {
    const updatedGame = await vibeClient.makeMove(gameId, move);
    if (updatedGame) {
      setActiveGames(activeGames.map(g => g.id === gameId ? updatedGame : g));

      // Track interaction
      const sessionId = localStorage.getItem("vibe_current_session") || "unknown";
      track.gameMove(sessionId, gameId, updatedGame.type);
    }
  };

  if (showNewGame) {
    return (
      <div style={{ padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
            New Game
          </h3>
          <button
            onClick={() => setShowNewGame(false)}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              fontSize: "20px",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            onClick={() => startNewGame("tictactoe")}
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "4px",
              padding: "12px",
              color: "#fff",
              fontSize: "13px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>Tic-Tac-Toe</div>
            <div style={{ fontSize: "11px", color: "#888" }}>vs AI</div>
          </button>

          <button
            onClick={() => startNewGame("hangman")}
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "4px",
              padding: "12px",
              color: "#fff",
              fontSize: "13px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>Hangman</div>
            <div style={{ fontSize: "11px", color: "#888" }}>Guess the word</div>
          </button>

          <button
            onClick={() => startNewGame("wordassociation")}
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "4px",
              padding: "12px",
              color: "#fff",
              fontSize: "13px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>Word Association</div>
            <div style={{ fontSize: "11px", color: "#888" }}>Chain of words</div>
          </button>
        </div>
      </div>
    );
  }

  const currentGame = selectedGame ? activeGames.find(g => g.id === selectedGame) : null;

  if (currentGame) {
    return (
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
            {currentGame.type === "tictactoe" ? "Tic-Tac-Toe" :
             currentGame.type === "hangman" ? "Hangman" :
             "Word Association"}
          </h3>
          <button
            onClick={() => setSelectedGame(null)}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              fontSize: "20px",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ←
          </button>
        </div>

        {currentGame.type === "tictactoe" && (
          <TicTacToeGame game={currentGame} onMove={(move) => makeMove(currentGame.id, move)} />
        )}

        {currentGame.type === "hangman" && (
          <HangmanGame game={currentGame} onMove={(move) => makeMove(currentGame.id, move)} />
        )}

        {currentGame.type === "wordassociation" && (
          <WordAssociationGame game={currentGame} onMove={(move) => makeMove(currentGame.id, move)} />
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>
          Games ({activeGames.length})
        </h3>
        <button
          onClick={() => setShowNewGame(true)}
          style={{
            background: "#6B8FFF",
            border: "none",
            borderRadius: "4px",
            padding: "4px 12px",
            color: "#fff",
            fontSize: "12px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          New
        </button>
      </div>

      {activeGames.length === 0 ? (
        <div style={{ fontSize: "12px", color: "#666", textAlign: "center", padding: "20px 0" }}>
          No active games. Start one!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {activeGames.map((game) => (
            <div
              key={game.id}
              onClick={() => setSelectedGame(game.id)}
              style={{
                padding: "12px",
                background: "#1a1a1a",
                borderRadius: "4px",
                cursor: "pointer",
                border: "1px solid #333",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#252525";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#1a1a1a";
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>
                {game.type === "tictactoe" ? "Tic-Tac-Toe" :
                 game.type === "hangman" ? "Hangman" :
                 "Word Association"}
              </div>
              <div style={{ fontSize: "11px", color: "#888" }}>
                {game.status === "active" ? "In progress" : "Completed"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Tic-Tac-Toe component
function TicTacToeGame({ game, onMove }: { game: GameState; onMove: (move: number) => void }) {
  const state = game.state as TicTacToeState;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
          maxWidth: "240px",
        }}
      >
        {state.board.map((cell, index) => (
          <button
            key={index}
            onClick={() => !cell && !state.winner && onMove(index)}
            disabled={!!cell || !!state.winner}
            style={{
              aspectRatio: "1",
              background: cell ? "#2a2a2a" : "#1a1a1a",
              border: "1px solid #444",
              borderRadius: "4px",
              color: cell === "X" ? "#6B8FFF" : "#50fa7b",
              fontSize: "32px",
              fontWeight: "bold",
              cursor: cell || state.winner ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {cell || ""}
          </button>
        ))}
      </div>

      {state.winner && (
        <div
          style={{
            padding: "12px",
            background: state.winner === "X" ? "#6B8FFF20" : "#50fa7b20",
            borderRadius: "4px",
            fontSize: "13px",
            fontWeight: 600,
            textAlign: "center",
            color: state.winner === "X" ? "#6B8FFF" : "#50fa7b",
          }}
        >
          {state.winner === "X" ? "You won!" : "AI won!"}
        </div>
      )}

      {!state.winner && game.status === "active" && (
        <div style={{ fontSize: "12px", color: "#888", textAlign: "center" }}>
          {state.currentPlayer === "X" ? "Your turn (X)" : "AI thinking..."}
        </div>
      )}
    </div>
  );
}

// Hangman component
function HangmanGame({ game, onMove }: { game: GameState; onMove: (move: string) => void }) {
  const state = game.state as HangmanState;
  const [input, setInput] = useState("");

  const handleGuess = () => {
    if (input.length === 1 && !state.guessed.includes(input.toLowerCase())) {
      onMove(input);
      setInput("");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          padding: "20px",
          background: "#1a1a1a",
          borderRadius: "8px",
          fontSize: "24px",
          fontFamily: "monospace",
          letterSpacing: "8px",
          textAlign: "center",
        }}
      >
        {state.revealed.split("").join(" ")}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
        <div style={{ color: "#888" }}>
          Guesses left: <span style={{ color: state.remainingGuesses <= 2 ? "#ff5555" : "#fff" }}>
            {state.remainingGuesses}
          </span>
        </div>
        <div style={{ color: "#888" }}>
          Guessed: {state.guessed.join(", ").toUpperCase() || "none"}
        </div>
      </div>

      {game.status === "active" ? (
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toLowerCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                handleGuess();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            maxLength={1}
            placeholder="Letter"
            style={{
              flex: 1,
              background: "#2a2a2a",
              border: "1px solid #444",
              borderRadius: "4px",
              padding: "8px 12px",
              color: "#fff",
              fontSize: "13px",
              outline: "none",
              textAlign: "center",
              textTransform: "uppercase",
            }}
          />
          <button
            onClick={handleGuess}
            disabled={input.length !== 1 || state.guessed.includes(input.toLowerCase())}
            style={{
              background: "#6B8FFF",
              border: "none",
              borderRadius: "4px",
              padding: "8px 16px",
              color: "#fff",
              fontSize: "13px",
              cursor: "pointer",
              fontWeight: 600,
              opacity: (input.length !== 1 || state.guessed.includes(input.toLowerCase())) ? 0.5 : 1,
            }}
          >
            Guess
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: "12px",
            background: state.remainingGuesses > 0 ? "#50fa7b20" : "#ff555520",
            borderRadius: "4px",
            fontSize: "13px",
            fontWeight: 600,
            textAlign: "center",
            color: state.remainingGuesses > 0 ? "#50fa7b" : "#ff5555",
          }}
        >
          {state.remainingGuesses > 0 ? "You won!" : `Game over! Word was: ${state.word}`}
        </div>
      )}
    </div>
  );
}

// Word Association component
function WordAssociationGame({ game, onMove }: { game: GameState; onMove: (move: string) => void }) {
  const state = game.state as any; // WordAssociationState
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (input.trim()) {
      onMove(input.trim());
      setInput("");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
      <div
        style={{
          flex: 1,
          background: "#1a1a1a",
          borderRadius: "4px",
          padding: "12px",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {state.words.length === 0 ? (
          <div style={{ fontSize: "12px", color: "#666", textAlign: "center" }}>
            Start the word chain!
          </div>
        ) : (
          state.words.map((word: string, index: number) => (
            <div
              key={index}
              style={{
                padding: "8px 12px",
                background: "#2a2a2a",
                borderRadius: "4px",
                fontSize: "13px",
              }}
            >
              {word}
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          placeholder={state.lastWord ? `Word related to "${state.lastWord}"` : "Any word..."}
          style={{
            flex: 1,
            background: "#2a2a2a",
            border: "1px solid #444",
            borderRadius: "4px",
            padding: "8px 12px",
            color: "#fff",
            fontSize: "13px",
            outline: "none",
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          style={{
            background: "#6B8FFF",
            border: "none",
            borderRadius: "4px",
            padding: "8px 16px",
            color: "#fff",
            fontSize: "13px",
            cursor: "pointer",
            fontWeight: 600,
            opacity: !input.trim() ? 0.5 : 1,
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}
