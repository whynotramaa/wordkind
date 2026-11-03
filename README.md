# Wordkind

A Bun word-wheel game for solo play and anonymous, shared-link races. The app has 1,440 puzzles, six difficulties, and best-of-three matches. No accounts, database, analytics, or external services are required.

## Run the game

Use Bun 1.3.14 or newer:

```sh
bun start
```

Open **http://localhost:3000**. To reload the server when you edit files:

```sh
bun run dev
```

Set `PORT` to use another port. The app has no runtime dependencies; `bun install` is needed only for the browser test tools.

## Play solo

A fresh visit opens a random Easy puzzle. Drag through letters to submit a word. You can also tap letters and press the arrow, or type and press Enter. Each wheel tile can appear once per word. Backtrack a drag to undo a letter; press the wheel’s central cross to clear the selection.

Open the menu to change difficulty, mode, sound, or puzzle. The wallet opens separately from the header icon.

Choose a mode:

- **Zen** has no deadline and free hints.
- **Sprint** gives you three minutes. Results show your progress when the clock expires. You can retry or pick another puzzle.
- **Daily** uses the same puzzle for everyone on the same UTC date. It changes at midnight UTC and has no saved streak or completion restriction.

There are 240 puzzles per difficulty:

| Difficulty | Wheel | Target words | Directions |
| --- | --- | --- | --- |
| Breezy | 4–5 letters | 3 | Across and down |
| Easy | 5–6 letters | 4 | Across and down |
| Medium | 6–7 letters | 5 | Across and down |
| Hard | 6–7 letters | 6 | Diagonals too |
| Expert | 7–8 letters | 8 | Reverse paths too |
| Genius | 7–8 letters | 10 | All eight directions |

Select the word counter to see target lengths. **Expand board** in the menu opens a larger view. The library lets you browse by difficulty or open a puzzle by number. Recently played puzzles and visit statistics last only while the page is open.

Valid words outside the puzzle enter the temporary word wallet. Search, sort, or copy the collection. There is no currency or spending mechanism. Reloading clears the wallet.

Sound is off by default. The sound button enables short synthesized feedback. The instructions include an optional animated demonstration. Reduced-motion settings disable animation and show the tutorial’s final state.

## Challenge a friend

1. Open the menu and select **With a friend**.
2. Enter a nickname and choose a difficulty and round clock: one, three, or five minutes.
3. Create the room and send its invite link.
4. Both players select **I’m ready**. A shared countdown starts the same puzzle for both players.
5. Finish first to earn a point. At the deadline, the player with more completed target words earns the point. Equal progress draws the round.
6. Select Ready between rounds. The match ends at two points or after three rounds. Final scores can draw.

The scorecard includes real nicknames, scores, round results, elapsed time, and friendly desi humour. Copy the text, save a PNG, or use native image sharing where your browser supports it. A rematch stays in the same room and requires both players to agree.

Two tabs in one browser share an identity. Use separate browser profiles or devices to test two players. Opening the same room in another tab moves that player’s connection to the new tab.

## Share beyond your computer

The server listens on all interfaces. A friend on your Wi-Fi can use your computer’s LAN IP and port. A localhost invite only works on the same device.

For remote play, run the app on a host that supports a long-running Bun process and WebSockets. Use one instance and preserve Host and Origin through the proxy. Use HTTPS on a public host. No public deployment or domain has been provisioned.

A container definition is included:

```sh
docker build -t wordkind .
docker run --rm -p 3000:3000 wordkind
```

The Docker image has not been built in this environment.

## Temporary room state

An HttpOnly, SameSite session cookie contains a random browser identifier. It has no account or personal details. Nicknames, submissions, and scores live in server memory. Rooms expire after two hours or a server restart.

A player who disconnects during a match has 20 seconds to reopen the room. After that, an online opponent wins by forfeit. If both players leave, the match has no winner. There is no saved history, localStorage, persistent leaderboard, or database. Multiple server instances do not share rooms.

## Run checks

The engine and server tests use Bun’s built-in test runner:

```sh
bun test
```

To run the browser and accessibility checks:

```sh
bun install
bunx playwright install chromium
bun run test:browser
```

Each browser suite starts its own server on an unused port. The checks cover keyboard and wheel input, difficulty, library, bonus words, solo completion, Sprint expiry, Daily selection, PNG export, instructions, narrow layouts, two-player matches, rematches, stale responses, and reconnect/forfeit messages. Automated accessibility checks cover the main game and dialogs. Artifacts are written to `.impeccable/review/`.

These checks do not replace real-device Safari, Firefox, or screen-reader testing.

## Implementation reference

| File | Purpose |
| --- | --- |
| `server.js` | Bun HTTP server, dictionary checks, room connections, and timers |
| `rooms.js` | Round transitions, scoring, and match resets |
| `rules.js` | Difficulty tiers, UTC daily selection, and settings validation |
| `game.js` | Deterministic puzzle layouts and guess rules |
| `banks.js` | Curated short and long word families |
| `public/` | Game interface and scorecard rendering |
| `test/` | Engine, server, browser, and accessibility checks |
| `plans.markdown` | Expansion contract and completion record |

The catalog reuses curated letter families across distinct target sets and layouts. Six layout profiles vary shape and starting direction. Hard and Expert targets have at least four letters; Genius targets have at least five. Each puzzle has a deterministic mixed wheel shared by both racers; tracing around the circle does not reveal the longest answer. It does not contain 1,440 independently authored vocabularies. Some dictionary words are uncommon; target families are curated, while bonus words use the larger dictionary.

The client receives puzzle answers. The server controls race submissions, countdowns, points, and match transitions, but this version does not prevent a player from inspecting answers. It is a casual game without prizes or anti-cheat guarantees.

## Asset licenses

The bonus dictionary comes from [word-list](https://github.com/sindresorhus/word-list). Its upstream terms are bundled in `WORDS-LICENSE`. Manrope and DM Sans are self-hosted under the SIL Open Font License; their license files are in `public/assets/`. The SVG icon is original vector artwork inspired by the supplied reference. Reference screenshots are not bundled as game assets.
