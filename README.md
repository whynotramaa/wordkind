# Wordkind

A mobile-first Next.js word game with 1,440 puzzles and anonymous best-of-three friend matches. Solo play is stateless. Active multiplayer rooms use Upstash Redis and expire after two hours. There are no accounts or saved player histories.

## Run locally

Use Node.js 20.9 or newer and Bun as the package manager:

```sh
bun install
bun run dev
```

Open http://localhost:3000. Solo play works without configuration.

For friend matches, copy `.env.example` to `.env.local` and set your Upstash REST credentials:

```dotenv
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-server-only-token
```

Keep both variables server-side. Do not prefix them with `NEXT_PUBLIC_` or put credentials in browser code. The supplied Redis service is configured locally in the ignored `.env.local` file. A fresh checkout needs its own environment configuration.

## Deploy serverless

Import the project into a Next.js-compatible serverless host, such as Vercel. Use the Next.js framework preset, `bun install --frozen-lockfile` for installation and `bun run build` for the build. Add the two Upstash environment variables to the deployment environment and deploy. Use a Redis region close to your function region to reduce match-update latency.

The root page is prerendered. API requests use App Router route handlers with the Node.js runtime. Room updates use ordinary HTTP requests, so deployments do not need a persistent server, WebSocket process, background interval, cron job, or sticky session. Multiple function instances share the same Redis room state.

The build traces `words.txt` into the API deployment. `next.config.js` explicitly includes it. Upstash HTTP access uses native `fetch`; there is no Redis connection pool or client SDK to configure.

For a local production build:

```sh
bun run build
bun start
```

A public deployment has not been created. Localhost invite links work only on your own device; use the public deployment URL for remote friends.

## Play

The play screen contains the board, word entry and letter wheel. Drag across letters to submit, or tap letters and press the arrow. Typing and Enter work too. Each wheel tile can appear once per word. Backtrack a drag to undo a letter.

The menu contains difficulty, modes, puzzle library, instructions and optional sound. The word counter opens the target lengths. The wallet icon opens your temporary bonus-word collection. Accepted bonus words animate into that icon. Reduced-motion settings replace the flight with a confirmation.

There are 240 puzzles per difficulty:

| Difficulty | Wheel letters | Target words | Directions |
| --- | --- | --- | --- |
| Breezy | 4–5 | 3 | Across and down |
| Easy | 5–6 | 4 | Across and down |
| Medium | 6–7 | 5 | Across and down |
| Hard | 6–7 | 6 | Diagonals too |
| Expert | 7–8 | 8 | Reverse paths too |
| Genius | 7–8 | 10 | All eight directions |

Hard and Expert targets have at least four letters; Genius targets have at least five. Six layout profiles vary shape and starting direction. The wheel is mixed so tracing around its circle does not reveal the longest target. Racers receive identical boards and wheel arrangements.

Zen has no deadline. Sprint gives you three minutes. Daily uses the same UTC-date puzzle for everyone, changing at midnight UTC. There is no saved streak or daily completion restriction.

Wallet contents, visit statistics, recently played puzzles and sound preferences remain in page memory and clear on refresh. There is no wallet currency or spending mechanism.

## Race a friend

Open the menu and select **With a friend**. Enter a nickname, choose difficulty and a one-, three- or five-minute round clock, and share the invite link. Both players select Ready for the simultaneous countdown.

First to fill the puzzle earns a point. At the deadline, most completed target words earns the point; equal progress draws the round. The match ends at two points or after three rounds. Both players must agree to a rematch.

The server decides scores. Redis compare-and-set operations atomically apply updates, including simultaneous finishing submissions. Stale moves carry their round and match identifiers and cannot affect a later round or rematch. Browser clocks are adjusted using server timestamps.

Your actions receive an immediate response. During play the opponent’s state is polled about every 750 ms; waiting and finished rooms poll about every 1.5 seconds. Redis requests count toward your provider’s usage. Match updates are not pushed over WebSockets.

The invite includes a pastel QR code and copyable room link. Share it as a designed PNG or through native image sharing. The QR disappears once your friend joins so the lobby can focus on Ready. Scorecards also include a colored QR and game link. Copy the result text, download a PNG, or use native image sharing where supported.

## Temporary state and reconnects

An HttpOnly, SameSite session cookie contains an anonymous browser identifier. Public player IDs are separate from that private identifier. Two tabs in the same browser share the same player identity; use separate browser profiles or devices for two players.

Only active room data is stored under `wordkind:room:*` Redis keys. Each key expires two hours after creation. Polls and moves preserve the original TTL. No user profile, persistent history, leaderboard, analytics, localStorage or account database is implemented.

Room state survives function restarts and cold starts until the Redis TTL expires. If a player leaves, there is a 20-second reconnect grace period. A lost connection is detected after a five-second heartbeat lease, followed by that grace period. Reopening the link restores the same anonymous player. If both players leave, the match has no winner.

Round deadlines and forfeits are evaluated when the next request reads the room. They use stored timestamps, so a sleeping or terminated serverless instance cannot delay or duplicate scoring. Redis outages temporarily stop friend matches; the app does not fall back to inconsistent process memory. Solo play remains available.

## Run checks

```sh
bun test
bun run build
bunx playwright install chromium
bun run test:browser
```

Unit tests validate every puzzle, atomic concurrent updates from independent store clients, private identities, room capacity, countdown enforcement, stale moves, TTL preservation, expiry, timeout scoring and reconnect forfeits.

Browser suites launch a production Next.js server on an unused port and use a test-only Redis REST fixture. They cover the real UI, 320/360/390/768px layouts, wheel input, solo modes, wallet, scorecard downloads, two-player races, rematches and reconnects. Automated accessibility checks include the game and drawers. Artifacts go to `.impeccable/review/`.

The fixture models the Redis commands used by the app. A live Next.js + Upstash check also passed for two players, countdown enforcement, simultaneous finishing, one awarded point and preserved expiry. Its temporary test room was deleted afterward. To repeat this opt-in live check with configured credentials, run `bun run test:live`. Default unit and browser suites continue to use the test fixture. Public serverless deployment has not been performed. Real-device Safari, Firefox and manual screen-reader checks have not been performed.

## Files

| File | Purpose |
| --- | --- |
| `app/` | Next.js page, layout and API route handlers |
| `lib/api.js` | HTTP validation and stateless solo endpoints |
| `lib/room-service.js` | Multiplayer actions, presence and timestamp-based transitions |
| `lib/room-store.js` | Upstash REST storage and atomic compare-and-set |
| `lib/qr.js` | Styled QR generation and validation of share destinations |
| `rooms.js` | Shared round scoring and resets |
| `public/rules.js` | Shared difficulty and daily-puzzle rules |
| `game.js`, `banks.js` | Deterministic puzzle generation and vocabulary |
| `public/` | Game controller, styles, sharing and local assets |
| `test/` | Unit, production-browser and accessibility checks |

The catalog reuses curated letter families across distinct target sets and layouts. It does not contain 1,440 independently authored vocabularies. Answers are available to the client; this is a casual game without prizes or anti-cheat guarantees.

## References and assets

The migration follows [Next.js route handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [file tracing](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), and [Upstash’s Redis REST API](https://upstash.com/docs/redis/features/restapi). Atomic writes use Redis `EVAL` with compare-and-set and preserve the room TTL.

The bonus dictionary comes from [word-list](https://github.com/sindresorhus/word-list); see `WORDS-LICENSE`. Manrope and DM Sans are self-hosted under the SIL Open Font License, with license files in `public/assets/`. The original SVG icon follows the supplied visual reference. Reference screenshots are not bundled as game assets.

QR codes use the local `qrcode` encoder with high error correction, rounded purple/sage modules, a cream quiet zone and lilac frame. No QR service receives room links. Tests decode the actual on-screen QR and exported invite/scorecard PNGs, including phone sizes and long preview URLs. Physical phone-camera scanning has not been checked.
