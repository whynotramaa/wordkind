import { readFileSync } from "node:fs";
import path from "node:path";
export const dictionary = new Set(
  readFileSync(path.join(process.cwd(), "words.txt"), "utf8")
    .split("\n")
    .map((w) => w.toUpperCase()),
);
