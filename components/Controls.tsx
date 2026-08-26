"use client";

import { JAIL_FINE, money, tile } from "@/lib/game/board";
import type { GameState } from "@/lib/game/types";
import { isOwnable } from "@/lib/game/types";
import type { RoomAction } from "@/lib/server/rooms";

interface Props {
  state: GameState;
  me: string | null;
  busy: boolean;
  send: (a: RoomAction) => void;
}

export function Controls({ state, me, busy, send }: Props) {
  if (state.phase !== "playing" || !me) return null;

  const player = state.players.find((p) => p.id === me);
  if (!player || player.bankrupt) return null;

  const isMyTurn = state.players[state.turn]?.id === me;
  const debt = state.pendingDebt?.playerId === me ? state.pendingDebt : null;

  if (debt) {
    return (
      <div className="card border-[var(--danger)] p-3">
        <div className="label mb-1 text-[var(--danger)]">You owe {money(debt.amount)}</div>
        <p className="mb-3 text-sm text-[var(--ink-soft)]">
          Sell buildings, mortgage properties or trade to raise it. It settles automatically the
          moment you have enough.
        </p>
        <button
          type="button"
          className="btn btn-danger w-full"
          disabled={busy}
          onClick={() => {
            if (confirm("Declare bankruptcy? This ends your game.")) send({ type: "bankrupt" });
          }}
        >
          Declare bankruptcy
        </button>
      </div>
    );
  }

  if (!isMyTurn) {
    const whose = state.players[state.turn]?.name ?? "someone";
    return (
      <div className="card p-3 text-sm text-[var(--ink-soft)]">
        Waiting on <span className="font-semibold text-[var(--ink)]">{whose}</span>. You can still
        build, mortgage and offer trades.
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-2 p-3">
      {state.turnPhase === "roll" && player.inJail && (
        <>
          <div className="label">
            In jail — attempt {player.jailTurns + 1} of 3
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={() => send({ type: "roll" })}>
            🎲 Roll for doubles
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn"
              disabled={busy || player.cash < JAIL_FINE}
              onClick={() => send({ type: "payJailFine" })}
            >
              Pay {money(JAIL_FINE)}
            </button>
            <button
              className="btn"
              disabled={busy || player.getOutOfJailCards < 1}
              onClick={() => send({ type: "useJailCard" })}
            >
              🎟️ Use card
            </button>
          </div>
        </>
      )}

      {state.turnPhase === "roll" && !player.inJail && (
        <button className="btn btn-primary" disabled={busy} onClick={() => send({ type: "roll" })}>
          🎲 {state.doublesCount > 0 ? "Roll again (doubles)" : "Roll dice"}
        </button>
      )}

      {state.turnPhase === "decide_buy" && state.pendingPurchase !== null && (
        <BuyPrompt state={state} busy={busy} send={send} cash={player.cash} />
      )}

      {state.turnPhase === "resolve" && (
        <button className="btn btn-primary" disabled={busy} onClick={() => send({ type: "endTurn" })}>
          End turn
        </button>
      )}
    </div>
  );
}

function BuyPrompt({
  state,
  busy,
  send,
  cash,
}: {
  state: GameState;
  busy: boolean;
  send: (a: RoomAction) => void;
  cash: number;
}) {
  const t = tile(state.pendingPurchase!);
  const price = isOwnable(t) ? t.price : 0;
  return (
    <>
      <div className="text-sm">
        <span className="font-semibold">{t.name}</span> is unowned —{" "}
        <span className="font-semibold">{money(price)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          className="btn btn-primary"
          disabled={busy || cash < price}
          onClick={() => send({ type: "buy" })}
        >
          Buy
        </button>
        <button className="btn" disabled={busy} onClick={() => send({ type: "decline" })}>
          Pass
        </button>
      </div>
      <p className="text-xs text-[var(--ink-soft)]">
        Passing leaves it with the bank — there is no auction.
      </p>
    </>
  );
}
