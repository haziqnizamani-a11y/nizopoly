"use client";

import { useEffect } from "react";
import { CHANCE, CHEST } from "@/lib/game/cards";
import type { GameState } from "@/lib/game/types";

export const DECK_META = {
  chance: { title: "Karachi Traffic", icon: "🚗", color: "var(--danger)", deck: CHANCE },
  chest: { title: "Family Business", icon: "🥭", color: "var(--gold)", deck: CHEST },
} as const;

export type DeckId = keyof typeof DECK_META;

/** The two draw piles that sit in the middle of the board. */
export function CardDecks({
  state,
  onOpen,
}: {
  state: GameState;
  onOpen: (deck: DeckId) => void;
}) {
  const drawn = state.lastCard?.deck ?? null;

  return (
    <div className="flex items-end justify-center gap-[6cqi]">
      {(Object.keys(DECK_META) as DeckId[]).map((id) => {
        const meta = DECK_META[id];
        const used = id === "chance" ? state.chanceNext : state.chestNext;
        const left = meta.deck.length - used;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onOpen(id)}
            className={`deck-pile ${drawn === id ? "deck-drawing" : ""}`}
            style={{ ["--deck" as string]: meta.color }}
            title={`${meta.title} — tap to read all ${meta.deck.length} cards`}
          >
            <span className="deck-layer deck-layer-3" />
            <span className="deck-layer deck-layer-2" />
            <span className="deck-layer deck-face">
              <span className="deck-icon">{meta.icon}</span>
              <span className="deck-title">{meta.title}</span>
              <span className="deck-count">{left} left</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Full deck listing, so everyone can read the jokes they haven't drawn yet. */
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
        className="card slide-in flex max-h-[80dvh] w-full max-w-md flex-col p-4"
        style={{ borderColor: meta.color }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-lg font-black">
              {meta.icon} {meta.title}
            </div>
            <div className="label">
              {meta.deck.length} cards · {deck === "chance" ? "movement" : "money"}
            </div>
          </div>
          <button className="btn btn-ghost px-2 py-1" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <ol className="flex min-h-0 flex-col gap-1.5 overflow-y-auto pr-1">
          {meta.deck.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border px-2.5 py-2 text-sm leading-snug"
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
