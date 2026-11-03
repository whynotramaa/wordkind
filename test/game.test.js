import { describe, test, expect } from "bun:test";
import { tiers, dailyId, validateSettings, judgeRound } from "../rules.js";
import { beginRound, finishRound, resetMatch } from "../rooms.js";
import { banks } from "../banks.js";
import { puzzles, makePuzzle, canSpell, checkGuess } from "../game.js";
import { startServer } from "../server.js";
const dictionary = new Set(
  (await Bun.file(new URL("../words.txt", import.meta.url)).text())
    .toUpperCase()
    .split("\n"),
);
describe("puzzles", () => {
  test("1,440 deterministic, valid, distinct, connected boards with increasing difficulty", () => {
    expect(puzzles).toHaveLength(1440);
    const signatures = new Set();
    for (const p of puzzles) {
      expect(p).toEqual(makePuzzle(p.id));
      expect([...p.wheel].sort().join("")).toBe([...p.letters].sort().join(""));
      expect((p.wheel + p.wheel).includes(p.letters)).toBe(false);
      const reverse = [...p.wheel].reverse().join("");
      expect((reverse + reverse).includes(p.letters)).toBe(false);
      expect(p.slots.length).toBe(tiers[Math.floor((p.id - 1) / 240)].words);
      const cells = new Map();
      for (const s of p.slots) {
        expect(dictionary.has(s.word)).toBe(true);
        expect(canSpell(s.word, p.letters)).toBe(true);
        let intersects = cells.size === 0;
        for (const c of s.cells) {
          const k = `${c.x},${c.y}`;
          if (cells.has(k)) {
            expect(cells.get(k)).toBe(c.letter);
            intersects = true;
          }
        }
        expect(intersects).toBe(true);
        for (const c of s.cells) cells.set(`${c.x},${c.y}`, c.letter);
      }
      expect(p.width).toBeLessThanOrEqual(12);
      expect(p.height).toBeLessThanOrEqual(12);
      signatures.add(JSON.stringify(p.slots.map((s) => [s.word, s.cells])));
    }
    expect(signatures.size).toBe(1440);
  });
  test("layouts and starting directions vary, and higher tiers use longer words", () => {
    for (const tier of tiers) {
      const group = puzzles.filter((p) => p.difficulty === tier.id);
      expect(new Set(group.map((p) => p.layout)).size).toBe(6);
      expect(
        new Set(group.map((p) => `${p.slots[0].dx},${p.slots[0].dy}`)).size,
      ).toBe(tier.directions.length);
    }
    expect(
      puzzles
        .filter((p) => p.difficulty === "genius")
        .every((p) => p.slots.every((s) => s.word.length >= 5)),
    ).toBe(true);
    expect(
      puzzles
        .filter((p) => ["hard", "expert"].includes(p.difficulty))
        .every((p) => p.slots.every((s) => s.word.length >= 4)),
    ).toBe(true);
  });
  test("letter multiplicity, target, bonus, duplicate and invalid guesses", () => {
    const p = puzzles[240];
    expect(canSpell("APPLE", "PASTEL")).toBe(false);
    expect(checkGuess(p, "PASTEL", [], [], dictionary)).toBe("found");
    expect(checkGuess(p, "PASTEL", ["PASTEL"], [], dictionary)).toBe(
      "duplicate",
    );
    expect(checkGuess(p, "ZZZ", [], [], dictionary)).toBe("invalid");
    const extra = banks[0].find((w) => !p.slots.some((s) => s.word === w));
    expect(checkGuess(p, extra, [], [], dictionary)).toBe("bonus");
    expect(checkGuess(p, extra, [], [extra], dictionary)).toBe("duplicate");
  });
});
test("real two-player match: cookies, capacity, common puzzle, countdown, first finisher and best of three", async () => {
  const server = startServer(0),
    base = `http://localhost:${server.port}`;
  const sockets = [];
  try {
    const session = async () => {
      const r = await fetch(`${base}/api/session`);
      return {
        cookie: r.headers.get("set-cookie").split(";")[0],
        id: (await r.json()).id,
      };
    };
    const a = await session(),
      b = await session(),
      c = await session();
    const response = await fetch(`${base}/api/rooms`, {
      method: "POST",
      headers: { cookie: a.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ difficulty: "easy", seconds: 60 }),
    });
    const { code } = await response.json();
    const player = async (identity) => {
      const ws = new WebSocket(`${base.replace("http", "ws")}/ws/${code}`, {
        headers: { cookie: identity.cookie },
      });
      sockets.push(ws);
      const state = { ws, data: null };
      ws.onmessage = (e) => {
        const m = JSON.parse(e.data);
        if (m.type === "state") state.data = m.room;
      };
      await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
      });
      return state;
    };
    const pa = await player(a),
      pb = await player(b);
    const wait = async (fn) => {
      const end = Date.now() + 6000;
      while (!fn()) {
        if (Date.now() > end) throw Error("Timed out waiting for room state");
        await Bun.sleep(10);
      }
    };
    await wait(
      () => pa.data?.players.length === 2 && pb.data?.players.length === 2,
    );
    const full = await fetch(`${base}/ws/${code}`, {
      headers: { cookie: c.cookie },
    });
    expect(full.status).toBe(409);
    const forbidden = await fetch(`${base}/api/rooms`, {
      method: "POST",
      headers: { cookie: a.cookie, origin: "https://other.example" },
    });
    expect(forbidden.status).toBe(403);
    const proxied = await fetch(`${base}/api/session`, {
      headers: {
        origin: base.replace("http:", "https:"),
        "x-forwarded-proto": "https",
      },
    });
    expect(proxied.status).toBe(200);
    expect(proxied.headers.get("set-cookie")).toContain("; Secure");
    const malformed = await fetch(`${base}/api/word`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "null",
    });
    expect(malformed.status).toBe(400);
    pa.ws.send("null");
    pa.ws.send("{broken");
    for (let round = 1; round <= 2; round++) {
      pa.ws.send(JSON.stringify({ type: "ready" }));
      pb.ws.send(JSON.stringify({ type: "ready" }));
      await wait(() => pa.data?.round === round && pb.data?.round === round);
      expect(pa.data.puzzleId).toBe(pb.data.puzzleId);
      const p = puzzles[pa.data.puzzleId - 1];
      pa.ws.send(JSON.stringify({ type: "guess", word: p.slots[0].word }));
      await Bun.sleep(25);
      expect(pa.data.players[0].found.length).toBe(0);
      await Bun.sleep(Math.max(0, pa.data.startAt - Date.now() + 15));
      for (const s of p.slots)
        pa.ws.send(JSON.stringify({ type: "guess", word: s.word }));
      await wait(() => pa.data.status !== "playing");
      for (const s of p.slots)
        pb.ws.send(JSON.stringify({ type: "guess", word: s.word }));
      await Bun.sleep(25);
      expect(pa.data.winner).toBe(a.id);
      expect(pa.data.players[0].score).toBe(round);
      expect(pa.data.players[1].score).toBe(0);
    }
    expect(pa.data.status).toBe("finished");
  } finally {
    sockets.forEach((ws) => ws.close());
    server.stop(true);
  }
}, 18000);

describe("solo and match rules", () => {
  test("daily puzzle follows UTC dates, not local timezone", () => {
    expect(dailyId(new Date("2026-11-03T00:00:00Z"))).toBe(
      dailyId(new Date("2026-11-03T23:59:59Z")),
    );
    expect(dailyId(new Date("2026-11-03T00:00:00Z"))).not.toBe(
      dailyId(new Date("2026-11-04T00:00:00Z")),
    );
    expect(dailyId()).toBeGreaterThanOrEqual(1);
    expect(dailyId()).toBeLessThanOrEqual(puzzles.length);
  });
  test("room settings reject unrecognized tiers and clocks", () => {
    expect(validateSettings(null)).toEqual({
      difficulty: "easy",
      seconds: 180,
    });
    expect(validateSettings({ difficulty: "genius", seconds: 60 })).toEqual({
      difficulty: "genius",
      seconds: 60,
    });
    expect(validateSettings({ difficulty: "oops", seconds: -1 })).toEqual({
      difficulty: "easy",
      seconds: 180,
    });
  });
  test("timeouts use progress, ties award no point, max three rounds and rematch resets everything", () => {
    const room = {
      status: "waiting",
      round: 0,
      settings: { seconds: 60 },
      ids: [1, 2, 3],
      results: [],
      players: [
        { id: "a", found: [], bonus: [], score: 0 },
        { id: "b", found: [], bonus: [], score: 0 },
      ],
    };
    beginRound(room, 0);
    room.players[0].found = ["CARE"];
    expect(finishRound(room, null, "timeout", 63500)).toBe(true);
    expect(room.winner).toBe("a");
    expect(room.players[0].score).toBe(1);
    expect(room.results[0].elapsedMs).toBe(60000);
    expect(finishRound(room, "b")).toBe(false);
    beginRound(room, 100000);
    finishRound(room, null, "timeout", 163500);
    expect(room.winner).toBe(null);
    expect(room.status).toBe("round-over");
    beginRound(room, 200000);
    room.players[1].found = ["CARE"];
    finishRound(room, null, "timeout", 263500);
    expect(room.status).toBe("finished");
    expect(room.matchWinner).toBe(null);
    expect(room.players.map((p) => p.score)).toEqual([1, 1]);
    resetMatch(room, [4, 5, 6]);
    beginRound(room, 300000);
    expect(room.round).toBe(1);
    expect(room.results).toEqual([]);
    expect(room.players.map((p) => p.score)).toEqual([0, 0]);
    expect(room.players.every((p) => !p.ready && p.found.length === 0)).toBe(
      true,
    );
  });
});
