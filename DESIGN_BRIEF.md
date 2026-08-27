# Nizopoly — UI Design Brief

**For:** a designer producing a new visual design for an existing, working web game.
**Status:** the game is fully built and live. Nothing here is speculative — every
screen, state and number below is what the product actually does today.
**Live:** https://nizopoly.vercel.app

---

## 1. What this is

A personalised online version of a Monopoly-style property-trading board game,
built for one family and their friends in Karachi, Pakistan. Instead of Atlantic
City, the board is made of real places from their lives: their neighbourhoods,
the restaurants they argue about, their family mango farm, their two cats.

It is **real multiplayer**. One person creates a room and reads out a
four-character code; everyone else joins from their own phone. Two to six
players. A game lasts roughly 40–90 minutes.

This is not a commercial product. It will be played by a specific group of
people who know every place name on the board personally. The design should feel
warm, personal and a bit funny — a family in-joke rendered well — rather than
corporate or generic.

---

## 2. What we need from you

**The current UI is functional but unattractive.** It was built by an engineer
for correctness, not for looks. We want a designer to take the same information
and make it genuinely good-looking.

### The two specific complaints driving this brief

1. **"I don't like the UI."** It reads as a developer's default: flat cards,
   generic spacing, no personality, no hierarchy beyond font weight.
2. **"Each player should be able to easily see how much cash they have."**
   Money is the whole point of the game and it was previously buried in a small
   list below the board. A prominent cash bar was added as a stopgap; the real
   fix is a considered design.

### Deliverables we're hoping for

- Mobile screens first (that is where this is actually played), then desktop.
- A colour system for light **and** dark mode (both are supported today).
- Type scale, spacing scale, corner radii, elevation/shadow treatment.
- Board tile design at small sizes — this is the hardest problem, see §7.
- Component designs for every state listed in §6.
- Any illustration or texture direction you think fits.

**Please read §7 (Hard problems) before designing.** Several constraints are
non-negotiable and have already sunk one approach.

---

## 3. Hard technical constraints

These are fixed. A design that violates them cannot be built.

| Constraint | Detail |
|---|---|
| Stack | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Styling | CSS custom properties + Tailwind utilities. No CSS-in-JS. |
| Assets | **No external assets.** No web fonts from a CDN, no remote images, no icon libraries loaded over the network. Anything you use must be inlined, bundled locally, or be a system font / emoji. |
| Icons today | Plain emoji. If you want a custom icon set it must ship as inline SVG. |
| Fonts today | System UI stack only. A custom font must be self-hosted and licensed. |
| Sound | Synthesised in-browser with the Web Audio API — no audio files. |
| Motion | Must respect `prefers-reduced-motion` (already implemented). |
| Themes | Light and dark both required, driven by `prefers-color-scheme`. |
| Server-authoritative | The UI can never assume an action succeeded. Every action can be rejected by the server and must show an error. |

### Viewports

- **Primary: mobile portrait, 375×812 and up.** This is how it is played.
- Secondary: desktop 1280×800+, which currently uses a two-column layout
  (board left, side panel right).
- Tablet is not specifically designed for and currently falls back to mobile
  layout up to 1024px.

---

## 4. Current design tokens

Provided so you know what you are replacing. Feel free to discard all of it.

### Light mode
```
--bg:        #f4ece0   page background (warm cream)
--surface:   #fffaf3   cards
--surface-2: #f0e4d4   inset panels, board centre
--ink:       #23180f   primary text
--ink-soft:  #6b5946   secondary text
--line:      #d9c8b2   borders
--accent:    #1f7a4d   green — primary actions, "your turn"
--gold:      #c8961e   highlights, Community Chest deck
--danger:    #b23a2f   errors, rent owed, Chance deck
```

### Dark mode
```
--bg:        #171310
--surface:   #221c17
--surface-2: #2c241d
--ink:       #f3e9dc
--ink-soft:  #a89684
--line:      #3b3128
--accent:    #34a06a
--gold:      #e0b44a
--danger:    #d9594c
```

### Player colours
Assigned by seat order, used for token outlines and property ownership bars:
```
#1f7a4d  #c8961e  #b23a2f  #3b6fb6  #7a4d9c  #0f8a8a
```
**Note:** these were picked without checking contrast against each other or
against the group colours. Player 1's green is the same as the accent colour and
nearly the same as the Clifton group colour. Fixing this is in scope.

### Other current values
- Card radius `0.9rem`, button radius `0.6rem`, board radius `0.75rem`
- Minimum tap target `2.5rem` (40px) on buttons, `2.75rem` on inputs
- Body background has two soft radial gradients (gold top-left, green
  bottom-right), fixed attachment

---

## 5. Screen inventory

There are only three screens plus overlays. Full detail in §6.

1. **Home** — enter your name, create a game or join with a code.
2. **Lobby** — room code, who has joined, pick your token, edit your name, host
   starts the game.
3. **Game board** — the main screen. Board, your cash, controls, players,
   trades, log.

Overlays: tile detail, deck viewer, error toast, winner banner + confetti.

---

## 6. Screen-by-screen, every element and state

### 6.1 Home

**Elements**
- Wordmark "NIZOPOLY"
- Tagline: "Karachi, Hyderabad and the orchard — buy it all."
- A row of the six player tokens as emoji
- Text input: your name (max 20 chars, placeholder "Haziq")
- Primary button: "Start a new game"
- Divider: "or join"
- Text input: room code (4 chars, uppercase, centred, wide letter-spacing)
- Secondary button: "Join"
- Footer: "Everyone plays on their own phone. Two to six players."

**States**
- Name empty → error text "Enter your name first."
- Code shorter than 4 → "Room codes are four characters."
- Room not found → "No room with that code."
- Game already started → "That game has already started."
- Busy (request in flight) → buttons disabled
- Name is remembered from the last session and pre-filled

### 6.2 Lobby

**Elements**
- Room code displayed very large (currently 5xl, letter-spaced, accent colour)
- Helper: "Send this to everyone playing. They open the site and enter the code."
- "Share link" button — uses the native share sheet, falls back to clipboard;
  becomes "Link copied ✓" for 1.8s
- Player list: token emoji + name + `host` / `you` badges
- "Your name" text input + Save button (rename yourself, live for everyone)
- Token picker: six tokens; taken ones are disabled and show "Taken by X"
- Host only: "Start game" primary button
- Non-host: "Waiting for [host name] to start."

**States**
- Fewer than 2 players → Start disabled + "Waiting for at least one more player."
- Room full at 6 players
- Somebody joins/leaves → list updates live
- Duplicate name → "Someone is already using that name."
- A player opening the link with no session sees a join form instead
- Game already started + no session → "You are watching as a spectator."

### 6.3 Game board

Current mobile layout, top to bottom:

1. Header: "NIZOPOLY" + "ROOM XXXX"
2. **Money bar** (sticky) — your token, "YOUR CASH", your cash in large bold,
   net worth beneath, a "Your turn" / "[name]'s turn" pill, mute toggle
3. The board (see §7)
4. Controls card — changes with turn phase
5. Players list
6. Trades panel
7. Game log

Desktop puts 4–7 in a right-hand column beside the board.

#### Controls card — every state

| State | Shows |
|---|---|
| Your turn, must roll | "🎲 Roll dice" |
| Rolled doubles, go again | "🎲 Roll again (doubles)" |
| In jail | "In jail — attempt N of 3", "Roll for doubles", "Pay Rs 500", "🎟️ Use card" |
| Landed on unowned tile | "[Tile] is unowned — Rs X", Buy / Pass, note: "Passing leaves it with the bank — there is no auction." |
| After resolving | "End turn" |
| Not your turn | "Waiting on [name]. You can still build, mortgage and offer trades." |
| You owe more than you have | Red card: "You owe Rs X", explanation, "Declare bankruptcy" (confirm dialog) |
| Bankrupt / game over | Controls hidden |

#### Players list
Each row: token emoji (outlined in player colour, scales up on their turn),
name, `you` badge, 🔒 if jailed, 🎟️ if holding a get-out-of-jail card, cash,
net worth, `away` if disconnected. Bankrupt players are dimmed to 45%.
A floating "+Rs X" / "−Rs X" animates on any cash change.

#### Trades panel
- Incoming offers: "[name] offers: You get X, You give Y" + Accept / Decline
- Outgoing: "Waiting on [name]…" + Withdraw
- "New offer" opens: opponent dropdown, your properties as toggle chips, a cash
  field, their properties as chips, their cash field, "Send offer"
- Empty: "No offers on the table."

#### Game log
Reverse-chronological running commentary, newest highlighted, auto-scrolls,
capped at 120 entries. Example lines:
- "Haziq rolled 3 and 4."
- "Haziq bought Autobahn for Rs 2,000."
- "Sana pays Rs 500 rent on Autobahn."
- "Kiki passed GO and collected Rs 2,000."
- "Haziq rolled three doubles in a row."
- "Sana is bankrupt. Everything goes to Haziq."

#### Tile detail (opens on tapping any tile)
- Name, group name, group colour bar
- Flavour text in italics (every property has one — see data appendix)
- Owner, or "Unowned · Rs X", plus "mortgaged" in red
- **Properties:** full rent table, current level highlighted, house cost
- **Stations:** rent table for 1/2/3/4 stations owned, current level highlighted
- **Utilities:** "Rent is your roll × 40, or × 100 if one player holds both"
- If you own it: Build / Sell / Mortgage / Unmortgage buttons
- If you can't build: "You need all of [group] before you can build."

#### Deck viewer (tapping a draw pile)
Modal listing all 16 cards in that deck, scrollable, with deck name and colour.

#### Winner
Gold-bordered banner "🏆 [name] wins", final net worth, "New game" button,
plus falling confetti in the six player colours for six seconds.

#### Error toast
Fixed to the bottom, red-bordered, auto-dismisses after 4s, plays an error
sound. Every server rejection surfaces here: "It is not your turn.", "You cannot
afford it.", "Build evenly across the group.", "That offer is stale." etc.

---

## 7. Hard problems — please read

### 7.1 The board at phone size (the big one)

A standard board is 40 tiles: 11 columns × 11 rows, with the tiles forming the
ring and the middle open. On a 375px-wide phone, fitting the whole board means
**each tile is about 32px wide.** At that size no font is legible — "Qasimabad"
cannot be read in 32px.

**What we tried:**
- Shrinking the text → illegible (5–8px).
- Abbreviating names → "Muslim Soc", "Niz Complex". Helped, still cramped, and
  loses the personality that is the entire point of the board.
- **Current stopgap:** on screens under 700px the board renders at a minimum of
  544px and scrolls horizontally. Text is now readable but **you can no longer
  see the whole board at once**, which is bad for a board game.

**This is the single most valuable thing for you to solve.** Options worth
exploring, not exhaustive:
- A fitted overview board with no text (colour + tokens only) and names on tap
- Pinch-to-zoom with a fitted default
- A rotated/landscape board
- A non-square layout that abandons the physical board metaphor entirely
- A vertical "track" list for mobile with a mini-map

We are open to abandoning the literal square board on mobile if something reads
better. The square is a convention, not a requirement.

### 7.2 Distinguishing eight colour groups plus six player colours

There are 14 distinct colours on screen at once, and they must not be confusable
with each other. Currently the Clifton group green, the accent green and player
1's green are near-identical. Needs a systematic solution in both themes.

### 7.3 Showing ownership on a tile

Today a tile shows its group colour as a bar along one edge and the owner's
colour as a thin bar along the opposite edge. At 32px these are easy to miss and
easy to confuse with each other.

### 7.4 Tokens sharing a tile

Up to six tokens can occupy one tile. They currently fan out in a 2-wide grid
and shrink. At small tile sizes this is a mess.

### 7.5 Houses and hotels
A property can show 1–4 houses or a hotel. Currently literal 🏠 emoji repeated,
which is cramped and ugly. Needs a real treatment.

### 7.6 Landing feedback
When you land on a tile a lot happens at once: token arrives, rent is charged,
cash changes, a card may be drawn, the log updates. Currently these compete for
attention. A designed sequence would help enormously.

---

## 8. Motion currently implemented

Keep, replace or extend — but this is what exists, and players like it.

| Element | Behaviour |
|---|---|
| Token movement | Walks tile-by-tile, ~280ms per tile, with a hop; long moves speed up to ~170ms. Jail is an instant jump. "Go back 3" walks backwards. |
| Dice | Tumble through random faces for ~520ms, then settle with a bounce. Doubles get a gold border + "doubles!" label. |
| Cards | Flip in from the top with a rotateX. The drawn deck's top card lifts and tilts. |
| Cash change | "+Rs X" floats up and fades over 1.4s |
| Landing tile | Pulsing ring |
| Current player | Slow pulsing glow on their row |
| Winner | Confetti, 70 pieces, 6s |
| Buildings | Pop in |

There are also 15 synthesised sound effects (dice, steps, buy, rent, pass GO,
card draw, jail, build, trade, win, lose, error). A mute toggle persists.

---

## 9. Accessibility requirements

- All interactive elements are real `<button>`s with `aria-label` / `aria-pressed`
- Game log is an `aria-live="polite"` region
- `prefers-reduced-motion` disables all animation
- Minimum 40px tap targets
- **Colour must never be the only signal** — this matters most for property
  ownership and for whose turn it is
- Text contrast should meet WCAG AA in both themes (the current design has not
  been audited and probably fails in places)

---

## 10. Tone

Words to aim for: **warm, personal, a bit playful, unmistakably Karachi.**

Words to avoid: corporate, crypto, neon, "gamer", casino.

It should look like something made for a specific family, not a product. The
place names are the joke and the heart of it — Nizamani Orchards being the most
expensive tile on the board is a family in-joke, and the two cats are playing
pieces. Design should lean into that rather than sand it off.

Existing personality worth preserving: every property has a one-line flavour
text ("Table for four, bill for fourteen." for Shanghai Social), and the card
decks are named "Karachi Traffic" and "Family Business" rather than Chance and
Community Chest.

---

## 11. Data appendix

Everything below is generated directly from the running game, so it is exact.

### Full tile list (index order, 0-39)

| # | Name | Short label | Type | Group | Price | House cost | Rent: base / 1h / 2h / 3h / 4h / hotel |
|---|------|-------------|------|-------|-------|-----------|--------------------------------------|
| 0 | GO |  | go |  |  |  |  |
| 1 | Matli |  | property | Interior Sindh | 600 | 500 | 20 / 100 / 300 / 900 / 1600 / 2500 |
| 2 | Family Business | Family | chest |  |  |  |  |
| 3 | Tando Soomro | T. Soomro | property | Interior Sindh | 600 | 500 | 40 / 200 / 600 / 1800 / 3200 / 4500 |
| 4 | Income Tax |  | tax |  |  |  | pay 2000 |
| 5 | Sea View |  | station |  | 2000 |  |  |
| 6 | Jam Shoro |  | property | Hyderabad | 1000 | 500 | 60 / 300 / 900 / 2700 / 4000 / 5500 |
| 7 | Karachi Traffic | Traffic | chance |  |  |  |  |
| 8 | Das Numbri |  | property | Hyderabad | 1000 | 500 | 60 / 300 / 900 / 2700 / 4000 / 5500 |
| 9 | Qasimabad |  | property | Hyderabad | 1200 | 500 | 80 / 400 / 1000 / 3000 / 4500 / 6000 |
| 10 | Jail / Just Visiting |  | jail |  |  |  |  |
| 11 | Nizamani Complex | Niz Complex | property | Old Karachi | 1400 | 1000 | 100 / 500 / 1500 / 4500 / 6250 / 7500 |
| 12 | K-Electric | K-Elec | utility |  | 1500 |  |  |
| 13 | Muslim Society | Muslim Soc | property | Old Karachi | 1400 | 1000 | 100 / 500 / 1500 / 4500 / 6250 / 7500 |
| 14 | Shareef Biryani | Shareef | property | Old Karachi | 1600 | 1000 | 120 / 600 / 1800 / 5000 / 7000 / 9000 |
| 15 | Autobahn |  | station |  | 2000 |  |  |
| 16 | IBA Apartments | IBA Apts | property | Campus & Cafes | 1800 | 1000 | 140 / 700 / 2000 / 5500 / 7500 / 9500 |
| 17 | Family Business | Family | chest |  |  |  |  |
| 18 | Triggy |  | property | Campus & Cafes | 1800 | 1000 | 140 / 700 / 2000 / 5500 / 7500 / 9500 |
| 19 | Gogo's |  | property | Campus & Cafes | 2000 | 1000 | 160 / 800 / 2200 / 6000 / 8000 / 10000 |
| 20 | Free Parking |  | free |  |  |  |  |
| 21 | Greeno |  | property | Nightlife | 2200 | 1500 | 180 / 900 / 2500 / 7000 / 8750 / 10500 |
| 22 | Karachi Traffic | Traffic | chance |  |  |  |  |
| 23 | Mirchilli |  | property | Nightlife | 2200 | 1500 | 180 / 900 / 2500 / 7000 / 8750 / 10500 |
| 24 | Shanghai Social | Shanghai | property | Nightlife | 2400 | 1500 | 200 / 1000 / 3000 / 7500 / 9250 / 11000 |
| 25 | Daewoo Station | Daewoo | station |  | 2000 |  |  |
| 26 | Flamingo |  | property | Uptown | 2600 | 1500 | 220 / 1100 / 3300 / 8000 / 9750 / 11500 |
| 27 | Dolmen Mall | Dolmen | property | Uptown | 2600 | 1500 | 220 / 1100 / 3300 / 8000 / 9750 / 11500 |
| 28 | WAPDA |  | utility |  | 1500 |  |  |
| 29 | Bon Vista |  | property | Uptown | 2800 | 1500 | 240 / 1200 / 3600 / 8500 / 10250 / 12000 |
| 30 | Go To Jail |  | gotojail |  |  |  |  |
| 31 | Zamzama |  | property | Clifton | 3000 | 2000 | 260 / 1300 / 3900 / 9000 / 11000 / 12750 |
| 32 | Clifton Block 5 | Clifton 5 | property | Clifton | 3000 | 2000 | 260 / 1300 / 3900 / 9000 / 11000 / 12750 |
| 33 | Family Business | Family | chest |  |  |  |  |
| 34 | Boat Basin |  | property | Clifton | 3200 | 2000 | 280 / 1500 / 4500 / 10000 / 12000 / 14000 |
| 35 | Shahrah-e-Bhutto | Shahrah-e-B. | station |  | 2000 |  |  |
| 36 | Karachi Traffic | Traffic | chance |  |  |  |  |
| 37 | D.H.A Phase 8 | DHA 8 | property | Premium | 3500 | 2000 | 350 / 1750 / 5000 / 11000 / 13000 / 15000 |
| 38 | Luxury Tax |  | tax |  |  |  | pay 1000 |
| 39 | Nizamani Orchards | Orchards | property | Premium | 4000 | 2000 | 500 / 2000 / 6000 / 14000 / 17000 / 20000 |

### Colour groups

| Group | Hex | Tiles (index) | Names |
|-------|-----|---------------|-------|
| Interior Sindh (`interior`) | `#8d6e4a` | 1, 3 | Matli, Tando Soomro |
| Hyderabad (`hyderabad`) | `#8ecae6` | 6, 8, 9 | Jam Shoro, Das Numbri, Qasimabad |
| Old Karachi (`oldCity`) | `#d16ba5` | 11, 13, 14 | Nizamani Complex, Muslim Society, Shareef Biryani |
| Campus & Cafes (`campus`) | `#e08a3c` | 16, 18, 19 | IBA Apartments, Triggy, Gogo's |
| Nightlife (`nightlife`) | `#d64545` | 21, 23, 24 | Greeno, Mirchilli, Shanghai Social |
| Uptown (`uptown`) | `#e3c02b` | 26, 27, 29 | Flamingo, Dolmen Mall, Bon Vista |
| Clifton (`clifton`) | `#1f7a4d` | 31, 32, 34 | Zamzama, Clifton Block 5, Boat Basin |
| Premium (`premium`) | `#2b4d9c` | 37, 39 | D.H.A Phase 8, Nizamani Orchards |

### Tokens

- 🧢  **Haziq** (id `haziq`)
- 🌸  **Sana** (id `sana`)
- 🐈  **Chai** (id `chai`)
- 🐈‍⬛  **Kiki** (id `kiki`)
- 🥭  **Mango** (id `mango`)
- 🛺  **Rickshaw** (id `rickshaw`)

### Karachi Traffic deck (Chance equivalent, 16 cards)

1. Roads blocked for a VIP movement. Go back 3 tiles.
2. A clear run at 6am. Advance to Autobahn Station.
3. Straight down Shahrah-e-Bhutto. Advance to that station.
4. The traffic warden takes a liking to you. Advance to GO.
5. Rain floods the underpass and tempers flare. Go directly to Jail.
6. Chai escapes the carrier at the vet. Pay Rs 800.
7. Kiki knocks your chai onto the gear stick. Pay Rs 300.
8. Mango season. Advance to Nizamani Orchards.
9. Sana finds parking in Zamzama on the first try. Advance to Zamzama.
10. Caught speeding on the Autobahn. Pay Rs 1,500.
11. Yours is the only car that starts. Collect Rs 500 from every player.
12. Sunset drive. Advance to Sea View.
13. Get Out of Jail Free — a cousin knows someone.
14. Generators and pumps need servicing. Pay Rs 250 per house and Rs 1,000 per hotel.
15. Petrol price drops overnight. Collect Rs 1,000.
16. Wrong turn onto a one-way. Go back 3 tiles.

### Family Business deck (Community Chest equivalent, 16 cards)

1. The mango crop comes in strong. Collect Rs 4,000.
2. The orchard tube well needs a new motor. Pay Rs 2,000.
3. Land revenue refund from Matli. Collect Rs 1,200.
4. Wedding season, and you are on four guest lists. Pay Rs 500 to each player.
5. Everyone still owes you for the Shanghai Social bill. Collect Rs 600 from each player.
6. Chai and Kiki both need their shots. Pay Rs 900.
7. Sana closes a deal. Collect Rs 3,000.
8. Property tax reassessment. Pay Rs 1,500.
9. Rent collected from the Nizamani Complex shops. Collect Rs 2,500.
10. Get Out of Jail Free — the family lawyer earns his retainer.
11. A truck breaks down hauling crates from Tando Soomro. Pay Rs 1,100.
12. An old savings certificate matures. Collect Rs 2,000.
13. Repaint and repair season. Pay Rs 400 per house and Rs 1,600 per hotel.
14. Kiki wins a cat show nobody entered her in. Collect Rs 700.
15. You forgot the K-Electric bill again. Pay Rs 800.
16. Haziq calls a family meeting at the orchard. Advance to GO.

### Economy constants

- Starting cash: Rs 15,000
- Passing GO: Rs 2,000
- Jail fine: Rs 500
- Station rent by count owned: Rs 250 / Rs 500 / Rs 1,000 / Rs 2,000
- Utility rent: dice x 40 (one owned), dice x 100 (both)
- Bank stock: 32 houses, 12 hotels
- Mortgage: half price. Unmortgage: half price + 10%.
- Selling a house refunds half the house cost.


---

## 12. Rules that affect the UI

- Roll two dice, move, act on the tile you land on.
- Doubles give another roll. Three doubles in a row sends you to jail.
- Landing on an unowned tile: buy at the listed price, or pass — **there is no
  auction**, it stays with the bank.
- Owning every tile in a colour group doubles the base rent, and unlocks
  building.
- Building must be even across a group (no third house until every tile has two).
- 5 houses = a hotel. The bank has a limited stock, so building can be blocked
  by other players.
- Mortgaged tiles collect no rent and cannot be built on.
- Taxes and fines go into a **Free Parking pot**, which whoever lands there
  collects. (House rule, deliberately kept.)
- If you owe more than you hold, you must mortgage, sell or trade your way out —
  the turn is blocked until you do, or you declare bankruptcy.
- Bankruptcy gives everything to your creditor (or the bank). Last player
  standing wins.
- Trades: any properties + cash both ways, at any time, subject to acceptance.
  Groups with buildings on them cannot be traded.

---

## 13. Practical notes

- The room code alphabet excludes I, O, 0 and 1 — codes get read aloud.
- Names are capped at 20 characters.
- Players can rename themselves in the lobby.
- A disconnected player shows as `away` but the game does not pause.
- There is no turn timer.
- There is no spectator UI beyond a message.
- There is no game history or stats beyond the in-game log.
- Nothing is stored about a player between games except their last used name.
