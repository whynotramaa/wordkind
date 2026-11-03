# Wordkind expansion plan

This is the implementation contract for the expanded game. Preserve anonymous play and no saved history, ephemeral word wallets, random opening puzzles, and share-link best-of-three matches. "More labels" is interpreted as both more levels and clearer game labels.

## 1. Puzzle depth

- Expand the library from 120 to at least 1,200 deterministic puzzles.
- Offer six clearly explained difficulties: Breezy, Easy, Medium, Hard, Expert, Genius.
- Increase target count, letter-pool size and allowed directions as difficulty rises. Breezy starts with small boards; Expert and Genius add seven/eight-letter wheels and reverse/diagonal words.
- Expand the curated vocabulary with longer letter families; retain dictionary validation and consistent intersections.
- Display difficulty, puzzle number, target-word count, direction rules, and word-length checklist. Let players browse and launch a particular puzzle from the library, without implying unlocks or saved progression.
- Add next/new random actions and a session-only recently played list to avoid immediate repeats.

## 2. Solo modes

- Zen: untimed, free hints, calm default.
- Sprint: an optional 3-minute puzzle with a clear timer, expiry result and retry/new-puzzle actions.
- Daily: the same date-derived puzzle for everyone, with no account or saved streak. Show date and explicitly label this as a daily puzzle.
- Track this visit's completed puzzles, found words, bonus words, solve time, mistakes and hints. Results show actual measurements, never invented stats.
- Add keyboard shortcuts, clear selection, a word-length checklist, useful inline feedback, and explanations for too-short, impossible, duplicate and unknown words.

## 3. Word wallet

- Keep bonus words for this visit only. Add a word list, count, longest word, search, alphabetical/length sorting, and copy collection.
- Show recent additions in the wallet preview. No cash, coins, spending mechanics, persistence or account connection.

## 4. Friendly competition

- Keep server-controlled simultaneous starts, same puzzle, first-finisher point, first to two wins.
- Add room settings for difficulty and round time limit. Both players can see the rules before Ready.
- Add per-player word progress, visible online/ready states, round timer, and a large countdown overlay.
- Record each round's winner, elapsed time and points. On timeout, most completed target words wins; equal progress is a drawn round with no point. Three rounds maximum; final score can draw.
- Keep a reconnect grace period. Clearly explain expiration, full rooms, connection loss and an opponent leaving.
- Add a rematch in the same room, requiring both players to agree, and keep solo escape available.

## 5. Scorecards and sharing

- Build a more expressive, ticket-like scorecard using the supplied stamp/postcard and game-result references.
- Include real player nicknames, final score, round-by-round results, winner/draw state, and friendly desi humour that celebrates rather than insults.
- Support copying a text result and downloading a standalone PNG scorecard. Native sharing is offered where supported; clipboard/download fallback remains available.
- Solo cards include difficulty, words, elapsed time and hint usage.

## 6. Interface and motion

- Apply Stageshow's focus, hierarchy, framing and cause-driven motion to actual game states. A playable interface stays real; no fake activity or decorative dashboard data.
- Keep the confirmed cream/lilac/mint world and original bold app icon inspired by the supplied reference.
- Strengthen the board, simplify mobile navigation, add concise difficulty explanations and a compact play-mode switch. Give the wheel and board the visual lead.
- Add a short optional "show me" word-wheel demonstration in the instructions, clearly labeled as a demo and separate from real play.
- Animate a solved word, a wallet addition, the countdown and final result with reduced-motion alternatives. Avoid perpetual ambient movement.
- Add optional subtle synthesized sound, off by default, with a visible toggle. No downloaded audio or autoplay.
- Improve touch sizes, keyboard access, focus management, readable contrast, loading/error states, narrow-screen layouts and overflow handling.

## 7. Performance, safety and delivery

- The original Bun implementation used no runtime dependencies. The approved serverless migration now uses Next.js/React, cached vocabulary, and expiring Redis room state with HTTP updates.
- Bound request sizes, guesses, rooms and room lifetimes. Escape nicknames in UI and generated sharing output. Validate settings on the server.
- Keep anonymous session cookies and room state temporary. No localStorage, analytics, database, accounts or external API calls at runtime.
- Add meaningful Bun tests for all generated puzzle constraints, mode/date selection, settings validation, scoring/ties/timeouts, countdowns, shared puzzles, room capacity and match transitions.
- Run browser checks for wheel drag/taps, keyboard entry, all solo modes, library, wallet, invite/settings, real two-player matches, rematch, scorecard download and responsive layouts.
- Document startup, sharing locally/publicly, deployment requirements, temporary-state behavior, vocabulary sources and known competitive limits.

## Decisions kept deliberately small

No accounts, database, cloud backend, leaderboards, matchmaking, chat, payments, wallet economy, AI word generation, arbitrary puzzle editor, or persistent streaks. These would change the confirmed product and add services it does not need. The 1,200-puzzle catalog reuses curated letter families across distinct target sets/layouts; it does not claim 1,200 independently authored vocabularies. Friendly races are not a prize-bearing anti-cheat system.

## Completion record

Implementation and validation results will be recorded here after the expansion is complete.

### Implemented

All seven sections above are implemented. The catalog contains **1,440 distinct puzzles**, 240 per tier. The first version's 40 word families now include additional short and long families; a deterministic collision retry prevents repeated target/layout combinations. The catalog is precomputed and its HTTP gzip payload is about 160 KB.

Solo modes, UTC Daily selection, timers, word-length chips, library navigation, recent puzzles, visit measurements, wallet search/sort/copy, room settings, progress bars, timeout/draw rules, per-round history, same-room rematches, text/PNG/native sharing, the instructional demo, sound toggle and reduced-motion behavior are present. The serverless app uses Next.js and React. Playwright and axe are development-only dependencies used by the preserved browser suites.

### Verification

- `bun test`: all seven engine/server test groups pass, with over 40,000 assertions. They check every catalog puzzle, deterministic regeneration, vocabulary validity, intersecting cells, unique layouts, settings, UTC dates, draws, three-round limits, countdowns, first-finisher scoring and match resets.
- `bun run test:browser`: all three preserved browser suites pass. They exercise wheel taps and actual pointer dragging, keyboard focus, stale word responses, difficulty, library, wallet search/sort, solo solving, Sprint expiry, Daily mode, expanded boards, tutorial, PNG downloads, room settings, real two-player match completion, same-room rematch, offline waiting-room labels, the reconnect grace period, and correct forfeiting-player copy.
- Automated axe checks report no violations on the tested mobile game, instructions, library, invitation form and reduced-motion tutorial.
- Layout checks pass at 360, 390 and 768 CSS pixels, with desktop captures at 1440. Scorecard PNGs are checked as standalone files.
- An independent reviewer found keyboard-focus, accessible-state, contrast and reconnect-copy defects. These were fixed and checked in browser suites. The reviewer did not certify all subsequent edits.

### Delivery limits

Next.js serverless startup/hosting instructions are included. Public hosting is not provisioned. The supplied Redis credentials are configured locally and live room operations have been verified. Real-device Safari, Firefox and manual screen-reader checks were not performed. Rooms now expire in shared Redis after two hours and survive function restarts. Casual play exposes the catalog to the browser; there is no prize-grade anti-cheat claim. The test suite passing is evidence for the checked behaviors, not a claim that the app can never contain a bug.

## Mobile-first focus revision

The user rejected the initial page as cluttered. The current play screen removes the intro, side rails, promotional invite card, wallet preview, mode/difficulty grids, session-stat panel and footer. Game-only layout is now the visual authority. Settings, modes, difficulty, library, instructions, sound and visit statistics are in a native drawer. The wallet is a separate drawer. The word count opens the optional target checklist.

Shuffle, the wheel and Hint share a single grid and vertical centre line, with equal side spacing. Phone layouts are checked for a single-screen Easy game at 360×740 and 390×844. Bonus words visibly jump from the input into the wallet icon, followed by an icon bounce. Reduced motion uses a direct confirmation.

Puzzle generation now varies six layout profiles and the first word's allowed direction. Higher tiers prefer longer targets; Hard and Expert have a minimum of four letters and Genius has five. The initial wheel is mixed deterministically and cannot spell the longest target around the ring in either direction. Both racers still receive identical puzzles and wheel arrangements. Every generated board remains connected and has consistent crossings.

### Focused revision checks

Seven engine/server groups pass with more than 44,000 assertions, including all six layout profiles, the allowed starting directions, harder-tier word lengths and mixed-wheel multiplicity. The browser suite explicitly measures the wheel/tool centres and symmetric spacing. Easy fits 360×740 and 390×844 without page scrolling. Automated accessibility checks include both drawers as well as the main game. An independent review approved the focused layout at desktop and both phone sizes with no material findings in that reviewed scope.

The final regression pass also includes a 320×667 layout, matching Shuffle/Hint center lines and spacing, full Easy viewport fit, and seven automated accessibility surfaces. The browser test reads the actual puzzle ID from its level tooltip when checking races, rather than inferring an answer set from board geometry.

## Approved Next.js serverless migration

The user requested Next.js on serverless and approved temporary Upstash Redis room state. Next.js App Router renders the existing UI; Node.js route handlers replace Bun.serve. Shared Redis keys expire after two hours, with atomic compare-and-set updates and TTL preservation. Ordinary HTTP actions and polling replace WebSockets. Match/round IDs reject stale actions, private anonymous session identifiers are withheld from public snapshots, and timers are evaluated from stored timestamps on each request. No accounts or saved histories are introduced. Tests run the production Next.js build with a test-only Redis REST fixture. Provider credentials were subsequently supplied by the user and configured locally; public deployment remains outstanding.

Migration verification: `bun run build` passes with a prerendered root page and dynamic Node.js API route. `bun test` passes nine test groups and over 44,000 assertions. All three production-Next browser suites pass, including the same mobile UI, two-player HTTP matches, rematches, disconnects, PNG sharing and accessibility checks. Dictionary file tracing is present in the production API bundle. A subsequent live Next.js + Upstash check passed for concurrent finishing and TTL preservation, and its temporary room was deleted. Public serverless deployment remains unverified.

## Styled QR sharing

Friend invites now include a local, styled QR and a copyable room link. The invite can be downloaded as a designed PNG or shared through native image sharing. Once a friend joins, the lobby removes the invite block to keep Ready in focus. Scorecard screens and PNG exports also include a QR and visible game link. Codes use sage/purple modules, a lilac frame and small mint/coral accents outside the quiet zone. Same-origin destination validation rejects external/unsafe links. Decoder tests verify exact destinations at phone/export sizes and in the actual exported invite/scorecard PNGs. Physical phone-camera scanning remains unchecked.
