import type { GradeLevel } from "@prisma/client";

export interface SpellingWord {
  emoji: string;
  word: string;
}

export const SPELLING_WORDS: Record<GradeLevel, SpellingWord[]> = {
  PRE_K: [
    { emoji: "🐱", word: "cat" },
    { emoji: "🐶", word: "dog" },
    { emoji: "☀️", word: "sun" },
    { emoji: "🥚", word: "egg" },
  ],
  K: [
    { emoji: "🐟", word: "fish" },
    { emoji: "🐝", word: "bee" },
    { emoji: "🌳", word: "tree" },
    { emoji: "⭐", word: "star" },
  ],
  FIRST: [
    { emoji: "🐸", word: "frog" },
    { emoji: "🏠", word: "house" },
    { emoji: "📖", word: "book" },
    { emoji: "🌙", word: "moon" },
  ],
  SECOND: [
    { emoji: "🐢", word: "turtle" },
    { emoji: "🐰", word: "rabbit" },
    { emoji: "✏️", word: "pencil" },
    { emoji: "🌼", word: "flower" },
  ],
  THIRD: [
    { emoji: "🌈", word: "rainbow" },
    { emoji: "🎈", word: "balloon" },
    { emoji: "👹", word: "monster" },
    { emoji: "🖼️", word: "picture" },
  ],
  FOURTH: [
    { emoji: "🐘", word: "elephant" },
    { emoji: "🏔️", word: "mountain" },
    { emoji: "🥪", word: "sandwich" },
    { emoji: "🎁", word: "surprise" },
  ],
  FIFTH: [
    { emoji: "🦋", word: "butterfly" },
    { emoji: "🦖", word: "dinosaur" },
    { emoji: "🐊", word: "alligator" },
    { emoji: "🍫", word: "chocolate" },
  ],
};
