import catalog from "./lib/puzzle-catalog.js";
import { expandCatalog } from "./public/catalog.js";
export const puzzles = expandCatalog(catalog);
export function canSpell(word, letters) {
  const pool = [...letters];
  return [...word].every((c) => {
    const i = pool.indexOf(c);
    if (i < 0) return false;
    pool.splice(i, 1);
    return true;
  });
}
export function checkGuess(puzzle, word, found, bonus, dictionary) {
  if (!/^[A-Z]{3,8}$/.test(word) || !canSpell(word, puzzle.letters))
    return "invalid";
  if (found.includes(word) || bonus.includes(word)) return "duplicate";
  if (puzzle.slots.some((s) => s.word === word)) return "found";
  return dictionary.has(word) ? "bonus" : "invalid";
}
