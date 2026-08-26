import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import {
  addPlayer,
  apply,
  createGame,
  GameError,
  setName,
  setToken,
  startGame,
  type Action,
} from "../game/engine";
import type { GameState } from "../game/types";
import { checkSecret, codeExists, insertGame, putSecret, readGame, writeGame } from "./store";

/** No I/O/0/1 — these get read aloud over the phone. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode(len = 4): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export class ApiError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export type RoomAction =
  | Action
  | { type: "start" }
  | { type: "setToken"; tokenId: string }
  | { type: "setName"; name: string };

export interface Credentials {
  playerId: string;
  secret: string;
}

function newCredentials(): Credentials {
  return { playerId: randomUUID(), secret: randomBytes(24).toString("base64url") };
}

function cleanName(raw: unknown): string {
  const name = String(raw ?? "").trim().slice(0, 20);
  if (!name) throw new ApiError("Pick a name first.");
  return name;
}

export async function createRoom(rawName: string): Promise<{ code: string } & Credentials> {
  const name = cleanName(rawName);
  const creds = newCredentials();

  let code = "";
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = makeCode();
    if (await codeExists(candidate)) continue;
    code = candidate;
    break;
  }
  if (!code) throw new ApiError("Could not allocate a room code. Try again.", 503);

  const seed = randomBytes(4).readUInt32BE(0);
  await insertGame(code, createGame(creds.playerId, name, seed));
  await putSecret(code, creds.playerId, creds.secret);
  return { code, ...creds };
}

export async function joinRoom(code: string, rawName: string): Promise<Credentials> {
  const name = cleanName(rawName);
  const creds = newCredentials();

  for (let attempt = 0; attempt < 5; attempt++) {
    const state = await readGame(code);
    if (!state) throw new ApiError("No room with that code.", 404);
    if (state.phase !== "lobby") throw new ApiError("That game has already started.", 409);

    let next: GameState;
    try {
      next = addPlayer(state, creds.playerId, name);
    } catch (e) {
      throw new ApiError(e instanceof GameError ? e.message : "Could not join.", 409);
    }
    if (await writeGame(code, next, state.seq)) {
      await putSecret(code, creds.playerId, creds.secret);
      return creds;
    }
  }
  throw new ApiError("The room is busy. Try again.", 409);
}

export async function getRoom(code: string): Promise<GameState> {
  const state = await readGame(code);
  if (!state) throw new ApiError("No room with that code.", 404);
  return state;
}

/**
 * Read → apply → conditional write, retrying when another player's action lands
 * first. The engine is the only thing that may mutate state.
 */
export async function actOnRoom(
  code: string,
  creds: Credentials,
  action: RoomAction
): Promise<GameState> {
  if (!(await checkSecret(code, creds.playerId, creds.secret))) {
    throw new ApiError("You are not signed in to this room.", 403);
  }

  for (let attempt = 0; attempt < 6; attempt++) {
    const state = await readGame(code);
    if (!state) throw new ApiError("No room with that code.", 404);

    let next: GameState;
    try {
      if (action.type === "start") next = startGame(state, creds.playerId);
      else if (action.type === "setToken") next = setToken(state, creds.playerId, action.tokenId);
      else if (action.type === "setName") next = setName(state, creds.playerId, action.name);
      else next = apply(state, creds.playerId, action);
    } catch (e) {
      if (e instanceof GameError) throw new ApiError(e.message, 409);
      throw e;
    }

    if (next.seq === state.seq) return next; // No-op, nothing to persist.
    if (await writeGame(code, next, state.seq)) return next;
  }
  throw new ApiError("Too many players acted at once. Try again.", 409);
}
