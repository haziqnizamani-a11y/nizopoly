"use client";

import { GROUPS, TOLL_TILES, money, tile } from "@/lib/game/board";
import { hasGroup, rentFor } from "@/lib/game/engine";
import { isProperty, isToll, type GameState } from "@/lib/game/types";
import type { RoomAction } from "@/lib/server/rooms";

interface Props {
  state: GameState;
  index: number;
  me: string | null;
  busy: boolean;
  send: (a: RoomAction) => void;
  onClose: () => void;
}

export function TileDetail({ state, index, me, busy, send, onClose }: Props) {
  const t = tile(index);
  const own = state.tiles[index];
  const owner = own?.owner ? state.players.find((p) => p.id === own.owner) : null;
  const mine = own?.owner === me;

  return (
    <div className="card slide-in p-3" key={index}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-base font-bold">{t.name}</div>
          <div className="label">
            {isProperty(t) ? GROUPS[t.group].name : isToll(t) ? "Toll road" : t.kind}
          </div>
        </div>
        <button className="btn btn-ghost px-2 py-1" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {isProperty(t) && (
        <div
          className="mb-2 h-1.5 w-full rounded-full"
          style={{ background: GROUPS[t.group].color }}
        />
      )}

      {"blurb" in t && typeof t.blurb === "string" && (
        <p className="mb-2 text-sm italic text-[var(--ink-soft)]">{t.blurb}</p>
      )}

      <div className="mb-2 text-sm">
        {owner ? (
          <>
            Owned by <span className="font-semibold">{owner.name}</span>
            {own?.mortgaged && <span className="text-[var(--danger)]"> · mortgaged</span>}
          </>
        ) : isProperty(t) || isToll(t) ? (
          <span className="text-[var(--ink-soft)]">Unowned · {money(t.price)}</span>
        ) : (
          <span className="text-[var(--ink-soft)]">Not a property.</span>
        )}
      </div>

      {isProperty(t) && <RentTable state={state} index={index} />}

      {isToll(t) && (
        <div className="mb-2 text-sm text-[var(--ink-soft)]">
          Rent is your roll × 100, or × 250 if one player holds both toll roads.
          {owner && (
            <div className="mt-1 text-[var(--ink)]">
              {owner.name} holds{" "}
              {TOLL_TILES.filter((i) => state.tiles[i]?.owner === owner.id).length} of 2.
            </div>
          )}
        </div>
      )}

      {mine && (isProperty(t) || isToll(t)) && (
        <ManageButtons state={state} index={index} busy={busy} send={send} />
      )}
    </div>
  );
}

function RentTable({ state, index }: { state: GameState; index: number }) {
  const t = tile(index);
  if (!isProperty(t)) return null;
  const own = state.tiles[index];
  const monopoly = own?.owner ? hasGroup(state, own.owner, t.group) : false;
  const rows: [string, number][] = [
    [monopoly && (own?.houses ?? 0) === 0 ? "Base (group ×2)" : "Base", monopoly && (own?.houses ?? 0) === 0 ? t.rent[0] * 2 : t.rent[0]],
    ["1 house", t.rent[1]],
    ["2 houses", t.rent[2]],
    ["3 houses", t.rent[3]],
    ["4 houses", t.rent[4]],
    ["Hotel", t.rent[5]],
  ];
  const level = own?.houses ?? 0;

  return (
    <div className="mb-2 overflow-hidden rounded-lg border border-[var(--line)] text-xs">
      {rows.map(([label, amount], i) => (
        <div
          key={label}
          className="flex justify-between px-2 py-1"
          style={{
            background:
              i === level && own?.owner
                ? "color-mix(in srgb, var(--accent) 16%, transparent)"
                : i % 2
                  ? "var(--surface-2)"
                  : "transparent",
            fontWeight: i === level && own?.owner ? 700 : 400,
          }}
        >
          <span>{label}</span>
          <span>{money(amount)}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-[var(--line)] px-2 py-1 text-[var(--ink-soft)]">
        <span>House cost</span>
        <span>{money(t.houseCost)}</span>
      </div>
    </div>
  );
}

function ManageButtons({
  state,
  index,
  busy,
  send,
}: {
  state: GameState;
  index: number;
  busy: boolean;
  send: (a: RoomAction) => void;
}) {
  const t = tile(index);
  const own = state.tiles[index]!;
  // The server enforces this too; disabling it here stops the button looking
  // available when the group isn't complete.
  const canBuild =
    isProperty(t) &&
    !own.mortgaged &&
    own.houses < 5 &&
    hasGroup(state, own.owner ?? "", t.group) &&
    GROUPS[t.group].tiles.every((i) => !state.tiles[i]?.mortgaged);
  const unmortgageCost = Math.ceil(((isProperty(t) || isToll(t) ? t.price : 0) / 2) * 1.1);

  return (
    <div className="grid grid-cols-2 gap-2">
      {isProperty(t) && (
        <>
          <button
            className="btn"
            disabled={busy || !canBuild}
            onClick={() => send({ type: "build", tile: index })}
          >
            🏠 Build {money(t.houseCost)}
          </button>
          <button
            className="btn"
            disabled={busy || own.houses === 0}
            onClick={() => send({ type: "sellHouse", tile: index })}
          >
            Sell {money(Math.floor(t.houseCost / 2))}
          </button>
        </>
      )}
      {own.mortgaged ? (
        <button
          className="btn col-span-2"
          disabled={busy}
          onClick={() => send({ type: "unmortgage", tile: index })}
        >
          Lift mortgage · {money(unmortgageCost)}
        </button>
      ) : (
        <button
          className="btn col-span-2"
          disabled={busy || own.houses > 0}
          onClick={() => send({ type: "mortgage", tile: index })}
        >
          Mortgage · +{money(Math.floor((isProperty(t) || isToll(t) ? t.price : 0) / 2))}
        </button>
      )}
      {isProperty(t) && !hasGroup(state, own.owner ?? "", t.group) && (
        <p className="col-span-2 text-xs text-[var(--ink-soft)]">
          You need all of {GROUPS[t.group].name} before you can build.
        </p>
      )}
    </div>
  );
}

export { rentFor };
