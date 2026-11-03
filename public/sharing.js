export const timeLabel = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
export function scoreText(card) {
  return [
    `Wordkind · ${card.title.replace(/\n/g, " ")}`,
    card.subtitle,
    ...card.players.map((p) => `${p.name}: ${p.score}`),
    ...card.rounds.map(
      (r) => `Round ${r.round}: ${r.label} · ${timeLabel(r.elapsedMs)}`,
    ),
    ...card.details.map((d) => `${d.label}: ${d.value}`),
    location.origin,
  ]
    .filter(Boolean)
    .join("\n");
}
function fit(ctx, text, maxWidth, start, min = 24) {
  let size = start;
  while (size > min) {
    ctx.font = `800 ${size}px Manrope`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size--;
  }
  return size;
}
export async function scoreImage(card) {
  await document.fonts.ready;
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1350;
  const x = c.getContext("2d");
  const rect = (a, b, w, h, r, color) => {
    x.fillStyle = color;
    x.beginPath();
    x.roundRect(a, b, w, h, r);
    x.fill();
  };
  const text = (value, a, b, size = 28, color = "#303a30", bold = false) => {
    x.fillStyle = color;
    x.font = `${bold ? "800" : "400"} ${size}px ${bold ? "Manrope" : "DM"}`;
    x.fillText(value, a, b);
  };
  rect(0, 0, 1080, 1350, 0, "#e6e0f5");
  rect(65, 65, 950, 1220, 24, "#fffef9");
  // The circles cut a regular postage perforation into the ticket.
  for (let y = 95; y < 1280; y += 38) {
    for (const a of [65, 1015]) {
      x.beginPath();
      x.arc(a, y, 9, 0, Math.PI * 2);
      x.fillStyle = "#e6e0f5";
      x.fill();
    }
  }
  text("wordkind.", 115, 145, 45, "#303a30", true);
  text(
    card.match ? "A LITTLE FRIENDLY COMPETITION" : "A LITTLE WORDPLAY",
    115,
    192,
    18,
    "#606657",
  );
  const title = card.title.split("\n");
  title.forEach((line, i) => {
    const size = fit(x, line, 850, 64, 38);
    text(line, 115, 295 + i * 80, size, "#303a30", true);
  });
  const top = title.length > 1 ? 445 : 375;
  text(card.subtitle, 115, top, 24, "#606657");
  const scoreY = top + 45;
  if (card.match) {
    card.players.forEach((p, i) => {
      const left = 115 + i * 440;
      rect(left, scoreY, 410, 220, 16, i ? "#f3efb3" : "#d6e8ba");
      text(
        p.name,
        left + 25,
        scoreY + 55,
        fit(x, p.name, 360, 28, 18),
        "#303a30",
        true,
      );
      text(String(p.score), left + 25, scoreY + 165, 100, "#303a30", true);
    });
  } else {
    rect(115, scoreY, 850, 170, 16, "#d6e8ba");
    text(
      card.players[0]?.name || "Puzzle solved",
      145,
      scoreY + 55,
      28,
      "#303a30",
      true,
    );
    text(
      String(card.players[0]?.score || 0),
      145,
      scoreY + 133,
      65,
      "#303a30",
      true,
    );
    text("words found", 290, scoreY + 125, 26, "#45633b");
  }
  let y = scoreY + (card.match ? 275 : 225);
  x.strokeStyle = "#d4d9c9";
  x.setLineDash([7, 7]);
  x.beginPath();
  x.moveTo(115, y - 20);
  x.lineTo(965, y - 20);
  x.stroke();
  for (const r of card.rounds) {
    text(`ROUND ${r.round}`, 115, y + 30, 19, "#606657");
    text(r.label, 275, y + 30, 25, "#303a30", true);
    text(timeLabel(r.elapsedMs), 875, y + 30, 24, "#606657");
    y += 65;
  }
  for (const d of card.details) {
    text(d.label, 115, y + 30, 24, "#606657");
    const size = fit(x, String(d.value), 350, 28, 20);
    x.textAlign = "right";
    text(String(d.value), 965, y + 30, size, "#303a30", true);
    x.textAlign = "left";
    y += 60;
  }
  text("No sign-ups. Just words & bragging rights.", 115, 1200, 24, "#606657");
  text("WORDKIND · FRIENDLY BY NATURE", 115, 1240, 17, "#72638e");
  return new Promise((resolve, reject) =>
    c.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(Error("Could not create your scorecard.")),
      "image/png",
    ),
  );
}
export async function downloadScore(card) {
  const blob = await scoreImage(card),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "wordkind-scorecard.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function shareScore(card) {
  const blob = await scoreImage(card),
    file = new File([blob], "wordkind-scorecard.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "Wordkind scorecard",
      text: card.subtitle,
    });
    return "shared";
  }
  await downloadScore(card);
  return "downloaded";
}
