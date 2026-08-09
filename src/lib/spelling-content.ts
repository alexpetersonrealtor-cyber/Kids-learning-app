import type { Tier } from "@/lib/grade-tiers";

export interface SpellingWord {
  emoji: string;
  word: string;
}

const PRE_K_K: SpellingWord[] = [
  { emoji: "🐱", word: "cat" },
  { emoji: "🐶", word: "dog" },
  { emoji: "☀️", word: "sun" },
  { emoji: "🐟", word: "fish" },
  { emoji: "🥚", word: "egg" },
  { emoji: "🐝", word: "bee" },
  { emoji: "🌳", word: "tree" },
  { emoji: "⭐", word: "star" },
];

const FIRST_SECOND: SpellingWord[] = [
  { emoji: "🐸", word: "frog" },
  { emoji: "🏠", word: "house" },
  { emoji: "📖", word: "book" },
  { emoji: "🌙", word: "moon" },
  { emoji: "🍎", word: "apple" },
  { emoji: "🐷", word: "pig" },
  { emoji: "💧", word: "water" },
  { emoji: "🐢", word: "turtle" },
];

const THIRD_FIFTH: SpellingWord[] = [
  { emoji: "🦋", word: "butterfly" },
  { emoji: "🎈", word: "balloon" },
  { emoji: "🌈", word: "rainbow" },
  { emoji: "🏔️", word: "mountain" },
  { emoji: "🎸", word: "guitar" },
  { emoji: "🧭", word: "compass" },
  { emoji: "🦖", word: "dinosaur" },
  { emoji: "🚀", word: "rocket" },
];

export const SPELLING_WORDS: Record<Tier, SpellingWord[]> = {
  PRE_K_K,
  FIRST_SECOND,
  THIRD_FIFTH,
};
