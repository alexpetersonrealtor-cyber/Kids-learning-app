"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { avatarEmoji } from "@/lib/avatars";

interface KidProfile {
  id: string;
  name: string;
  avatar: string;
  hasPin: boolean;
}

export default function ProfilePicker({ kids }: { kids: KidProfile[] }) {
  const router = useRouter();
  const [pinKid, setPinKid] = useState<KidProfile | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  function selectKid(kid: KidProfile) {
    if (kid.hasPin) {
      setPinKid(kid);
      setPin("");
      setError(false);
    } else {
      router.push(`/play/${kid.id}`);
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
        router.push(`/play/${pinKid.id}`);
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
      <div className="flex flex-col items-center gap-6">
        <span className="text-6xl">{avatarEmoji(pinKid.avatar)}</span>
        <p className="text-xl font-semibold text-slate-700">
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
          <p className="text-sm font-medium text-red-500">
            Wrong PIN, try again.
          </p>
        )}
        <div className="grid grid-cols-3 gap-3">
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
                  className="h-16 w-16 rounded-2xl bg-white text-2xl font-semibold text-slate-700 shadow hover:bg-sky-50 disabled:opacity-50"
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
          Back to profiles
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
      {kids.map((kid) => (
        <button
          key={kid.id}
          onClick={() => selectKid(kid)}
          className="flex flex-col items-center gap-2 rounded-3xl bg-white p-6 shadow-md transition hover:scale-105 hover:shadow-lg"
        >
          <span className="text-6xl">{avatarEmoji(kid.avatar)}</span>
          <span className="text-lg font-bold text-slate-800">{kid.name}</span>
          {kid.hasPin && <span className="text-xs text-slate-400">🔒 PIN</span>}
        </button>
      ))}
    </div>
  );
}
