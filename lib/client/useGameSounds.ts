"use client";

import { useEffect, useRef } from "react";
import { PASS_GO } from "../game/board";
import type { GameState } from "../game/types";
import { sound } from "./sound";

interface Snapshot {
  seq: number;
  cash: number;
  owned: number;
  inJail: boolean;
  myTurn: boolean;
  card: string | null;
  winner: string | null;
  bankrupt: boolean;
}

function snapshot(state: GameState, me: string | null): Snapshot | null {
  const player = state.players.find((p) => p.id === me);
  if (!player) return null;
  let owned = 0;
  for (const t of Object.values(state.tiles)) if (t.owner === me) owned++;
  return {
    seq: state.seq,
    cash: player.cash,
    owned,
    inJail: player.inJail,
    myTurn: state.phase === "playing" && state.players[state.turn]?.id === me,
    card: state.lastCard?.text ?? null,
    winner: state.winnerId,
    bankrupt: player.bankrupt,
  };
}

/**
 * Watches state transitions and plays the matching sound. Deliberately derived
 * from state rather than the log, so rewording a log line can't break audio.
 */
export function useGameSounds(state: GameState | null, me: string | null) {
  const prev = useRef<Snapshot | null>(null);

  useEffect(() => {
    if (!state) return;
    const now = snapshot(state, me);
    if (!now) return;

    const before = prev.current;
    prev.current = now;
    if (!before || now.seq === before.seq) return;

    // End of game trumps everything else.
    if (now.winner && !before.winner) {
      sound.play(now.winner === me ? "win" : "lose");
      return;
    }
    if (now.bankrupt && !before.bankrupt) {
      sound.play("lose");
      return;
    }

    if (now.card && now.card !== before.card) sound.play("card");
    if (now.inJail && !before.inJail) sound.play("jail");
    if (now.owned > before.owned) sound.play("buy");

    const delta = now.cash - before.cash;
    if (delta >= PASS_GO) sound.play("passGo");
    else if (delta > 0) sound.play("collect");
    else if (delta < 0 && now.owned === before.owned) sound.play("rent");

    if (now.myTurn && !before.myTurn) sound.play("turn");
  }, [state, me]);
}
