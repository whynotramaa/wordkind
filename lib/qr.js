import QRCode from "qrcode";
export function shareTarget(value, origin) {
  let target;
  try {
    target = new URL(value || origin);
  } catch {
    throw Object.assign(Error("Invalid share link."), { status: 400 });
  }
  const source = new URL(origin);
  if (
    !["http:", "https:"].includes(target.protocol) ||
    target.host !== source.host ||
    target.username ||
    target.password ||
    target.pathname !== "/" ||
    target.hash ||
    target.href.length > 512 ||
    [...target.searchParams.keys()].some((key) => key !== "room") ||
    (target.searchParams.has("room") &&
      !/^[a-f0-9]{12}$/.test(target.searchParams.get("room")))
  )
    throw Object.assign(Error("Invalid share link."), { status: 400 });
  return target.href;
}
export function shareQrSvg(target) {
  const { modules } = QRCode.create(target, { errorCorrectionLevel: "H" }),
    size = modules.size,
    unit = 6,
    offset = 40,
    edge = (size + 8) * unit + 32;
  const finder = (x, y) =>
    `<rect x="${x}" y="${y}" width="42" height="42" rx="6" fill="#70517f"/><rect x="${x + 6}" y="${y + 6}" width="30" height="30" rx="4" fill="#fffef9"/><rect x="${x + 12}" y="${y + 12}" width="18" height="18" rx="3" fill="#405d42"/>`;
  let cells = "";
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (
        (x < 7 && y < 7) ||
        (x >= size - 7 && y < 7) ||
        (x < 7 && y >= size - 7)
      )
        continue;
      if (modules.get(y, x))
        cells += `<rect x="${offset + x * unit}" y="${offset + y * unit}" width="6" height="6" rx="1.25" fill="${(x + y) % 3 === 0 ? "#70517f" : "#405d42"}"/>`;
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${edge}" height="${edge}" viewBox="0 0 ${edge} ${edge}"><rect width="${edge}" height="${edge}" rx="24" fill="#e6e0f5"/><rect x="12" y="12" width="${edge - 24}" height="${edge - 24}" rx="16" fill="#fffef9"/>${cells}${finder(offset, offset)}${finder(offset + (size - 7) * unit, offset)}${finder(offset, offset + (size - 7) * unit)}<circle cx="${edge - 9}" cy="9" r="7" fill="#ed827c"/><circle cx="9" cy="${edge - 9}" r="7" fill="#d6e8ba"/></svg>`;
}
