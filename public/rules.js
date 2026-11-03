export const tiers = [
  {
    id: "breezy",
    name: "Breezy",
    tag: "A sip of chai",
    words: 3,
    min: 4,
    max: 5,
    directions: [
      [1, 0],
      [0, 1],
    ],
    description: "4–5 letters · 3 words · across & down",
  },
  {
    id: "easy",
    name: "Easy",
    tag: "A little breezy",
    words: 4,
    min: 5,
    max: 6,
    directions: [
      [1, 0],
      [0, 1],
    ],
    description: "5–6 letters · 4 words · across & down",
  },
  {
    id: "medium",
    name: "Medium",
    tag: "Get those gears going",
    words: 5,
    min: 6,
    max: 7,
    directions: [
      [1, 0],
      [0, 1],
    ],
    description: "6–7 letters · 5 words · across & down",
  },
  {
    id: "hard",
    name: "Hard",
    tag: "A little masala",
    words: 6,
    min: 6,
    max: 7,
    directions: [
      [1, 0],
      [0, 1],
      [1, 1],
      [-1, 1],
    ],
    description: "6–7 letters · 6 words · diagonals too",
  },
  {
    id: "expert",
    name: "Expert",
    tag: "Proper teekha",
    words: 8,
    min: 7,
    max: 8,
    directions: [
      [1, 0],
      [0, 1],
      [1, 1],
      [-1, 1],
      [-1, 0],
      [0, -1],
    ],
    description: "7–8 letters · 8 words · reverse paths",
  },
  {
    id: "genius",
    name: "Genius",
    tag: "Sharma ji territory",
    words: 10,
    min: 7,
    max: 8,
    directions: [
      [1, 0],
      [0, 1],
      [1, 1],
      [-1, 1],
      [-1, 0],
      [0, -1],
      [-1, -1],
      [1, -1],
    ],
    description: "7–8 letters · 10 words · every direction",
  },
];
export const perTier = 240;
export const totalPuzzles = tiers.length * perTier;
export function dailyId(date = new Date()) {
  const day = Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      86400000,
  );
  return 1 + ((Math.imul(day, 7919) >>> 0) % totalPuzzles);
}
export function validateSettings(input = {}) {
  input = input && typeof input === "object" ? input : {};
  return {
    difficulty: tiers.some((t) => t.id === input.difficulty)
      ? input.difficulty
      : "easy",
    seconds: [60, 180, 300].includes(input.seconds) ? input.seconds : 180,
  };
}
export function judgeRound(players, winnerId = null) {
  if (winnerId) return winnerId;
  const [a, b] = players;
  return a.found.length === b.found.length
    ? null
    : a.found.length > b.found.length
      ? a.id
      : b.id;
}
export function matchFinished(round, players) {
  return round >= 3 || players.some((p) => p.score >= 2);
}
