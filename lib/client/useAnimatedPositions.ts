"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BOARD_SIZE, JAIL_TILE } from "../game/board";
import type { GameState } from "../game/types";

/** Anything further back than this is treated as a "go back N" card, not a lap. */
const BACKWARD_WINDOW = 5;

function stepDelay(distance: number): number {
  if (distance > 12) return 55;
  if (distance > 6) return 85;
  return 115;
}

export interface AnimatedToken {
  position: number;
  moving: boolean;
}

/**
 * Walks each token tile-by-tile toward its real position so moves read like a
 * physical board rather than teleporting. Jail is a jump — you don't walk there.
 *
 * The walk machinery lives in refs because it is driven by timers, but nothing
 * reads those refs during render: every mutation publishes to state instead.
 */
export function useAnimatedPositions(state: GameState | null): Record<string, AnimatedToken> {
  const [display, setDisplay] = useState<Record<string, AnimatedToken>>({});
  const positions = useRef<Map<string, number>>(new Map());
  const moving = useRef<Set<string>>(new Set());
  const timers = useRef<Map<string, number>>(new Map());
  const targets = useRef<Map<string, number>>(new Map());

  const publish = useCallback(() => {
    const out: Record<string, AnimatedToken> = {};
    for (const [id, position] of positions.current) {
      out[id] = { position, moving: moving.current.has(id) };
    }
    setDisplay(out);
  }, []);

  // Each step schedules the next one, so the callback needs a stable handle on
  // itself rather than referring to its own binding.
  const advanceRef = useRef<(id: string) => void>(() => {});

  const advance = useCallback(
    (id: string) => {
      const target = targets.current.get(id);
      const cur = positions.current.get(id);
      if (target === undefined || cur === undefined || cur === target) {
        moving.current.delete(id);
        timers.current.delete(id);
        publish();
        return;
      }

      const forward = (target - cur + BOARD_SIZE) % BOARD_SIZE;
      const backward = (cur - target + BOARD_SIZE) % BOARD_SIZE;
      const goBack = backward <= BACKWARD_WINDOW && backward < forward;
      positions.current.set(id, goBack ? (cur - 1 + BOARD_SIZE) % BOARD_SIZE : (cur + 1) % BOARD_SIZE);

      const remaining = (goBack ? backward : forward) - 1;
      if (remaining <= 0) {
        moving.current.delete(id);
        timers.current.delete(id);
        publish();
        return;
      }
      publish();
      timers.current.set(id, window.setTimeout(() => advanceRef.current(id), stepDelay(remaining)));
    },
    [publish]
  );

  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  useEffect(() => {
    if (!state) return;
    let dirty = false;

    for (const p of state.players) {
      targets.current.set(p.id, p.position);
      const cur = positions.current.get(p.id);

      if (cur === undefined) {
        positions.current.set(p.id, p.position);
        dirty = true;
        continue;
      }
      if (cur === p.position) continue;

      // Jail isn't a walk — you get sent there.
      if (p.inJail && p.position === JAIL_TILE) {
        positions.current.set(p.id, p.position);
        moving.current.delete(p.id);
        dirty = true;
        continue;
      }
      if (moving.current.has(p.id)) continue;

      moving.current.add(p.id);
      dirty = true;
      const forward = (p.position - cur + BOARD_SIZE) % BOARD_SIZE;
      timers.current.set(p.id, window.setTimeout(() => advanceRef.current(p.id), stepDelay(forward)));
    }

    // Publishing the walk's starting frame is the whole point of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (dirty) publish();
  }, [state, publish]);

  useEffect(() => {
    const running = timers.current;
    return () => {
      for (const t of running.values()) window.clearTimeout(t);
      running.clear();
    };
  }, []);

  return display;
}
