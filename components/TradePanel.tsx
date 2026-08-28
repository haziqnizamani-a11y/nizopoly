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
    <section>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="label shrink-0">On the table</span>
        <span className="h-px flex-1" style={{ background: "var(--line-hair)" }} />
        <span className="label shrink-0" style={{ color: "var(--ink-faint)" }}>
          {incoming.length + outgoing.length} offer{incoming.length + outgoing.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {incoming.map((t) => {
          const from = state.players.find((p) => p.id === t.from);
          return (
            <div key={t.id} className="plate p-3 text-sm">
              <div className="mb-2 font-medium">{from?.name} offers</div>
              <div className="grid grid-cols-2 gap-3 border-t pt-2" style={{ borderColor: "var(--line-hair)" }}>
                <div>
                  <div className="label mb-1">You get</div>
                  <TradeSide tiles={t.giveTiles} cash={t.giveCash} />
                </div>
                <div className="border-l pl-3" style={{ borderColor: "var(--line-hair)" }}>
                  <div className="label mb-1">You give</div>
                  <TradeSide tiles={t.wantTiles} cash={t.wantCash} />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  className="btn btn-primary btn-dense"
                  disabled={busy}
                  onClick={() => send({ type: "respondTrade", id: t.id, accept: true })}
                >
                  Accept
                </button>
                <button
                  className="btn btn-outline btn-dense"
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
            <div key={t.id} className="flex items-center justify-between text-xs text-[var(--ink-soft)]">
              <span>Waiting on {to?.name}…</span>
              <button
                className="btn btn-ghost btn-dense px-2"
                disabled={busy}
                onClick={() => send({ type: "cancelTrade", id: t.id })}
              >
                Withdraw
              </button>
            </div>
          );
        })}

        {open && (
          <div className="plate flex flex-col gap-2 p-3 text-xs">
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

        {opponents.length > 0 && (
          <button
            type="button"
            className="label rounded-[var(--r-btn)] py-2 text-center transition-colors"
            style={{
              border: "1px dashed var(--line-strong)",
              color: "var(--gold-600)",
              minHeight: "36px",
            }}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Cancel" : "+ New offer"}
          </button>
        )}

        {!open && incoming.length === 0 && outgoing.length === 0 && opponents.length === 0 && (
          <p className="text-xs text-[var(--ink-soft)]">No offers on the table.</p>
        )}
      </div>
    </section>
  );
}

function TradeSide({ tiles, cash }: { tiles: number[]; cash: number }) {
  if (tiles.length === 0 && cash === 0) {
    return <p className="text-[var(--ink-faint)]">Nothing</p>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      {tiles.map((i) => (
        <div key={i} className="text-[11.5px]">
          {tile(i).name}
        </div>
      ))}
      {cash > 0 && <div className="money text-[11.5px]">+ {money(cash)}</div>}
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
        <p className="text-[var(--ink-faint)]">Nothing to offer.</p>
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
                className="rounded-[var(--r-btn)] border px-1.5 py-0.5 text-[11px]"
                style={{
                  borderColor: on ? "var(--green)" : "var(--line)",
                  background: on ? "color-mix(in srgb, var(--green) 12%, transparent)" : "transparent",
                  fontWeight: on ? 600 : 400,
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
