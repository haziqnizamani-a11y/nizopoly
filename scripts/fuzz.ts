/**
 * Plays thousands of random games against the engine, asserting invariants after
 * every single action. Run with: npm run fuzz
 */
import {
  BOARD,
  GROUPS,
  HOTEL_SUPPLY,
  HOUSE_SUPPLY,
  START_CASH,
  STATION_TILES,
  UTILITY_TILES,
} from "../lib/game/board";
import { addPlayer, apply, createGame, GameError, startGame, type Action } from "../lib/game/engine";
import { isOwnable, isProperty, type GameState } from "../lib/game/types";

/** The board must keep the standard shape: 40 tiles, 22 properties, 8 groups. */
function checkBoardShape() {
  const count = (kind: string) => BOARD.filter((t) => t.kind === kind).length;
  const expect = (label: string, got: number, want: number) => {
    if (got !== want) throw new Error(`board shape: ${label} is ${got}, expected ${want}`);
  };

  expect("total tiles", BOARD.length, 40);
  expect("properties", count("property"), 22);
  expect("stations", count("station"), 4);
  expect("utilities", count("utility"), 2);
  expect("chance", count("chance"), 3);
  expect("community chest", count("chest"), 3);
  expect("taxes", count("tax"), 2);
  expect("station tiles listed", STATION_TILES.length, 4);
  expect("utility tiles listed", UTILITY_TILES.length, 2);

  const sizes = Object.values(GROUPS).map((g) => g.tiles.length).sort();
  const wanted = [2, 2, 3, 3, 3, 3, 3, 3];
  if (sizes.join() !== wanted.join()) {
    throw new Error(`board shape: colour groups are ${sizes.join()}, expected ${wanted.join()}`);
  }

  const grouped = Object.values(GROUPS).flatMap((g) => g.tiles);
  if (new Set(grouped).size !== 22) throw new Error("board shape: a property is in two groups");
  for (const i of grouped) {
    if (BOARD[i].kind !== "property") throw new Error(`board shape: tile ${i} in a group is not a property`);
  }
  for (const t of BOARD) {
    if (t.kind === "property" && !grouped.includes(t.index)) {
      throw new Error(`board shape: ${t.name} belongs to no colour group`);
    }
  }
}

function check(s: GameState, note: string) {
  for (const p of s.players) {
    if (!Number.isFinite(p.cash)) throw new Error(`${note}: non-finite cash for ${p.name}`);
    if (p.cash < 0) throw new Error(`${note}: negative cash ${p.cash} for ${p.name}`);
    if (p.position < 0 || p.position >= BOARD.length) {
      throw new Error(`${note}: off-board position ${p.position}`);
    }
    if (p.bankrupt && p.cash !== 0) throw new Error(`${note}: bankrupt player holds cash`);
  }

  let houses = 0;
  let hotels = 0;
  for (const [k, st] of Object.entries(s.tiles)) {
    const i = Number(k);
    const t = BOARD[i];
    if (st.houses > 0) {
      if (!isProperty(t)) throw new Error(`${note}: buildings on non-property ${t.name}`);
      if (st.mortgaged) throw new Error(`${note}: buildings on mortgaged ${t.name}`);
      if (!st.owner) throw new Error(`${note}: buildings on unowned ${t.name}`);
      // Even-build rule.
      const spread = GROUPS[t.group].tiles.map((g) => s.tiles[g]?.houses ?? 0);
      if (Math.max(...spread) - Math.min(...spread) > 1) {
        throw new Error(`${note}: uneven build in ${t.group} -> ${spread.join(",")}`);
      }
      // A group with buildings must be wholly owned by one player.
      const owners = new Set(GROUPS[t.group].tiles.map((g) => s.tiles[g]?.owner ?? null));
      if (owners.size !== 1) throw new Error(`${note}: split group ${t.group} has buildings`);
    }
    if (st.houses === 5) hotels++;
    else houses += st.houses;
    if (st.owner && !s.players.some((p) => p.id === st.owner && !p.bankrupt)) {
      throw new Error(`${note}: tile ${t.name} owned by a bankrupt/unknown player`);
    }
    if (st.houses > 5) throw new Error(`${note}: ${t.name} has ${st.houses} buildings`);
  }
  if (houses > HOUSE_SUPPLY) throw new Error(`${note}: ${houses} houses exceeds supply`);
  if (hotels > HOTEL_SUPPLY) throw new Error(`${note}: ${hotels} hotels exceeds supply`);

  if (s.phase === "playing" && s.players[s.turn].bankrupt) {
    throw new Error(`${note}: turn belongs to a bankrupt player`);
  }
}

function candidateActions(s: GameState, pid: string): Action[] {
  const acts: Action[] = [];
  const p = s.players.find((x) => x.id === pid)!;
  const isTurn = s.players[s.turn].id === pid;

  if (isTurn && !s.pendingDebt) {
    if (s.turnPhase === "roll") {
      acts.push({ type: "roll" });
      if (p.inJail) {
        acts.push({ type: "payJailFine" }, { type: "useJailCard" });
      }
    }
    // Real players buy most of the time. Pure coin-flip agents never generate
    // enough rent to end a game, because GO keeps injecting cash.
    if (s.turnPhase === "decide_buy") {
      acts.push({ type: "buy" }, { type: "buy" }, { type: "buy" }, { type: "decline" });
    }
    if (s.turnPhase === "resolve") acts.push({ type: "endTurn" });
  }

  for (const t of BOARD) {
    if (!isOwnable(t)) continue;
    if (s.tiles[t.index]?.owner !== pid) continue;
    acts.push({ type: "mortgage", tile: t.index }, { type: "unmortgage", tile: t.index });
    if (isProperty(t)) {
      acts.push({ type: "build", tile: t.index }, { type: "sellHouse", tile: t.index });
    }
  }

  const offer = s.trades.find((t) => t.to === pid);
  if (offer) acts.push({ type: "respondTrade", id: offer.id, accept: Math.random() < 0.5 });

  const other = s.players.find((o) => o.id !== pid && !o.bankrupt);
  if (other && Math.random() < 0.05) {
    const mine = BOARD.filter((t) => s.tiles[t.index]?.owner === pid).map((t) => t.index);
    const theirs = BOARD.filter((t) => s.tiles[t.index]?.owner === other.id).map((t) => t.index);
    acts.push({
      type: "proposeTrade",
      to: other.id,
      giveTiles: mine.slice(0, 1),
      giveCash: Math.min(p.cash, 500),
      wantTiles: theirs.slice(0, 1),
      wantCash: 0,
    });
  }

  if (s.pendingDebt?.playerId === pid) acts.push({ type: "bankrupt" });
  return acts;
}

function playGame(seed: number): { turns: number; state: GameState } {
  let s = createGame("p1", "Haziq", seed);
  s = addPlayer(s, "p2", "Sana");
  s = addPlayer(s, "p3", "Chai");
  s = startGame(s, "p1");
  check(s, "start");

  let steps = 0; // accepted actions only — rejections are the engine working
  let attempts = 0;
  // Random agents mortgage/unmortgage in circles, so a game needs a generous
  // attempt budget before "did not finish" means anything.
  const cap = 400_000;
  while (s.phase === "playing" && attempts < cap) {
    attempts++;
    // The player under pressure acts first, otherwise whoever's turn it is.
    const actorId = s.pendingDebt?.playerId ?? s.players[s.turn].id;
    const acts = candidateActions(s, actorId);
    if (acts.length === 0) {
      // Deadlock guard: a stuck debtor must be able to go bankrupt.
      if (s.pendingDebt) {
        s = apply(s, s.pendingDebt.playerId, { type: "bankrupt" });
        continue;
      }
      throw new Error(`no legal action at step ${steps}, phase ${s.turnPhase}`);
    }
    const a = acts[Math.floor(Math.random() * acts.length)];
    try {
      const next = apply(s, actorId, a);
      check(next, `after ${a.type} (step ${steps})`);
      s = next;
      steps++;
    } catch (e) {
      if (e instanceof GameError) continue; // Illegal move correctly rejected.
      throw e;
    }
  }
  if (attempts >= cap) {
    const alive = s.players.filter((p) => !p.bankrupt).length;
    const owned = Object.values(s.tiles).filter((t) => t.owner).length;
    throw new Error(
      `game failed to terminate: ${steps} accepted actions, ${alive} players alive, ` +
        `${owned}/28 tiles owned, cash=[${s.players.map((p) => p.cash).join(",")}]`
    );
  }
  return { turns: steps, state: s };
}

checkBoardShape();
console.log("board shape ok — 40 tiles, 22 properties, 4 stations, 2 utilities");

const GAMES = Number(process.argv[2] ?? 400);
let totalSteps = 0;
const winners = new Map<string, number>();

for (let i = 0; i < GAMES; i++) {
  const { turns, state } = playGame(i * 7919 + 13);
  totalSteps += turns;
  const w = state.winnerId ? state.players.find((p) => p.id === state.winnerId)!.name : "none";
  winners.set(w, (winners.get(w) ?? 0) + 1);
}

console.log(`ok — ${GAMES} games, ${totalSteps} actions, no invariant violations`);
console.log(`avg actions/game: ${Math.round(totalSteps / GAMES)}`);
console.log(`start cash ${START_CASH}, winners:`, Object.fromEntries(winners));
