"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Board } from "@/components/Board";
import { Confetti } from "@/components/Confetti";
import { GameOver } from "@/components/GameOver";
import { MoneyBar } from "@/components/MoneyBar";
import { MyProperties } from "@/components/MyProperties";
import { Controls } from "@/components/Controls";
import { Lobby } from "@/components/Lobby";
import { LogPanel } from "@/components/LogPanel";
import { PlayerList } from "@/components/PlayerList";
import { TileDetail } from "@/components/TileDetail";
import { TradePanel } from "@/components/TradePanel";
import { recallName, saveSession } from "@/lib/client/session";
import { useRoom } from "@/lib/client/useRoom";
import { useGameSounds } from "@/lib/client/useGameSounds";
import { primeAudioOnFirstGesture, sound } from "@/lib/client/sound";

export function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const { state, session, me, loading, error, busy, send, dismissError } = useRoom(code);
  const [selected, setSelected] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);
  const [name, setName] = useState("");

  useGameSounds(state, me);
  useEffect(() => primeAudioOnFirstGesture(), []);

  // Recalls the last-used name from localStorage after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setName(recallName()), []);

  // Surface the last landed-on tile automatically so players see what happened.
  useEffect(() => {
    if (!state || !me) return;
    const p = state.players.find((x) => x.id === me);
    if (p && state.turnPhase === "decide_buy" && state.pendingPurchase !== null) {
    // Surfaces the tile the player just landed on.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(state.pendingPurchase);
    }
  }, [state?.turnPhase, state?.pendingPurchase, state, me]);

  if (loading) {
    return <Centered>Loading room {code}…</Centered>;
  }

  if (!state) {
    return (
      <Centered>
        <p className="mb-3">{error ?? `No room called ${code}.`}</p>
        <button className="btn" onClick={() => router.push("/")}>
          Back to start
        </button>
      </Centered>
    );
  }

  // Someone opened the link without a session — let them join if there's room.
  if (!session || !state.players.some((p) => p.id === me)) {
    const canJoin = state.phase === "lobby";
    return (
      <Centered>
        <div className="card w-full max-w-sm p-5">
          <div className="label mb-1">Room</div>
          <div className="mb-3 text-3xl font-black tracking-[0.2em] text-[var(--accent)]">{code}</div>
          {canJoin ? (
            <>
              <input
                className="input mb-3"
                value={name}
                maxLength={20}
                placeholder="Your name"
                onChange={(e) => setName(e.target.value)}
              />
              <button
                className="btn btn-primary w-full"
                disabled={joining || !name.trim()}
                onClick={async () => {
                  setJoining(true);
                  const res = await fetch(`/api/rooms/${code}/join`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ name: name.trim() }),
                  });
                  const body = await res.json();
                  if (res.ok) {
                    saveSession(code, {
                      playerId: body.playerId,
                      secret: body.secret,
                      name: name.trim(),
                    });
                    window.location.reload();
                  } else {
                    setJoining(false);
                    alert(body.error ?? "Could not join.");
                  }
                }}
              >
                Join game
              </button>
            </>
          ) : (
            <p className="text-sm text-[var(--ink-soft)]">
              This game is already under way. You are watching as a spectator.
            </p>
          )}
        </div>
      </Centered>
    );
  }

  if (state.phase === "lobby") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col justify-center p-4">
        <Lobby state={state} code={code} me={me} busy={busy} send={send} />
        <ErrorToast error={error} onDismiss={dismissError} />
      </main>
    );
  }

  const winner = state.winnerId ? state.players.find((p) => p.id === state.winnerId) : null;

  return (
    <main className="mx-auto w-full max-w-6xl p-3 lg:p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-xl font-black tracking-tight text-[var(--accent)]">NIZOPOLY</h1>
        <span className="label">Room {code}</span>
      </header>

      <MoneyBar state={state} me={me} />

      {winner && <Confetti />}

      {winner && <GameOver state={state} me={me} onNewGame={() => router.push("/")} />}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="board-scroll mx-auto w-full min-w-0" style={{ maxWidth: "min(100%, 54rem)" }}>
          <Board state={state} me={me} selected={selected} onSelect={setSelected} />
        </div>

        <aside className="flex min-w-0 flex-col gap-3">
          <Controls state={state} me={me} busy={busy} send={send} />
          {selected !== null && (
            <TileDetail
              state={state}
              index={selected}
              me={me}
              busy={busy}
              send={send}
              onClose={() => setSelected(null)}
            />
          )}
          {me && (
            <MyProperties
              state={state}
              me={me}
              busy={busy}
              send={send}
              urgent={state.pendingDebt?.playerId === me}
            />
          )}
          <PlayerList state={state} me={me} />
          {me && <TradePanel state={state} me={me} busy={busy} send={send} />}
          <LogPanel state={state} />
        </aside>
      </div>

      <ErrorToast error={error} onDismiss={dismissError} />
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center p-5 text-center">
      <div>{children}</div>
    </main>
  );
}

function ErrorToast({ error, onDismiss }: { error: string | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!error) return;
    sound.play("error");
    const id = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(id);
  }, [error, onDismiss]);

  if (!error) return null;
  return (
    <div
      role="status"
      className="card fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm border-[var(--danger)] p-3 text-center text-sm"
    >
      {error}
    </div>
  );
}
