"use client";

import { useEffect, useState } from "react";
import { PLAYER_COLORS } from "./PlayerList";

interface Bit {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  skew: number;
}

/** Pure-CSS celebration. Respects prefers-reduced-motion via the global rule. */
export function Confetti({ count = 70 }: { count?: number }) {
  // Randomised after mount: generating during render is impure, and would also
  // mismatch between the server and client passes.
  const [bits, setBits] = useState<Bit[]>([]);

  useEffect(() => {
    // Randomised post-mount to keep render pure and SSR-stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBits(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 2.4 + Math.random() * 1.8,
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        skew: Math.random() * 40 - 20,
      }))
    );
    const t = window.setTimeout(() => setBits([]), 6000);
    return () => window.clearTimeout(t);
  }, [count]);

  if (bits.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {bits.map((b) => (
        <span
          key={b.id}
          className="confetti"
          style={{
            left: `${b.left}%`,
            background: b.color,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            transform: `skewY(${b.skew}deg)`,
          }}
        />
      ))}
    </div>
  );
}
