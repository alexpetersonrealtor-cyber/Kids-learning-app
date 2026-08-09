"use client";

import { useMemo } from "react";
import type { Tier } from "@/lib/grade-tiers";
import {
  SIGHT_WORDS_PRE_K_K,
  SIGHT_WORDS_FIRST_SECOND,
  READING_PASSAGES,
  type Passage,
} from "@/lib/reading-content";
import SightWords from "./SightWords";
import ReadingComprehension from "./ReadingComprehension";

function pickRandomPassage(): Passage {
  return READING_PASSAGES[Math.floor(Math.random() * READING_PASSAGES.length)];
}

export default function Reading({ kidId, tier }: { kidId: string; tier: Tier }) {
  const passage = useMemo(() => pickRandomPassage(), []);

  if (tier === "THIRD_FIFTH") {
    return <ReadingComprehension kidId={kidId} passage={passage} />;
  }

  const words = tier === "PRE_K_K" ? SIGHT_WORDS_PRE_K_K : SIGHT_WORDS_FIRST_SECOND;
  const skillTag = tier === "PRE_K_K" ? "sight-words-prek-k" : "sight-words-1-2";
  return <SightWords kidId={kidId} words={words} skillTag={skillTag} />;
}
