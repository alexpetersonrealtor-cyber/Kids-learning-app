"use client";

import { useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";
import DifficultyGate from "@/components/DifficultyGate";
import PlayerTwoGate from "@/components/PlayerTwoGate";
import type { Difficulty } from "@/lib/difficulty";

const ROWS = 6;
const COLS = 7;
const CENTER = Math.floor(COLS / 2);

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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMediumColumn(board: Board): number {
  const options = validColumns(board);

  for (const col of options) {
    const result = dropPiece(board, col, "yellow");
    if (result && checkWinner(result.board) === "yellow") return col;
  }
  for (const col of options) {
    const result = dropPiece(board, col, "red");
    if (result && checkWinner(result.board) === "red") return col;
  }

  const weighted = options.flatMap((col) => Array(COLS - Math.abs(col - CENTER)).fill(col));
  return pickRandom(weighted) ?? options[0];
}

function scoreWindow(window: Cell[]): number {
  const yellow = window.filter((c) => c === "yellow").length;
  const red = window.filter((c) => c === "red").length;
  const empty = window.filter((c) => c === null).length;
  if (yellow > 0 && red > 0) return 0;
  if (yellow === 4) return 100000;
  if (red === 4) return -100000;
  if (yellow === 3 && empty === 1) return 50;
  if (red === 3 && empty === 1) return -50;
  if (yellow === 2 && empty === 2) return 10;
  if (red === 2 && empty === 2) return -10;
  if (yellow === 1 && empty === 3) return 1;
  if (red === 1 && empty === 3) return -1;
  return 0;
}

function evaluateBoard(board: Board): number {
  let score = 0;
  for (let r = 0; r < ROWS; r++) {
    if (board[r][CENTER] === "yellow") score += 3;
    else if (board[r][CENTER] === "red") score -= 3;
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += scoreWindow([board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]]);
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      score += scoreWindow([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]]);
    }
  }
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += scoreWindow([board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]]);
    }
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += scoreWindow([board[r][c], board[r - 1][c + 1], board[r - 2][c + 2], board[r - 3][c + 3]]);
    }
  }
  return score;
}

function minimax(board: Board, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  const winner = checkWinner(board);
  if (winner === "yellow") return 1000000 + depth;
  if (winner === "red") return -1000000 - depth;

  const cols = validColumns(board);
  if (depth === 0 || cols.length === 0) return evaluateBoard(board);

  let value = maximizing ? -Infinity : Infinity;
  for (const col of cols) {
    const result = dropPiece(board, col, maximizing ? "yellow" : "red");
    if (!result) continue;
    const childValue = minimax(result.board, depth - 1, alpha, beta, !maximizing);
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

function pickBestColumn(board: Board, depth: number): number {
  const cols = validColumns(board);
  let bestScore = -Infinity;
  let bestCols: number[] = [];
  for (const col of cols) {
    const result = dropPiece(board, col, "yellow");
    if (!result) continue;
    const score = minimax(result.board, depth - 1, -Infinity, Infinity, false);
    if (score > bestScore) {
      bestScore = score;
      bestCols = [col];
    } else if (score === bestScore) {
      bestCols.push(col);
    }
  }
  return pickRandom(bestCols) ?? cols[0];
}

const SEARCH_DEPTH: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 4, expert: 6 };

function pickComputerColumn(board: Board, difficulty: Difficulty): number {
  if (difficulty === "easy") return pickRandom(validColumns(board));
  if (difficulty === "medium") return pickMediumColumn(board);
  return pickBestColumn(board, SEARCH_DEPTH[difficulty]);
}

export default function ConnectFour({ kidId }: { kidId: string }) {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [turn, setTurn] = useState<"red" | "yellow">("red");
  const [vsComputer, setVsComputer] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [player2, setPlayer2] = useState<string | "skip" | null>(null);
  const [winner, setWinner] = useState<"red" | "yellow" | "draw" | null>(null);
  const startedAt = useRef(new Date());
  const recorded = useRef(false);

  function finish(result: "red" | "yellow" | "draw") {
    setWinner(result);
    if (!recorded.current) {
      recorded.current = true;
      const skillTag = vsComputer ? `connect-four-${difficulty}` : "connect-four-2p";
      recordGameSession({
        kidId,
        gameType: "connect-four",
        subject: "classic",
        skillTag,
        startedAt: startedAt.current,
        score: result === "red" ? 1 : 0,
      });
      if (!vsComputer && player2 && player2 !== "skip") {
        recordGameSession({
          kidId: player2,
          gameType: "connect-four",
          subject: "classic",
          skillTag,
          startedAt: startedAt.current,
          score: result === "yellow" ? 1 : 0,
        });
      }
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

    if (vsComputer && nextTurn === "yellow" && difficulty) {
      setTimeout(() => {
        const col = pickComputerColumn(next, difficulty);
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

  if (vsComputer && !difficulty) {
    return (
      <DifficultyGate
        title="Choose a difficulty"
        description="How strong should the computer opponent play?"
        onSelect={setDifficulty}
      />
    );
  }

  if (!vsComputer && player2 === null) {
    return (
      <PlayerTwoGate
        excludeKidId={kidId}
        onSelect={setPlayer2}
        onSkip={() => setPlayer2("skip")}
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
              setPlayer2(null);
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
