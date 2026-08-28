"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TOKENS } from "@/lib/game/board";
import { recallName, rememberName, saveSession } from "@/lib/client/session";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // localStorage and the URL are only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(recallName());
    const url = new URL(window.location.href);
    const c = url.searchParams.get("code");
    if (c) setCode(c.toUpperCase());
  }, []);

  const create = async () => {
    if (!name.trim()) return setError("Enter your name first.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not create a room.");
      rememberName(name.trim());
      saveSession(body.code, { playerId: body.playerId, secret: body.secret, name: name.trim() });
      router.push(`/room/${body.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create a room.");
      setBusy(false);
    }
  };

  const join = async () => {
    if (!name.trim()) return setError("Enter your name first.");
    const room = code.trim().toUpperCase();
    if (room.length < 4) return setError("Room codes are four characters.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${room}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not join.");
      rememberName(name.trim());
      saveSession(room, { playerId: body.playerId, secret: body.secret, name: name.trim() });
      router.push(`/room/${room}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not join.");
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 p-5">
      <header className="text-center">
        <h1
          className="money text-5xl tracking-tight"
          style={{ color: "var(--green)", fontFamily: "var(--font-display)" }}
        >
          Nizopoly
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Karachi, Hyderabad and the orchard — buy it all.
        </p>
        <div className="mt-3 flex justify-center gap-1 text-2xl">
          {TOKENS.map((t) => (
            <span key={t.id} title={t.name}>
              {t.emoji}
            </span>
          ))}
        </div>
      </header>

      <div className="card flex flex-col gap-3 p-5">
        <label className="flex flex-col gap-1">
          <span className="label">Your name</span>
          <input
            className="input"
            value={name}
            maxLength={20}
            placeholder="Haziq"
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
          />
        </label>

        <button className="btn btn-primary" disabled={busy} onClick={create}>
          Start a new game
        </button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-[var(--line)]" />
          <span className="label">or join</span>
          <div className="h-px flex-1 bg-[var(--line)]" />
        </div>

        <div className="flex gap-2">
          <input
            className="input text-center text-xl font-bold uppercase tracking-[0.3em]"
            value={code}
            maxLength={6}
            placeholder="CODE"
            inputMode="text"
            autoCapitalize="characters"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && join()}
          />
          <button className="btn shrink-0" disabled={busy} onClick={join}>
            Join
          </button>
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      </div>

      <p className="text-center text-xs text-[var(--ink-soft)]">
        Everyone plays on their own phone. Two to six players.
      </p>
    </main>
  );
}
