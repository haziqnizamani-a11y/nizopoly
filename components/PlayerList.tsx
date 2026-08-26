"use client";

import { useEffect, useRef, useState } from "react";
import { TOKENS, money } from "@/lib/game/board";
import { netWorth } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";

export const PLAYER_COLORS = ["#1f7a4d", "#c8961e", "#b23a2f", "#3b6fb6", "#7a4d9c", "#0f8a8a"];

export function colorFor(state: GameState, id: string): string {
  const i = state.players.findIndex((p) => p.id === id);
  return PLAYER_COLORS[i] ?? "#888";
}

/** Remembers the last cash figure per player so we can float the delta. */
function useCashDeltas(state: GameState): Record<string, { amount: number; key: number }> {
  const prev = useRef<Map<string, number>>(new Map());
  const [deltas, setDeltas] = useState<Record<string, { amount: number; key: number }>>({});

  useEffect(() => {
    const changes: Record<string, { amount: number; key: number }> = {};
    for (const p of state.players) {
      const before = prev.current.get(p.id);
      if (before !== undefined && before !== p.cash) {
        changes[p.id] = { amount: p.cash - before, key: state.seq };
      }
      prev.current.set(p.id, p.cash);
    }
    if (Object.keys(changes).length > 0) {
      // Derives a transient flash from the incoming state change.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDeltas((d) => ({ ...d, ...changes }));
      const t = window.setTimeout(() => setDeltas({}), 1500);
      return () => window.clearTimeout(t);
    }
  }, [state]);

  return deltas;
}

export function PlayerList({ state, me }: { state: GameState; me: string | null }) {
  const deltas = useCashDeltas(state);

  return (
    <div className="card p-3">
      <div className="label mb-2">Players</div>
      <ul className="flex flex-col gap-1.5">
        {state.players.map((p, i) => {
          const token = TOKENS.find((t) => t.id === p.tokenId) ?? TOKENS[0];
          const isTurn = state.phase === "playing" && state.turn === i && !p.bankrupt;
          const delta = deltas[p.id];

          return (
            <li
              key={p.id}
              className={`relative flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                isTurn ? "turn-glow" : ""
              }`}
              style={{
                background: isTurn
                  ? "color-mix(in srgb, var(--accent) 14%, transparent)"
                  : "transparent",
                opacity: p.bankrupt ? 0.45 : 1,
              }}
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-base transition-transform"
                style={{
                  background: "var(--surface-2)",
                  outline: `2px solid ${PLAYER_COLORS[i]}`,
                  transform: isTurn ? "scale(1.12)" : "scale(1)",
                }}
              >
                {token.emoji}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                  <span className="truncate">{p.name}</span>
                  {p.id === me && <span className="label shrink-0">you</span>}
                  {p.inJail && <span title="In jail">🔒</span>}
                  {p.getOutOfJailCards > 0 && (
                    <span title={`${p.getOutOfJailCards} get-out-of-jail card(s)`}>🎟️</span>
                  )}
                </div>
                <div className="text-xs text-[var(--ink-soft)]">
                  {p.bankrupt ? (
                    "Bankrupt"
                  ) : (
                    <>
                      {money(p.cash)}
                      <span className="opacity-60"> · net {money(netWorth(state, p.id))}</span>
                    </>
                  )}
                </div>
              </div>

              {delta && (
                <span
                  key={delta.key}
                  className="float-up pointer-events-none absolute right-2 top-1 text-xs font-bold"
                  style={{ color: delta.amount > 0 ? "var(--accent)" : "var(--danger)" }}
                >
                  {delta.amount > 0 ? "+" : "−"}
                  {money(Math.abs(delta.amount))}
                </span>
              )}

              {!p.connected && !p.bankrupt && (
                <span className="label shrink-0" title="Not connected">
                  away
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
