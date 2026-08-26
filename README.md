# Nizopoly

A property-trading board game for the Nizamani household. Karachi, Hyderabad and
Badin instead of Atlantic City. Everyone plays from their own phone — one person
creates a room, the rest join with a four-character code.

Original board, cards and artwork; the rules follow the classic tabletop
property-trading formula.

## The board

28 tiles, seven a side. Fifteen properties in five groups, plus two toll roads.

| Group | Tiles |
| --- | --- |
| Interior Sindh | Matli, Tando Soomro, Das Numbri |
| Hyderabad | Qasimabad, Nizamani Complex, Muslim Society |
| Karachi Central | IBA Apartments, Triggy, Shanghai Social |
| Uptown | Flamingo, Zamzama, Clifton Block 5 |
| Premium | Sea View, D.H.A Phase 8, Nizamani Orchards |

**Toll roads** — Autobahn and Neher-e-Khayyam. Rent is your dice roll × 100, or
× 250 if one player holds both.

**Card decks** — *Karachi Traffic* (movement, 16 cards) and *Family Business*
(money, 16 cards). Both piles sit in the middle of the board and show how many
cards are left; tap one to read the whole deck.

**Tokens** — Haziq, Sana, Chai, Kiki, a mango and a rickshaw.

Everything above lives in [`lib/game/board.ts`](lib/game/board.ts) and
[`lib/game/cards.ts`](lib/game/cards.ts). Renaming a tile or rewriting a card is
a one-line edit; prices and rents are plain numbers in the same file.

## House rules worth knowing

- Starting cash Rs 15,000, Rs 2,000 for passing GO.
- Taxes and fines go into the Free Parking pot, and whoever lands there takes it.
- Declining a purchase leaves the tile with the bank. There is no auction.
- A full group doubles the base rent before any houses go up.
- Building is even across a group, and the bank holds 24 houses and 8 hotels.

## Running it

```bash
npm install
npm run dev
```

No database needed: rooms live in the dev server's memory. State is lost when
the server restarts, and it only works as a single process — fine for one
evening, not for anything hosted.

### Playing tonight, over your own wifi

`next dev` listens on every interface, so everyone in the house can join without
Supabase at all. Find your machine's address and hand that out instead of
`localhost`:

```bash
ipconfig getifaddr en0
```

Everyone opens `http://<that-address>:3000` on their phone, on the same wifi.
Keep the terminal running — quitting it ends the game.

### Real multiplayer, properly

Needed for playing when you're not in the same house, and for deploying.

1. Create a project at [supabase.com](https://supabase.com) (the free tier is plenty).
2. Open the SQL editor, paste in [`supabase/schema.sql`](supabase/schema.sql), Run.
3. Settings → API, and copy three values into `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`
4. Confirm it all works:

```bash
npm run check:supabase
```

That creates a scratch room, proves the service role can write, proves the
public key **cannot** read player secrets, proves a stale write gets rejected,
waits for a live Realtime push, then deletes the room. It tells you which of
those failed and what to do about it.

Restart `npm run dev` and the app switches over on its own — state in Postgres,
changes pushed to every player over Realtime.

### Deploying

Push to GitHub, import into Vercel, set the same three variables in the project
settings, deploy. `SUPABASE_SERVICE_ROLE_KEY` must **not** be prefixed with
`NEXT_PUBLIC_` — that prefix ships a value to the browser, and this key bypasses
row level security.

Note that the in-memory fallback cannot work on Vercel: serverless functions
don't share memory, so players would land on different instances and see
different games. Supabase is required for a deployed game, not optional.

## How it holds together

The rules live in one pure module, [`lib/game/engine.ts`](lib/game/engine.ts):
`apply(state, playerId, action)` returns the next state or throws. It has no
knowledge of React, HTTP or the database.

Every move goes to the server, which reads the room, runs the engine, and writes
the result back conditionally on the state's `seq` counter — so two players
acting at the same instant can't corrupt a room; the loser retries against fresh
state. The browser never mutates game state directly, and each player holds a
secret that the server checks before accepting a move.

## Tests

```bash
npm run fuzz 300
```

Plays hundreds of random games, asserting after *every* action that nobody holds
negative cash, buildings stay even across a group, no group with buildings is
split between owners, the house and hotel supply is respected, and the turn
never lands on a bankrupt player. Illegal moves are expected — the engine
rejecting them is the point.

This is what caught the trade bug: an offer made before houses went up could be
accepted afterwards, tearing a developed group apart.
