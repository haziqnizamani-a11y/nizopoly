"use client";

import { useEffect, useRef, useState } from "react";
import { TOKENS, money } from "@/lib/game/board";
import { netWorth } from "@/lib/game/engine";
import { isOwnable } from "@/lib/game/types";
import { BOARD } from "@/lib/game/board";
import type { GameState } from "@/lib/game/types";
import { MuteButton } from "./MuteButton";
import { PLAYER_COLORS } from "./PlayerList";

/**
 * Always-visible cash plate. Sticks to the top on a phone, where the players
 * list is otherwise scrolled far below the board. Deliberately never a filled
 * green bar — green means "your turn" / primary action, and a green cash
 * plate would make that unreadable.
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
  const deedCount = BOARD.filter((t) => isOwnable(t) && state.tiles[t.index]?.owner === player.id).length;
  const houseCount = BOARD.reduce((n, t) => {
    const own = state.tiles[t.index];
    return own?.owner === player.id ? n + own.houses : n;
  }, 0);

  return (
    <div className="card sticky top-0 z-30 mb-3 p-[11px_14px_12px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-base"
            style={{ background: "var(--surface-3)", border: `2px solid ${color}` }}
          >
            {token.emoji}
          </span>
          <span className="label truncate">
            {player.name} · Your cash
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {myTurn && (
            <span
              className="inline-block h-[5px] w-[5px] shrink-0"
              style={{ background: "var(--gold)", transform: "rotate(45deg)" }}
              aria-hidden
            />
          )}
          <span
            className="label whitespace-nowrap"
            style={{ color: myTurn ? "var(--green-700)" : "var(--ink-faint)" }}
          >
            {myTurn ? "Your turn" : `${turnOf?.name ?? "…"}'s turn`}
          </span>
          <MuteButton />
        </div>
      </div>

      <div className="relative flex items-baseline gap-2">
        <span className="money text-[28px] leading-tight sm:text-[34px]">{money(player.cash)}</span>
        {delta !== null && (
          <span
            key={delta}
            className="float-up money text-[11px] font-medium"
            style={{ color: delta > 0 ? "var(--green)" : "var(--danger)" }}
          >
            {delta > 0 ? "+" : "−"}
            {money(Math.abs(delta))}
          </span>
        )}
      </div>

      <div className="my-1.5 h-px" style={{ background: "var(--gold)", opacity: 0.5 }} aria-hidden />

      <div className="flex items-center justify-between text-[10px] text-[var(--ink-soft)]">
        <span className="money">Net worth {money(netWorth(state, player.id))}</span>
        <span>
          {deedCount} deed{deedCount === 1 ? "" : "s"} · {houseCount} house{houseCount === 1 ? "" : "s"}
          {player.inJail && <span style={{ color: "var(--danger)" }}> · in jail</span>}
        </span>
      </div>
    </div>
  );
}
