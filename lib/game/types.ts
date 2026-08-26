// Core game types. The whole game state is a single JSON blob that lives in one
// Postgres row; every mutation goes through the engine server-side.

export type GroupId = "interior" | "hyderabad" | "central" | "uptown" | "premium";

export type TileKind =
  | "go"
  | "property"
  | "toll"
  | "chance"
  | "chest"
  | "tax"
  | "jail"
  | "free"
  | "gotojail";

export interface BaseTile {
  index: number;
  kind: TileKind;
  name: string;
  /** Shown on the board when the full name won't wrap cleanly in a tile. */
  short?: string;
}

export interface PropertyTile extends BaseTile {
  kind: "property";
  group: GroupId;
  price: number;
  houseCost: number;
  /** [base, 1 house, 2, 3, 4, hotel] */
  rent: [number, number, number, number, number, number];
  blurb: string;
}

export interface TollTile extends BaseTile {
  kind: "toll";
  price: number;
  blurb: string;
}

export interface TaxTile extends BaseTile {
  kind: "tax";
  amount: number;
}

export type Tile = BaseTile | PropertyTile | TollTile | TaxTile;

export function isProperty(t: Tile): t is PropertyTile {
  return t.kind === "property";
}
export function isToll(t: Tile): t is TollTile {
  return t.kind === "toll";
}
export function isTax(t: Tile): t is TaxTile {
  return t.kind === "tax";
}
/** Anything a player can own. */
export function isOwnable(t: Tile): t is PropertyTile | TollTile {
  return t.kind === "property" || t.kind === "toll";
}

export interface Token {
  id: string;
  name: string;
  emoji: string;
}

export type CardAction =
  | { type: "money"; amount: number } // negative = pay bank
  | { type: "collectFromEach"; amount: number }
  | { type: "payEach"; amount: number }
  | { type: "move"; to: number } // absolute tile, passing GO pays
  | { type: "moveBack"; steps: number }
  | { type: "goToJail" }
  | { type: "getOutOfJail" }
  | { type: "repairs"; perHouse: number; perHotel: number };

export interface Card {
  id: string;
  deck: "chance" | "chest";
  text: string;
  action: CardAction;
}

export interface OwnedState {
  /** Player id, or null if the bank still holds it. */
  owner: string | null;
  /** 0-4 = houses, 5 = hotel. Always 0 for toll roads. */
  houses: number;
  mortgaged: boolean;
}

export interface Player {
  id: string;
  name: string;
  tokenId: string;
  cash: number;
  position: number;
  inJail: boolean;
  /** Turns spent in jail so far this stint. */
  jailTurns: number;
  getOutOfJailCards: number;
  bankrupt: boolean;
  connected: boolean;
}

/** What the current player is allowed to do right now. */
export type TurnPhase =
  | "roll" // must roll (or pay/use card to leave jail first)
  | "decide_buy" // landed on an unowned tile
  | "resolve" // card/rent resolved, may manage then end turn
  | "end"; // turn is over, waiting for engine to advance

export interface TradeOffer {
  id: string;
  from: string;
  to: string;
  giveTiles: number[];
  giveCash: number;
  wantTiles: number[];
  wantCash: number;
}

export interface LogEntry {
  id: string;
  ts: number;
  text: string;
}

export interface GameState {
  version: 1;
  phase: "lobby" | "playing" | "ended";
  hostId: string;
  players: Player[];
  /** Index into `players` of whose turn it is. */
  turn: number;
  turnPhase: TurnPhase;
  /** Consecutive doubles rolled this turn. */
  doublesCount: number;
  lastRoll: [number, number] | null;
  /** Set while turnPhase === "decide_buy". */
  pendingPurchase: number | null;
  /**
   * A debt the player cannot currently cover. They must mortgage, sell or trade
   * their way out of it, or declare bankruptcy. Blocks the turn until cleared.
   */
  pendingDebt: { playerId: string; amount: number; creditorId: string | null } | null;
  /** Most recent card drawn, kept so the UI can show it. */
  lastCard: { deck: "chance" | "chest"; text: string } | null;
  tiles: Record<number, OwnedState>;
  chanceOrder: string[];
  chestOrder: string[];
  chanceNext: number;
  chestNext: number;
  freeParkingPot: number;
  trades: TradeOffer[];
  log: LogEntry[];
  winnerId: string | null;
  /** Monotonic counter; clients use it to drop out-of-order realtime frames. */
  seq: number;
  rngSeed: number;
}
