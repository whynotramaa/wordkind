import { shareQrSvg, shareTarget } from "./qr.js";
import { puzzles, checkGuess, canSpell } from "../game.js";
import { dictionary } from "./dictionary.js";
import { redisRoomStore } from "./room-store.js";
import { createRoom, updateRoom } from "./room-service.js";
const identity = (req) =>
  /(?:^|; )wordkind=([a-f0-9-]{36})(?:;|$)/.exec(
    req.headers.get("cookie") || "",
  )?.[1];
const json = (data, status = 200, headers = {}) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
async function body(req) {
  if (Number(req.headers.get("content-length") || 0) > 2048)
    throw Object.assign(Error("Request too large."), { status: 413 });
  const reader = req.body?.getReader();
  if (!reader) throw Object.assign(Error("Invalid request."), { status: 400 });
  let size = 0,
    chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 2048) {
      await reader.cancel();
      throw Object.assign(Error("Request too large."), { status: 413 });
    }
    chunks.push(value);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString());
    if (!data || typeof data !== "object" || Array.isArray(data)) throw Error();
    return data;
  } catch {
    throw Object.assign(Error("Invalid request."), { status: 400 });
  }
}
export async function handleRequest(req) {
  try {
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
      if (
        source.host !== url.host ||
        !["http:", "https:"].includes(source.protocol)
      )
        return json(
          { error: "Open the game directly to make this request." },
          403,
        );
    }
    if (path === "/api/qr" && req.method === "GET") {
      const target = shareTarget(url.searchParams.get("target"), url.origin);
      return new Response(shareQrSvg(target), {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (path === "/api/session" && req.method === "GET") {
      const id = identity(req) || crypto.randomUUID(),
        secure =
          url.protocol === "https:" ||
          req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ===
            "https";
      return json({ id }, 200, {
        "Set-Cookie": `wordkind=${id}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`,
      });
    }
    if (path === "/api/puzzles" && req.method === "GET")
      return json(puzzles, 200, { "Cache-Control": "public, max-age=3600" });
    if (path === "/api/word" && req.method === "POST") {
      const data = await body(req),
        p = puzzles[Number(data.id) - 1],
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
      const session = identity(req);
      if (!session)
        return json({ error: "Refresh to start your anonymous session." }, 401);
      return json(await createRoom(redisRoomStore(), await body(req)));
    }
    const match = /^\/api\/rooms\/([a-f0-9]{12})$/.exec(path);
    if (match && (req.method === "GET" || req.method === "POST")) {
      const session = identity(req);
      if (!session)
        return json(
          { error: "Refresh to restore your anonymous session." },
          401,
        );
      const action = req.method === "GET" ? { type: "poll" } : await body(req);
      if (
        !["poll", "join", "leave", "ready", "rematch", "guess"].includes(
          action.type,
        )
      )
        return json({ error: "Unknown room action." }, 400);
      return json(
        await updateRoom(redisRoomStore(), match[1], session, action),
      );
    }
    return json({ error: "Not found." }, 404);
  } catch (error) {
    if (error.status) return json({ error: error.message }, error.status);
    console.error("Wordkind request failed:", error.name);
    return json({ error: "Room service is unavailable. Please retry." }, 503);
  }
}
