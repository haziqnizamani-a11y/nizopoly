import type { Card } from "./types";

/** Movement-heavy deck, drawn on tiles 7 / 22 / 36. */
export const CHANCE: Card[] = [
  { id: "ch01", deck: "chance", text: "Roads blocked for a VIP movement. Go back 3 tiles.", action: { type: "moveBack", steps: 3 } },
  { id: "ch02", deck: "chance", text: "A clear run at 6am. Advance to Autobahn Station.", action: { type: "move", to: 15 } },
  { id: "ch03", deck: "chance", text: "Straight down Shahrah-e-Bhutto. Advance to that station.", action: { type: "move", to: 35 } },
  { id: "ch04", deck: "chance", text: "The traffic warden takes a liking to you. Advance to GO.", action: { type: "move", to: 0 } },
  { id: "ch05", deck: "chance", text: "Rain floods the underpass and tempers flare. Go directly to Jail.", action: { type: "goToJail" } },
  { id: "ch06", deck: "chance", text: "Chai escapes the carrier at the vet. Pay Rs 800.", action: { type: "money", amount: -800 } },
  { id: "ch07", deck: "chance", text: "Kiki knocks your chai onto the gear stick. Pay Rs 300.", action: { type: "money", amount: -300 } },
  { id: "ch08", deck: "chance", text: "Mango season. Advance to Nizamani Orchards.", action: { type: "move", to: 39 } },
  { id: "ch09", deck: "chance", text: "Sana finds parking in Zamzama on the first try. Advance to Zamzama.", action: { type: "move", to: 31 } },
  { id: "ch10", deck: "chance", text: "Caught speeding on the Autobahn. Pay Rs 1,500.", action: { type: "money", amount: -1500 } },
  { id: "ch11", deck: "chance", text: "Yours is the only car that starts. Collect Rs 500 from every player.", action: { type: "collectFromEach", amount: 500 } },
  { id: "ch12", deck: "chance", text: "Sunset drive. Advance to Sea View.", action: { type: "move", to: 5 } },
  { id: "ch13", deck: "chance", text: "Get Out of Jail Free — a cousin knows someone.", action: { type: "getOutOfJail" } },
  { id: "ch14", deck: "chance", text: "Generators and pumps need servicing. Pay Rs 250 per house and Rs 1,000 per hotel.", action: { type: "repairs", perHouse: 250, perHotel: 1000 } },
  { id: "ch15", deck: "chance", text: "Petrol price drops overnight. Collect Rs 1,000.", action: { type: "money", amount: 1000 } },
  { id: "ch16", deck: "chance", text: "Wrong turn onto a one-way. Go back 3 tiles.", action: { type: "moveBack", steps: 3 } },
];

/** Money-heavy deck, drawn on tiles 2 / 17 / 33. */
export const CHEST: Card[] = [
  { id: "cc01", deck: "chest", text: "The mango crop comes in strong. Collect Rs 4,000.", action: { type: "money", amount: 4000 } },
  { id: "cc02", deck: "chest", text: "The orchard tube well needs a new motor. Pay Rs 2,000.", action: { type: "money", amount: -2000 } },
  { id: "cc03", deck: "chest", text: "Land revenue refund from Matli. Collect Rs 1,200.", action: { type: "money", amount: 1200 } },
  { id: "cc04", deck: "chest", text: "Wedding season, and you are on four guest lists. Pay Rs 500 to each player.", action: { type: "payEach", amount: 500 } },
  { id: "cc05", deck: "chest", text: "Everyone still owes you for the Shanghai Social bill. Collect Rs 600 from each player.", action: { type: "collectFromEach", amount: 600 } },
  { id: "cc06", deck: "chest", text: "Chai and Kiki both need their shots. Pay Rs 900.", action: { type: "money", amount: -900 } },
  { id: "cc07", deck: "chest", text: "Sana closes a deal. Collect Rs 3,000.", action: { type: "money", amount: 3000 } },
  { id: "cc08", deck: "chest", text: "Property tax reassessment. Pay Rs 1,500.", action: { type: "money", amount: -1500 } },
  { id: "cc09", deck: "chest", text: "Rent collected from the Nizamani Complex shops. Collect Rs 2,500.", action: { type: "money", amount: 2500 } },
  { id: "cc10", deck: "chest", text: "Get Out of Jail Free — the family lawyer earns his retainer.", action: { type: "getOutOfJail" } },
  { id: "cc11", deck: "chest", text: "A truck breaks down hauling crates from Tando Soomro. Pay Rs 1,100.", action: { type: "money", amount: -1100 } },
  { id: "cc12", deck: "chest", text: "An old savings certificate matures. Collect Rs 2,000.", action: { type: "money", amount: 2000 } },
  { id: "cc13", deck: "chest", text: "Repaint and repair season. Pay Rs 400 per house and Rs 1,600 per hotel.", action: { type: "repairs", perHouse: 400, perHotel: 1600 } },
  { id: "cc14", deck: "chest", text: "Kiki wins a cat show nobody entered her in. Collect Rs 700.", action: { type: "money", amount: 700 } },
  { id: "cc15", deck: "chest", text: "You forgot the K-Electric bill again. Pay Rs 800.", action: { type: "money", amount: -800 } },
  { id: "cc16", deck: "chest", text: "Haziq calls a family meeting at the orchard. Advance to GO.", action: { type: "move", to: 0 } },
];

const BY_ID = new Map<string, Card>([...CHANCE, ...CHEST].map((c) => [c.id, c]));

export function cardById(id: string): Card {
  const c = BY_ID.get(id);
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}
