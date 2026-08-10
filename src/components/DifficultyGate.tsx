"use client";

import { DIFFICULTY_LEVELS, type Difficulty } from "@/lib/difficulty";

export default function DifficultyGate({
  title,
  description,
  onSelect,
}: {
  title: string;
  description?: string;
  onSelect: (level: Difficulty) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow">
      <p className="text-xl font-bold text-slate-800">{title}</p>
      {description && (
        <p className="max-w-xs text-center text-sm text-slate-500">{description}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {DIFFICULTY_LEVELS.map((level) => (
          <button
            key={level.value}
            onClick={() => onSelect(level.value)}
            className="flex flex-col items-center gap-1 rounded-xl border-2 border-slate-200 px-6 py-4 font-semibold text-slate-700 hover:border-sky-400 hover:bg-sky-50"
          >
            <span className="text-2xl">{level.emoji}</span>
            {level.label}
          </button>
        ))}
      </div>
    </div>
  );
}
