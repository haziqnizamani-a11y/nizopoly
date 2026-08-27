"use client";

import { useEffect, useRef, useState } from "react";
import { BOARD, GROUPS, TOKENS, money } from "@/lib/game/board";
import { useAnimatedPositions } from "@/lib/client/useAnimatedPositions";
import { sound } from "@/lib/client/sound";
import { CardDecks, DeckViewer, DECK_META, type DeckId } from "./CardDecks";
import {
  isOwnable,
  isProperty,
  isStation,
  isTax,
  isUtility,
  type GameState,
  type Tile,
} from "@/lib/game/types";
import { PLAYER_COLORS } from "./PlayerList";

/**
 * The 40 tiles wrap the edge of an 11x11 grid (perimeter = 11*4-4 = 40),
 * starting at GO in the bottom-right and running anticlockwise.
 */
export const GRID = 11;

export function tilePos(i: number): { row: number; col: number } {
  if (i === 0) return { row: 11, col: 11 };
  if (i <= 9) return { row: 11, col: 11 - i };
  if (i === 10) return { row: 11, col: 1 };
  if (i <= 19) return { row: 21 - i, col: 1 };
  if (i === 20) return { row: 1, col: 1 };
  if (i <= 29) return { row: 1, col: i - 19 };
  if (i === 30) return { row: 1, col: 11 };
  return { row: i - 29, col: 11 };
}

const CORNER_LABEL: Record<number, { title: string; icon: string }> = {
  0: { title: "GO", icon: "→" },
  10: { title: "Jail", icon: "🔒" },
  20: { title: "Free", icon: "🅿️" },
  30: { title: "Go Jail", icon: "🚨" },
};

function groupColor(t: Tile): string | null {
  return isProperty(t) ? GROUPS[t.group].color : null;
}

interface Props {
  state: GameState;
  me: string | null;
  onSelect: (index: number) => void;
  selected: number | null;
}

export function Board({ state, me, onSelect, selected }: Props) {
  const animated = useAnimatedPositions(state, (kind) => sound.play(kind));
  const [deckOpen, setDeckOpen] = useState<DeckId | null>(null);
  const colorOf = (id: string) => {
    const i = state.players.findIndex((p) => p.id === id);
    return PLAYER_COLORS[i] ?? "#888";
  };

  // Tokens sharing a tile fan out so they don't stack on top of each other.
  const occupancy = new Map<number, string[]>();
  for (const p of state.players) {
    if (p.bankrupt) continue;
    const pos = animated[p.id]?.position ?? p.position;
    const list = occupancy.get(pos) ?? [];
    list.push(p.id);
    occupancy.set(pos, list);
  }

  return (
    <div className="board-wrap">
      <div className="board-grid select-none">
        {BOARD.map((t) => {
          const pos = tilePos(t.index);
          const own = state.tiles[t.index];
          const color = groupColor(t);
          const corner = CORNER_LABEL[t.index];
          const isSelected = selected === t.index;
          const owner = own?.owner ? state.players.find((p) => p.id === own.owner) : null;
          const isTarget = state.pendingPurchase === t.index;

          return (
            <button
              key={t.index}
              type="button"
              onClick={() => onSelect(t.index)}
              style={{
                gridRow: pos.row,
                gridColumn: pos.col,
                // Tint the card squares so they read as belonging to a deck.
                background:
                  t.kind === "chance" || t.kind === "chest"
                    ? `color-mix(in srgb, ${DECK_META[t.kind].color} 13%, var(--surface))`
                    : undefined,
              }}
              className={`tile ${isTarget ? "flash-ring" : ""}`}
              aria-label={`${t.name}${owner ? `, owned by ${owner.name}` : ""}`}
              aria-pressed={isSelected}
            >
              {color && (
                <div
                  className="h-[14%] min-h-[4px] w-full shrink-0 rounded-sm"
                  style={{ background: color }}
                />
              )}

              {isSelected && (
                <div className="pointer-events-none absolute inset-0 z-10 border-2 border-[var(--accent)]" />
              )}

              {owner && (
                <>
                  {/* Colour bar stays as a second, non-colour-blind-hostile signal. */}
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[4px]"
                    style={{ background: colorOf(owner.id) }}
                  />
                  {/* The owner's actual piece, so you can see at a glance whose
                      it is. Smaller and flatter than a moving token, and pinned
                      to the corner, so it never reads as "standing here". */}
                  <span
                    className="owner-badge"
                    style={{ borderColor: colorOf(owner.id) }}
                    title={`Owned by ${owner.name}`}
                  >
                    {(TOKENS.find((t) => t.id === owner.tokenId) ?? TOKENS[0]).emoji}
                  </span>
                </>
              )}

              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[1px] px-[1px]">
                {corner ? (
                  <>
                    <span className="tile-icon-corner">{corner.icon}</span>
                    <span className="tile-name">{corner.title}</span>
                  </>
                ) : (
                  <>
                    <span className="tile-name">{t.short ?? t.name}</span>
                    {isOwnable(t) && !owner && <span className="tile-sub">{money(t.price)}</span>}
                    {isTax(t) && <span className="tile-sub">{money(t.amount)}</span>}
                    {t.kind === "chance" && <span className="tile-icon">🚗</span>}
                    {t.kind === "chest" && <span className="tile-icon">🥭</span>}
                    {isStation(t) && <span className="tile-icon">🚌</span>}
                    {isUtility(t) && (
                      <span className="tile-icon">{t.index === 12 ? "💡" : "🚰"}</span>
                    )}
                  </>
                )}

                {own?.mortgaged && <span className="tile-sub text-[var(--danger)]">mortgaged</span>}
                {own && own.houses > 0 && (
                  <span className="tile-sub pop" aria-label={`${own.houses} buildings`}>
                    {own.houses === 5 ? "🏨" : "🏠".repeat(own.houses)}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        <div
          className="flex flex-col items-center justify-center gap-[2cqi] p-3 text-center"
          style={{ gridRow: "2 / 11", gridColumn: "2 / 11", background: "var(--surface-2)" }}
        >
          <BoardCentre state={state} onOpenDeck={setDeckOpen} />
        </div>
      </div>

      <div className="token-layer">
        {state.players.map((p) => {
          if (p.bankrupt) return null;
          const anim = animated[p.id];
          const pos = anim?.position ?? p.position;
          const { row, col } = tilePos(pos);
          const mates = occupancy.get(pos) ?? [p.id];
          const slot = mates.indexOf(p.id);
          // Fan tokens across the cell. Offsets are a share of the cell itself,
          // since .token is exactly one cell wide.
          const perRow = mates.length > 2 ? 2 : mates.length;
          const colSlot = slot % perRow;
          const rowSlot = Math.floor(slot / perRow);
          const dx = perRow > 1 ? (colSlot - (perRow - 1) / 2) * 34 : 0;
          // Sit tokens low in the cell so they cover the price line, not the name.
          const dy = 26 + (mates.length > 2 ? (rowSlot - 0.5) * 30 : 0);
          const token = TOKENS.find((t) => t.id === p.tokenId) ?? TOKENS[0];

          return (
            <div
              key={p.id}
              className={`token ${anim?.moving ? "token-hop" : ""}`}
              style={{
                transform: `translate(calc(${(col - 1) * 100}% + ${dx}%), calc(${(row - 1) * 100}% + ${dy}%))`,
                zIndex: 20 + slot,
              }}
            >
              <span
                className="token-face"
                style={{
                  fontSize: "clamp(7px, 1.45vw, 15px)",
                  width: "1.45em",
                  height: "1.45em",
                  outline: `${p.id === me ? 3 : 2}px solid ${colorOf(p.id)}`,
                  opacity: p.inJail ? 0.65 : 1,
                }}
                title={p.name}
              >
                {token.emoji}
              </span>
            </div>
          );
        })}
      </div>

      {deckOpen && <DeckViewer deck={deckOpen} onClose={() => setDeckOpen(null)} />}
    </div>
  );
}

function BoardCentre({
  state,
  onOpenDeck,
}: {
  state: GameState;
  onOpenDeck: (d: DeckId) => void;
}) {
  const player = state.players[state.turn];

  return (
    <>
      <div className="text-[clamp(1rem,3.2cqi,1.9rem)] font-black tracking-tight text-[var(--accent)]">
        NIZOPOLY
      </div>

      <CardDecks state={state} onOpen={onOpenDeck} />

      <Dice roll={state.lastRoll} />

      {state.phase === "playing" && player && (
        <div className="slide-in text-sm" key={player.id + state.turnPhase}>
          <span className="font-semibold">{player.name}</span>
          <span className="text-[var(--ink-soft)]">
            {state.turnPhase === "roll"
              ? " to roll"
              : state.turnPhase === "decide_buy"
                ? " is deciding"
                : " is playing"}
          </span>
        </div>
      )}

      {state.lastCard && (
        <div
          key={state.lastCard.text}
          className="card card-in max-w-[92%] p-2 text-xs leading-snug"
          style={{ borderColor: DECK_META[state.lastCard.deck].color }}
        >
          <div className="label mb-1">
            {DECK_META[state.lastCard.deck].icon} {DECK_META[state.lastCard.deck].title}
          </div>
          {state.lastCard.text}
        </div>
      )}

      {state.freeParkingPot > 0 && (
        <div className="text-xs text-[var(--ink-soft)]">
          Free Parking pot: <span className="font-semibold">{money(state.freeParkingPot)}</span>
        </div>
      )}
    </>
  );
}

/** Tumbles for a beat before settling on the real numbers. */
function Dice({ roll }: { roll: [number, number] | null }) {
  const [rolling, setRolling] = useState(false);
  const [faces, setFaces] = useState<[number, number]>([1, 1]);

  // Every poll hands us a brand new array, so keying this effect on `roll`
  // itself restarts the tumble forever. Key on the values instead.
  const d0 = roll?.[0] ?? null;
  const d1 = roll?.[1] ?? null;
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (d0 === null || d1 === null) {
      seen.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRolling(false);
      return;
    }

    const key = `${d0}:${d1}`;
    if (seen.current === key) return;
    const firstSight = seen.current === null;
    seen.current = key;
    // Don't replay a finished roll just because we loaded the page.
    if (firstSight) return;

    sound.play("dice");

    // Kicks off the tumble; the interval is the external system here.
     
    setRolling(true);
    const spin = window.setInterval(() => {
      setFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
    }, 70);
    const stop = window.setTimeout(() => {
      window.clearInterval(spin);
      setRolling(false);
    }, 520);

    return () => {
      window.clearInterval(spin);
      window.clearTimeout(stop);
    };
  }, [d0, d1]);

  if (!roll) return null;
  const shown = rolling ? faces : roll;
  const doubles = !rolling && roll[0] === roll[1];

  return (
    <div className="flex items-center gap-2">
      {shown.map((d, i) => (
        <span
          key={i}
          className={`card grid h-9 w-9 place-items-center text-lg font-bold ${
            rolling ? "die-rolling" : "die-settled"
          }`}
          style={{
            borderRadius: "0.5rem",
            borderColor: doubles ? "var(--gold)" : undefined,
          }}
        >
          {d}
        </span>
      ))}
      {doubles && <span className="label text-[var(--gold)]">doubles!</span>}
    </div>
  );
}
