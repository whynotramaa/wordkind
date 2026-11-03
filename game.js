import { banks, shortBanks, longBanks } from "./banks.js";
import { tiers, perTier, totalPuzzles } from "./rules.js";
export const difficulties = tiers.map((t) => t.id);
const families = [...shortBanks, ...banks, ...longBanks];
const minimumTargetLength = [3, 3, 4, 4, 4, 5];
const pools = tiers.map((t, i) =>
  families
    .map((f) => [
      f[0],
      ...f.slice(1).filter((w) => w.length >= minimumTargetLength[i]),
    ])
    .filter(
      (f) =>
        f[0].length >= t.min && f[0].length <= t.max && f.length >= t.words,
    ),
);
const layouts = [
  { name: "weave", aspect: 1 },
  { name: "tower", aspect: 0.7 },
  { name: "spread", aspect: 1.5 },
  { name: "stair", aspect: 1 },
  { name: "fan", aspect: 1.2 },
  { name: "cascade", aspect: 0.85 },
];
export function canSpell(word, letters) {
  const pool = [...letters];
  return [...word].every((c) => {
    const i = pool.indexOf(c);
    if (i < 0) return false;
    pool.splice(i, 1);
    return true;
  });
}
function random(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function mixWheel(letters, seed) {
  const rng = random(seed),
    chars = [...letters];
  for (let attempt = 0; attempt < 64; attempt++) {
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const wheel = chars.join(""),
      reverse = [...wheel].reverse().join("");
    if (
      !(wheel + wheel).includes(letters) &&
      !(reverse + reverse).includes(letters)
    )
      return wheel;
  }
  throw new Error("Cannot mix wheel");
}
const catalogRetries = new Map();
export function makePuzzle(id, attempt = catalogRetries.get(id) || 0) {
  if (!Number.isInteger(id) || id < 1 || id > totalPuzzles)
    throw new Error("Unknown puzzle");
  const tier = Math.floor((id - 1) / perTier),
    pool = pools[tier],
    family = pool[((id - 1) % perTier) % pool.length],
    letters = family[0],
    rng = random(id * 731 + attempt * 119);
  const count = tiers[tier].words;
  const candidates = family.slice(1);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  if (tier >= 4) candidates.sort((a, b) => b.length - a.length);
  const words = [letters, ...candidates.slice(0, count - 1)];
  const layout = layouts[(id - 1) % layouts.length];
  const occupied = new Map(),
    slots = [];
  const directions = tiers[tier].directions;
  const firstDirection = directions[Math.floor(rng() * directions.length)];
  const key = (x, y) => `${x},${y}`;
  for (const word of words) {
    let best;
    const tries = slots.length
      ? [...occupied.entries()].flatMap(([k, c]) =>
          [...word].flatMap((letter, i) =>
            letter === c
              ? directions.map(([dx, dy]) => {
                  const [x, y] = k.split(",").map(Number);
                  return { x: x - i * dx, y: y - i * dy, dx, dy };
                })
              : [],
          ),
        )
      : [{ x: 0, y: 0, dx: firstDirection[0], dy: firstDirection[1] }];
    for (const pos of tries) {
      const cells = [...word].map((letter, i) => ({
        x: pos.x + i * pos.dx,
        y: pos.y + i * pos.dy,
        letter,
      }));
      if (
        cells.some(
          (c) =>
            occupied.has(key(c.x, c.y)) &&
            occupied.get(key(c.x, c.y)) !== c.letter,
        )
      )
        continue;
      if (
        slots.some(
          (s) =>
            s.dx * pos.dy === s.dy * pos.dx &&
            cells.some((c) => s.cells.some((d) => c.x === d.x && c.y === d.y)),
        )
      )
        continue;
      if (cells.every((c) => occupied.has(key(c.x, c.y)))) continue;
      const all = [...occupied.keys()]
        .map((k) => k.split(",").map(Number))
        .concat(cells.map((c) => [c.x, c.y]));
      const width =
        Math.max(...all.map((c) => c[0])) -
        Math.min(...all.map((c) => c[0])) +
        1;
      const height =
        Math.max(...all.map((c) => c[1])) -
        Math.min(...all.map((c) => c[1])) +
        1;
      if (width > 12 || height > 12) continue;
      const centerX = all.reduce((sum, c) => sum + c[0], 0) / all.length,
        centerY = all.reduce((sum, c) => sum + c[1], 0) / all.length;
      const stairBias =
        layout.name === "stair" || layout.name === "cascade"
          ? (all.reduce(
              (sum, c) => sum + Math.abs(c[0] - centerX - (c[1] - centerY)),
              0,
            ) /
              all.length) *
            5
          : 0;
      const crossings = cells.filter((c) => occupied.has(key(c.x, c.y))).length;
      const weaveBias = layout.name === "weave" ? -crossings * 7 : 0;
      const score =
        width * height +
        Math.max(width, height) ** 2 * 0.85 +
        Math.abs(width - height * layout.aspect) * 9 +
        stairBias +
        weaveBias +
        rng() * 12;
      if (!best || score < best.score) best = { ...pos, cells, score };
    }
    if (!best) {
      if (attempt >= 64) throw new Error(`Cannot place ${word} in ${id}`);
      return makePuzzle(id, attempt + 1);
    }
    slots.push({ word, ...best });
    best.cells.forEach((c) => occupied.set(key(c.x, c.y), c.letter));
  }
  const minX = Math.min(...slots.flatMap((s) => s.cells.map((c) => c.x))),
    minY = Math.min(...slots.flatMap((s) => s.cells.map((c) => c.y)));
  slots.forEach((s) => {
    s.cells.forEach((c) => {
      c.x -= minX;
      c.y -= minY;
    });
    delete s.score;
  });
  return {
    id,
    layout: layout.name,
    difficulty: difficulties[tier],
    letters,
    wheel: mixWheel(letters, id * 7919 + 17),
    slots,
    width: Math.max(...slots.flatMap((s) => s.cells.map((c) => c.x))) + 1,
    height: Math.max(...slots.flatMap((s) => s.cells.map((c) => c.y))) + 1,
  };
}
export const puzzles = [];
const signatures = new Set();
for (let id = 1; id <= totalPuzzles; id++) {
  let puzzle,
    signature,
    variant = 0;
  do {
    puzzle = makePuzzle(id, variant);
    signature = JSON.stringify(puzzle.slots.map((s) => [s.word, s.cells]));
    if (!signatures.has(signature)) break;
    if (++variant > 64) throw new Error(`Duplicate puzzle ${id}`);
  } while (true);
  // Keep collision retries so regenerating a catalog ID returns the same board.
  catalogRetries.set(id, variant);
  signatures.add(signature);
  puzzles.push(puzzle);
}
export function checkGuess(puzzle, word, found, bonus, dictionary) {
  if (!/^[A-Z]{3,8}$/.test(word) || !canSpell(word, puzzle.letters))
    return "invalid";
  if (found.includes(word) || bonus.includes(word)) return "duplicate";
  if (puzzle.slots.some((s) => s.word === word)) return "found";
  return dictionary.has(word) ? "bonus" : "invalid";
}
