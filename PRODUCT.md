# Wordkind

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Bun, explicitly requested by the user for speed. Built-in HTTP server and WebSockets; plain HTML/CSS/JavaScript client. No runtime dependencies. Fonts and the original SVG icon are served locally.

## Users and purpose
People who enjoy casual word puzzles alone or in a live race with a friend. Open the game, receive a random puzzle, connect letters on a wheel, and fill a shaped word board. Valid additional words go into a temporary word wallet.

## Confirmed scope
The deterministic catalog contains 1,440 distinct puzzles, with 240 per difficulty. Six layout profiles and seeded starting directions vary board shapes. Medium, Hard and Expert targets have at least four letters; Genius targets have at least five. Expert and Genius favour longer remaining targets. A deterministic mixed wheel prevents the longest answer from appearing in circular reading order in either direction. The catalog reuses curated letter families across different target sets and layouts; it does not claim 1,440 independently authored vocabularies.

| Difficulty | Wheel letters | Target words | Board directions |
| --- | --- | --- | --- |
| Breezy | 4–5 | 3 | Across and down |
| Easy | 5–6 | 4 | Across and down |
| Medium | 6–7 | 5 | Across and down |
| Hard | 6–7 | 6 | Across, down and diagonals |
| Expert | 7–8 | 8 | Adds reverse horizontal and vertical paths |
| Genius | 7–8 | 10 | All eight directions |

Solo starts with a random Easy puzzle in Zen mode. Zen is untimed. Sprint has a three-minute limit and an expiry result with retry. Daily selects the same puzzle for everyone using the UTC date. Players can browse a paginated library by difficulty, jump to a puzzle number, and revisit puzzles played during this visit. There are no unlocks or saved streaks.

The game supports dragging, tapping and typed words, selection backtracking, clearing, shuffling, free solo hints, an expanded board and a word-length checklist opened from the progress count. Inline feedback explains invalid and repeated guesses. Visit statistics and solo scorecards use actual words, elapsed time, mistakes and hints. The word wallet has search, alphabetical or longest-first sorting, a longest-word summary and copy collection. Refreshing clears the wallet and visit statistics.

Anonymous share-link rooms support two players. The host chooses difficulty and a one-, three- or five-minute round limit. Both players see the rules and tap Ready before the shared countdown. Each round uses the same puzzle and start time for both players. The first player to finish earns a point. On timeout, the player with more completed target words earns a point; equal progress earns neither player a point. A match ends at two points or after three rounds, so a final draw is possible. Hints are unavailable in races. Rooms show readiness, connection state, word progress, timers and round results. Both players must agree to a rematch in the same room.

Solo and match scorecards support copying a text result, downloading a PNG and native sharing where the browser supports it. Results use friendly desi humour. Instructions include an optional animated word-wheel demonstration, separate from the real puzzle. Synthesized sound is optional and off by default. Reduced-motion styles show the tutorial's completed state and remove animation. Keyboard controls, visible focus indicators, status announcements and native dialogs support accessible play; this is not a claim of a formal accessibility audit.

## Play screen and navigation
The mobile-first play screen contains a compact brand header with wallet and menu controls, difficulty and puzzle number, progress, the board, word input and letter wheel. Shuffle and Hint occupy matching columns on either side of the centred wheel. There is no marketing introduction, side rail or persistent statistics panel.

The menu opens a native dialog drawer on desktop and a bottom sheet on phones. It contains Solo/With a friend, difficulty, Zen/Sprint/Daily, the puzzle library, wallet, expanded board, instructions, sound and visit statistics. Difficulty also opens from the play toolbar. The wallet opens in a separate drawer, full-screen on phones. A new bonus word flies from the input to the header wallet icon, followed by a small icon bounce. Reduced motion uses a text status instead.

## Brand commitments
Wordkind is the working name. The user approved warm cream, a lilac letter wheel and mint solved tiles. Keep chunky game tiles, readable board states and paper-like scorecards. The user rejected a cluttered page and requested a game-only screen, with supporting controls behind the menu. The icon reference uses condensed black lettering, yellow, lilac and coral. The shipped original SVG follows that direction without copying the supplied SOLD icon. Keep the interface playful, subtle, pastel, minimal and easy on the eyes. Keep desi humour brief and friendly.

## Operating constraints
No accounts, database, saved history or progression. The wallet, recent-puzzle list, sound preference and visit statistics live in page memory. Anonymous session cookies identify reconnecting players without accounts. Player names are nicknames. Rooms live in one server process for at most two hours; an active match allows a 20-second reconnect grace period. Restarting the server clears rooms. No external services, credentials, analytics or tracking are implemented.

Hosting must support a long-running Bun server and WebSockets. Localhost links work only on the same device; a reachable origin is needed for remote friends. Friendly races are not a prize-bearing anti-cheat system.

## Open decisions
Production hosting and a domain are not provided. The wallet has no cash value, coins or spending mechanics. No wallet economy is part of the implemented scope.
