"use client";

import type { Tier } from "@/lib/grade-tiers";
import {
  SIGHT_WORDS_PRE_K_K,
  SIGHT_WORDS_FIRST_SECOND,
  READING_PASSAGES,
} from "@/lib/reading-content";
import SightWords from "./SightWords";
import ReadingComprehension from "./ReadingComprehension";

export default function Reading({ kidId, tier }: { kidId: string; tier: Tier }) {
  if (tier === "THIRD_FIFTH") {
    return <ReadingComprehension kidId={kidId} passages={READING_PASSAGES} />;
  }

  const words = tier === "PRE_K_K" ? SIGHT_WORDS_PRE_K_K : SIGHT_WORDS_FIRST_SECOND;
  const skillTag = tier === "PRE_K_K" ? "sight-words-prek-k" : "sight-words-1-2";
  return <SightWords kidId={kidId} words={words} skillTag={skillTag} />;
}
