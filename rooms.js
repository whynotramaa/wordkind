import { judgeRound, matchFinished } from "./public/rules.js";
export function finishRound(
  room,
  winnerId = null,
  reason = "solved",
  now = Date.now(),
) {
  if (room.status !== "playing") return false;
  const winner = judgeRound(room.players, winnerId);
  if (winner) room.players.find((p) => p.id === winner).score++;
  room.winner = winner;
  room.reason = reason;
  room.results.push({
    round: room.round,
    puzzleId: room.ids[room.round - 1],
    winner,
    reason,
    elapsedMs: Math.max(
      0,
      Math.min(now - room.startAt, room.settings.seconds * 1000),
    ),
    progress: room.players.map((p) => ({ id: p.id, words: p.found.length })),
  });
  room.status = matchFinished(room.round, room.players)
    ? "finished"
    : "round-over";
  if (room.status === "finished") {
    const [a, b] = room.players;
    room.matchWinner =
      a.score === b.score ? null : a.score > b.score ? a.id : b.id;
  }
  return true;
}
export function beginRound(room, now = Date.now()) {
  room.round++;
  room.winner = null;
  room.reason = null;
  room.players.forEach((p) => {
    p.found = [];
    p.bonus = [];
    p.ready = false;
  });
  room.startAt = now + 3500;
  room.deadline = room.startAt + room.settings.seconds * 1000;
  room.status = "playing";
}
export function resetMatch(room, ids) {
  room.ids = ids;
  room.round = 0;
  room.results = [];
  room.matchWinner = null;
  room.players.forEach((p) => {
    p.score = 0;
    p.ready = false;
  });
}
