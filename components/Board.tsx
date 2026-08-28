"use client";

import { useEffect, useRef, useState } from "react";
import { BOARD, GROUPS, TOKENS, money } from "@/lib/game/board";
import { useAnimatedPositions } from "@/lib/client/useAnimatedPositions";
import { sound } from "@/lib/client/sound";
import { DeckViewer, DECK_META, type DeckId } from "./CardDecks";
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

type Edge = "top" | "bottom" | "left" | "right";

/** The edge of a perimeter tile that faces the board's open centre. */
function centreEdge(pos: { row: number; col: number }): Edge {
  if (pos.row === 11) return "top";
  if (pos.row === 1) return "bottom";
  if (pos.col === 1) return "right";
  return "left";
}

function opposite(edge: Edge): Edge {
  return edge === "top" ? "bottom" : edge === "bottom" ? "top" : edge === "left" ? "right" : "left";
}

/** Text glyphs standing in for what used to be emoji or tile names. */
const CORNER_GLYPH: Record<number, { text: string; danger?: boolean }> = {
  0: { text: "GO" },
  10: { text: "JAIL" },
  20: { text: "FREE" },
  30: { text: "→JAIL", danger: true },
};

function kindGlyph(t: Tile): { text: string; color?: string } | null {
  switch (t.kind) {
    case "chest":
      return { text: "◆", color: "var(--gold)" };
    case "chance":
      return { text: "◇", color: "var(--gold)" };
    case "station":
      return { text: "▬" };
    case "utility":
      return { text: "◎" };
    case "tax":
      return { text: "Rs", color: "var(--danger)" };
    default:
      return null;
  }
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

  // The tile the current mover is standing on — the centre panel's default
  // read-out, and the tile that gets the landed pulse.
  const landedIndex = state.phase === "playing" ? state.players[state.turn]?.position ?? null : null;

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
          const corner = CORNER_GLYPH[t.index];
          const isSelected = selected === t.index;
          const isLanded = landedIndex === t.index;
          const owner = own?.owner ? state.players.find((p) => p.id === own.owner) : null;
          const glyph = corner ? null : kindGlyph(t);

          const fill = isProperty(t)
            ? `color-mix(in srgb, ${GROUPS[t.group].color} 16%, var(--bg))`
            : "var(--surface-2)";

          const edge = centreEdge(pos);

          return (
            <button
              key={t.index}
              type="button"
              onClick={() => onSelect(t.index)}
              style={{ gridRow: pos.row, gridColumn: pos.col, background: fill }}
              className={`tile ${isSelected ? "tile-selected" : ""} ${isLanded ? "tile-landed" : ""}`}
              aria-label={`${t.name}${owner ? `, owned by ${owner.name}` : ""}`}
              aria-pressed={isSelected}
            >
              {isProperty(t) && (
                <span
                  className={`tile-chip tile-chip-${edge}`}
                  style={{ ["--chip-color" as string]: GROUPS[t.group].color }}
                />
              )}

              {owner && isOwnable(t) && (
                <span
                  className={`tile-owner-bar tile-owner-bar-${opposite(edge)}`}
                  style={{ ["--owner-color" as string]: colorOf(owner.id) }}
                />
              )}

              <div className="tile-content">
                {corner && (
                  <span
                    className="tile-glyph tile-glyph-corner"
                    style={corner.danger ? { ["--glyph-color" as string]: "var(--danger)" } : undefined}
                  >
                    {corner.text}
                  </span>
                )}

                {glyph && (
                  <span
                    className="tile-glyph"
                    style={glyph.color ? { ["--glyph-color" as string]: glyph.color } : undefined}
                  >
                    {glyph.text}
                  </span>
                )}

                {owner && isProperty(t) && (
                  <span
                    className="tile-monogram"
                    style={{ ["--owner-color" as string]: colorOf(owner.id) }}
                  >
                    {owner.name.charAt(0).toUpperCase()}
                  </span>
                )}

                {isProperty(t) && own && own.houses > 0 && (
                  <span className="tile-pips pop" aria-label={`${own.houses} buildings`}>
                    {own.houses === 5 ? (
                      <span className="tile-pip-hotel">◆</span>
                    ) : (
                      Array.from({ length: own.houses }, (_, i) => <span key={i}>▪</span>)
                    )}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        <div
          className="flex flex-col items-center justify-center gap-2 p-3 text-center"
          style={{ gridRow: "2 / 11", gridColumn: "2 / 11", background: "var(--surface-2)" }}
        >
          <BoardCentre
            state={state}
            displayIndex={selected ?? landedIndex ?? 0}
            onOpenDeck={setDeckOpen}
          />
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
                  border: `${p.id === me ? 2 : 1.5}px solid ${colorOf(p.id)}`,
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

/** Flavour lines for kinds that have no `blurb` field in the board data. */
function fallbackFlavour(t: Tile): string | null {
  switch (t.kind) {
    case "go":
      return "Collect Rs 2,000 every time you pass.";
    case "jail":
      return "Just visiting, or doing time.";
    case "free":
      return "Rest here. Collect the pot if there is one.";
    case "gotojail":
      return "Go directly. Do not pass GO.";
    case "tax":
      return "Paid straight to the bank.";
    case "chance":
    case "chest":
      return "Tap below to read every card in this deck.";
    default:
      return null;
  }
}

function BoardCentre({
  state,
  displayIndex,
  onOpenDeck,
}: {
  state: GameState;
  displayIndex: number;
  onOpenDeck: (d: DeckId) => void;
}) {
  const t = BOARD[displayIndex];
  const own = state.tiles[displayIndex];
  const owner = own?.owner ? state.players.find((p) => p.id === own.owner) : null;
  const flavour = "blurb" in t && typeof t.blurb === "string" ? t.blurb : fallbackFlavour(t);
  const isDeck = t.kind === "chance" || t.kind === "chest";
  const deckMeta = isDeck ? DECK_META[t.kind as DeckId] : null;

  const eyebrow = isProperty(t)
    ? GROUPS[t.group].name
    : isStation(t)
      ? "Station"
      : isUtility(t)
        ? "Utility"
        : deckMeta
          ? deckMeta.title
          : isTax(t)
            ? "Tax"
            : null;

  return (
    <>
      {eyebrow && (
        <div className="flex items-center gap-1.5">
          {isProperty(t) && (
            <span
              className="inline-block h-2 w-2 rounded-[1px]"
              style={{ background: GROUPS[t.group].color }}
            />
          )}
          <span className="label">{eyebrow}</span>
        </div>
      )}

      <div
        className="money px-2 text-[22px] leading-tight sm:text-[26px]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {t.name}
      </div>

      {flavour && <p className="max-w-[85%] text-xs italic text-[var(--ink-soft)]">{flavour}</p>}

      <div
        className="h-px w-11"
        style={{ background: "var(--gold)", opacity: 0.5 }}
        aria-hidden
      />

      {isDeck && deckMeta && (
        <button
          type="button"
          className="btn btn-outline btn-dense"
          onClick={() => onOpenDeck(t.kind as DeckId)}
        >
          Read all {deckMeta.deck.length} cards
        </button>
      )}

      {isOwnable(t) &&
        (owner ? (
          <div className="text-sm">
            <span className="font-semibold">{owner.name}</span> owns it
            {own?.mortgaged && <span style={{ color: "var(--danger)" }}> · mortgaged</span>}
          </div>
        ) : (
          <div className="text-sm text-[var(--ink-soft)]">
            Unowned · <span className="money">{money(t.price)}</span>
          </div>
        ))}

      <Dice roll={state.lastRoll} />

      {state.lastCard && (
        <div
          key={state.lastCard.text}
          className="plate card-in max-w-[92%] p-2 text-xs leading-snug"
          style={{ ["--plate-rule" as string]: DECK_META[state.lastCard.deck].color }}
        >
          <div className="label mb-1">{DECK_META[state.lastCard.deck].title}</div>
          {state.lastCard.text}
        </div>
      )}

      {state.freeParkingPot > 0 && (
        <div className="text-xs text-[var(--ink-soft)]">
          Free Parking pot:{" "}
          <span className="money font-semibold">{money(state.freeParkingPot)}</span>
        </div>
      )}

      <div className="label" style={{ color: "var(--ink-faint)" }}>
        Tap any tile to read it
      </div>
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
  /*
   * Ending a turn clears lastRoll, so "have we seen a roll before" cannot be
   * inferred from `seen` alone: that reset made the first roll of every turn
   * look like a page load, and the dice never made a sound. Track the mount
   * itself, which is the only case that should stay silent.
   */
  const mounted = useRef(false);

  useEffect(() => {
    if (d0 === null || d1 === null) {
      seen.current = null;
      mounted.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRolling(false);
      return;
    }

    const key = `${d0}:${d1}`;
    if (seen.current === key) return;
    // Only stay silent when the page loaded with a roll already on the table.
    const onPageLoad = !mounted.current;
    mounted.current = true;
    seen.current = key;
    if (onPageLoad) return;

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
          className={`card money grid h-8 w-8 place-items-center text-base ${
            rolling ? "die-rolling" : "die-settled"
          }`}
          style={{ borderColor: doubles ? "var(--gold)" : undefined }}
        >
          {d}
        </span>
      ))}
      {doubles && <span className="label text-[var(--gold-600)]">Doubles</span>}
    </div>
  );
}
