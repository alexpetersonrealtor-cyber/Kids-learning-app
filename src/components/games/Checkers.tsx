"use client";

import { useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";
import DifficultyGate from "@/components/DifficultyGate";
import type { Difficulty } from "@/lib/difficulty";

type PieceColor = "red" | "black";
type Cell = { color: PieceColor; king: boolean } | null;
type Board = Cell[][];
type Pos = { r: number; c: number };

function initialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: "black", king: false };
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: "red", king: false };
    }
  }
  return board;
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function pieceDirections(piece: NonNullable<Cell>): number[] {
  if (piece.king) return [-1, 1];
  return piece.color === "red" ? [-1] : [1];
}

function movesFor(board: Board, pos: Pos): { to: Pos; captured?: Pos }[] {
  const piece = board[pos.r][pos.c];
  if (!piece) return [];
  const results: { to: Pos; captured?: Pos }[] = [];
  const dirs = pieceDirections(piece);

  for (const dr of dirs) {
    for (const dc of [-1, 1]) {
      const r1 = pos.r + dr;
      const c1 = pos.c + dc;
      if (inBounds(r1, c1) && !board[r1][c1]) {
        results.push({ to: { r: r1, c: c1 } });
      }
      const r2 = pos.r + dr * 2;
      const c2 = pos.c + dc * 2;
      if (
        inBounds(r2, c2) &&
        !board[r2][c2] &&
        inBounds(r1, c1) &&
        board[r1][c1] &&
        board[r1][c1]!.color !== piece.color
      ) {
        results.push({ to: { r: r2, c: c2 }, captured: { r: r1, c: c1 } });
      }
    }
  }
  return results;
}

function allMovesForColor(board: Board, color: PieceColor) {
  const moves: { from: Pos; to: Pos; captured?: Pos }[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece?.color === color) {
        for (const m of movesFor(board, { r, c })) {
          moves.push({ from: { r, c }, ...m });
        }
      }
    }
  }
  const captures = moves.filter((m) => m.captured);
  return captures.length > 0 ? captures : moves;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type Move = { from: Pos; to: Pos; captured?: Pos };

const SEARCH_DEPTH: Record<Difficulty, number> = {
  easy: 0,
  medium: 2,
  hard: 4,
  expert: 6,
};

function evaluateBoard(board: Board): number {
  let score = 0;
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      const value = cell.king ? 3 : 1;
      score += cell.color === "red" ? value : -value;
    }
  }
  return score;
}

function minimax(board: Board, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  const color: PieceColor = maximizing ? "red" : "black";
  const moves = allMovesForColor(board, color);
  if (depth === 0 || moves.length === 0) {
    return evaluateBoard(board);
  }
  let value = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    const next = applyMove(board, move);
    const childValue = minimax(next, depth - 1, alpha, beta, !maximizing);
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

function pickBestMove(board: Board, depth: number): Move {
  const moves = allMovesForColor(board, "red");
  let bestScore = -Infinity;
  let bestMoves: Move[] = [];
  for (const move of moves) {
    const next = applyMove(board, move);
    const score = minimax(next, depth - 1, -Infinity, Infinity, false);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }
  return pickRandom(bestMoves);
}

function applyMove(board: Board, move: { from: Pos; to: Pos; captured?: Pos }): Board {
  const next = board.map((row) => [...row]);
  const piece = next[move.from.r][move.from.c];
  next[move.from.r][move.from.c] = null;
  if (piece && (move.to.r === 0 || move.to.r === 7)) {
    next[move.to.r][move.to.c] = { ...piece, king: true };
  } else {
    next[move.to.r][move.to.c] = piece;
  }
  if (move.captured) next[move.captured.r][move.captured.c] = null;
  return next;
}

export default function Checkers({ kidId }: { kidId: string }) {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [turn, setTurn] = useState<PieceColor>("black");
  const [selected, setSelected] = useState<Pos | null>(null);
  const [vsComputer, setVsComputer] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [winner, setWinner] = useState<PieceColor | null>(null);
  const startedAt = useRef(new Date());
  const recorded = useRef(false);

  function countPieces(b: Board, color: PieceColor) {
    return b.flat().filter((p) => p?.color === color).length;
  }

  function checkWinner(b: Board): PieceColor | null {
    if (countPieces(b, "red") === 0) return "black";
    if (countPieces(b, "black") === 0) return "red";
    if (allMovesForColor(b, "red").length === 0) return "black";
    if (allMovesForColor(b, "black").length === 0) return "red";
    return null;
  }

  function finish(w: PieceColor) {
    setWinner(w);
    if (!recorded.current) {
      recorded.current = true;
      recordGameSession({
        kidId,
        gameType: "checkers",
        subject: "classic",
        skillTag: vsComputer ? `checkers-${difficulty}` : "checkers-2p",
        startedAt: startedAt.current,
        score: w === "black" ? 1 : 0,
      });
    }
  }

  function doMove(move: { from: Pos; to: Pos; captured?: Pos }) {
    const next = applyMove(board, move);
    setBoard(next);
    setSelected(null);
    const w = checkWinner(next);
    if (w) {
      finish(w);
      return;
    }
    const nextTurn = turn === "black" ? "red" : "black";
    setTurn(nextTurn);

    if (vsComputer && nextTurn === "red") {
      setTimeout(() => computerMove(next), 500);
    }
  }

  function computerMove(current: Board) {
    const options = allMovesForColor(current, "red");
    if (options.length === 0) {
      finish("black");
      return;
    }
    const depth = SEARCH_DEPTH[difficulty ?? "medium"];
    const choice = depth === 0 ? pickRandom(options) : pickBestMove(current, depth);
    const next = applyMove(current, choice);
    setBoard(next);
    const w = checkWinner(next);
    if (w) {
      finish(w);
    } else {
      setTurn("black");
    }
  }

  function handleClick(r: number, c: number) {
    if (winner) return;
    if (vsComputer && turn === "red") return;

    const piece = board[r][c];
    if (selected) {
      const legal = movesFor(board, selected).find(
        (m) => m.to.r === r && m.to.c === c,
      );
      if (legal) {
        doMove({ from: selected, to: legal.to, captured: legal.captured });
        return;
      }
    }
    if (piece?.color === turn) {
      setSelected({ r, c });
    } else {
      setSelected(null);
    }
  }

  function reset() {
    setBoard(initialBoard());
    setTurn("black");
    setSelected(null);
    setWinner(null);
    startedAt.current = new Date();
    recorded.current = false;
  }

  const legalTargets = selected ? movesFor(board, selected).map((m) => m.to) : [];

  if (vsComputer && !difficulty) {
    return (
      <DifficultyGate
        title="Choose a difficulty"
        description="How strong should the computer opponent play?"
        onSelect={setDifficulty}
      />
    );
  }

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
        {!winner && <span>Turn: {turn === "black" ? "⚫ Black" : "🔴 Red"}</span>}
      </div>

      <div className="grid grid-cols-8 overflow-hidden rounded-lg shadow-lg">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const dark = (r + c) % 2 === 1;
            const isSelected = selected?.r === r && selected?.c === c;
            const isTarget = legalTargets.some((t) => t.r === r && t.c === c);
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleClick(r, c)}
                className={`flex h-10 w-10 items-center justify-center sm:h-12 sm:w-12 ${
                  dark ? "bg-emerald-800" : "bg-emerald-100"
                } ${isSelected ? "ring-4 ring-sky-400" : ""} ${
                  isTarget ? "ring-2 ring-yellow-400" : ""
                }`}
              >
                {cell && (
                  <span
                    className={`h-7 w-7 rounded-full sm:h-9 sm:w-9 ${
                      cell.color === "red" ? "bg-red-500" : "bg-slate-900"
                    } ${cell.king ? "ring-2 ring-yellow-300" : ""}`}
                  />
                )}
              </button>
            );
          }),
        )}
      </div>

      {winner && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xl font-bold text-slate-800">
            {winner === "black" ? "⚫ Black wins! 🎉" : "🔴 Red wins!"}
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
          >
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
