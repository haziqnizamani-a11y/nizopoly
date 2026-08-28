"use client";

import { useEffect } from "react";
import { CHANCE, CHEST } from "@/lib/game/cards";

export const DECK_META = {
  chance: { title: "Karachi Traffic", color: "var(--danger)", deck: CHANCE },
  chest: { title: "Family Business", color: "var(--gold)", deck: CHEST },
} as const;

export type DeckId = keyof typeof DECK_META;

/** Full deck listing, opened from the board centre so everyone can read the
 * jokes they haven't drawn yet. */
export function DeckViewer({ deck, onClose }: { deck: DeckId; onClose: () => void }) {
  const meta = DECK_META[deck];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={meta.title}
      onClick={onClose}
    >
      <div
        className="plate slide-in flex max-h-[80dvh] w-full max-w-md flex-col p-4"
        style={{ ["--plate-rule" as string]: meta.color }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="money text-lg" style={{ fontFamily: "var(--font-display)" }}>
              {meta.title}
            </div>
            <div className="label">
              {meta.deck.length} cards · {deck === "chance" ? "movement" : "money"}
            </div>
          </div>
          <button className="btn btn-ghost btn-dense px-2" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <ol className="flex min-h-0 flex-col gap-1.5 overflow-y-auto pr-1">
          {meta.deck.map((c) => (
            <li
              key={c.id}
              className="rounded-[var(--r-btn)] border px-2.5 py-2 text-sm leading-snug"
              style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
            >
              {c.text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
