"use client";

import { useMemo, useState } from "react";
import { BOARD, money, tile } from "@/lib/game/board";
import { isOwnable, type GameState } from "@/lib/game/types";
import type { RoomAction } from "@/lib/server/rooms";
import { sound } from "@/lib/client/sound";

interface Props {
  state: GameState;
  me: string;
  busy: boolean;
  send: (a: RoomAction) => void;
}

function ownedBy(state: GameState, id: string): number[] {
  return BOARD.filter((t) => isOwnable(t) && state.tiles[t.index]?.owner === id).map((t) => t.index);
}

export function TradePanel({ state, me, busy, send }: Props) {
  const incoming = state.trades.filter((t) => t.to === me);
  const outgoing = state.trades.filter((t) => t.from === me);
  const opponents = state.players.filter((p) => p.id !== me && !p.bankrupt);

  const [open, setOpen] = useState(false);
  const [withId, setWithId] = useState(opponents[0]?.id ?? "");
  const [give, setGive] = useState<number[]>([]);
  const [want, setWant] = useState<number[]>([]);
  const [giveCash, setGiveCash] = useState(0);
  const [wantCash, setWantCash] = useState(0);

  const mine = useMemo(() => ownedBy(state, me), [state, me]);
  const theirs = useMemo(() => (withId ? ownedBy(state, withId) : []), [state, withId]);
  const myCash = state.players.find((p) => p.id === me)?.cash ?? 0;

  const toggle = (list: number[], set: (v: number[]) => void, i: number) =>
    set(list.includes(i) ? list.filter((x) => x !== i) : [...list, i]);

  const reset = () => {
    setGive([]);
    setWant([]);
    setGiveCash(0);
    setWantCash(0);
  };

  const propose = () => {
    if (!withId) return;
    sound.play("trade");
    send({ type: "proposeTrade", to: withId, giveTiles: give, giveCash, wantTiles: want, wantCash });
    reset();
    setOpen(false);
  };

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="label">Trades</div>
        {opponents.length > 0 && (
          <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => setOpen((v) => !v)}>
            {open ? "Cancel" : "New offer"}
          </button>
        )}
      </div>

      {incoming.map((t) => {
        const from = state.players.find((p) => p.id === t.from);
        return (
          <div key={t.id} className="mb-2 rounded-lg border border-[var(--accent)] p-2 text-xs">
            <div className="mb-1 font-semibold">{from?.name} offers:</div>
            <div className="mb-1">
              You get: {summary(t.giveTiles, t.giveCash)}
              <br />
              You give: {summary(t.wantTiles, t.wantCash)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="btn btn-primary py-1 text-xs"
                disabled={busy}
                onClick={() => send({ type: "respondTrade", id: t.id, accept: true })}
              >
                Accept
              </button>
              <button
                className="btn py-1 text-xs"
                disabled={busy}
                onClick={() => send({ type: "respondTrade", id: t.id, accept: false })}
              >
                Decline
              </button>
            </div>
          </div>
        );
      })}

      {outgoing.map((t) => {
        const to = state.players.find((p) => p.id === t.to);
        return (
          <div key={t.id} className="mb-2 flex items-center justify-between text-xs">
            <span className="text-[var(--ink-soft)]">Waiting on {to?.name}…</span>
            <button
              className="btn btn-ghost px-2 py-0.5 text-xs"
              disabled={busy}
              onClick={() => send({ type: "cancelTrade", id: t.id })}
            >
              Withdraw
            </button>
          </div>
        );
      })}

      {!open && incoming.length === 0 && outgoing.length === 0 && (
        <p className="text-xs text-[var(--ink-soft)]">No offers on the table.</p>
      )}

      {open && (
        <div className="flex flex-col gap-2 text-xs">
          <label className="flex flex-col gap-1">
            <span className="label">Trade with</span>
            <select
              className="input"
              value={withId}
              onChange={(e) => {
                setWithId(e.target.value);
                setWant([]);
              }}
            >
              {opponents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <TilePicker label="You give" tiles={mine} selected={give} onToggle={(i) => toggle(give, setGive, i)} />
          <label className="flex items-center gap-2">
            <span className="label shrink-0">+ your cash</span>
            <input
              type="number"
              min={0}
              max={myCash}
              className="input"
              value={giveCash}
              onChange={(e) => setGiveCash(Math.max(0, Math.min(myCash, Number(e.target.value) || 0)))}
            />
          </label>

          <TilePicker label="You get" tiles={theirs} selected={want} onToggle={(i) => toggle(want, setWant, i)} />
          <label className="flex items-center gap-2">
            <span className="label shrink-0">+ their cash</span>
            <input
              type="number"
              min={0}
              className="input"
              value={wantCash}
              onChange={(e) => setWantCash(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>

          <button
            className="btn btn-primary"
            disabled={
              busy ||
              !withId ||
              (give.length === 0 && want.length === 0 && giveCash === 0 && wantCash === 0)
            }
            onClick={propose}
          >
            Send offer
          </button>
        </div>
      )}
    </div>
  );
}

function TilePicker({
  label,
  tiles,
  selected,
  onToggle,
}: {
  label: string;
  tiles: number[];
  selected: number[];
  onToggle: (i: number) => void;
}) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      {tiles.length === 0 ? (
        <p className="text-xs text-[var(--ink-soft)]">Nothing to offer.</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {tiles.map((i) => {
            const on = selected.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => onToggle(i)}
                aria-pressed={on}
                className="rounded-md border px-1.5 py-0.5 text-[11px]"
                style={{
                  borderColor: on ? "var(--accent)" : "var(--line)",
                  background: on ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "transparent",
                  fontWeight: on ? 700 : 400,
                }}
              >
                {tile(i).name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function summary(tiles: number[], cash: number): string {
  const parts = tiles.map((i) => tile(i).name);
  if (cash > 0) parts.push(money(cash));
  return parts.length ? parts.join(", ") : "nothing";
}
