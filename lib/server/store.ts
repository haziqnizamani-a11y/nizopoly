import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GameState } from "../game/types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const usingSupabase = Boolean(URL && SERVICE_KEY);

let admin: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!admin) {
    admin = createClient(URL!, SERVICE_KEY!, { auth: { persistSession: false } });
  }
  return admin;
}

export class StoreError extends Error {}

/**
 * Dev fallback so the game is playable with no external services. Survives HMR
 * by hanging off globalThis; single-process only, which is fine for local play.
 */
type MemRow = { state: GameState; secrets: Map<string, string> };
const mem: Map<string, MemRow> = ((globalThis as Record<string, unknown>).__nizopoly ??=
  new Map()) as Map<string, MemRow>;

/**
 * Guard against a deploy with no database. This store lives in one process, so
 * on a serverless host every request can land on a different instance: players
 * would silently end up in separate games, rooms would vanish between turns.
 * Better to fail loudly with instructions than to look like it works.
 */
function memoryStore(): Map<string, MemRow> {
  if (process.env.NODE_ENV === "production") {
    throw new StoreError(
      "This deployment has no database configured, so games cannot be shared between " +
        "players. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and " +
        "SUPABASE_SERVICE_ROLE_KEY in the Vercel project settings, then redeploy."
    );
  }
  return mem;
}

export async function readGame(code: string): Promise<GameState | null> {
  if (!usingSupabase) return memoryStore().get(code)?.state ?? null;
  const { data, error } = await db().from("games").select("state").eq("code", code).maybeSingle();
  if (error) throw new StoreError(error.message);
  return (data?.state as GameState) ?? null;
}

export async function insertGame(code: string, state: GameState): Promise<void> {
  if (!usingSupabase) {
    memoryStore().set(code, { state, secrets: new Map() });
    return;
  }
  const { error } = await db().from("games").insert({ code, state });
  if (error) throw new StoreError(error.message);
}

/**
 * Optimistic write: only lands if nobody else has advanced `seq` since we read.
 * Returns false on a lost race so the caller can retry with fresh state.
 */
export async function writeGame(code: string, next: GameState, expectedSeq: number): Promise<boolean> {
  if (!usingSupabase) {
    const row = memoryStore().get(code);
    if (!row) throw new StoreError("Room not found.");
    if (row.state.seq !== expectedSeq) return false;
    row.state = next;
    return true;
  }
  const { data, error } = await db()
    .from("games")
    .update({ state: next, updated_at: new Date().toISOString() })
    .eq("code", code)
    .eq("state->>seq", String(expectedSeq))
    .select("code");
  if (error) throw new StoreError(error.message);
  return (data?.length ?? 0) > 0;
}

export async function putSecret(code: string, playerId: string, secret: string): Promise<void> {
  if (!usingSupabase) {
    const row = memoryStore().get(code);
    if (!row) throw new StoreError("Room not found.");
    row.secrets.set(playerId, secret);
    return;
  }
  const { error } = await db().from("game_players").insert({ code, player_id: playerId, secret });
  if (error) throw new StoreError(error.message);
}

export async function checkSecret(code: string, playerId: string, secret: string): Promise<boolean> {
  if (!secret) return false;
  if (!usingSupabase) return memoryStore().get(code)?.secrets.get(playerId) === secret;
  const { data, error } = await db()
    .from("game_players")
    .select("secret")
    .eq("code", code)
    .eq("player_id", playerId)
    .maybeSingle();
  if (error) throw new StoreError(error.message);
  return Boolean(data?.secret) && timingSafeEqual(data!.secret, secret);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function codeExists(code: string): Promise<boolean> {
  return (await readGame(code)) !== null;
}
