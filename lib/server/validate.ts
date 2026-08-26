import { BOARD_SIZE, TOKENS } from "../game/board";
import { ApiError, type RoomAction } from "./rooms";

function tileIndex(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n >= BOARD_SIZE) throw new ApiError("Bad tile.");
  return n;
}

function cash(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 10_000_000) throw new ApiError("Bad amount.");
  return n;
}

function tileList(v: unknown): number[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > BOARD_SIZE) throw new ApiError("Bad tile list.");
  const list = v.map(tileIndex);
  if (new Set(list).size !== list.length) throw new ApiError("Duplicate tiles in offer.");
  return list;
}

function id(v: unknown): string {
  const s = String(v ?? "");
  if (!s || s.length > 64) throw new ApiError("Bad id.");
  return s;
}

/** Never trust the client's action shape — rebuild it field by field. */
export function parseAction(raw: unknown): RoomAction {
  if (!raw || typeof raw !== "object") throw new ApiError("Missing action.");
  const a = raw as Record<string, unknown>;

  switch (a.type) {
    case "roll":
    case "buy":
    case "decline":
    case "payJailFine":
    case "useJailCard":
    case "endTurn":
    case "bankrupt":
    case "start":
      return { type: a.type };

    case "build":
    case "sellHouse":
    case "mortgage":
    case "unmortgage":
      return { type: a.type, tile: tileIndex(a.tile) };

    case "setName": {
      const name = String(a.name ?? "").trim().slice(0, 20);
      if (!name) throw new ApiError("Pick a name.");
      return { type: "setName", name };
    }

    case "setToken": {
      const tokenId = String(a.tokenId ?? "");
      if (!TOKENS.some((t) => t.id === tokenId)) throw new ApiError("Unknown token.");
      return { type: "setToken", tokenId };
    }

    case "proposeTrade":
      return {
        type: "proposeTrade",
        to: id(a.to),
        giveTiles: tileList(a.giveTiles),
        giveCash: cash(a.giveCash),
        wantTiles: tileList(a.wantTiles),
        wantCash: cash(a.wantCash),
      };

    case "respondTrade":
      return { type: "respondTrade", id: id(a.id), accept: a.accept === true };

    case "cancelTrade":
      return { type: "cancelTrade", id: id(a.id) };

    default:
      throw new ApiError("Unknown action.");
  }
}

export function parseCode(raw: unknown): string {
  const code = String(raw ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,6}$/.test(code)) throw new ApiError("Bad room code.", 404);
  return code;
}
