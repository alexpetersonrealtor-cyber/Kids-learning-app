export type GameSlug =
  | "tetris"
  | "snake"
  | "checkers"
  | "tic-tac-toe"
  | "memory-match"
  | "math-facts"
  | "reading";

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
];

export function getGame(slug: string): GameCatalogEntry | undefined {
  return GAMES_CATALOG.find((g) => g.slug === slug);
}
