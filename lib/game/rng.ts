/**
 * Deterministic PRNG. Dice are rolled on the server and the seed is advanced in
 * the stored state, so a replayed or duplicated request cannot reroll.
 */
export function nextSeed(seed: number): number {
  return (seed + 0x6d2b79f5) >>> 0;
}

export function randomFrom(seed: number): number {
  let t = nextSeed(seed);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Returns the two dice and the seed to store back on the state. */
export function rollDice(seed: number): { dice: [number, number]; seed: number } {
  const s1 = nextSeed(seed);
  const s2 = nextSeed(s1);
  const d1 = Math.floor(randomFrom(seed) * 6) + 1;
  const d2 = Math.floor(randomFrom(s1) * 6) + 1;
  return { dice: [d1, d2], seed: s2 };
}

export function shuffle<T>(items: T[], seed: number): { items: T[]; seed: number } {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(randomFrom(s) * (i + 1));
    s = nextSeed(s);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return { items: out, seed: s };
}
