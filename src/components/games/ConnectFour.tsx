"use client";

import { useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";

const ROWS = 6;
const COLS = 7;

type Cell = "red" | "yellow" | null;
type Board = Cell[][];

function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

function dropPiece(board: Board, col: number, color: "red" | "yellow"): { board: Board; row: number } | null {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (!board[row][col]) {
      const next = board.map((r) => [...r]);
      next[row][col] = color;
      return { board: next, row };
    }
  }
  return null;
}

function checkWinner(board: Board): "red" | "yellow" | null {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const color = board[r][c];
      if (!color) continue;
      for (const [dr, dc] of dirs) {
        let count = 1;
        let rr = r + dr;
        let cc = c + dc;
        while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[rr][cc] === color) {
          count++;
          rr += dr;
          cc += dc;
        }
        if (count >= 4) return color;
      }
    }
  }
  return null;
}

function validColumns(board: Board): number[] {
  const cols: number[] = [];
  for (let c = 0; c < COLS; c++) {
    if (!board[0][c]) cols.push(c);
  }
  return cols;
}

function pickComputerColumn(board: Board): number {
  const options = validColumns(board);

  for (const col of options) {
    const result = dropPiece(board, col, "yellow");
    if (result && checkWinner(result.board) === "yellow") return col;
  }
  for (const col of options) {
    const result = dropPiece(board, col, "red");
    if (result && checkWinner(result.board) === "red") return col;
  }

  const center = Math.floor(COLS / 2);
  const weighted = options.flatMap((col) =>
    Array(COLS - Math.abs(col - center)).fill(col),
  );
  return weighted[Math.floor(Math.random() * weighted.length)] ?? options[0];
}

export default function ConnectFour({ kidId }: { kidId: string }) {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [turn, setTurn] = useState<"red" | "yellow">("red");
  const [vsComputer, setVsComputer] = useState(true);
  const [winner, setWinner] = useState<"red" | "yellow" | "draw" | null>(null);
  const startedAt = useRef(new Date());
  const recorded = useRef(false);

  function finish(result: "red" | "yellow" | "draw") {
    setWinner(result);
    if (!recorded.current) {
      recorded.current = true;
      recordGameSession({
        kidId,
        gameType: "connect-four",
        subject: "classic",
        skillTag: "connect-four",
        startedAt: startedAt.current,
        score: result === "red" ? 1 : 0,
      });
    }
  }

  function afterDrop(next: Board, color: "red" | "yellow") {
    setBoard(next);
    const win = checkWinner(next);
    if (win) {
      finish(win);
      return;
    }
    if (validColumns(next).length === 0) {
      finish("draw");
      return;
    }
    const nextTurn = color === "red" ? "yellow" : "red";
    setTurn(nextTurn);

    if (vsComputer && nextTurn === "yellow") {
      setTimeout(() => {
        const col = pickComputerColumn(next);
        const result = dropPiece(next, col, "yellow");
        if (result) afterDrop(result.board, "yellow");
      }, 500);
    }
  }

  function play(col: number) {
    if (winner) return;
    if (vsComputer && turn === "yellow") return;
    const result = dropPiece(board, col, turn);
    if (!result) return;
    afterDrop(result.board, turn);
  }

  function reset() {
    setBoard(emptyBoard());
    setTurn("red");
    setWinner(null);
    startedAt.current = new Date();
    recorded.current = false;
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
        {!winner && <span>Turn: {turn === "red" ? "🔴 Red" : "🟡 Yellow"}</span>}
      </div>

      <div className="flex flex-col gap-1 rounded-xl bg-blue-700 p-2 shadow-lg">
        <div className="flex gap-1">
          {Array.from({ length: COLS }).map((_, c) => (
            <button
              key={c}
              onClick={() => play(c)}
              disabled={!!winner || !!board[0][c]}
              className="flex h-8 w-10 items-center justify-center text-xl text-white disabled:opacity-30 sm:h-9 sm:w-12"
            >
              ⬇
            </button>
          ))}
        </div>
        {board.map((row, r) => (
          <div key={r} className="flex gap-1">
            {row.map((cell, c) => (
              <button
                key={c}
                onClick={() => play(c)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-800 sm:h-12 sm:w-12"
              >
                {cell && (
                  <span
                    className={`h-8 w-8 rounded-full sm:h-10 sm:w-10 ${
                      cell === "red" ? "bg-red-500" : "bg-yellow-400"
                    }`}
                  />
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {winner && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xl font-bold text-slate-800">
            {winner === "draw"
              ? "It's a draw! 🤝"
              : winner === "red"
                ? "🔴 Red wins! 🎉"
                : "🟡 Yellow wins!"}
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
