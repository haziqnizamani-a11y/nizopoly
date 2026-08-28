"use client";

import { useEffect, useRef, useState } from "react";
import { TOKENS, money } from "@/lib/game/board";
import type { GameState } from "@/lib/game/types";

/**
 * Player colours from the "Register" design handoff (IMPLEMENTATION.md §1): a
 * darker band than the group hues, so a player tone can never be mistaken for
 * a group tone. No player colour repeats a group colour.
 */
export const PLAYER_COLORS = ["#10452B", "#8A3B12", "#14607A", "#5B3A7A", "#7A1F35", "#3F4A2E"];

export function colorFor(state: GameState, id: string): string {
  const i = state.players.findIndex((p) => p.id === id);
  return PLAYER_COLORS[i] ?? "#888";
}

/** A small tracked-caps marker. Filled for "you", outlined for everything else. */
function Chip({ children, filled = false }: { children: React.ReactNode; filled?: boolean }) {
  return (
    <span
      className="label shrink-0 rounded-sm px-1 py-px"
      style={
        filled
          ? { background: "var(--green)", color: "var(--bg)" }
          : { border: "1px solid var(--line-strong)", color: "var(--ink-soft)" }
      }
    >
      {children}
    </span>
  );
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
    <section>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="label shrink-0">At the table</span>
        <span className="h-px flex-1" style={{ background: "var(--line-hair)" }} />
      </div>

      <ul>
        {state.players.map((p, i) => {
          const token = TOKENS.find((t) => t.id === p.tokenId) ?? TOKENS[0];
          const delta = deltas[p.id];

          return (
            <li
              key={p.id}
              className="relative flex items-center gap-2.5 border-b py-2 last:border-none"
              style={{ borderColor: "var(--line-hair)", opacity: p.bankrupt ? 0.45 : 1 }}
            >
              <span
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[13px]"
                style={{ background: "var(--surface-3)", border: `1.5px solid ${PLAYER_COLORS[i]}` }}
              >
                {token.emoji}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                  <span className="truncate" style={{ textDecoration: p.bankrupt ? "line-through" : "none" }}>
                    {p.name}
                  </span>
                  {p.id === me && <Chip filled>You</Chip>}
                  {!p.connected && !p.bankrupt && <Chip>Away</Chip>}
                  {p.inJail && <Chip>Jail</Chip>}
                  {p.getOutOfJailCards > 0 && <Chip>Card</Chip>}
                </div>
              </div>

              <span className="money shrink-0 text-[11px] font-medium">
                {p.bankrupt ? "Bankrupt" : money(p.cash)}
              </span>

              {delta && (
                <span
                  key={delta.key}
                  className="float-up money pointer-events-none absolute right-0 top-0 text-xs font-medium"
                  style={{ color: delta.amount > 0 ? "var(--green)" : "var(--danger)" }}
                >
                  {delta.amount > 0 ? "+" : "−"}
                  {money(Math.abs(delta.amount))}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
