"use client";

import { BOARD, TOKENS, money } from "@/lib/game/board";
import { standings } from "@/lib/game/engine";
import { isOwnable, type GameState } from "@/lib/game/types";
import { PLAYER_COLORS } from "./PlayerList";

const MEDAL = ["🥇", "🥈", "🥉"];

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

/** Final placings, shown when the game ends. */
export function GameOver({
  state,
  me,
  onNewGame,
}: {
  state: GameState;
  me: string | null;
  onNewGame: () => void;
}) {
  const table = standings(state);
  const winner = table[0];
  const youPlaced = table.find((r) => r.player.id === me);

  const propertyCount = (id: string) =>
    BOARD.filter((t) => isOwnable(t) && state.tiles[t.index]?.owner === id).length;

  return (
    <div className="card card-in mb-3 overflow-hidden border-[var(--gold)]">
      <div
        className="p-4 text-center"
        style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)" }}
      >
        <div className="label">Final standings</div>
        <div className="money text-2xl leading-tight" style={{ fontFamily: "var(--font-display)" }}>
          🏆 {winner?.player.name} wins
        </div>
        {youPlaced && (
          <div className="mt-1 text-sm text-[var(--ink-soft)]">
            {youPlaced.player.id === me && youPlaced.place === 1
              ? "That's you."
              : `You finished ${ordinal(youPlaced.place)} of ${table.length}.`}
          </div>
        )}
      </div>

      <ol className="flex flex-col">
        {table.map(({ player, place, worth }) => {
          const seat = state.players.findIndex((p) => p.id === player.id);
          const token = TOKENS.find((t) => t.id === player.tokenId) ?? TOKENS[0];
          const isMe = player.id === me;

          return (
            <li
              key={player.id}
              className="flex items-center gap-3 border-t border-[var(--line)] px-3 py-2.5"
              style={{
                background: isMe
                  ? "color-mix(in srgb, var(--green) 8%, transparent)"
                  : "transparent",
              }}
            >
              <span className="w-7 shrink-0 text-center text-lg font-black">
                {MEDAL[place - 1] ?? ordinal(place)}
              </span>

              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xl"
                style={{
                  background: "var(--surface-2)",
                  outline: `2px solid ${PLAYER_COLORS[seat] ?? "#888"}`,
                  filter: player.bankrupt ? "grayscale(1)" : "none",
                }}
              >
                {token.emoji}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 truncate font-semibold">
                  <span className="truncate">{player.name}</span>
                  {isMe && <span className="label shrink-0">you</span>}
                </div>
                <div className="money text-xs text-[var(--ink-soft)]">
                  {player.bankrupt
                    ? "Bankrupt"
                    : `${money(worth)} · ${propertyCount(player.id)} propert${
                        propertyCount(player.id) === 1 ? "y" : "ies"
                      }`}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="border-t border-[var(--line)] p-3">
        <button className="btn btn-primary w-full" onClick={onNewGame}>
          New game
        </button>
      </div>
    </div>
  );
}
