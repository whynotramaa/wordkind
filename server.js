import { puzzles, checkGuess, canSpell } from "./game.js";
import { validateSettings } from "./rules.js";
import { beginRound, finishRound, resetMatch } from "./rooms.js";
const dictionary = new Set(
  (await Bun.file(new URL("./words.txt", import.meta.url)).text())
    .split("\n")
    .map((w) => w.toUpperCase()),
);
const rooms = new Map(),
  catalog = JSON.stringify(puzzles),
  compressed = Bun.gzipSync(catalog);
const json = (data, status = 200) => Response.json(data, { status });
const identity = (req) =>
  /(?:^|; )wordkind=([a-f0-9-]{36})(?:;|$)/.exec(
    req.headers.get("cookie") || "",
  )?.[1];
function pickMatch(difficulty) {
  const pool = puzzles.filter((p) => p.difficulty === difficulty);
  const selected = [];
  while (selected.length < 3) {
    const id = pool[Math.floor(Math.random() * pool.length)].id;
    if (!selected.includes(id)) selected.push(id);
  }
  return selected;
}
function broadcast(room) {
  for (const p of room.players)
    p.ws?.send(
      JSON.stringify({
        type: "state",
        you: p.id,
        room: {
          code: room.code,
          round: room.round,
          status: room.status,
          startAt: room.startAt,
          deadline: room.deadline,
          winner: room.winner,
          matchWinner: room.matchWinner,
          reason: room.reason,
          settings: room.settings,
          results: room.results,
          puzzleId: room.ids[room.round - 1],
          players: room.players.map((q) => ({
            id: q.id,
            name: q.name,
            score: q.score,
            found: q.found,
            online: !!q.ws,
            ready: q.ready,
          })),
        },
      }),
    );
}
function startRound(room) {
  beginRound(room);
  room.roundTimer = setTimeout(() => {
    if (finishRound(room, null, "timeout")) broadcast(room);
  }, room.deadline - Date.now()).unref();
  broadcast(room);
}
const staticFiles = {
  "/": "public/index.html",
  "/app.js": "public/app.js",
  "/style.css": "public/style.css",
  "/sharing.js": "public/sharing.js",
  "/rules.js": "rules.js",
  "/assets/icon.svg": "public/assets/icon.svg",
  "/assets/manrope.ttf": "public/assets/manrope.ttf",
  "/assets/dm-sans.ttf": "public/assets/dm-sans.ttf",
};
export function startServer(port = Number(process.env.PORT || 3000)) {
  return Bun.serve({
    port,
    hostname: "0.0.0.0",
    maxRequestBodySize: 2048,
    async fetch(req, server) {
      const url = new URL(req.url),
        path = url.pathname,
        origin = req.headers.get("origin");
      if (origin) {
        let source;
        try {
          source = new URL(origin);
        } catch {
          return json({ error: "Invalid request origin." }, 403);
        }
        // TLS proxies forward HTTP internally; the public host must still match.
        if (
          source.host !== url.host ||
          !["http:", "https:"].includes(source.protocol)
        )
          return json(
            { error: "Open the game directly to make this request." },
            403,
          );
      }
      if (path === "/api/session") {
        const id = identity(req) || crypto.randomUUID();
        return Response.json(
          { id },
          {
            headers: {
              "Set-Cookie": `wordkind=${id}; Path=/; HttpOnly; SameSite=Lax${url.protocol === "https:" || req.headers.get("x-forwarded-proto")?.split(",")[0].trim() === "https" ? "; Secure" : ""}`,
            },
          },
        );
      }
      if (path === "/api/puzzles") {
        const gzip = /\bgzip\b/.test(req.headers.get("accept-encoding") || "");
        return new Response(gzip ? compressed : catalog, {
          headers: {
            "Content-Type": "application/json",
            Vary: "Accept-Encoding",
            ...(gzip ? { "Content-Encoding": "gzip" } : {}),
          },
        });
      }
      if (path === "/api/word" && req.method === "POST") {
        let data;
        try {
          data = await req.json();
        } catch {
          return json({ error: "Invalid word request." }, 400);
        }
        if (!data || typeof data !== "object")
          return json({ error: "Invalid word request." }, 400);
        const p = puzzles[Number(data.id) - 1],
          word = typeof data.word === "string" ? data.word.toUpperCase() : "";
        if (!p) return json({ error: "That puzzle does not exist." }, 400);
        const result = checkGuess(p, word, [], [], dictionary);
        return json({
          result,
          valid: result !== "invalid",
          reason:
            word.length < 3
              ? "short"
              : !canSpell(word, p.letters)
                ? "letters"
                : "unknown",
        });
      }
      if (path === "/api/rooms" && req.method === "POST") {
        const id = identity(req);
        if (!id)
          return json({ error: "Refresh the page to start a session." }, 401);
        if (rooms.size >= 1000)
          return json({ error: "All rooms are busy. Try again soon." }, 503);
        let input;
        try {
          input = await req.json();
        } catch {
          return json({ error: "Invalid room settings." }, 400);
        }
        const settings = validateSettings(input),
          code = crypto.randomUUID().slice(0, 8);
        rooms.set(code, {
          code,
          ids: pickMatch(settings.difficulty),
          settings,
          created: Date.now(),
          players: [],
          round: 0,
          status: "waiting",
          winner: null,
          matchWinner: null,
          results: [],
        });
        return json({ code });
      }
      if (path.startsWith("/ws/")) {
        const room = rooms.get(path.slice(4)),
          id = identity(req);
        if (!room)
          return json(
            { error: "This room has expired. Make a fresh invite." },
            404,
          );
        if (!id)
          return json(
            { error: "Refresh to restore your anonymous session." },
            401,
          );
        if (room.players.length === 2 && !room.players.some((p) => p.id === id))
          return json({ error: "This room already has two players." }, 409);
        if (
          server.upgrade(req, {
            data: { room, id, window: Date.now(), messages: 0 },
          })
        )
          return;
        return json({ error: "Could not connect to the room." }, 400);
      }
      const file = staticFiles[path];
      if (file)
        return new Response(Bun.file(new URL(file, import.meta.url)), {
          headers: {
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": path.startsWith("/assets/")
              ? "public, max-age=604800"
              : "no-cache",
            "Content-Security-Policy":
              "default-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; font-src 'self'; frame-ancestors 'none'",
          },
        });
      return new Response("Not found", { status: 404 });
    },
    websocket: {
      maxPayloadLength: 1024,
      idleTimeout: 120,
      open(ws) {
        const { room, id } = ws.data;
        let p = room.players.find((p) => p.id === id);
        if (p) {
          const old = p.ws;
          p.ws = ws;
          clearTimeout(p.disconnectTimer);
          old?.close(1000, "Opened in another tab");
        } else {
          if (room.players.length === 2) {
            ws.close(1008, "Room full");
            return;
          }
          p = {
            id,
            name: `Player ${room.players.length + 1}`,
            score: 0,
            found: [],
            bonus: [],
            ws,
            ready: false,
          };
          room.players.push(p);
        }
        broadcast(room);
      },
      message(ws, raw) {
        const { room, id } = ws.data,
          p = room.players.find((p) => p.id === id);
        if (!p || p.ws !== ws) return;
        if (Date.now() - ws.data.window > 1000) {
          ws.data.window = Date.now();
          ws.data.messages = 0;
        }
        if (++ws.data.messages > 15) return;
        let m;
        try {
          m = JSON.parse(raw);
        } catch {
          return;
        }
        if (!m || typeof m !== "object") return;
        if (m.type === "join") {
          p.name =
            typeof m.name === "string"
              ? m.name
                  .trim()
                  .replace(/[\x00-\x1f\x7f]/g, "")
                  .slice(0, 20) || "Chai champion"
              : p.name;
          broadcast(room);
        }
        if (
          m.type === "ready" &&
          ["waiting", "round-over"].includes(room.status)
        ) {
          p.ready = true;
          if (
            room.players.length === 2 &&
            room.players.every((q) => q.ready && q.ws)
          )
            startRound(room);
          else broadcast(room);
        }
        if (m.type === "rematch" && room.status === "finished") {
          p.ready = true;
          if (
            room.players.length === 2 &&
            room.players.every((q) => q.ready && q.ws)
          ) {
            resetMatch(room, pickMatch(room.settings.difficulty));
            startRound(room);
          } else broadcast(room);
        }
        if (
          m.type === "guess" &&
          room.status === "playing" &&
          Date.now() >= room.startAt
        ) {
          if (Date.now() >= room.deadline) {
            if (finishRound(room, null, "timeout")) broadcast(room);
            return;
          }
          const word = typeof m.word === "string" ? m.word.toUpperCase() : "",
            puzzle = puzzles[room.ids[room.round - 1] - 1],
            result = checkGuess(puzzle, word, p.found, p.bonus, dictionary);
          if (result === "found") p.found.push(word);
          if (result === "bonus") p.bonus.push(word);
          ws.send(JSON.stringify({ type: "guess", word, result }));
          if (p.found.length === puzzle.slots.length)
            finishRound(room, id, "solved");
          broadcast(room);
        }
      },
      close(ws) {
        const { room, id } = ws.data,
          p = room.players.find((p) => p.id === id);
        if (!p || p.ws !== ws) return;
        p.ws = null;
        if (["playing", "round-over"].includes(room.status)) {
          p.disconnectTimer = setTimeout(() => {
            if (!p.ws && ["playing", "round-over"].includes(room.status)) {
              clearTimeout(room.roundTimer);
              const other = room.players.find((q) => q.id !== id);
              if (!other.ws) {
                room.status = "finished";
                room.winner = null;
                room.matchWinner = null;
                room.reason = "abandoned";
                broadcast(room);
                return;
              }
              room.winner = other.id;
              room.matchWinner = other.id;
              room.status = "finished";
              room.reason = "disconnect";
              other.score = 2;
              room.players.forEach((q) => (q.ready = false));
              broadcast(room);
            }
          }, 20000).unref();
        }
        broadcast(room);
      },
    },
  });
}
// shortcut: room state is process-local; use one Bun instance until shared hosting state is required.
setInterval(() => {
  for (const [code, r] of rooms)
    if (Date.now() - r.created > 7200000) {
      clearTimeout(r.roundTimer);
      r.players.forEach((p) => {
        clearTimeout(p.disconnectTimer);
        p.ws?.close(1000, "Room expired");
      });
      rooms.delete(code);
    }
}, 60000).unref();
if (import.meta.main) {
  const s = startServer();
  console.log(
    `Wordkind is ready at http://localhost:${s.port} · ${puzzles.length} puzzles`,
  );
}
