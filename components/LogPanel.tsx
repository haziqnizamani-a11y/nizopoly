"use client";

import { useEffect, useRef } from "react";
import type { GameState } from "@/lib/game/types";

export function LogPanel({ state }: { state: GameState }) {
  const ref = useRef<HTMLOListElement>(null);
  const count = state.log.length;

  // Newest entries render at the top now, so a new one just needs the list
  // scrolled back up if the reader had drifted down into older history.
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = 0;
  }, [count]);

  // Newest first for reading; fade the ink the further back an entry sits.
  const rows = [...state.log].reverse();

  return (
    <section>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="label shrink-0">The log</span>
        <span className="h-px flex-1" style={{ background: "var(--line-hair)" }} />
      </div>

      <ol
        ref={ref}
        aria-live="polite"
        className="flex max-h-56 min-h-0 flex-col overflow-y-auto pr-1 text-xs leading-snug"
      >
        {rows.map((l, i) => (
          <li
            key={l.id}
            className="py-1"
            style={
              i === 0
                ? {
                    background: "var(--surface-2)",
                    borderLeft: "2px solid var(--gold)",
                    paddingLeft: "8px",
                    color: "var(--ink)",
                  }
                : {
                    paddingLeft: "10px",
                    color: i < 5 ? "var(--ink-soft)" : "var(--ink-faint)",
                  }
            }
          >
            {l.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
