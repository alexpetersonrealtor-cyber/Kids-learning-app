export type Difficulty = "easy" | "medium" | "hard" | "expert";

export const DIFFICULTY_LEVELS: { value: Difficulty; label: string; emoji: string }[] = [
  { value: "easy", label: "Easy", emoji: "🟢" },
  { value: "medium", label: "Medium", emoji: "🟡" },
  { value: "hard", label: "Hard", emoji: "🟠" },
  { value: "expert", label: "Expert", emoji: "🔴" },
];
