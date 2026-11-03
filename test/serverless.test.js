import { test, expect } from "bun:test";
import { startRedisFixture } from "./helpers/redis.mjs";
import { redisRoomStore } from "../lib/room-store.js";
import { handleRequest } from "../lib/api.js";
import { createRoom, updateRoom } from "../lib/room-service.js";
import { puzzles } from "../game.js";

test("serverless HTTP rooms: anonymous sessions, concurrent workers, countdowns, atomic winner, expiry and private identities", async () => {
  const redis = startRedisFixture(),
    oldURL = process.env.UPSTASH_REDIS_REST_URL,
    oldToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = redis.url;
  process.env.UPSTASH_REDIS_REST_TOKEN = redis.token;
  try {
    const call = (path, cookie, data, extra = {}) =>
      handleRequest(
        new Request(`https://wordkind.test${path}`, {
          method: data ? "POST" : "GET",
          headers: {
            ...(cookie ? { cookie } : {}),
            ...(data ? { "Content-Type": "application/json" } : {}),
            ...extra,
          },
          body: data ? JSON.stringify(data) : undefined,
        }),
      );
    const session = async () => {
      const response = await call("/api/session");
      expect(response.headers.get("set-cookie")).toContain("HttpOnly");
      return response.headers.get("set-cookie").split(";")[0];
    };
    const a = await session(),
      b = await session(),
      c = await session();
    const { code } = await (
      await call("/api/rooms", a, { difficulty: "breezy", seconds: 60 })
    ).json();
    const join = async (cookie, name) =>
      (await call(`/api/rooms/${code}`, cookie, { type: "join", name })).json();
    let pa = await join(a, "Chai champion"),
      pb = await join(b, "Sharma ji");
    expect((await call(`/api/rooms/${code}`, c, { type: "join" })).status).toBe(
      409,
    );
    expect(JSON.stringify(pb)).not.toContain(a.split("=")[1]);
    expect(pa.you).not.toBe(a.split("=")[1]);
    const path = `/api/rooms/${code}`;
    await call(path, a, { type: "ready", round: 0, match: pa.room.match });
    pb = await (
      await call(path, b, { type: "ready", round: 0, match: pb.room.match })
    ).json();
    const round = pb.room.round,
      match = pb.room.match,
      puzzle = puzzles[pb.room.puzzleId - 1];
    expect(round).toBe(1);
    const early = await (
      await call(path, a, {
        type: "guess",
        word: puzzle.slots[0].word,
        round,
        match,
      })
    ).json();
    expect(early.guess.result).toBe("early");
    redis.change(code, (r) => {
      r.startAt = Date.now() - 50;
      r.deadline = Date.now() + 60000;
    });
    // Independent store objects model requests hitting separate serverless instances.
    const storeA = redisRoomStore(),
      storeB = redisRoomStore(),
      idA = a.split("=")[1],
      idB = b.split("=")[1];
    await Promise.all([
      updateRoom(storeA, code, idA, {
        type: "guess",
        word: puzzle.slots[0].word,
        round,
        match,
      }),
      updateRoom(storeB, code, idB, {
        type: "guess",
        word: puzzle.slots[0].word,
        round,
        match,
      }),
    ]);
    expect(redis.room(code).players.every((p) => p.found.length === 1)).toBe(
      true,
    );
    redis.change(code, (r) =>
      r.players.forEach((p) => {
        p.found = puzzle.slots.slice(0, -1).map((s) => s.word);
      }),
    );
    await Promise.all([
      updateRoom(storeA, code, idA, {
        type: "guess",
        word: puzzle.slots.at(-1).word,
        round,
        match,
      }),
      updateRoom(storeB, code, idB, {
        type: "guess",
        word: puzzle.slots.at(-1).word,
        round,
        match,
      }),
    ]);
    expect(redis.room(code).players.reduce((sum, p) => sum + p.score, 0)).toBe(
      1,
    );
    expect(redis.room(code).status).toBe("round-over");
    const stale = await updateRoom(storeA, code, idA, {
      type: "ready",
      round: 0,
      match,
    });
    expect(stale.room.players.find((p) => p.id === pa.you).ready).toBe(false);
    const ttlBefore = redis.data.get(`wordkind:room:${code}`).expires;
    await call(path, a);
    expect(redis.data.get(`wordkind:room:${code}`).expires).toBe(ttlBefore);
    expect(
      (await call("/api/rooms", a, {}, { origin: "https://evil.test" })).status,
    ).toBe(403);
    const invalid = await handleRequest(
      new Request("https://wordkind.test/api/word", {
        method: "POST",
        body: "null",
      }),
    );
    expect(invalid.status).toBe(400);
    const tooLarge = await handleRequest(
      new Request("https://wordkind.test/api/word", {
        method: "POST",
        body: "x".repeat(2049),
      }),
    );
    expect(tooLarge.status).toBe(413);
    redis.data.get(`wordkind:room:${code}`).expires = Date.now() - 1;
    expect((await call(path, a)).status).toBe(404);
  } finally {
    redis.stop();
    if (oldURL === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = oldURL;
    if (oldToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = oldToken;
  }
});

test("serverless room deadlines and disconnect grace are evaluated on the next request without timers", async () => {
  const redis = startRedisFixture(),
    oldURL = process.env.UPSTASH_REDIS_REST_URL,
    oldToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.UPSTASH_REDIS_REST_URL = redis.url;
  process.env.UPSTASH_REDIS_REST_TOKEN = redis.token;
  try {
    const store = redisRoomStore(),
      a = crypto.randomUUID(),
      b = crypto.randomUUID();
    const { code } = await createRoom(store, {
      difficulty: "easy",
      seconds: 60,
    });
    await updateRoom(store, code, a, { type: "join" });
    await updateRoom(store, code, b, { type: "join" });
    redis.change(code, (r) => {
      r.round = 1;
      r.status = "playing";
      r.startAt = Date.now() - 61000;
      r.deadline = Date.now() - 1000;
      r.players[0].found = ["word"];
    });
    const timeout = await updateRoom(store, code, a, { type: "poll" });
    expect(timeout.room.status).toBe("round-over");
    expect(timeout.room.players[0].score).toBe(1);
    expect(timeout.room.results[0].elapsedMs).toBe(60000);
    await updateRoom(store, code, b, { type: "leave" });
    redis.change(code, (r) => {
      r.players[1].disconnectedAt = Date.now() - 21000;
    });
    const forfeit = await updateRoom(store, code, a, { type: "poll" });
    expect(forfeit.room.status).toBe("finished");
    expect(forfeit.room.matchWinner).toBe(forfeit.you);
    expect(forfeit.room.reason).toBe("disconnect");
    const returning = await updateRoom(store, code, b, { type: "join" });
    expect(returning.room.matchWinner).not.toBe(returning.you);
  } finally {
    redis.stop();
    if (oldURL === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = oldURL;
    if (oldToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = oldToken;
  }
});

test("solo works without Redis and unconfigured multiplayer fails without a memory fallback", async () => {
  const oldURL = process.env.UPSTASH_REDIS_REST_URL,
    oldToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    expect(
      (await handleRequest(new Request("http://localhost/api/puzzles"))).status,
    ).toBe(200);
    const response = await handleRequest(
      new Request("http://localhost/api/rooms", {
        method: "POST",
        headers: { cookie: `wordkind=${crypto.randomUUID()}` },
        body: "{}",
      }),
    );
    expect(response.status).toBe(503);
    expect((await response.json()).error).not.toContain("TOKEN");
  } finally {
    if (oldURL !== undefined) process.env.UPSTASH_REDIS_REST_URL = oldURL;
    if (oldToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = oldToken;
  }
});

test("frequent polls read without writes until the heartbeat is due", async () => {
  let raw, writes = 0;
  const store = {
    async create(code, room) { raw = JSON.stringify(room); return true; },
    async read() { return raw; },
    async replace(code, old, room) {
      expect(raw).toBe(old);
      raw = JSON.stringify(room);
      writes++;
      return true;
    },
  };
  const session = crypto.randomUUID();
  const { code } = await createRoom(store, { difficulty: "easy", seconds: 60 });
  await updateRoom(store, code, session, { type: "join" });
  const before = writes;
  for (let i = 0; i < 10; i++)
    await updateRoom(store, code, session, { type: "poll" });
  expect(writes).toBe(before);
  const room = JSON.parse(raw);
  room.players[0].lastSeen = Date.now() - 1600;
  raw = JSON.stringify(room);
  await updateRoom(store, code, session, { type: "poll" });
  expect(writes).toBe(before + 1);
  await expect(updateRoom(store, code, crypto.randomUUID(), { type: "poll" })).rejects.toMatchObject({ status: 403 });
});
