export interface RecordSessionInput {
  kidId: string;
  gameType: string;
  subject: string;
  skillTag: string;
  startedAt: Date;
  score?: number;
  accuracy?: number;
}

export async function recordGameSession(input: RecordSessionInput) {
  try {
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        startedAt: input.startedAt.toISOString(),
      }),
    });
  } catch {
    // best-effort; a dropped analytics write shouldn't block gameplay
  }
}
