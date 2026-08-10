"use client";

import { useMemo, useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";
import DifficultyGate from "@/components/DifficultyGate";
import type { Difficulty } from "@/lib/difficulty";

type Cell = "X" | "O" | null;
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function winner(board: Cell[]): Cell {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function emptyCells(board: Cell[]): number[] {
  return board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function easyMove(board: Cell[]): number {
  return pickRandom(emptyCells(board));
}

function mediumMove(board: Cell[]): number {
  const empty = emptyCells(board);
  for (const i of empty) {
    const copy = [...board];
    copy[i] = "O";
    if (winner(copy) === "O") return i;
  }
  for (const i of empty) {
    const copy = [...board];
    copy[i] = "X";
    if (winner(copy) === "X") return i;
  }
  return pickRandom(empty);
}

function hardMove(board: Cell[]): number {
  const empty = emptyCells(board);
  for (const i of empty) {
    const copy = [...board];
    copy[i] = "O";
    if (winner(copy) === "O") return i;
  }
  for (const i of empty) {
    const copy = [...board];
    copy[i] = "X";
    if (winner(copy) === "X") return i;
  }
  if (board[4] === null) return 4;
  return pickRandom(empty);
}

function minimaxScore(board: Cell[], maximizing: boolean, depth: number): number {
  const w = winner(board);
  if (w === "O") return 10 - depth;
  if (w === "X") return depth - 10;
  const empty = emptyCells(board);
  if (empty.length === 0) return 0;

  let best = maximizing ? -Infinity : Infinity;
  for (const i of empty) {
    const copy = [...board];
    copy[i] = maximizing ? "O" : "X";
    const score = minimaxScore(copy, !maximizing, depth + 1);
    best = maximizing ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

function expertMove(board: Cell[]): number {
  const empty = emptyCells(board);
  let bestScore = -Infinity;
  let bestMoves: number[] = [];
  for (const i of empty) {
    const copy = [...board];
    copy[i] = "O";
    const score = minimaxScore(copy, false, 0);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [i];
    } else if (score === bestScore) {
      bestMoves.push(i);
    }
  }
  return pickRandom(bestMoves);
}

const MOVE_FOR_DIFFICULTY: Record<Difficulty, (board: Cell[]) => number> = {
  easy: easyMove,
  medium: mediumMove,
  hard: hardMove,
  expert: expertMove,
};

export default function TicTacToe({ kidId }: { kidId: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [wins, setWins] = useState({ X: 0, O: 0, draws: 0 });
  const startedAt = useRef(new Date());

  const result = useMemo(() => winner(board), [board]);
  const isDraw = !result && board.every((c) => c !== null);

  function play(i: number) {
    if (!difficulty || board[i] || result || isDraw) return;
    const next = [...board];
    next[i] = turn;
    setBoard(next);

    const w = winner(next);
    const draw = !w && next.every((c) => c !== null);
    if (w || draw) {
      finishRound(w, draw);
      return;
    }

    if (turn === "X") {
      setTurn("O");
      setTimeout(() => {
        const move = MOVE_FOR_DIFFICULTY[difficulty](next);
        const afterAi = [...next];
        afterAi[move] = "O";
        setBoard(afterAi);
        const w2 = winner(afterAi);
        const draw2 = !w2 && afterAi.every((c) => c !== null);
        if (w2 || draw2) {
          finishRound(w2, draw2);
        } else {
          setTurn("X");
        }
      }, 400);
    }
  }

  function finishRound(w: Cell, draw: boolean) {
    setWins((prev) => ({
      X: prev.X + (w === "X" ? 1 : 0),
      O: prev.O + (w === "O" ? 1 : 0),
      draws: prev.draws + (draw ? 1 : 0),
    }));
    recordGameSession({
      kidId,
      gameType: "tic-tac-toe",
      subject: "classic",
      skillTag: `tic-tac-toe-${difficulty}`,
      startedAt: startedAt.current,
      score: w === "X" ? 1 : 0,
    });
  }

  function reset() {
    setBoard(Array(9).fill(null));
    setTurn("X");
    startedAt.current = new Date();
  }

  if (!difficulty) {
    return (
      <DifficultyGate
        title="Choose a difficulty"
        description="How strong should the computer opponent play?"
        onSelect={setDifficulty}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-6 text-sm font-semibold text-slate-600">
        <span>You (X): {wins.X}</span>
        <span>Computer (O): {wins.O}</span>
        <span>Draws: {wins.draws}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => play(i)}
            className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white text-5xl font-bold text-slate-700 shadow hover:bg-sky-50"
          >
            {cell}
          </button>
        ))}
      </div>

      {(result || isDraw) && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xl font-bold text-slate-800">
            {result === "X" ? "You win! 🎉" : result === "O" ? "Computer wins!" : "It's a draw!"}
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
