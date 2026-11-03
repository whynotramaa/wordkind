import { puzzles, checkGuess } from "../game.js";
import { validateSettings } from "../public/rules.js";
import { beginRound, finishRound, resetMatch } from "../rooms.js";
import { dictionary } from "./dictionary.js";
const fail = (message, status) => {
  throw Object.assign(Error(message), { status });
};
const active = (r) => ["playing", "round-over"].includes(r.status);
function matchPuzzles(difficulty) {
  const pool = puzzles.filter((p) => p.difficulty === difficulty),
    ids = [];
  while (ids.length < 3) {
    const id = pool[Math.floor(Math.random() * pool.length)].id;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}
function advance(room, now) {
  for (const p of room.players)
    if (p.online && now - p.lastSeen >= 5000) {
      p.online = false;
      p.disconnectedAt = p.lastSeen + 5000;
    }
  if (!active(room)) return;
  const absent = room.players.filter((p) => !p.online),
    forfeitAt = absent.length
      ? Math.min(...absent.map((p) => p.disconnectedAt + 20000))
      : Infinity;
  if (
    room.status === "playing" &&
    now >= room.deadline &&
    room.deadline <= forfeitAt
  )
    finishRound(room, null, "timeout", room.deadline);
  if (active(room) && now >= forfeitAt) {
    const online = room.players.filter((p) => p.online);
    room.status = "finished";
    room.players.forEach((p) => (p.ready = false));
    if (!online.length) {
      room.winner = null;
      room.matchWinner = null;
      room.reason = "abandoned";
    } else {
      const winner = online[0];
      room.winner = winner.id;
      room.matchWinner = winner.id;
      room.reason = "disconnect";
      winner.score = 2;
    }
  }
}
function snapshot(room, session, now) {
  const me = room.players.find((p) => p.session === session);
  return {
    type: "state",
    you: me.id,
    serverTime: now,
    room: {
      code: room.code,
      revision: room.revision,
      match: room.match,
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
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        found: p.found,
        online: p.online,
        ready: p.ready,
      })),
    },
  };
}
export async function createRoom(store, input, now = Date.now()) {
  const settings = validateSettings(input);
  for (let attempt = 0; attempt < 4; attempt++) {
    const code = crypto.randomUUID().replaceAll("-", "").slice(0, 12),
      room = {
        code,
        settings,
        ids: matchPuzzles(settings.difficulty),
        created: now,
        revision: 0,
        match: crypto.randomUUID(),
        round: 0,
        status: "waiting",
        winner: null,
        matchWinner: null,
        results: [],
        players: [],
      };
    if (await store.create(code, room)) return { code };
  }
  fail("Could not make a room. Please try again.", 503);
}
export async function updateRoom(store, code, session, action) {
  if (!/^[a-f0-9]{12}$/.test(code))
    fail("This room has expired. Make a fresh invite.", 404);
  for (let retry = 0; retry < 12; retry++) {
    const raw = await store.read(code);
    if (!raw) fail("This room has expired. Make a fresh invite.", 404);
    const room = JSON.parse(raw),
      now = Date.now();
    advance(room, now);
    let player = room.players.find((p) => p.session === session);
    if (!player) {
      if (action.type !== "join") fail("Join this room before playing.", 403);
      if (room.players.length >= 2)
        fail("This room already has two players.", 409);
      player = {
        id: crypto.randomUUID(),
        session,
        name: `Player ${room.players.length + 1}`,
        found: [],
        bonus: [],
        score: 0,
        ready: false,
        lastSeen: now,
        online: true,
        window: now,
        messages: 0,
      };
      room.players.push(player);
    }
    if (now - player.window >= 1000) {
      player.window = now;
      player.messages = 0;
    }
    let result;
    if (action.type === "leave") {
      player.online = false;
      player.disconnectedAt = now;
    } else {
      player.lastSeen = now;
      player.online = true;
      player.disconnectedAt = null;
      if (action.type === "join")
        player.name =
          typeof action.name === "string"
            ? action.name
                .trim()
                .replace(/[\x00-\x1f\x7f]/g, "")
                .slice(0, 20) || "Chai champion"
            : player.name;
      if (
        action.type !== "poll" &&
        action.type !== "join" &&
        ++player.messages > 15
      )
        fail("Too many moves. Try again in a moment.", 429);
      const sameRound =
        action.round === room.round && action.match === room.match;
      if (
        action.type === "ready" &&
        sameRound &&
        ["waiting", "round-over"].includes(room.status)
      ) {
        player.ready = true;
        if (
          room.players.length === 2 &&
          room.players.every((p) => p.ready && p.online)
        )
          beginRound(room, now);
      }
      if (
        action.type === "rematch" &&
        sameRound &&
        room.status === "finished"
      ) {
        player.ready = true;
        if (
          room.players.length === 2 &&
          room.players.every((p) => p.ready && p.online)
        ) {
          resetMatch(room, matchPuzzles(room.settings.difficulty));
          room.match = crypto.randomUUID();
          beginRound(room, now);
        }
      }
      if (action.type === "guess") {
        const word =
          typeof action.word === "string" ? action.word.toUpperCase() : "";
        if (!sameRound || room.status !== "playing")
          result = { word, result: "inactive" };
        else if (now < room.startAt) result = { word, result: "early" };
        else {
          const puzzle = puzzles[room.ids[room.round - 1] - 1],
            kind = checkGuess(
              puzzle,
              word,
              player.found,
              player.bonus,
              dictionary,
            );
          result = { word, result: kind };
          if (kind === "found") player.found.push(word);
          if (kind === "bonus") player.bonus.push(word);
          if (player.found.length === puzzle.slots.length)
            finishRound(room, player.id, "solved", now);
        }
      }
    }
    room.revision++;
    if (await store.replace(code, raw, room))
      return { ...snapshot(room, session, now), guess: result };
  }
  fail("The room is busy. Please retry your move.", 503);
}
