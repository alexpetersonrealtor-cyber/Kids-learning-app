"use client";

import { useMemo, useRef, useState } from "react";
import { Chess, type Square, type Move } from "chess.js";
import { recordGameSession } from "@/lib/record-session";
import { playCorrect, playHurt, playGameOver } from "@/lib/arcade-sound";
import DifficultyGate from "@/components/DifficultyGate";
import type { Difficulty } from "@/lib/difficulty";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

const PIECE_UNICODE: Record<string, string> = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const SEARCH_DEPTH: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2, expert: 3 };

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chessFromPgn(pgn: string): Chess {
  const chess = new Chess();
  if (pgn) chess.loadPgn(pgn);
  return chess;
}

function evaluate(chess: Chess): number {
  if (chess.isCheckmate()) return chess.turn() === "w" ? -100000 : 100000;
  if (chess.isDraw() || chess.isStalemate()) return 0;

  let score = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq) continue;
      const value = PIECE_VALUES[sq.type];
      score += sq.color === "b" ? value : -value;
    }
  }
  return score;
}

function orderedMoves(chess: Chess): Move[] {
  const moves = chess.moves({ verbose: true }) as Move[];
  return [...moves].sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0));
}

function minimax(chess: Chess, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0 || chess.isGameOver()) return evaluate(chess);

  const moves = orderedMoves(chess);
  let value = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    chess.move(move);
    const childValue = minimax(chess, depth - 1, alpha, beta, !maximizing);
    chess.undo();
    if (maximizing) {
      value = Math.max(value, childValue);
      alpha = Math.max(alpha, value);
    } else {
      value = Math.min(value, childValue);
      beta = Math.min(beta, value);
    }
    if (alpha >= beta) break;
  }
  return value;
}

function pickBestMove(chess: Chess, depth: number): Move {
  const moves = orderedMoves(chess);
  let bestScore = -Infinity;
  let bestMoves: Move[] = [];
  for (const move of moves) {
    chess.move(move);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, false);
    chess.undo();
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }
  return pickRandom(bestMoves);
}

function pickComputerMove(chess: Chess, difficulty: Difficulty): Move {
  const moves = orderedMoves(chess);
  if (difficulty === "easy") return pickRandom(moves);
  return pickBestMove(chess, SEARCH_DEPTH[difficulty]);
}

function statusText(chess: Chess): string | null {
  if (chess.isCheckmate()) return chess.turn() === "w" ? "Checkmate — Black wins! 🎉" : "Checkmate — White wins! 🎉";
  if (chess.isStalemate()) return "Stalemate — it's a draw.";
  if (chess.isThreefoldRepetition()) return "Draw by repetition.";
  if (chess.isInsufficientMaterial()) return "Draw — not enough material to checkmate.";
  if (chess.isDraw()) return "It's a draw.";
  return null;
}

export default function ChessGame({ kidId }: { kidId: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [vsComputer, setVsComputer] = useState(true);
  const [pgn, setPgn] = useState("");
  const [selected, setSelected] = useState<Square | null>(null);
  const [thinking, setThinking] = useState(false);

  const startedAt = useRef(new Date());
  const recorded = useRef(false);

  const chess = useMemo(() => chessFromPgn(pgn), [pgn]);
  const status = statusText(chess);
  const gameOver = chess.isGameOver();

  const legalTargets = useMemo(() => {
    if (!selected) return [];
    return (chess.moves({ square: selected, verbose: true }) as Move[]).map((m) => m.to);
  }, [selected, chess]);

  function finish(finalChess: Chess) {
    if (recorded.current) return;
    recorded.current = true;
    const whiteWon = finalChess.isCheckmate() && finalChess.turn() === "b";
    (whiteWon ? playCorrect : playGameOver)();
    recordGameSession({
      kidId,
      gameType: "chess",
      subject: "classic",
      skillTag: vsComputer ? `chess-${difficulty}` : "chess-2p",
      startedAt: startedAt.current,
      score: whiteWon ? 1 : 0,
    });
  }

  function maybeComputerMove(current: Chess) {
    if (!vsComputer || !difficulty || current.isGameOver() || current.turn() !== "b") return;
    setThinking(true);
    setTimeout(() => {
      const move = pickComputerMove(current, difficulty);
      current.move(move);
      setThinking(false);
      setPgn(current.pgn());
      if (current.isGameOver()) {
        playHurt();
        finish(current);
      }
    }, 50);
  }

  function trySelect(square: Square) {
    if (gameOver || thinking) return;
    if (vsComputer && chess.turn() !== "w") return;

    if (selected) {
      const legal = (chess.moves({ square: selected, verbose: true }) as Move[]).find(
        (m) => m.to === square,
      );
      if (legal) {
        const isPromotion =
          chess.get(selected)?.type === "p" && (square[1] === "8" || square[1] === "1");
        chess.move({ from: selected, to: square, promotion: isPromotion ? "q" : undefined });
        setSelected(null);
        setPgn(chess.pgn());
        if (chess.isGameOver()) {
          finish(chess);
        } else {
          maybeComputerMove(chess);
        }
        return;
      }
    }

    const piece = chess.get(square);
    if (piece && piece.color === chess.turn()) {
      setSelected(square);
    } else {
      setSelected(null);
    }
  }

  function reset() {
    setPgn("");
    setSelected(null);
    setThinking(false);
    startedAt.current = new Date();
    recorded.current = false;
  }

  if (vsComputer && !difficulty) {
    return (
      <DifficultyGate
        title="Choose a difficulty"
        description="How strong should the computer opponent play?"
        onSelect={setDifficulty}
      />
    );
  }

  const board = chess.board();
  const checkedKingSquare = chess.isCheck()
    ? board.flat().find((sq) => sq?.type === "k" && sq.color === chess.turn())?.square
    : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 text-sm font-semibold text-slate-600">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={vsComputer}
            onChange={(e) => {
              setVsComputer(e.target.checked);
              reset();
            }}
          />
          Play vs computer
        </label>
        {!status && (
          <span>
            Turn: {chess.turn() === "w" ? "⚪ White" : "⚫ Black"}
            {thinking ? " (thinking…)" : chess.isCheck() ? " — Check!" : ""}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-lg shadow-lg">
        {board.map((row, ri) => (
          <div key={ri} className="flex">
            {row.map((sq, ci) => {
              const file = FILES[ci];
              const rank = RANKS[ri];
              const square = `${file}${rank}` as Square;
              const dark = (ri + ci) % 2 === 1;
              const isSelected = selected === square;
              const isTarget = legalTargets.includes(square);
              const isChecked = checkedKingSquare === square;
              return (
                <button
                  key={square}
                  onClick={() => trySelect(square)}
                  className={`relative flex h-9 w-9 items-center justify-center text-2xl sm:h-11 sm:w-11 sm:text-3xl ${
                    dark ? "bg-emerald-700" : "bg-emerald-50"
                  } ${isSelected ? "ring-4 ring-sky-400" : ""} ${
                    isChecked ? "bg-red-400" : ""
                  }`}
                >
                  {sq && (
                    <span
                      className={sq.color === "w" ? "text-white" : "text-slate-900"}
                      style={sq.color === "w" ? { WebkitTextStroke: "1.5px #1e293b" } : undefined}
                    >
                      {PIECE_UNICODE[`${sq.color}${sq.type}`]}
                    </span>
                  )}
                  {isTarget && (
                    <span
                      className={`absolute inset-0 m-auto ${
                        sq ? "h-full w-full rounded-none ring-4 ring-yellow-400/80" : "h-3 w-3 rounded-full bg-yellow-400/80"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {status && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xl font-bold text-slate-800">{status}</p>
          <button
            onClick={reset}
            className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
          >
            Play again
          </button>
        </div>
      )}
      <p className="text-xs text-slate-400">Tap a piece, then tap a highlighted square to move it.</p>
    </div>
  );
}
