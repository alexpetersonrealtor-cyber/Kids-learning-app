import type { GradeLevel } from "@prisma/client";

export const GRADE_LEVELS: { value: GradeLevel; label: string }[] = [
  { value: "PRE_K", label: "Pre-K" },
  { value: "K", label: "Kindergarten" },
  { value: "FIRST", label: "1st Grade" },
  { value: "SECOND", label: "2nd Grade" },
  { value: "THIRD", label: "3rd Grade" },
  { value: "FOURTH", label: "4th Grade" },
  { value: "FIFTH", label: "5th Grade" },
];

export type Tier = "PRE_K_K" | "FIRST_SECOND" | "THIRD_FIFTH";

const TIER_BY_GRADE: Record<GradeLevel, Tier> = {
  PRE_K: "PRE_K_K",
  K: "PRE_K_K",
  FIRST: "FIRST_SECOND",
  SECOND: "FIRST_SECOND",
  THIRD: "THIRD_FIFTH",
  FOURTH: "THIRD_FIFTH",
  FIFTH: "THIRD_FIFTH",
};

export function tierForGrade(grade: GradeLevel): Tier {
  return TIER_BY_GRADE[grade];
}

export function gradeLabel(grade: GradeLevel): string {
  return GRADE_LEVELS.find((g) => g.value === grade)?.label ?? grade;
}
