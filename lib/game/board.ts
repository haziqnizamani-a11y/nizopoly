import type { GroupId, Tile, Token } from "./types";

/**
 * Standard 40-tile board: 22 properties in eight groups (2,3,3,3,3,3,3,2),
 * four stations, two utilities, four corners, three Chance, three Community
 * Chest and two taxes.
 *
 * Prices and rents are the classic tables scaled 10x into rupees, so the
 * balance of the original game carries over unchanged.
 */

export const START_CASH = 15_000;
export const PASS_GO = 2_000;
export const JAIL_FINE = 500;
export const JAIL_TILE = 10;
export const GO_TO_JAIL_TILE = 30;
export const MAX_JAIL_TURNS = 3;
/** Houses/hotels available to the whole table, as in the physical game. */
export const HOUSE_SUPPLY = 32;
export const HOTEL_SUPPLY = 12;

export const GROUPS: Record<GroupId, { name: string; color: string; tiles: number[] }> = {
  interior: { name: "Interior Sindh", color: "#8d6e4a", tiles: [1, 3] },
  hyderabad: { name: "Hyderabad", color: "#8ecae6", tiles: [6, 8, 9] },
  oldCity: { name: "Old Karachi", color: "#d16ba5", tiles: [11, 13, 14] },
  campus: { name: "Campus & Cafes", color: "#e08a3c", tiles: [16, 18, 19] },
  nightlife: { name: "Nightlife", color: "#d64545", tiles: [21, 23, 24] },
  uptown: { name: "Uptown", color: "#e3c02b", tiles: [26, 27, 29] },
  clifton: { name: "Clifton", color: "#1f7a4d", tiles: [31, 32, 34] },
  premium: { name: "Premium", color: "#2b4d9c", tiles: [37, 39] },
};

export const STATION_TILES = [5, 15, 25, 35];
export const UTILITY_TILES = [12, 28];

/** Rent by number of stations the owner holds. */
export const STATION_RENT = [0, 250, 500, 1000, 2000];
/** Dice multiplier for one / both utilities. */
export const UTILITY_MULTIPLIER = { one: 40, both: 100 };

export const BOARD: Tile[] = [
  { index: 0, kind: "go", name: "GO" },
  {
    index: 1,
    kind: "property",
    name: "Matli",
    group: "interior",
    price: 600,
    houseCost: 500,
    rent: [20, 100, 300, 900, 1600, 2500],
    blurb: "Sugarcane, dust and the road home.",
  },
  { index: 2, kind: "chest", name: "Family Business" },
  {
    index: 3,
    kind: "property",
    name: "Tando Soomro",
    group: "interior",
    price: 600,
    houseCost: 500,
    rent: [40, 200, 600, 1800, 3200, 4500],
    blurb: "Blink and you have driven past it.",
  },
  { index: 4, kind: "tax", name: "Income Tax", amount: 2000 },
  {
    index: 5,
    kind: "station",
    name: "Sea View",
    price: 2000,
    blurb: "Corn, camels and the whole city at sunset.",
  },
  {
    index: 6,
    kind: "property",
    name: "Jam Shoro",
    group: "hyderabad",
    price: 1000,
    houseCost: 500,
    rent: [60, 300, 900, 2700, 4000, 5500],
    blurb: "University town on the Indus.",
  },
  { index: 7, kind: "chance", name: "Karachi Traffic" },
  {
    index: 8,
    kind: "property",
    name: "Das Numbri",
    group: "hyderabad",
    price: 1000,
    houseCost: 500,
    rent: [60, 300, 900, 2700, 4000, 5500],
    blurb: "Ten Number. Everyone gives directions from here.",
  },
  {
    index: 9,
    kind: "property",
    name: "Qasimabad",
    group: "hyderabad",
    price: 1200,
    houseCost: 500,
    rent: [80, 400, 1000, 3000, 4500, 6000],
    blurb: "Half of Hyderabad moved here and never left.",
  },
  { index: 10, kind: "jail", name: "Jail / Just Visiting" },
  {
    index: 11,
    kind: "property",
    name: "Nizamani Complex",
    group: "oldCity",
    price: 1400,
    houseCost: 1000,
    rent: [100, 500, 1500, 4500, 6250, 7500],
    blurb: "The name on the gate is the name on the deed.",
  },
  {
    index: 12,
    kind: "utility",
    name: "K-Electric",
    short: "K-Electric",
    price: 1500,
    blurb: "Load shedding is included at no extra charge.",
  },
  {
    index: 13,
    kind: "property",
    name: "Muslim Society",
    group: "oldCity",
    price: 1400,
    houseCost: 1000,
    rent: [100, 500, 1500, 4500, 6250, 7500],
    blurb: "Old Karachi, narrow lanes, impossible parking.",
  },
  {
    index: 14,
    kind: "property",
    name: "Shareef Biryani",
    short: "Shareef",
    group: "oldCity",
    price: 1600,
    houseCost: 1000,
    rent: [120, 600, 1800, 5000, 7000, 9000],
    blurb: "Worth the queue. Always worth the queue.",
  },
  {
    index: 15,
    kind: "station",
    name: "Autobahn",
    price: 2000,
    blurb: "Clear at 6am, a car park by nine.",
  },
  {
    index: 16,
    kind: "property",
    name: "IBA Apartments",
    short: "IBA Apts",
    group: "campus",
    price: 1800,
    houseCost: 1000,
    rent: [140, 700, 2000, 5500, 7500, 9500],
    blurb: "Nobody sleeps here during finals week.",
  },
  { index: 17, kind: "chest", name: "Family Business" },
  {
    index: 18,
    kind: "property",
    name: "Triggy",
    group: "campus",
    price: 1800,
    houseCost: 1000,
    rent: [140, 700, 2000, 5500, 7500, 9500],
    blurb: "You said one round. It was not one round.",
  },
  {
    index: 19,
    kind: "property",
    name: "Gogo's",
    group: "campus",
    price: 2000,
    houseCost: 1000,
    rent: [160, 800, 2200, 6000, 8000, 10000],
    blurb: "Somehow always open when nothing else is.",
  },
  { index: 20, kind: "free", name: "Free Parking" },
  {
    index: 21,
    kind: "property",
    name: "Greeno",
    group: "nightlife",
    price: 2200,
    houseCost: 1500,
    rent: [180, 900, 2500, 7000, 8750, 10500],
    blurb: "Order the whole menu, regret nothing.",
  },
  { index: 22, kind: "chance", name: "Karachi Traffic" },
  {
    index: 23,
    kind: "property",
    name: "Mirchilli",
    group: "nightlife",
    price: 2200,
    houseCost: 1500,
    rent: [180, 900, 2500, 7000, 8750, 10500],
    blurb: "Hotter than advertised, every single time.",
  },
  {
    index: 24,
    kind: "property",
    name: "Shanghai Social",
    short: "Shanghai",
    group: "nightlife",
    price: 2400,
    houseCost: 1500,
    rent: [200, 1000, 3000, 7500, 9250, 11000],
    blurb: "Table for four, bill for fourteen.",
  },
  {
    index: 25,
    kind: "station",
    name: "Daewoo Station",
    short: "Daewoo",
    price: 2000,
    blurb: "The bus actually leaves on time.",
  },
  {
    index: 26,
    kind: "property",
    name: "Flamingo",
    group: "uptown",
    price: 2600,
    houseCost: 1500,
    rent: [220, 1100, 3300, 8000, 9750, 11500],
    blurb: "Still the plan when nobody can agree on a plan.",
  },
  {
    index: 27,
    kind: "property",
    name: "Dolmen Mall",
    short: "Dolmen",
    group: "uptown",
    price: 2600,
    houseCost: 1500,
    rent: [220, 1100, 3300, 8000, 9750, 11500],
    blurb: "Air conditioning as a destination.",
  },
  {
    index: 28,
    kind: "utility",
    name: "WAPDA",
    price: 1500,
    blurb: "The bill arrives whether the power did or not.",
  },
  {
    index: 29,
    kind: "property",
    name: "Bon Vista",
    group: "uptown",
    price: 2800,
    houseCost: 1500,
    rent: [240, 1200, 3600, 8500, 10250, 12000],
    blurb: "Sea breeze, salt damage, worth it.",
  },
  { index: 30, kind: "gotojail", name: "Go To Jail" },
  {
    index: 31,
    kind: "property",
    name: "Zamzama",
    group: "clifton",
    price: 3000,
    houseCost: 2000,
    rent: [260, 1300, 3900, 9000, 11000, 12750],
    blurb: "Rent per square foot: unreasonable.",
  },
  {
    index: 32,
    kind: "property",
    name: "Clifton Block 5",
    short: "Clifton 5",
    group: "clifton",
    price: 3000,
    houseCost: 2000,
    rent: [260, 1300, 3900, 9000, 11000, 12750],
    blurb: "Everything worth doing is a five minute drive away.",
  },
  { index: 33, kind: "chest", name: "Family Business" },
  {
    index: 34,
    kind: "property",
    name: "Boat Basin",
    group: "clifton",
    price: 3200,
    houseCost: 2000,
    rent: [280, 1500, 4500, 10000, 12000, 14000],
    blurb: "Parathas at midnight, engine idling.",
  },
  {
    index: 35,
    kind: "station",
    name: "Shahrah-e-Bhutto",
    short: "Shahrah-e-B.",
    price: 2000,
    blurb: "Six lanes of intent.",
  },
  { index: 36, kind: "chance", name: "Karachi Traffic" },
  {
    index: 37,
    kind: "property",
    name: "D.H.A Phase 8",
    short: "DHA 8",
    group: "premium",
    price: 3500,
    houseCost: 2000,
    rent: [350, 1750, 5000, 11000, 13000, 15000],
    blurb: "Reclaimed from the sea, priced like it.",
  },
  { index: 38, kind: "tax", name: "Luxury Tax", amount: 1000 },
  {
    index: 39,
    kind: "property",
    name: "Nizamani Orchards",
    short: "Orchards",
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
