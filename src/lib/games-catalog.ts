export type GameSlug =
  | "tetris"
  | "snake"
  | "checkers"
  | "tic-tac-toe"
  | "memory-match"
  | "math-facts"
  | "reading"
  | "connect-four"
  | "simon-says"
  | "number-matching"
  | "phonics"
  | "spelling-bee"
  | "chess"
  | "banana-blast"
  | "word-blaster"
  | "star-hopper";

export interface GameCatalogEntry {
  slug: GameSlug;
  name: string;
  emoji: string;
  subject: "classic" | "math" | "reading";
  description: string;
}

export const GAMES_CATALOG: GameCatalogEntry[] = [
  { slug: "tetris", name: "Tetris", emoji: "🧱", subject: "classic", description: "Stack the falling blocks." },
  { slug: "snake", name: "Snake", emoji: "🐍", subject: "classic", description: "Eat and grow, don't hit the walls." },
  { slug: "checkers", name: "Checkers", emoji: "🔴", subject: "classic", description: "Jump your way to victory." },
  { slug: "tic-tac-toe", name: "Tic-Tac-Toe", emoji: "❌", subject: "classic", description: "Three in a row wins." },
  { slug: "memory-match", name: "Memory Match", emoji: "🃏", subject: "classic", description: "Find the matching pairs." },
  { slug: "math-facts", name: "Math Facts", emoji: "➕", subject: "math", description: "Quick addition & subtraction drills." },
  { slug: "reading", name: "Reading", emoji: "📖", subject: "reading", description: "Words and stories." },
  { slug: "connect-four", name: "Connect Four", emoji: "🟡", subject: "classic", description: "Four in a row wins." },
  { slug: "simon-says", name: "Simon Says", emoji: "🎵", subject: "classic", description: "Watch, then repeat the pattern." },
  { slug: "number-matching", name: "Number Match", emoji: "🔢", subject: "math", description: "Count and pick the right number." },
  { slug: "phonics", name: "Phonics", emoji: "🔤", subject: "reading", description: "What letter does it start with?" },
  { slug: "spelling-bee", name: "Spelling Bee", emoji: "🐝", subject: "reading", description: "Build the word, letter by letter." },
  { slug: "chess", name: "Chess", emoji: "♟️", subject: "classic", description: "Checkmate the king." },
  { slug: "banana-blast", name: "Banana Blast", emoji: "🐒", subject: "math", description: "Toss the answer to the right monkey." },
  { slug: "word-blaster", name: "Word Blaster", emoji: "💥", subject: "reading", description: "Blast the letters to spell the word." },
  { slug: "star-hopper", name: "Star Hopper", emoji: "🧑‍🚀", subject: "classic", description: "Run, jump, and stomp your way to the flag." },
];

export function getGame(slug: string): GameCatalogEntry | undefined {
  return GAMES_CATALOG.find((g) => g.slug === slug);
}
