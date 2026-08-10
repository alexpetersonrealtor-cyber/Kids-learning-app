"use client";

import type { GradeLevel } from "@prisma/client";
import { SIGHT_WORDS_BY_GRADE, passagesForGrade } from "@/lib/reading-content";
import SightWords from "./SightWords";
import ReadingComprehension from "./ReadingComprehension";

export default function Reading({ kidId, grade }: { kidId: string; grade: GradeLevel }) {
  if (grade === "THIRD" || grade === "FOURTH" || grade === "FIFTH") {
    return <ReadingComprehension kidId={kidId} passages={passagesForGrade(grade)} />;
  }

  const words = SIGHT_WORDS_BY_GRADE[grade];
  return (
    <SightWords kidId={kidId} words={words} skillTag={`sight-words-${grade.toLowerCase()}`} />
  );
}
