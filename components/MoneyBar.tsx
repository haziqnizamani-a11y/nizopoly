"use client";

import { useEffect, useRef, useState } from "react";
import { TOKENS, money } from "@/lib/game/board";
import { netWorth } from "@/lib/game/engine";
import type { GameState } from "@/lib/game/types";
import { MuteButton } from "./MuteButton";
import { PLAYER_COLORS } from "./PlayerList";

/**
 * Always-visible bar with your own cash. Sticks to the top on a phone, where
 * the players panel is otherwise scrolled far below the board.
 */
export function MoneyBar({ state, me }: { state: GameState; me: string | null }) {
  const idx = state.players.findIndex((p) => p.id === me);
  const player = idx >= 0 ? state.players[idx] : null;

  // Flash the amount when it changes so money moving is impossible to miss.
  const prevCash = useRef<number | null>(null);
  const [delta, setDelta] = useState<number | null>(null);

  useEffect(() => {
    if (!player) return;
    const before = prevCash.current;
    prevCash.current = player.cash;
    if (before === null || before === player.cash) return;
     
    setDelta(player.cash - before);
    const t = window.setTimeout(() => setDelta(null), 1800);
    return () => window.clearTimeout(t);
  }, [player?.cash, player]);

  if (!player) return null;

  const token = TOKENS.find((t) => t.id === player.tokenId) ?? TOKENS[0];
  const turnOf = state.players[state.turn];
  const myTurn = turnOf?.id === me;
  const color = PLAYER_COLORS[idx] ?? "#888";

  return (
    <div
      className="card sticky top-0 z-30 mb-3 flex items-center gap-3 p-3"
      style={{
        borderColor: myTurn ? "var(--accent)" : "var(--line)",
        backdropFilter: "blur(8px)",
        background: "color-mix(in srgb, var(--surface) 92%, transparent)",
      }}
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-2xl"
        style={{ background: "var(--surface-2)", outline: `2.5px solid ${color}` }}
      >
        {token.emoji}
      </span>

      <div className="min-w-0 flex-1">
        <div className="label leading-none">Your cash</div>
        <div className="relative flex items-baseline gap-2">
          <span className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">
            {money(player.cash)}
          </span>
          {delta !== null && (
            <span
              key={delta}
              className="float-up text-sm font-bold"
              style={{ color: delta > 0 ? "var(--accent)" : "var(--danger)" }}
            >
              {delta > 0 ? "+" : "−"}
              {money(Math.abs(delta))}
            </span>
          )}
        </div>
        <div className="truncate text-xs text-[var(--ink-soft)]">
          Net worth {money(netWorth(state, player.id))}
          {player.inJail && <span className="text-[var(--danger)]"> · in jail</span>}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className="rounded-full px-2.5 py-1 text-xs font-bold"
          style={{
            background: myTurn ? "var(--accent)" : "var(--surface-2)",
            color: myTurn ? "var(--accent-ink)" : "var(--ink-soft)",
          }}
        >
          {myTurn ? "Your turn" : `${turnOf?.name ?? "…"}'s turn`}
        </span>
        <MuteButton />
      </div>
    </div>
  );
}
