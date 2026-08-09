export interface PhonicsWord {
  emoji: string;
  word: string;
  letter: string;
}

export const PHONICS_WORDS: PhonicsWord[] = [
  { emoji: "🐱", word: "cat", letter: "C" },
  { emoji: "🐶", word: "dog", letter: "D" },
  { emoji: "☀️", word: "sun", letter: "S" },
  { emoji: "🐟", word: "fish", letter: "F" },
  { emoji: "⚽", word: "ball", letter: "B" },
  { emoji: "🍎", word: "apple", letter: "A" },
  { emoji: "🐸", word: "frog", letter: "F" },
  { emoji: "🏠", word: "house", letter: "H" },
  { emoji: "🌙", word: "moon", letter: "M" },
  { emoji: "🐝", word: "bee", letter: "B" },
  { emoji: "🦆", word: "duck", letter: "D" },
  { emoji: "🐢", word: "turtle", letter: "T" },
  { emoji: "🥕", word: "carrot", letter: "C" },
  { emoji: "🎈", word: "balloon", letter: "B" },
  { emoji: "🐷", word: "pig", letter: "P" },
  { emoji: "🦋", word: "butterfly", letter: "B" },
];

export const LETTER_CHOICES = [
  "A", "B", "C", "D", "E", "F", "G", "H", "M", "P", "S", "T",
];
