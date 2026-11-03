export const qrSource = (target) =>
  `/api/qr?target=${encodeURIComponent(target)}`;
async function qrImage(target) {
  const image = new Image();
  image.src = qrSource(target);
  await image.decode();
  return image;
}
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
function wrapLink(ctx, value, width) {
  const lines = [];
  let line = "";
  for (const c of value) {
    if (line && ctx.measureText(line + c).width > width) {
      lines.push(line);
      line = "";
    }
    line += c;
  }
  if (line) lines.push(line);
  return lines;
}
export async function scoreImage(card) {
  await document.fonts.ready;
  const qr = await qrImage(location.origin);
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
  x.drawImage(qr, 115, 1040, 215, 215);
  text("Pass the word.", 365, 1110, 32, "#405d42", true);
  text("Scan for a little wordplay.", 365, 1152, 24, "#606657");
  x.font = "400 20px DM";
  wrapLink(x, location.origin, 570).forEach((line, i) =>
    text(line, 365, 1182 + i * 24, 20, "#70517f"),
  );
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

export async function inviteImage(target) {
  await document.fonts.ready;
  const qr = await qrImage(target),
    canvas = document.createElement("canvas");
  canvas.width = 720;
  const ctx = canvas.getContext("2d");
  ctx.font = "400 18px DM";
  const words = wrapLink(ctx, target, 564);
  canvas.height = Math.max(960, 850 + words.length * 25 + 70);
  ctx.fillStyle = "#e6e0f5";
  ctx.fillRect(0, 0, 720, canvas.height);
  ctx.fillStyle = "#fffef9";
  ctx.beginPath();
  ctx.roundRect(35, 35, 650, canvas.height - 70, 25);
  ctx.fill();
  for (let y = 65; y < canvas.height - 35; y += 30) {
    ctx.fillStyle = "#e6e0f5";
    for (const x of [35, 685]) {
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const text = (value, x, y, size, color = "#303a30") => {
    ctx.font = `800 ${size}px Manrope`;
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  };
  text("wordkind.", 78, 107, 32);
  text("Chai later.", 78, 190, 48);
  text("Wordplay now.", 78, 250, 48);
  ctx.drawImage(qr, 160, 290, 400, 400);
  text("Scan. Join. Game on.", 160, 746, 25, "#405d42");
  ctx.font = "400 18px DM";
  ctx.fillStyle = "#70517f";
  words.forEach((line, i) => ctx.fillText(line, 78, 810 + i * 25));
  ctx.fillStyle = "#606657";
  ctx.fillText(
    "Best of three. A little friendly trouble.",
    78,
    canvas.height - 75,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(Error("Could not create your invite.")),
      "image/png",
    ),
  );
}
export async function shareInvite(target) {
  const blob = await inviteImage(target),
    file = new File([blob], "wordkind-invite.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: "A little friendly Wordkind",
      text: target,
    });
    return "shared";
  }
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = "wordkind-invite.png";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
