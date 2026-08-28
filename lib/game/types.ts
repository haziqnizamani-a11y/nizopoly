// Core game types. The whole game state is a single JSON blob that lives in one
// Postgres row; every mutation goes through the engine server-side.

export type GroupId =
  | "interior"
  | "hyderabad"
  | "oldCity"
  | "campus"
  | "nightlife"
  | "uptown"
  | "clifton"
  | "premium";

export type TileKind =
  | "go"
  | "property"
  | "station"
  | "utility"
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

export interface StationTile extends BaseTile {
  kind: "station";
  price: number;
  blurb: string;
}

export interface UtilityTile extends BaseTile {
  kind: "utility";
  price: number;
  blurb: string;
}

export interface TaxTile extends BaseTile {
  kind: "tax";
  amount: number;
}

export type Tile = BaseTile | PropertyTile | StationTile | UtilityTile | TaxTile;

export function isProperty(t: Tile): t is PropertyTile {
  return t.kind === "property";
}
export function isStation(t: Tile): t is StationTile {
  return t.kind === "station";
}
export function isUtility(t: Tile): t is UtilityTile {
  return t.kind === "utility";
}
export function isTax(t: Tile): t is TaxTile {
  return t.kind === "tax";
}
/** Anything a player can own. */
export function isOwnable(t: Tile): t is PropertyTile | StationTile | UtilityTile {
  return t.kind === "property" || t.kind === "station" || t.kind === "utility";
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
  /** 0-4 = houses, 5 = hotel. Always 0 for stations and utilities. */
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
  /**
   * Order in which players went bust, 1 = first out. Drives final placings:
   * surviving longer is a better result. Absent on games started before this
   * was tracked, in which case ranking falls back to net worth.
   */
  bankruptAt?: number;
  connected: boolean;
}

/** What the current player is allowed to do right now. */
export type TurnPhase =
  | "roll" // must roll (or pay/use card to leave jail first)
  | "decide_buy" // landed on an unowned tile
  | "auction" // the tile was declined and is up for bidding
  | "resolve" // card/rent resolved, may manage then end turn
  | "end"; // turn is over, waiting for engine to advance

export interface AuctionState {
  tile: number;
  highBid: number;
  /** null until someone places a bid. */
  highBidderId: string | null;
  /** Players out of this auction for good — passing is final. */
  passed: string[];
}

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

/**
 * Bumped whenever the board layout changes, because stored tile indices and
 * positions become meaningless. Rooms on an older version are refused rather
 * than silently misread.
 */
export const BOARD_VERSION = 2;

export interface GameState {
  version: typeof BOARD_VERSION;
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
   * Set while turnPhase === "auction". Optional: games in flight before this
   * was added simply never have one, same as `lastRent`/`bankruptAt`.
   */
  pendingAuction?: AuctionState | null;
  /**
   * A debt the player cannot currently cover. They must mortgage, sell or trade
   * their way out of it, or declare bankruptcy. Blocks the turn until cleared.
   */
  pendingDebt: { playerId: string; amount: number; creditorId: string | null } | null;
  /** Most recent card drawn, kept so the UI can show it. */
  lastCard: { deck: "chance" | "chest"; text: string } | null;
  /**
   * Most recent rent collected, so the owner can be told they were paid rather
   * than having to spot it in the log. Optional: games started before this was
   * added simply never show the notice.
   */
  lastRent?: {
    fromName: string;
    toId: string;
    toName: string;
    amount: number;
    tile: string;
    seq: number;
  } | null;
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
