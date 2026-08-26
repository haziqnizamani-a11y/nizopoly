import {
  BOARD,
  BOARD_SIZE,
  GROUPS,
  HOTEL_SUPPLY,
  HOUSE_SUPPLY,
  JAIL_FINE,
  JAIL_TILE,
  MAX_JAIL_TURNS,
  PASS_GO,
  START_CASH,
  TOKENS,
  TOLL_TILES,
  money,
  tile,
} from "./board";
import { CHANCE, CHEST, cardById } from "./cards";
import { nextSeed, rollDice, shuffle } from "./rng";
import {
  isProperty,
  isToll,
  isTax,
  isOwnable,
  type Card,
  type GameState,
  type GroupId,
  type Player,
  type PropertyTile,
  type TollTile,
} from "./types";

export class GameError extends Error {}

function fail(msg: string): never {
  throw new GameError(msg);
}

export type Action =
  | { type: "roll" }
  | { type: "buy" }
  | { type: "decline" }
  | { type: "payJailFine" }
  | { type: "useJailCard" }
  | { type: "build"; tile: number }
  | { type: "sellHouse"; tile: number }
  | { type: "mortgage"; tile: number }
  | { type: "unmortgage"; tile: number }
  | { type: "endTurn" }
  | {
      type: "proposeTrade";
      to: string;
      giveTiles: number[];
      giveCash: number;
      wantTiles: number[];
      wantCash: number;
    }
  | { type: "respondTrade"; id: string; accept: boolean }
  | { type: "cancelTrade"; id: string }
  | { type: "bankrupt" };

// ---------------------------------------------------------------- setup

export function createGame(hostId: string, hostName: string, seed: number): GameState {
  const s1 = shuffle(CHANCE.map((c) => c.id), seed);
  const s2 = shuffle(CHEST.map((c) => c.id), s1.seed);
  return {
    version: 1,
    phase: "lobby",
    hostId,
    players: [newPlayer(hostId, hostName, TOKENS[0].id)],
    turn: 0,
    turnPhase: "roll",
    doublesCount: 0,
    lastRoll: null,
    pendingPurchase: null,
    pendingDebt: null,
    lastCard: null,
    tiles: {},
    chanceOrder: s1.items,
    chestOrder: s2.items,
    chanceNext: 0,
    chestNext: 0,
    freeParkingPot: 0,
    trades: [],
    log: [entry("Room created. Waiting for players.")],
    winnerId: null,
    seq: 0,
    rngSeed: s2.seed,
  };
}

function newPlayer(id: string, name: string, tokenId: string): Player {
  return {
    id,
    name,
    tokenId,
    cash: START_CASH,
    position: 0,
    inJail: false,
    jailTurns: 0,
    getOutOfJailCards: 0,
    bankrupt: false,
    connected: true,
  };
}

let logCounter = 0;
function entry(text: string) {
  logCounter = (logCounter + 1) % 1_000_000;
  return { id: `${Date.now().toString(36)}-${logCounter.toString(36)}`, ts: Date.now(), text };
}

function log(s: GameState, text: string) {
  s.log.push(entry(text));
  if (s.log.length > 120) s.log = s.log.slice(-120);
}

export function addPlayer(state: GameState, id: string, name: string, tokenId?: string): GameState {
  const s = clone(state);
  if (s.phase !== "lobby") fail("This game has already started.");
  if (s.players.some((p) => p.id === id)) return s;
  if (s.players.length >= TOKENS.length) fail("The room is full.");
  const taken = new Set(s.players.map((p) => p.tokenId));
  const token = tokenId && !taken.has(tokenId) ? tokenId : TOKENS.find((t) => !taken.has(t.id))!.id;
  s.players.push(newPlayer(id, name, token));
  log(s, `${name} joined.`);
  s.seq++;
  return s;
}

export function setToken(state: GameState, id: string, tokenId: string): GameState {
  const s = clone(state);
  if (s.phase !== "lobby") fail("Tokens are locked once the game starts.");
  if (s.players.some((p) => p.id !== id && p.tokenId === tokenId)) fail("That token is taken.");
  const p = s.players.find((x) => x.id === id) ?? fail("You are not in this game.");
  p.tokenId = tokenId;
  s.seq++;
  return s;
}

export function setName(state: GameState, id: string, rawName: string): GameState {
  const s = clone(state);
  const p = s.players.find((x) => x.id === id) ?? fail("You are not in this game.");
  const name = rawName.trim().slice(0, 20);
  if (!name) fail("Pick a name.");
  if (name === p.name) return state;
  if (s.players.some((x) => x.id !== id && x.name.toLowerCase() === name.toLowerCase())) {
    fail("Someone is already using that name.");
  }
  log(s, `${p.name} is now ${name}.`);
  p.name = name;
  s.seq++;
  return s;
}

export function startGame(state: GameState, byId: string): GameState {
  const s = clone(state);
  if (s.hostId !== byId) fail("Only the host can start the game.");
  if (s.phase !== "lobby") fail("The game has already started.");
  if (s.players.length < 2) fail("You need at least two players.");
  s.phase = "playing";
  s.turnPhase = "roll";
  log(s, `Game on. ${s.players[0].name} rolls first.`);
  s.seq++;
  return s;
}

// ---------------------------------------------------------------- helpers

function clone(s: GameState): GameState {
  return structuredClone(s);
}

function current(s: GameState): Player {
  return s.players[s.turn];
}

function playerById(s: GameState, id: string): Player {
  return s.players.find((p) => p.id === id) ?? fail("You are not in this game.");
}

function ownState(s: GameState, index: number) {
  if (!s.tiles[index]) s.tiles[index] = { owner: null, houses: 0, mortgaged: false };
  return s.tiles[index];
}

export function ownerOf(s: GameState, index: number): string | null {
  return s.tiles[index]?.owner ?? null;
}

function requireTurn(s: GameState, playerId: string): Player {
  if (s.phase !== "playing") fail("The game is not running.");
  const p = current(s);
  if (p.id !== playerId) fail("It is not your turn.");
  if (p.bankrupt) fail("You are out of the game.");
  return p;
}

/** Does this player hold every tile in the group? */
export function hasGroup(s: GameState, playerId: string, group: GroupId): boolean {
  return GROUPS[group].tiles.every((i) => ownerOf(s, i) === playerId);
}

function tilesOwnedBy(s: GameState, playerId: string): number[] {
  return BOARD.filter((t) => isOwnable(t) && ownerOf(s, t.index) === playerId).map((t) => t.index);
}

function housesUsed(s: GameState): { houses: number; hotels: number } {
  let houses = 0;
  let hotels = 0;
  for (const t of BOARD) {
    const st = s.tiles[t.index];
    if (!st) continue;
    if (st.houses === 5) hotels++;
    else houses += st.houses;
  }
  return { houses, hotels };
}

export function netWorth(s: GameState, playerId: string): number {
  const p = s.players.find((x) => x.id === playerId);
  if (!p) return 0;
  let total = p.cash;
  for (const i of tilesOwnedBy(s, playerId)) {
    const t = tile(i) as PropertyTile | TollTile;
    const st = ownState(s, i);
    total += st.mortgaged ? Math.floor(t.price / 2) : t.price;
    if (isProperty(t)) total += st.houses * t.houseCost;
  }
  return total;
}

export function rentFor(s: GameState, index: number, diceTotal: number): number {
  const t = tile(index);
  const st = s.tiles[index];
  if (!st || !st.owner || st.mortgaged) return 0;

  if (isToll(t)) {
    const owned = TOLL_TILES.filter((i) => ownerOf(s, i) === st.owner).length;
    return diceTotal * (owned >= 2 ? 250 : 100);
  }
  if (isProperty(t)) {
    if (st.houses > 0) return t.rent[st.houses];
    // Undeveloped but the owner holds the whole group: double rent.
    return hasGroup(s, st.owner, t.group) ? t.rent[0] * 2 : t.rent[0];
  }
  return 0;
}

// ---------------------------------------------------------------- money

/**
 * Move money. If `from` cannot cover it, the shortfall becomes a pending debt
 * that blocks the turn until they raise the cash or go bankrupt.
 */
function pay(s: GameState, fromId: string, amount: number, toId: string | null) {
  if (amount <= 0) return;
  const from = playerById(s, fromId);
  if (from.cash >= amount) {
    from.cash -= amount;
    credit(s, toId, amount);
    return;
  }
  s.pendingDebt = { playerId: fromId, amount, creditorId: toId };
  log(
    s,
    `${from.name} owes ${money(amount)}${toId ? ` to ${playerById(s, toId).name}` : " to the bank"} and must raise it.`
  );
}

function credit(s: GameState, toId: string | null, amount: number) {
  if (toId) playerById(s, toId).cash += amount;
  else s.freeParkingPot += amount;
}

/** Called after any action that raises cash. */
function trySettleDebt(s: GameState) {
  const debt = s.pendingDebt;
  if (!debt) return;
  const p = playerById(s, debt.playerId);
  if (p.cash < debt.amount) return;
  p.cash -= debt.amount;
  credit(s, debt.creditorId, debt.amount);
  s.pendingDebt = null;
  log(s, `${p.name} settled ${money(debt.amount)}.`);
}

// ---------------------------------------------------------------- movement

function moveTo(s: GameState, p: Player, target: number, collectGo: boolean) {
  const dest = ((target % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
  if (collectGo && dest < p.position) {
    p.cash += PASS_GO;
    log(s, `${p.name} passed GO and collected ${money(PASS_GO)}.`);
  }
  p.position = dest;
}

function sendToJail(s: GameState, p: Player) {
  p.position = JAIL_TILE;
  p.inJail = true;
  p.jailTurns = 0;
  s.doublesCount = 0;
  s.turnPhase = "resolve";
  log(s, `${p.name} was sent to Jail.`);
}

function landOn(s: GameState, p: Player) {
  const t = tile(p.position);
  const diceTotal = (s.lastRoll?.[0] ?? 0) + (s.lastRoll?.[1] ?? 0);
  s.turnPhase = "resolve";

  if (isOwnable(t)) {
    const st = ownState(s, p.position);
    if (!st.owner) {
      if (p.cash >= t.price) {
        s.turnPhase = "decide_buy";
        s.pendingPurchase = p.position;
      } else {
        log(s, `${p.name} landed on ${t.name} but cannot afford it.`);
      }
      return;
    }
    if (st.owner === p.id) {
      log(s, `${p.name} landed on their own ${t.name}.`);
      return;
    }
    if (st.mortgaged) {
      log(s, `${t.name} is mortgaged — no rent.`);
      return;
    }
    const rent = rentFor(s, p.position, diceTotal);
    log(s, `${p.name} pays ${money(rent)} rent on ${t.name}.`);
    pay(s, p.id, rent, st.owner);
    return;
  }

  switch (t.kind) {
    case "tax": {
      const amt = isTax(t) ? t.amount : 0;
      log(s, `${p.name} pays ${t.name} of ${money(amt)}.`);
      pay(s, p.id, amt, null);
      return;
    }
    case "gotojail":
      sendToJail(s, p);
      return;
    case "free": {
      if (s.freeParkingPot > 0) {
        log(s, `${p.name} scoops ${money(s.freeParkingPot)} off Free Parking.`);
        p.cash += s.freeParkingPot;
        s.freeParkingPot = 0;
      } else {
        log(s, `${p.name} rests on Free Parking.`);
      }
      return;
    }
    case "chance":
    case "chest":
      drawCard(s, p, t.kind);
      return;
    default:
      return;
  }
}

function drawCard(s: GameState, p: Player, deck: "chance" | "chest") {
  const order = deck === "chance" ? s.chanceOrder : s.chestOrder;
  const idx = deck === "chance" ? s.chanceNext : s.chestNext;
  const card = cardById(order[idx % order.length]);
  if (deck === "chance") s.chanceNext = (idx + 1) % order.length;
  else s.chestNext = (idx + 1) % order.length;

  s.lastCard = { deck, text: card.text };
  log(s, `${p.name} draws: ${card.text}`);
  applyCard(s, p, card);
}

function applyCard(s: GameState, p: Player, card: Card) {
  const a = card.action;
  switch (a.type) {
    case "money":
      if (a.amount >= 0) p.cash += a.amount;
      else pay(s, p.id, -a.amount, null);
      return;
    case "collectFromEach": {
      for (const o of s.players) {
        if (o.id === p.id || o.bankrupt) continue;
        pay(s, o.id, a.amount, p.id);
      }
      return;
    }
    case "payEach": {
      const others = s.players.filter((o) => o.id !== p.id && !o.bankrupt);
      pay(s, p.id, a.amount * others.length, null);
      // Distribute only if the payer could actually cover it.
      if (!s.pendingDebt) {
        s.freeParkingPot -= a.amount * others.length;
        for (const o of others) o.cash += a.amount;
      }
      return;
    }
    case "move":
      moveTo(s, p, a.to, true);
      landOn(s, p);
      return;
    case "moveBack":
      moveTo(s, p, p.position - a.steps, false);
      landOn(s, p);
      return;
    case "goToJail":
      sendToJail(s, p);
      return;
    case "getOutOfJail":
      p.getOutOfJailCards++;
      return;
    case "repairs": {
      let houses = 0;
      let hotels = 0;
      for (const i of tilesOwnedBy(s, p.id)) {
        const st = ownState(s, i);
        if (st.houses === 5) hotels++;
        else houses += st.houses;
      }
      const bill = houses * a.perHouse + hotels * a.perHotel;
      if (bill > 0) {
        log(s, `${p.name} owes ${money(bill)} in repairs.`);
        pay(s, p.id, bill, null);
      }
      return;
    }
  }
}

// ---------------------------------------------------------------- actions

export function apply(state: GameState, playerId: string, action: Action): GameState {
  const s = clone(state);

  switch (action.type) {
    case "roll":
      doRoll(s, playerId);
      break;
    case "buy":
      doBuy(s, playerId);
      break;
    case "decline":
      doDecline(s, playerId);
      break;
    case "payJailFine":
      doPayJailFine(s, playerId);
      break;
    case "useJailCard":
      doUseJailCard(s, playerId);
      break;
    case "build":
      doBuild(s, playerId, action.tile);
      break;
    case "sellHouse":
      doSellHouse(s, playerId, action.tile);
      break;
    case "mortgage":
      doMortgage(s, playerId, action.tile);
      break;
    case "unmortgage":
      doUnmortgage(s, playerId, action.tile);
      break;
    case "endTurn":
      doEndTurn(s, playerId);
      break;
    case "proposeTrade":
      doProposeTrade(s, playerId, action);
      break;
    case "respondTrade":
      doRespondTrade(s, playerId, action.id, action.accept);
      break;
    case "cancelTrade":
      s.trades = s.trades.filter((t) => !(t.id === action.id && t.from === playerId));
      break;
    case "bankrupt":
      doBankrupt(s, playerId);
      break;
  }

  trySettleDebt(s);
  checkGameOver(s);
  s.seq++;
  return s;
}

function doRoll(s: GameState, playerId: string) {
  const p = requireTurn(s, playerId);
  if (s.turnPhase !== "roll") fail("You cannot roll right now.");
  if (s.pendingDebt) fail("Settle your debt first.");

  const { dice, seed } = rollDice(s.rngSeed);
  s.rngSeed = seed;
  s.lastRoll = dice;
  s.lastCard = null;
  const total = dice[0] + dice[1];
  const isDouble = dice[0] === dice[1];
  log(s, `${p.name} rolled ${dice[0]} and ${dice[1]}.`);

  if (p.inJail) {
    if (isDouble) {
      p.inJail = false;
      p.jailTurns = 0;
      s.doublesCount = 0; // Rolling out of jail does not earn another turn.
      log(s, `${p.name} rolled doubles and walked out of Jail.`);
      moveTo(s, p, p.position + total, true);
      landOn(s, p);
      return;
    }
    p.jailTurns++;
    if (p.jailTurns >= MAX_JAIL_TURNS) {
      log(s, `${p.name} served their time and pays the ${money(JAIL_FINE)} fine.`);
      pay(s, p.id, JAIL_FINE, null);
      p.inJail = false;
      p.jailTurns = 0;
      if (!s.pendingDebt) {
        moveTo(s, p, p.position + total, true);
        landOn(s, p);
        return;
      }
    } else {
      log(s, `${p.name} stays in Jail (attempt ${p.jailTurns} of ${MAX_JAIL_TURNS}).`);
    }
    s.turnPhase = "resolve";
    return;
  }

  if (isDouble) {
    s.doublesCount++;
    if (s.doublesCount >= 3) {
      log(s, `${p.name} rolled three doubles in a row.`);
      sendToJail(s, p);
      return;
    }
  } else {
    s.doublesCount = 0;
  }

  moveTo(s, p, p.position + total, true);
  landOn(s, p);
}

function doBuy(s: GameState, playerId: string) {
  const p = requireTurn(s, playerId);
  if (s.turnPhase !== "decide_buy" || s.pendingPurchase === null) fail("Nothing to buy.");
  const index = s.pendingPurchase;
  const t = tile(index);
  if (!isOwnable(t)) fail("That tile cannot be bought.");
  if (p.cash < t.price) fail("You cannot afford it.");

  p.cash -= t.price;
  ownState(s, index).owner = p.id;
  s.pendingPurchase = null;
  s.turnPhase = "resolve";
  log(s, `${p.name} bought ${t.name} for ${money(t.price)}.`);
}

function doDecline(s: GameState, playerId: string) {
  requireTurn(s, playerId);
  if (s.turnPhase !== "decide_buy") fail("Nothing to decline.");
  const index = s.pendingPurchase;
  s.pendingPurchase = null;
  s.turnPhase = "resolve";
  if (index !== null) log(s, `${current(s).name} passed on ${tile(index).name}.`);
}

function doPayJailFine(s: GameState, playerId: string) {
  const p = requireTurn(s, playerId);
  if (!p.inJail) fail("You are not in Jail.");
  if (s.turnPhase !== "roll") fail("Too late for that this turn.");
  if (p.cash < JAIL_FINE) fail("You cannot afford the fine.");
  pay(s, p.id, JAIL_FINE, null);
  p.inJail = false;
  p.jailTurns = 0;
  log(s, `${p.name} paid the ${money(JAIL_FINE)} fine and is free.`);
}

function doUseJailCard(s: GameState, playerId: string) {
  const p = requireTurn(s, playerId);
  if (!p.inJail) fail("You are not in Jail.");
  if (p.getOutOfJailCards < 1) fail("You have no Get Out of Jail card.");
  p.getOutOfJailCards--;
  p.inJail = false;
  p.jailTurns = 0;
  log(s, `${p.name} used a Get Out of Jail Free card.`);
}

function doBuild(s: GameState, playerId: string, index: number) {
  const p = playerById(s, playerId);
  const t = tile(index);
  if (!isProperty(t)) fail("You can only build on properties.");
  if (ownerOf(s, index) !== playerId) fail("You do not own that.");
  if (!hasGroup(s, playerId, t.group)) fail(`You need all of ${GROUPS[t.group].name} first.`);

  const group = GROUPS[t.group].tiles;
  if (group.some((i) => ownState(s, i).mortgaged)) fail("Unmortgage the whole group first.");

  const st = ownState(s, index);
  if (st.houses >= 5) fail("That already has a hotel.");
  const min = Math.min(...group.map((i) => ownState(s, i).houses));
  if (st.houses > min) fail("Build evenly across the group.");

  const supply = housesUsed(s);
  if (st.houses === 4) {
    if (supply.hotels >= HOTEL_SUPPLY) fail("No hotels left in the bank.");
  } else if (supply.houses >= HOUSE_SUPPLY) {
    fail("No houses left in the bank.");
  }

  if (p.cash < t.houseCost) fail("You cannot afford that.");
  p.cash -= t.houseCost;
  st.houses++;
  log(
    s,
    st.houses === 5
      ? `${p.name} built a hotel on ${t.name}.`
      : `${p.name} built a house on ${t.name} (${st.houses}).`
  );
}

function doSellHouse(s: GameState, playerId: string, index: number) {
  const p = playerById(s, playerId);
  const t = tile(index);
  if (!isProperty(t)) fail("Nothing to sell there.");
  if (ownerOf(s, index) !== playerId) fail("You do not own that.");
  const st = ownState(s, index);
  if (st.houses === 0) fail("There is nothing built there.");

  const group = GROUPS[t.group].tiles;
  const max = Math.max(...group.map((i) => ownState(s, i).houses));
  if (st.houses < max) fail("Sell evenly across the group.");

  st.houses--;
  const refund = Math.floor(t.houseCost / 2);
  p.cash += refund;
  log(s, `${p.name} sold a building on ${t.name} for ${money(refund)}.`);
}

function doMortgage(s: GameState, playerId: string, index: number) {
  const p = playerById(s, playerId);
  const t = tile(index);
  if (!isOwnable(t)) fail("That cannot be mortgaged.");
  if (ownerOf(s, index) !== playerId) fail("You do not own that.");
  const st = ownState(s, index);
  if (st.mortgaged) fail("Already mortgaged.");
  if (isProperty(t) && GROUPS[t.group].tiles.some((i) => ownState(s, i).houses > 0)) {
    fail("Sell the buildings in that group first.");
  }
  st.mortgaged = true;
  const amount = Math.floor(t.price / 2);
  p.cash += amount;
  log(s, `${p.name} mortgaged ${t.name} for ${money(amount)}.`);
}

function doUnmortgage(s: GameState, playerId: string, index: number) {
  const p = playerById(s, playerId);
  const t = tile(index);
  if (!isOwnable(t)) fail("That cannot be unmortgaged.");
  if (ownerOf(s, index) !== playerId) fail("You do not own that.");
  const st = ownState(s, index);
  if (!st.mortgaged) fail("That is not mortgaged.");
  const cost = Math.ceil((t.price / 2) * 1.1);
  if (p.cash < cost) fail("You cannot afford to lift the mortgage.");
  p.cash -= cost;
  st.mortgaged = false;
  log(s, `${p.name} lifted the mortgage on ${t.name} for ${money(cost)}.`);
}

function doEndTurn(s: GameState, playerId: string) {
  const p = requireTurn(s, playerId);
  if (s.pendingDebt) fail("Settle your debt or declare bankruptcy.");
  if (s.turnPhase === "decide_buy") fail("Buy the property or pass on it first.");
  if (s.turnPhase === "roll") fail("You still have to roll.");

  const rolledDoubles = s.lastRoll?.[0] === s.lastRoll?.[1];
  if (rolledDoubles && !p.inJail && s.doublesCount > 0 && s.doublesCount < 3) {
    s.turnPhase = "roll";
    log(s, `${p.name} rolled doubles and goes again.`);
    return;
  }
  advanceTurn(s);
}

function advanceTurn(s: GameState) {
  s.doublesCount = 0;
  s.lastRoll = null;
  s.lastCard = null;
  s.pendingPurchase = null;
  const alive = s.players.filter((p) => !p.bankrupt);
  if (alive.length <= 1) return;
  let next = s.turn;
  do {
    next = (next + 1) % s.players.length;
  } while (s.players[next].bankrupt);
  s.turn = next;
  s.turnPhase = "roll";
  log(s, `${s.players[next].name}'s turn.`);
}

// ---------------------------------------------------------------- trading

function doProposeTrade(
  s: GameState,
  playerId: string,
  a: Extract<Action, { type: "proposeTrade" }>
) {
  const from = playerById(s, playerId);
  const to = playerById(s, a.to);
  if (from.id === to.id) fail("You cannot trade with yourself.");
  if (from.bankrupt || to.bankrupt) fail("That player is out of the game.");
  if (a.giveCash < 0 || a.wantCash < 0) fail("Cash amounts must be positive.");
  if (from.cash < a.giveCash) fail("You do not have that much cash.");

  for (const i of a.giveTiles) {
    if (ownerOf(s, i) !== from.id) fail("You are offering something you do not own.");
    if (hasBuildings(s, i)) fail("Sell the buildings in that group before trading it.");
  }
  for (const i of a.wantTiles) {
    if (ownerOf(s, i) !== to.id) fail("They do not own one of those.");
    if (hasBuildings(s, i)) fail("Their group still has buildings on it.");
  }

  s.trades.push({
    id: `tr-${s.seq}-${Math.floor(Math.random() * 1e6).toString(36)}`,
    from: from.id,
    to: to.id,
    giveTiles: a.giveTiles,
    giveCash: a.giveCash,
    wantTiles: a.wantTiles,
    wantCash: a.wantCash,
  });
  log(s, `${from.name} offered ${to.name} a trade.`);
}

function hasBuildings(s: GameState, index: number): boolean {
  const t = tile(index);
  if (!isProperty(t)) return false;
  return GROUPS[t.group].tiles.some((i) => ownState(s, i).houses > 0);
}

function doRespondTrade(s: GameState, playerId: string, id: string, accept: boolean) {
  const trade = s.trades.find((t) => t.id === id) ?? fail("That offer is gone.");
  if (trade.to !== playerId) fail("That offer is not yours to answer.");
  s.trades = s.trades.filter((t) => t.id !== id);

  const from = playerById(s, trade.from);
  const to = playerById(s, trade.to);
  if (!accept) {
    log(s, `${to.name} declined ${from.name}'s offer.`);
    return;
  }

  // Re-validate: the board may have moved since the offer was made.
  if (from.cash < trade.giveCash || to.cash < trade.wantCash) fail("Someone is short on cash now.");
  if (trade.giveTiles.some((i) => ownerOf(s, i) !== from.id)) fail("That offer is stale.");
  if (trade.wantTiles.some((i) => ownerOf(s, i) !== to.id)) fail("That offer is stale.");
  // Buildings may have gone up while the offer sat pending — a developed group
  // must never be split by a trade.
  if ([...trade.giveTiles, ...trade.wantTiles].some((i) => hasBuildings(s, i))) {
    fail("That group has been built on since the offer was made.");
  }

  from.cash -= trade.giveCash;
  to.cash += trade.giveCash;
  to.cash -= trade.wantCash;
  from.cash += trade.wantCash;
  for (const i of trade.giveTiles) ownState(s, i).owner = to.id;
  for (const i of trade.wantTiles) ownState(s, i).owner = from.id;
  log(s, `${to.name} accepted ${from.name}'s trade.`);
}

// ---------------------------------------------------------------- bankruptcy

function doBankrupt(s: GameState, playerId: string) {
  const p = playerById(s, playerId);
  if (p.bankrupt) return;
  const creditorId = s.pendingDebt?.playerId === playerId ? s.pendingDebt.creditorId : null;

  // Buildings always go back to the bank at half value; the cash follows the deed.
  let salvage = 0;
  for (const i of tilesOwnedBy(s, playerId)) {
    const t = tile(i);
    const st = ownState(s, i);
    if (isProperty(t) && st.houses > 0) {
      salvage += Math.floor((t.houseCost / 2) * st.houses);
      st.houses = 0;
    }
    st.owner = creditorId;
    if (!creditorId) st.mortgaged = false;
  }

  const pot = p.cash + salvage;
  p.cash = 0;
  p.bankrupt = true;
  s.pendingDebt = null;
  credit(s, creditorId, pot);

  log(
    s,
    creditorId
      ? `${p.name} is bankrupt. Everything goes to ${playerById(s, creditorId).name}.`
      : `${p.name} is bankrupt. The bank takes it all.`
  );

  if (current(s).id === playerId) advanceTurn(s);
}

function checkGameOver(s: GameState) {
  if (s.phase !== "playing") return;
  const alive = s.players.filter((p) => !p.bankrupt);
  if (alive.length <= 1 && s.players.length > 1) {
    s.phase = "ended";
    s.winnerId = alive[0]?.id ?? null;
    if (alive[0]) log(s, `${alive[0].name} wins.`);
  }
}

// ---------------------------------------------------------------- misc

export function setConnected(state: GameState, playerId: string, connected: boolean): GameState {
  const s = clone(state);
  const p = s.players.find((x) => x.id === playerId);
  if (!p || p.connected === connected) return state;
  p.connected = connected;
  s.seq++;
  return s;
}

export { nextSeed };
