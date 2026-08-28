"use client";

import { useEffect, useState } from "react";
import { TOKENS } from "@/lib/game/board";
import { rememberName } from "@/lib/client/session";
import type { GameState } from "@/lib/game/types";
import type { RoomAction } from "@/lib/server/rooms";

interface Props {
  state: GameState;
  code: string;
  me: string | null;
  busy: boolean;
  send: (a: RoomAction) => void;
}

export function Lobby({ state, code, me, busy, send }: Props) {
  const [copied, setCopied] = useState(false);
  const isHost = state.hostId === me;
  const taken = new Map(state.players.map((p) => [p.tokenId, p.name]));
  const myPlayer = state.players.find((p) => p.id === me);
  const [draftName, setDraftName] = useState(myPlayer?.name ?? "");
  const [editing, setEditing] = useState(false);

  // Keep the field in step with the server unless the player is mid-edit.
  useEffect(() => {
    // Mirrors the server's name into the field unless mid-edit.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!editing && myPlayer) setDraftName(myPlayer.name);
  }, [myPlayer?.name, editing, myPlayer]);

  const commitName = () => {
    const name = draftName.trim();
    setEditing(false);
    if (!name || name === myPlayer?.name) {
      setDraftName(myPlayer?.name ?? "");
      return;
    }
    rememberName(name);
    send({ type: "setName", name });
  };

  const share = async () => {
    const url = `${window.location.origin}/room/${code}`;
    try {
      if (navigator.share) await navigator.share({ title: "Nizopoly", url });
      else await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="card p-5 text-center">
        <div className="label">Room code</div>
        <div className="money my-1 text-5xl tracking-[0.2em]" style={{ color: "var(--green)", fontFamily: "var(--font-display)" }}>{code}</div>
        <p className="mb-3 text-sm text-[var(--ink-soft)]">
          Send this to everyone playing. They open the site and enter the code.
        </p>
        <button className="btn w-full" onClick={share}>
          {copied ? "Link copied ✓" : "Share link"}
        </button>
      </div>

      <div className="card p-4">
        <div className="label mb-2">
          In the room · {state.players.length} of {TOKENS.length}
        </div>
        <ul className="mb-4 flex flex-col gap-1">
          {state.players.map((p) => (
            <li key={p.id} className="slide-in flex items-center gap-2 text-sm">
              <span className="text-xl">{TOKENS.find((t) => t.id === p.tokenId)?.emoji}</span>
              <span className="font-semibold">{p.name}</span>
              {p.id === state.hostId && <span className="label">host</span>}
              {p.id === me && <span className="label">you</span>}
            </li>
          ))}
        </ul>

        <div className="label mb-2">Your name</div>
        <div className="mb-4 flex gap-2">
          <input
            className="input"
            value={draftName}
            maxLength={20}
            placeholder="Your name"
            onFocus={() => setEditing(true)}
            onChange={(e) => {
              setEditing(true);
              setDraftName(e.target.value);
            }}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setDraftName(myPlayer?.name ?? "");
                setEditing(false);
                e.currentTarget.blur();
              }
            }}
          />
          <button
            className="btn shrink-0"
            disabled={busy || !draftName.trim() || draftName.trim() === myPlayer?.name}
            onClick={commitName}
          >
            Save
          </button>
        </div>

        <div className="label mb-2">Your token</div>
        <div className="mb-4 flex flex-wrap gap-2">
          {TOKENS.map((t) => {
            const owner = taken.get(t.id);
            const isMine = state.players.find((p) => p.id === me)?.tokenId === t.id;
            const disabled = Boolean(owner) && !isMine;
            return (
              <button
                key={t.id}
                type="button"
                disabled={busy || disabled}
                onClick={() => send({ type: "setToken", tokenId: t.id })}
                title={owner ? `Taken by ${owner}` : t.name}
                className="flex flex-col items-center rounded-lg border px-3 py-2 disabled:opacity-35"
                style={{
                  borderColor: isMine ? "var(--green)" : "var(--line)",
                  background: isMine ? "color-mix(in srgb, var(--green) 12%, transparent)" : "transparent",
                }}
              >
                <span className="text-2xl">{t.emoji}</span>
                <span className="text-[11px] font-semibold">{t.name}</span>
              </button>
            );
          })}
        </div>

        {isHost ? (
          <>
            <button
              className="btn btn-primary w-full"
              disabled={busy || state.players.length < 2}
              onClick={() => send({ type: "start" })}
            >
              Start game
            </button>
            {state.players.length < 2 && (
              <p className="mt-2 text-center text-xs text-[var(--ink-soft)]">
                Waiting for at least one more player.
              </p>
            )}
          </>
        ) : (
          <p className="text-center text-sm text-[var(--ink-soft)]">
            Waiting for {state.players.find((p) => p.id === state.hostId)?.name} to start.
          </p>
        )}
      </div>
    </div>
  );
}
