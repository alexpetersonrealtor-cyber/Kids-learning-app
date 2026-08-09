"use client";

import { useMemo, useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";

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

function bestMove(board: Cell[]): number {
  const empty = board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
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
  return empty[Math.floor(Math.random() * empty.length)];
}

export default function TicTacToe({ kidId }: { kidId: string }) {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [wins, setWins] = useState({ X: 0, O: 0, draws: 0 });
  const startedAt = useRef(new Date());

  const result = useMemo(() => winner(board), [board]);
  const isDraw = !result && board.every((c) => c !== null);

  function play(i: number) {
    if (board[i] || result || isDraw) return;
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
        const move = bestMove(next);
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
      skillTag: "tic-tac-toe",
      startedAt: startedAt.current,
      score: w === "X" ? 1 : 0,
    });
  }

  function reset() {
    setBoard(Array(9).fill(null));
    setTurn("X");
    startedAt.current = new Date();
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
