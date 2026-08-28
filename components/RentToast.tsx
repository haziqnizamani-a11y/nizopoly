"use client";

import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/game/board";
import type { GameState } from "@/lib/game/types";

/**
 * Tells you when somebody has paid you. Rent used to be a log line far below
 * the board on a phone, so collecting it was easy to miss entirely.
 */
export function RentToast({ state, me }: { state: GameState; me: string | null }) {
  const rent = state.lastRent;
  const mine = rent && rent.toId === me ? rent : null;
  const [shown, setShown] = useState<typeof mine>(null);

  // `state` — and so `state.lastRent` — is a fresh object every poll tick even
  // when it is the very same stale event (JSON parsing never preserves
  // identity). Depending on that object kept re-arming the dismiss timer on
  // every poll, so the banner never actually went away. `seq` is the one
  // thing that only changes when a genuinely new rent event happens; the
  // object itself is read from a ref so the effect doesn't need it as a dep.
  const mineRef = useRef(mine);
  useEffect(() => {
    mineRef.current = mine;
  });
  const seq = mine?.seq ?? null;

  useEffect(() => {
    if (seq === null) return;
     
    setShown(mineRef.current);
    const t = window.setTimeout(() => setShown(null), 4000);
    return () => window.clearTimeout(t);
  }, [seq]);

  if (!shown) return null;

  return (
    <div
      role="status"
      className="card slide-in fixed inset-x-4 top-4 z-40 mx-auto max-w-sm p-3 text-center"
      style={{
        borderColor: "var(--green)",
        background: "color-mix(in srgb, var(--green) 10%, var(--surface))",
      }}
    >
      <div className="money text-lg" style={{ color: "var(--green)", fontFamily: "var(--font-display)" }}>
        + {money(shown.amount)}
      </div>
      <div className="text-sm">
        <span className="font-semibold">{shown.fromName}</span> paid you for{" "}
        <span className="font-semibold">{shown.tile}</span>
      </div>
    </div>
  );
}
