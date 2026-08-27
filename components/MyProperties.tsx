"use client";

import { BOARD, GROUPS, money, tile } from "@/lib/game/board";
import { hasGroup } from "@/lib/game/engine";
import { isOwnable, isProperty, isStation, isUtility, type GameState } from "@/lib/game/types";
import type { RoomAction } from "@/lib/server/rooms";
import { sound } from "@/lib/client/sound";

interface Props {
  state: GameState;
  me: string;
  busy: boolean;
  send: (a: RoomAction) => void;
  /** Raising money is urgent — opens expanded and leads with cash raised. */
  urgent?: boolean;
}

/**
 * Everything you own, with the money-raising actions attached. Previously
 * mortgaging meant hunting for the tile on the board, which is hopeless when
 * you are one turn from bankruptcy.
 */
export function MyProperties({ state, me, busy, send, urgent = false }: Props) {
  const owned = BOARD.filter((t) => isOwnable(t) && state.tiles[t.index]?.owner === me);

  if (owned.length === 0) {
    return (
      <div className="card p-3">
        <div className="label mb-1">Your properties</div>
        <p className="text-xs text-[var(--ink-soft)]">You do not own anything yet.</p>
      </div>
    );
  }

  // What you could raise right now without touching buildings.
  const raisable = owned.reduce((sum, t) => {
    const st = state.tiles[t.index]!;
    if (st.mortgaged || st.houses > 0) return sum;
    return sum + Math.floor((isOwnable(t) ? t.price : 0) / 2);
  }, 0);

  return (
    <div
      className="card p-3"
      style={urgent ? { borderColor: "var(--danger)" } : undefined}
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="label">Your properties · {owned.length}</div>
        {raisable > 0 && (
          <div className="text-xs text-[var(--ink-soft)]">
            mortgage all: <span className="font-semibold text-[var(--ink)]">{money(raisable)}</span>
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        {owned.map((t) => {
          const st = state.tiles[t.index]!;
          const price = isOwnable(t) ? t.price : 0;
          const color = isProperty(t) ? GROUPS[t.group].color : "var(--ink-soft)";
          const canBuild =
            isProperty(t) &&
            !st.mortgaged &&
            st.houses < 5 &&
            hasGroup(state, me, t.group) &&
            GROUPS[t.group].tiles.every((i) => !state.tiles[i]?.mortgaged);

          return (
            <li
              key={t.index}
              className="rounded-lg border p-2"
              style={{
                borderColor: st.mortgaged ? "var(--danger)" : "var(--line)",
                background: st.mortgaged ? "transparent" : "var(--surface-2)",
                opacity: st.mortgaged ? 0.7 : 1,
              }}
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-sm"
                  style={{ background: color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t.name}</span>
                {st.houses > 0 && (
                  <span className="shrink-0 text-xs">
                    {st.houses === 5 ? "🏨" : "🏠".repeat(st.houses)}
                  </span>
                )}
                {st.mortgaged && (
                  <span className="label shrink-0 text-[var(--danger)]">mortgaged</span>
                )}
                {(isStation(t) || isUtility(t)) && !st.mortgaged && (
                  <span className="label shrink-0">{isStation(t) ? "station" : "utility"}</span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {st.mortgaged ? (
                  <button
                    className="btn min-h-0 px-2 py-1 text-xs"
                    disabled={busy}
                    onClick={() => send({ type: "unmortgage", tile: t.index })}
                  >
                    Lift · {money(Math.ceil((price / 2) * 1.1))}
                  </button>
                ) : (
                  <button
                    className="btn min-h-0 px-2 py-1 text-xs"
                    disabled={busy || st.houses > 0}
                    title={st.houses > 0 ? "Sell the buildings in this group first" : undefined}
                    onClick={() => send({ type: "mortgage", tile: t.index })}
                  >
                    Mortgage · +{money(Math.floor(price / 2))}
                  </button>
                )}

                {isProperty(t) && st.houses > 0 && (
                  <button
                    className="btn min-h-0 px-2 py-1 text-xs"
                    disabled={busy}
                    onClick={() => send({ type: "sellHouse", tile: t.index })}
                  >
                    Sell building · +{money(Math.floor(t.houseCost / 2))}
                  </button>
                )}

                {canBuild && !urgent && (
                  <button
                    className="btn min-h-0 px-2 py-1 text-xs"
                    disabled={busy}
                    onClick={() => {
                      sound.play("build");
                      send({ type: "build", tile: t.index });
                    }}
                  >
                    🏠 Build · {money(t.houseCost)}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-xs text-[var(--ink-soft)]">
        Mortgaging pays you half the price and stops the rent. Lifting it costs that
        half back plus 10%.
      </p>
    </div>
  );
}

export { tile };
