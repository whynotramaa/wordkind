// Store each word's start and direction instead of repeating every cell.
export function expandCatalog(catalog) {
  return catalog.map((p) => ({
    ...p,
    slots: p.slots.map(([word, x, y, dx, dy]) => ({
      word,
      dx,
      dy,
      cells: [...word].map((letter, i) => ({
        x: x + i * dx,
        y: y + i * dy,
        letter,
      })),
    })),
  }));
}
