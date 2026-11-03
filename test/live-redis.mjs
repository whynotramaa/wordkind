import assert from "node:assert/strict";
import { startApp } from "./helpers/app-server.mjs";
const url = process.env.UPSTASH_REDIS_REST_URL,
  token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token)
  throw Error(
    "Set the server-only Redis variables before running the live check.",
  );
async function redis(command) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const payload = await response.json();
  if (!response.ok || payload.error)
    throw Error("The live Redis command failed.");
  return payload.result;
}
const server = await startApp({ url, token, stop() {} });
let key;
try {
  async function call(path, cookie, data) {
    const response = await fetch(`${server.base}${path}`, {
      method: data ? "POST" : "GET",
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(data ? { "Content-Type": "application/json" } : {}),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    const payload = await response.json();
    assert.equal(response.status, 200, payload.error);
    return payload;
  }
  async function session() {
    const response = await fetch(`${server.base}/api/session`);
    assert.equal(response.status, 200);
    return response.headers.get("set-cookie").split(";")[0];
  }
  const [a, b] = await Promise.all([session(), session()]),
    { code } = await call("/api/rooms", a, {
      difficulty: "breezy",
      seconds: 60,
    });
  key = `wordkind:room:${code}`;
  const ttlBefore = await redis(["TTL", key]);
  assert.ok(ttlBefore > 7100 && ttlBefore <= 7200);
  const path = `/api/rooms/${code}`;
  const [pa, pb] = await Promise.all([
    call(path, a, { type: "join", name: "Live check A" }),
    call(path, b, { type: "join", name: "Live check B" }),
  ]);
  assert.notEqual(pa.you, pb.you);
  await Promise.all([
    call(path, a, { type: "ready", round: 0, match: pa.room.match }),
    call(path, b, { type: "ready", round: 0, match: pb.room.match }),
  ]);
  let state = await call(path, a);
  assert.equal(state.room.status, "playing");
  const catalog = await call("/api/puzzles"),
    puzzle = catalog[state.room.puzzleId - 1];
  const early = await call(path, a, {
    type: "guess",
    word: puzzle.slots[0].word,
    round: 1,
    match: state.room.match,
  });
  assert.equal(early.guess.result, "early");
  await Bun.sleep(Math.max(0, state.room.startAt - Date.now() + 30));
  await Promise.all([call(path, a), call(path, b)]);
  for (const slot of puzzle.slots)
    await Promise.all([
      call(path, a, {
        type: "guess",
        word: slot.word,
        round: 1,
        match: state.room.match,
      }),
      call(path, b, {
        type: "guess",
        word: slot.word,
        round: 1,
        match: state.room.match,
      }),
    ]);
  state = await call(path, a);
  assert.equal(state.room.status, "round-over");
  assert.equal(
    state.room.players.reduce((n, p) => n + p.score, 0),
    1,
  );
  const ttlAfter = await redis(["TTL", key]);
  assert.ok(
    ttlAfter > 0 && ttlAfter < ttlBefore,
    "Room updates must preserve expiry, not reset it.",
  );
  console.log(
    "Live Next.js + Upstash passed: two players, countdown, concurrent finishing, one awarded point, and preserved two-hour expiry.",
  );
} finally {
  if (key) {
    await redis(["DEL", key]);
    console.log("Removed the live test room.");
  }
  server.stop();
}
