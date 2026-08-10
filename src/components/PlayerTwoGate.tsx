"use client";

import { useEffect, useState } from "react";
import { avatarEmoji } from "@/lib/avatars";

interface KidProfile {
  id: string;
  name: string;
  avatar: string;
  hasPin: boolean;
}

export default function PlayerTwoGate({
  excludeKidId,
  onSelect,
  onSkip,
}: {
  excludeKidId: string;
  onSelect: (kidId: string) => void;
  onSkip: () => void;
}) {
  const [kids, setKids] = useState<KidProfile[] | null>(null);
  const [pinKid, setPinKid] = useState<KidProfile | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetch(`/api/kids?exclude=${excludeKidId}`)
      .then((res) => res.json())
      .then((data) => setKids(data.kids ?? []))
      .catch(() => setKids([]));
  }, [excludeKidId]);

  function selectKid(kid: KidProfile) {
    if (kid.hasPin) {
      setPinKid(kid);
      setPin("");
      setError(false);
    } else {
      onSelect(kid.id);
    }
  }

  async function submitPin(nextPin: string) {
    if (!pinKid) return;
    setChecking(true);
    setError(false);
    try {
      const res = await fetch("/api/kids/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kidId: pinKid.id, pin: nextPin }),
      });
      const data = await res.json();
      if (data.ok) {
        onSelect(pinKid.id);
      } else {
        setError(true);
        setPin("");
      }
    } finally {
      setChecking(false);
    }
  }

  function press(digit: string) {
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      submitPin(next);
    }
  }

  if (pinKid) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow">
        <span className="text-5xl">{avatarEmoji(pinKid.avatar)}</span>
        <p className="text-lg font-semibold text-slate-700">
          Enter {pinKid.name}&rsquo;s PIN
        </p>
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-4 w-4 rounded-full border-2 border-sky-500 ${
                i < pin.length ? "bg-sky-500" : "bg-transparent"
              }`}
            />
          ))}
        </div>
        {error && (
          <p className="text-sm font-medium text-red-500">Wrong PIN, try again.</p>
        )}
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map(
            (key, i) =>
              key === "" ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  disabled={checking}
                  onClick={() =>
                    key === "⌫" ? setPin(pin.slice(0, -1)) : press(key)
                  }
                  className="h-12 w-12 rounded-xl bg-slate-100 text-xl font-semibold text-slate-700 hover:bg-sky-50 disabled:opacity-50"
                >
                  {key}
                </button>
              ),
          )}
        </div>
        <button
          onClick={() => setPinKid(null)}
          className="text-sm text-slate-500 underline"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow">
      <p className="text-lg font-bold text-slate-800">Who&rsquo;s Player 2?</p>
      <p className="max-w-xs text-center text-sm text-slate-500">
        Sign in so your own wins get tracked, or skip to just play.
      </p>
      {kids === null ? (
        <p className="text-sm text-slate-400">Loading profiles…</p>
      ) : kids.length === 0 ? (
        <p className="text-sm text-slate-400">No other profiles yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {kids.map((kid) => (
            <button
              key={kid.id}
              onClick={() => selectKid(kid)}
              className="flex flex-col items-center gap-1 rounded-xl border-2 border-slate-200 px-4 py-3 hover:border-sky-400 hover:bg-sky-50"
            >
              <span className="text-3xl">{avatarEmoji(kid.avatar)}</span>
              <span className="text-sm font-semibold text-slate-700">{kid.name}</span>
            </button>
          ))}
        </div>
      )}
      <button onClick={onSkip} className="text-sm text-slate-500 underline">
        Skip — just play
      </button>
    </div>
  );
}
