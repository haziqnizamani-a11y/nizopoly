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

/** The controls plate: a 2px top rule whose colour states the mode (gold =
 * your move, stone = waiting, danger = a debt), with a tracked-caps label
 * above a Playfair sentence headline — never just a bare button label. */
function Plate({
  rule,
  label,
  headline,
  children,
}: {
  rule: "gold" | "stone" | "danger";
  label: string;
  headline: string;
  children?: React.ReactNode;
}) {
  const ruleColor =
    rule === "danger" ? "var(--danger)" : rule === "stone" ? "var(--stone-300)" : "var(--gold)";
  return (
    <div className="plate p-3" style={{ ["--plate-rule" as string]: ruleColor }}>
      <div className="label mb-1">{label}</div>
      <div className="money mb-2 text-[15px]" style={{ fontFamily: "var(--font-display)" }}>
        {headline}
      </div>
      {children}
    </div>
  );
}

export function Controls({ state, me, busy, send }: Props) {
  if (state.phase !== "playing" || !me) return null;

  const player = state.players.find((p) => p.id === me);
  if (!player || player.bankrupt) return null;

  const isMyTurn = state.players[state.turn]?.id === me;
  const debt = state.pendingDebt?.playerId === me ? state.pendingDebt : null;

  if (debt) {
    return (
      <Plate rule="danger" label="Outstanding" headline={`You owe ${money(debt.amount)}.`}>
        <p className="mb-3 text-sm text-[var(--ink-soft)]">
          Mortgage, sell or trade your way out. The turn is blocked until the debt clears.
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
      </Plate>
    );
  }

  if (!isMyTurn) {
    const whose = state.players[state.turn]?.name ?? "Someone";
    const verb = state.turnPhase === "roll" ? "rolling" : "playing";
    return (
      <Plate rule="stone" label="Waiting" headline={`${whose} is ${verb}.`}>
        <p className="text-sm text-[var(--ink-soft)]">
          You can still build, mortgage and offer trades.
        </p>
      </Plate>
    );
  }

  if (state.turnPhase === "roll" && player.inJail) {
    return (
      <Plate
        rule="gold"
        label={`In jail · attempt ${player.jailTurns + 1} of 3`}
        headline="Doubles, the fine, or the card."
      >
        <div className="flex flex-col gap-2">
          <button className="btn btn-primary" disabled={busy} onClick={() => send({ type: "roll" })}>
            Roll for doubles
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn btn-outline"
              disabled={busy || player.cash < JAIL_FINE}
              onClick={() => send({ type: "payJailFine" })}
            >
              Pay {money(JAIL_FINE)}
            </button>
            <button
              className="btn btn-outline"
              disabled={busy || player.getOutOfJailCards < 1}
              onClick={() => send({ type: "useJailCard" })}
            >
              Use card
            </button>
          </div>
        </div>
      </Plate>
    );
  }

  if (state.turnPhase === "roll") {
    return (
      <Plate rule="gold" label="Your move" headline="Two dice, forty tiles.">
        <button className="btn btn-primary w-full" disabled={busy} onClick={() => send({ type: "roll" })}>
          {state.doublesCount > 0 ? "Roll again — doubles" : "Roll dice"}
        </button>
      </Plate>
    );
  }

  if (state.turnPhase === "decide_buy" && state.pendingPurchase !== null) {
    const t = tile(state.pendingPurchase);
    const price = isOwnable(t) ? t.price : 0;
    return (
      <Plate rule="gold" label="Your move" headline={`${t.name} is unowned — ${money(price)}.`}>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="btn btn-primary"
            disabled={busy || player.cash < price}
            onClick={() => send({ type: "buy" })}
          >
            Buy
          </button>
          <button className="btn btn-outline" disabled={busy} onClick={() => send({ type: "decline" })}>
            Pass
          </button>
        </div>
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          Passing leaves it with the bank — there is no auction.
        </p>
      </Plate>
    );
  }

  return (
    <Plate rule="gold" label="Your move" headline="Nothing left to do but end your turn.">
      <button className="btn btn-primary w-full" disabled={busy} onClick={() => send({ type: "endTurn" })}>
        End turn
      </button>
    </Plate>
  );
}
