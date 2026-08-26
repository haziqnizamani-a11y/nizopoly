"use client";

import { useEffect, useRef } from "react";
import type { GameState } from "@/lib/game/types";

export function LogPanel({ state }: { state: GameState }) {
  const ref = useRef<HTMLOListElement>(null);
  const count = state.log.length;

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  return (
    <div className="card flex min-h-0 flex-col p-3">
      <div className="label mb-2">Game log</div>
      <ol
        ref={ref}
        aria-live="polite"
        className="flex max-h-56 min-h-0 flex-col gap-1 overflow-y-auto pr-1 text-xs leading-snug"
      >
        {state.log.map((l, i) => (
          <li
            key={l.id}
            className={`text-[var(--ink-soft)] ${i === count - 1 ? "slide-in font-medium text-[var(--ink)]" : ""}`}
          >
            {l.text}
          </li>
        ))}
      </ol>
    </div>
  );
}
