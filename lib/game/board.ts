import type { GroupId, Tile, Token } from "./types";

/**
 * 28 tiles: four corners with six tiles per side. Fifteen properties in five
 * groups of three, plus the two toll roads. Prices are in rupees and follow the
 * classic ladder scaled 10x, so the standard rent maths still balances.
 */

export const START_CASH = 15_000;
export const PASS_GO = 2_000;
export const JAIL_FINE = 500;
export const JAIL_TILE = 7;
export const GO_TO_JAIL_TILE = 21;
export const MAX_JAIL_TURNS = 3;
/** Houses/hotels available to the whole table, as in the physical game. */
export const HOUSE_SUPPLY = 24;
export const HOTEL_SUPPLY = 8;

export const GROUPS: Record<GroupId, { name: string; color: string; tiles: number[] }> = {
  interior: { name: "Interior Sindh", color: "#8d6e4a", tiles: [1, 3, 6] },
  hyderabad: { name: "Hyderabad", color: "#4a9cd6", tiles: [8, 10, 11] },
  central: { name: "Karachi Central", color: "#e08a3c", tiles: [12, 13, 15] },
  uptown: { name: "Uptown", color: "#d64545", tiles: [17, 19, 20] },
  premium: { name: "Premium", color: "#1f7a4d", tiles: [22, 24, 27] },
};

export const TOLL_TILES = [5, 18];

export const BOARD: Tile[] = [
  { index: 0, kind: "go", name: "GO" },
  {
    index: 1,
    kind: "property",
    name: "Matli",
    group: "interior",
    price: 1000,
    houseCost: 500,
    rent: [60, 300, 900, 2700, 4000, 5500],
    blurb: "Sugarcane, dust and the road home.",
  },
  { index: 2, kind: "chest", name: "Family Business" },
  {
    index: 3,
    kind: "property",
    name: "Tando Soomro",
    group: "interior",
    price: 1000,
    houseCost: 500,
    rent: [60, 300, 900, 2700, 4000, 5500],
    blurb: "Blink and you have driven past it.",
  },
  { index: 4, kind: "tax", name: "Income Tax", amount: 2000 },
  {
    index: 5,
    kind: "toll",
    name: "Autobahn",
    price: 2000,
    blurb: "Toll road. Rent scales with your roll.",
  },
  {
    index: 6,
    kind: "property",
    name: "Das Numbri",
    group: "interior",
    price: 1200,
    houseCost: 500,
    rent: [80, 400, 1000, 3000, 4500, 6000],
    blurb: "Ten Number. Everyone gives directions from here.",
  },
  { index: 7, kind: "jail", name: "Jail / Just Visiting" },
  {
    index: 8,
    kind: "property",
    name: "Qasimabad",
    group: "hyderabad",
    price: 1400,
    houseCost: 1000,
    rent: [100, 500, 1500, 4500, 6250, 7500],
    blurb: "Half of Hyderabad moved here and never left.",
  },
  { index: 9, kind: "chance", name: "Karachi Traffic" },
  {
    index: 10,
    kind: "property",
    name: "Nizamani Complex",
    group: "hyderabad",
    price: 1400,
    houseCost: 1000,
    rent: [100, 500, 1500, 4500, 6250, 7500],
    blurb: "The name on the gate is the name on the deed.",
  },
  {
    index: 11,
    kind: "property",
    name: "Muslim Society",
    group: "hyderabad",
    price: 1600,
    houseCost: 1000,
    rent: [120, 600, 1800, 5000, 7000, 9000],
    blurb: "Old Karachi, narrow lanes, impossible parking.",
  },
  {
    index: 12,
    kind: "property",
    name: "IBA Apartments",
    short: "IBA Apts",
    group: "central",
    price: 1800,
    houseCost: 1000,
    rent: [140, 700, 2000, 5500, 7500, 9500],
    blurb: "Nobody sleeps here during finals week.",
  },
  {
    index: 13,
    kind: "property",
    name: "Triggy",
    group: "central",
    price: 1800,
    houseCost: 1000,
    rent: [140, 700, 2000, 5500, 7500, 9500],
    blurb: "You said one round. It was not one round.",
  },
  { index: 14, kind: "free", name: "Free Parking" },
  {
    index: 15,
    kind: "property",
    name: "Shanghai Social",
    group: "central",
    price: 2000,
    houseCost: 1000,
    rent: [160, 800, 2200, 6000, 8000, 10000],
    blurb: "Table for four, bill for fourteen.",
  },
  { index: 16, kind: "chest", name: "Family Business" },
  {
    index: 17,
    kind: "property",
    name: "Flamingo",
    group: "uptown",
    price: 2600,
    houseCost: 1500,
    rent: [220, 1100, 3300, 8000, 9750, 11500],
    blurb: "Still the plan when nobody can agree on a plan.",
  },
  {
    index: 18,
    kind: "toll",
    name: "Neher-e-Khayyam",
    short: "Neher-e-K.",
    price: 2000,
    blurb: "Toll road. Rent scales with your roll.",
  },
  {
    index: 19,
    kind: "property",
    name: "Zamzama",
    group: "uptown",
    price: 2600,
    houseCost: 1500,
    rent: [220, 1100, 3300, 8000, 9750, 11500],
    blurb: "Rent per square foot: unreasonable.",
  },
  {
    index: 20,
    kind: "property",
    name: "Clifton Block 5",
    group: "uptown",
    price: 2800,
    houseCost: 1500,
    rent: [240, 1200, 3600, 8500, 10250, 12000],
    blurb: "Everything worth doing is a five minute drive away.",
  },
  { index: 21, kind: "gotojail", name: "Go To Jail" },
  {
    index: 22,
    kind: "property",
    name: "Sea View",
    group: "premium",
    price: 3000,
    houseCost: 2000,
    rent: [260, 1300, 3900, 9000, 11000, 12750],
    blurb: "Corn, camels, and the whole city at sunset.",
  },
  { index: 23, kind: "chance", name: "Karachi Traffic" },
  {
    index: 24,
    kind: "property",
    name: "D.H.A Phase 8",
    group: "premium",
    price: 3200,
    houseCost: 2000,
    rent: [280, 1500, 4500, 10000, 12000, 14000],
    blurb: "Reclaimed from the sea, priced like it.",
  },
  { index: 25, kind: "tax", name: "Luxury Tax", amount: 1000 },
  { index: 26, kind: "chance", name: "Karachi Traffic" },
  {
    index: 27,
    kind: "property",
    name: "Nizamani Orchards",
    group: "premium",
    price: 4000,
    houseCost: 2000,
    rent: [500, 2000, 6000, 14000, 17000, 20000],
    blurb: "The mangoes alone are worth the trip.",
  },
];

export const BOARD_SIZE = BOARD.length;

export const TOKENS: Token[] = [
  { id: "haziq", name: "Haziq", emoji: "🧢" },
  { id: "sana", name: "Sana", emoji: "🌸" },
  { id: "chai", name: "Chai", emoji: "🐈" },
  { id: "kiki", name: "Kiki", emoji: "🐈‍⬛" },
  { id: "mango", name: "Mango", emoji: "🥭" },
  { id: "rickshaw", name: "Rickshaw", emoji: "🛺" },
];

export function tile(index: number): Tile {
  return BOARD[((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE];
}

export function groupOf(index: number): GroupId | null {
  const t = BOARD[index];
  return t && t.kind === "property" ? (t as { group: GroupId }).group : null;
}

export function money(n: number): string {
  return `Rs ${n.toLocaleString("en-PK")}`;
}
