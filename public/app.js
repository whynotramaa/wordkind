import { tiers, dailyId } from "/rules.js";
import { expandCatalog } from "/catalog.js";
import {
  timeLabel,
  scoreText,
  downloadScore,
  shareScore,
  qrSource,
  shareInvite,
} from "/sharing.js";
const $ = (s) => document.querySelector(s);
const icons = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',

  sound:
    '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  wallet:
    '<path d="M4 6h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h13v2"/><path d="M20 10h-5v5h5"/><path d="M17 12.5h.01"/>',
  arrow: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
  refresh:
    '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .5-1.5 1-1.5 2m0 3h.01"/>',
  sparkle:
    '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
  shuffle:
    '<path d="M3 6h3c4 0 6 12 10 12h5m-4-4 4 4-4 4M3 18h3c1.5 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4"/>',
  bulb: '<path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 1-1 3-1 4H9c0-1 0-3-1-4Z"/>',
  flower:
    '<path d="M12 8c-8-10-13 2-4 4-10 8 2 13 4 4 8 10 13-2 4-4 10-8-2-13-4-4Z"/><circle cx="12" cy="12" r="1.5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
function fillIcons(root = document) {
  root
    .querySelectorAll("[data-icon]")
    .forEach(
      (el) =>
        (el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[el.dataset.icon] || ""}</svg>`),
    );
}
$("#difficulty-options").innerHTML = tiers
  .map(
    (t, i) =>
      `<button class="difficulty${t.id === "easy" ? " active" : ""}" data-difficulty="${t.id}" title="${t.description}"><span class="tier-dots" aria-hidden="true">${"<i></i>".repeat(i + 1)}</span>${t.name}<span>${t.words} words</span></button>`,
  )
  .join("");
fillIcons();
let puzzles = [],
  puzzle,
  found = [],
  bonus = [],
  wallet = new Set(),
  hints = new Set(),
  order = [],
  selected = [],
  dragging = false,
  moved = false,
  startPoint,
  room = null,
  roomCode = null,
  roomPoll = null,
  roomOnline = false,
  roomClockOffset = 0,
  you,
  submitting = false,
  pendingFound = new Set(),
  celebrated = false,
  soloDifficulty = "easy",
  toastTimer,
  feedbackTimer,
  roomShown = "",
  connectionVersion = 0;
let soloMode = "zen",
  run = { startedAt: Date.now(), hints: 0, mistakes: 0, ended: false },
  visit = { solved: 0, words: 0, bonus: 0 },
  recent = [],
  soundOn = false,
  audio = null;
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3000);
}
function modal(html, wide = false) {
  $("#settings-dialog").close();
  $("#dialog").classList.remove("wallet-drawer");
  $("#dialog").classList.toggle("wide", wide);
  $("#dialog-content").innerHTML = html;
  fillIcons($("#dialog"));
  const heading = $("#dialog-content h2");
  if (heading) {
    heading.id = "dialog-heading";
    $("#dialog").setAttribute("aria-labelledby", "dialog-heading");
  }
  if (!$("#dialog").open) $("#dialog").showModal();
}
function closeDialog() {
  $("#dialog").close();
}
$("#close-dialog").onclick = closeDialog;
$("#dialog").addEventListener("click", (e) => {
  if (e.target === $("#dialog")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeDialog();
  }
});
// Start the private session in parallel, but never hold up a solo puzzle for it.
const sessionReady = fetch("/api/session", {
  signal: AbortSignal.timeout(10000),
}).then((response) => {
  if (!response.ok) throw Error("Couldn’t start your session. Refresh to retry.");
});
sessionReady.catch(() => {});
async function api(path, data) {
  if (path.startsWith("/api/rooms")) await sessionReady;
  const response = await fetch(path, {
    signal: AbortSignal.timeout(10000),
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw Object.assign(
      Error(result.error || "Something went wrong. Try again."),
      { status: response.status },
    );
  return result;
}
function setPuzzle(id) {
  run = { startedAt: Date.now(), hints: 0, mistakes: 0, ended: false };
  recent.push(id);
  if (recent.length > 30) recent.shift();
  puzzle = puzzles.find((p) => p.id === id);
  found = [];
  bonus = [];
  pendingFound.clear();
  hints.clear();
  selected = [];
  celebrated = false;
  $("#word-input").value = "";
  order = [...puzzle.wheel].map((letter, id) => ({ letter, id }));
  clearTimeout(feedbackTimer);
  $("#board-message").textContent = "";
  renderBoard();
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
    $("#board").animate(
      [
        { opacity: 0.35, transform: "translateY(6px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 260, easing: "cubic-bezier(.16,1,.3,1)" },
    );
  renderWheel();
  updateControls();
  renderSession();
  updateClock();
}
function randomPuzzle() {
  if (!puzzles.length) return;
  if (soloMode === "daily") {
    setPuzzle(dailyId());
    return;
  }
  let options = puzzles.filter(
    (p) => p.difficulty === soloDifficulty && !recent.includes(p.id),
  );
  if (!options.length)
    options = puzzles.filter((p) => p.difficulty === soloDifficulty);
  setPuzzle(options[Math.floor(Math.random() * options.length)].id);
}
function updateControls() {
  const racing = !!room;
  $(".game-progress").hidden = false;
  $("#new-puzzle").disabled = racing;
  $("#hint-button").disabled = racing;
  $("#library-button").disabled = racing;
  document.querySelectorAll(".difficulty").forEach((b) => {
    b.disabled = racing || soloMode === "daily";
    b.classList.toggle("active", b.dataset.difficulty === puzzle.difficulty);
    b.setAttribute(
      "aria-pressed",
      String(b.dataset.difficulty === puzzle.difficulty),
    );
  });
  $("#solo-nav").classList.toggle("active", !racing);
  $("#race-nav").classList.toggle("active", racing);
  $("#solo-nav").setAttribute("aria-pressed", String(!racing));
  $("#race-nav").setAttribute("aria-pressed", String(racing));
  $("#level-label").textContent = racing
    ? `Round ${room.round || 1} of 3`
    : soloMode === "daily"
      ? `Daily · ${new Date().toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" })}`
      : `Puzzle ${String(puzzle.id).padStart(3, "0")}`;
  $("#level-label").title = `Puzzle ${puzzle.id}`;
  const tier = tiers.find((t) => t.id === puzzle.difficulty);
  $("#difficulty-label").textContent = tier.name;
  $("#difficulty-label").title = tier.description;
  document.querySelectorAll("[data-mode]").forEach((b) => {
    b.disabled = racing;
    b.classList.toggle("active", b.dataset.mode === soloMode);
    b.setAttribute("aria-pressed", String(b.dataset.mode === soloMode));
  });
  $("#new-puzzle").disabled = racing || soloMode === "daily";
}
function renderBoard(newWord = "") {
  const cells = new Map();
  puzzle.slots.forEach((s) =>
    s.cells.forEach((c, j) => {
      const key = `${c.x},${c.y}`;
      let cell = cells.get(key) || {
        ...c,
        solved: false,
        new: false,
      };
      if (found.includes(s.word)) {
        cell.solved = true;
        if (s.word === newWord) {
          cell.new = true;
          cell.delay = j * 45;
        }
      }
      cells.set(key, cell);
    }),
  );
  const available = $(".game").clientWidth - 24;
  const compact = innerWidth <= 650;
  const boardRoom = Math.max(
    160,
    Math.min(300, innerHeight - (compact ? 470 : 465)),
  );
  const areaHeight = Math.min(
    boardRoom,
    Math.max(195, puzzle.height * 38 + 20),
  );
  $(".board-area").style.height = `${areaHeight}px`;
  const tile = Math.min(
    46,
    Math.floor((available - (puzzle.width - 1) * 5) / puzzle.width),
    Math.floor((areaHeight - 18 - (puzzle.height - 1) * 5) / puzzle.height),
  );
  $("#board").style.cssText =
    `--tile:${tile}px;grid-template-columns:repeat(${puzzle.width},${tile}px);grid-template-rows:repeat(${puzzle.height},${tile}px)`;
  $("#board").innerHTML = [...cells.entries()]
    .map(
      ([key, c]) =>
        `<div role="img" class="cell${c.solved ? " solved" : ""}${c.new ? " just-found" : ""}${hints.has(key) && !c.solved ? " hinted" : ""}" style="grid-column:${c.x + 1};grid-row:${c.y + 1};--delay:${c.delay || 0}ms;font-size:${Math.max(12, Math.min(22, tile * 0.48))}px" aria-label="${c.solved || hints.has(key) ? c.letter : "Empty letter"}">${c.solved || hints.has(key) ? c.letter : ""}</div>`,
    )
    .join("");
  $("#progress-label").textContent =
    `${found.length} / ${puzzle.slots.length} words`;
  $("#word-checklist").innerHTML = puzzle.slots
    .map(
      (s, i) =>
        `<span class="word-chip${found.includes(s.word) ? " complete" : ""}" title="Word ${i + 1}: ${s.word.length} letters">${found.includes(s.word) ? s.word : `${i + 1} · ${s.word.length} letters`}</span>`,
    )
    .join("");
}
let lastGameWidth = 0;
new ResizeObserver(([entry]) => {
  const width = entry.contentRect.width;
  if (puzzle && width !== lastGameWidth) {
    lastGameWidth = width;
    renderBoard();
  }
}).observe($(".game"));
window.addEventListener("resize", () => {
  if (puzzle) renderBoard();
});
function positions() {
  return order.map((_, i) => {
    const angle = (i / order.length) * Math.PI * 2 - Math.PI / 2;
    return { x: 130 + 94 * Math.cos(angle), y: 130 + 94 * Math.sin(angle) };
  });
}
function renderWheel() {
  const points = positions(),
    container = $("#letters");
  if (container.children.length !== order.length)
    container.innerHTML = order
      .map((_, i) => `<button class="letter" data-index="${i}"></button>`)
      .join("");
  [...container.children].forEach((button, i) => {
    button.textContent = order[i].letter;
    button.setAttribute("aria-label", `Letter ${order[i].letter}`);
    button.setAttribute("aria-pressed", String(selected.includes(i)));
    button.classList.toggle("selected", selected.includes(i));
    button.style.setProperty("--x", `${points[i].x / 2.6}%`);
    button.style.setProperty("--y", `${points[i].y / 2.6}%`);
  });
  $("#clear-word").hidden = !selected.length && !$("#word-input").value;
  $("#wheel-line").setAttribute(
    "points",
    selected.map((i) => `${points[i].x},${points[i].y}`).join(" "),
  );
}
function choose(i) {
  if (selected.at(-1) === i) return;
  if (selected.at(-2) === i) selected.pop();
  else if (!selected.includes(i)) selected.push(i);
  $("#word-input").value = selected.map((j) => order[j].letter).join("");
  renderWheel();
}
$("#wheel").addEventListener("pointerdown", (e) => {
  const letter = e.target.closest(".letter");
  if (!letter) return;
  e.preventDefault();
  dragging = true;
  moved = false;
  startPoint = { x: e.clientX, y: e.clientY };
  $("#wheel").setPointerCapture(e.pointerId);
  choose(Number(letter.dataset.index));
});
$("#wheel").addEventListener("pointermove", (e) => {
  if (!dragging) return;
  if (Math.hypot(e.clientX - startPoint.x, e.clientY - startPoint.y) > 10)
    moved = true;
  const r = $("#wheel").getBoundingClientRect(),
    x = ((e.clientX - r.left) / r.width) * 260,
    y = ((e.clientY - r.top) / r.height) * 260;
  positions().forEach((p, i) => {
    if (Math.hypot(x - p.x, y - p.y) < 24) choose(i);
  });
});
$("#wheel").addEventListener("pointerup", () => {
  if (!dragging) return;
  dragging = false;
  if (moved) {
    if (selected.length >= 3) submit();
    else clearWord();
  }
});
$("#wheel").addEventListener("pointercancel", () => {
  dragging = false;
  clearWord();
});
$("#wheel").addEventListener("click", (e) => {
  if (e.detail === 0 && e.target.closest(".letter"))
    choose(Number(e.target.closest(".letter").dataset.index));
});
function clearWord() {
  selected = [];
  $("#word-input").value = "";
  renderWheel();
}
$("#word-input").addEventListener("input", () => {
  selected = [];
  $("#word-input").value = $("#word-input")
    .value.replace(/[^a-z]/gi, "")
    .toUpperCase();
  renderWheel();
});
$("#word-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") submit();
  if (e.key === "Escape") clearWord();
});
$("#submit-word").onclick = submit;
$("#clear-word").onclick = clearWord;
function spellable(word) {
  const letters = [...puzzle.letters];
  return [...word].every((c) => {
    const i = letters.indexOf(c);
    if (i < 0) return false;
    letters.splice(i, 1);
    return true;
  });
}
function result(word, result, clearInput = true) {
  if (result === "found") {
    if (!found.includes(word)) {
      found.push(word);
      visit.words++;
    }
    beep("found");
    renderSession();
    renderBoard(word);
    $("#board-message").textContent = word;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(
      () => ($("#board-message").textContent = ""),
      1800,
    );
  } else if (result === "bonus") {
    if (!bonus.includes(word)) bonus.push(word);
    const fresh = !wallet.has(word);
    wallet.add(word);
    if (fresh) visit.bonus++;
    beep("bonus");
    updateWallet();
    renderSession();
    flyToWallet(word);
  } else if (result === "duplicate")
    toast("Already found. Your next word is out there.");
  else {
    run.mistakes++;
    toast("Not in our word list. Try another combination.");
    $("#word-input").parentElement.classList.add("shake");
    setTimeout(() => $(".word-entry").classList.remove("shake"), 350);
  }
  if (clearInput) clearWord();
  if (!room && found.length === puzzle.slots.length && !celebrated) {
    celebrated = true;
    run.ended = true;
    run.elapsedMs = Date.now() - run.startedAt;
    visit.solved++;
    renderSession();
    const solvedId = puzzle.id;
    setTimeout(() => {
      if (
        !room &&
        puzzle.id === solvedId &&
        found.length === puzzle.slots.length
      )
        soloResult();
    }, 650);
  }
}
async function submit() {
  const word = $("#word-input").value.toUpperCase();
  if (submitting || !puzzle) return;
  if (!room && run.ended) {
    toast("This round is over. Pick a new puzzle or retry.");
    return;
  }
  if (word.length < 3) {
    toast("A little longer. Try 3 or more letters.");
    return;
  }
  if (room) {
    if (
      room.status !== "playing" ||
      Date.now() + roomClockOffset < room.startAt
    ) {
      toast("Hold that thought. The round hasn’t started.");
      return;
    }
    if (!roomOnline) {
      toast("Connection lost. Reconnect before submitting.");
      return;
    }
    clearWord();
    if (!spellable(word)) {
      toast("Use only the wheel’s letters, once per tile.");
      return;
    }
    if (found.includes(word)) return result(word, "duplicate");
    if (puzzle.slots.some((s) => s.word === word)) {
      pendingFound.add(word);
      result(word, "found");
      renderRace();
    }
    await sendRoomAction({ type: "guess", word });
    pendingFound.delete(word);
    return;
  }
  if (found.includes(word) || bonus.includes(word))
    return result(word, "duplicate");
  if (!spellable(word)) {
    run.mistakes++;
    toast("Use only the wheel’s letters, once per tile.");
    clearWord();
    return;
  }
  if (puzzle.slots.some((s) => s.word === word)) return result(word, "found");
  submitting = true;
  $("#submit-word").disabled = true;
  const id = puzzle.id,
    submittedRun = run;
  try {
    const response = await api("/api/word", { word, id });
    if (puzzle.id === id && run === submittedRun && !run.ended && !room)
      result(word, response.valid ? "bonus" : "invalid");
  } catch (e) {
    toast("Couldn’t check that word. Try again.");
  } finally {
    submitting = false;
    $("#submit-word").disabled = false;
  }
}
$("#shuffle-button").onclick = () => {
  const previous = positions(),
    old = new Map(order.map((item, i) => [item.id, previous[i]]));
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  clearWord();
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const next = positions();
    $("#letters")
      .querySelectorAll(".letter")
      .forEach((button, i) => {
        const from = old.get(order[i].id);
        button.animate(
          [
            {
              transform: `translate(-50%,-50%) translate(${from.x - next[i].x}px,${from.y - next[i].y}px)`,
            },
            { transform: "translate(-50%,-50%) translate(0,0)" },
          ],
          { duration: 320, easing: "cubic-bezier(.16,1,.3,1)" },
        );
      });
  }
};

$("#hint-button").onclick = () => {
  if (room || !puzzle) return;
  const c = puzzle.slots
    .filter((s) => !found.includes(s.word))
    .flatMap((s) => s.cells)
    .find(
      (c) =>
        !hints.has(`${c.x},${c.y}`) &&
        !puzzle.slots.some(
          (s) =>
            found.includes(s.word) &&
            s.cells.some((d) => c.x === d.x && c.y === d.y),
        ),
    );
  if (!c) {
    toast("All the letters are there. Put the words together!");
    return;
  }
  hints.add(`${c.x},${c.y}`);
  run.hints++;
  renderBoard();
  toast("A tiny nudge. One letter revealed.");
};
$("#new-puzzle").onclick = () => {
  if (!room) randomPuzzle();
};
document.querySelectorAll(".difficulty").forEach(
  (button) =>
    (button.onclick = () => {
      if (room) return;
      soloDifficulty = button.dataset.difficulty;
      soloMode = soloMode === "daily" ? "zen" : soloMode;
      randomPuzzle();
      $("#settings-dialog").close();
    }),
);
function updateWallet() {
  $("#wallet-count").textContent = wallet.size;
  $("#wallet-count").hidden = !wallet.size;
  $("#wallet-nav").setAttribute(
    "aria-label",
    `Word wallet, ${wallet.size} words`,
  );
}
function openWallet() {
  modal(
    `<h2>Word wallet<span class="brand-dot">.</span></h2><p>${wallet.size} little finds. ${wallet.size ? `Longest: ${esc([...wallet].sort((a, b) => b.length - a.length)[0])}.` : "Make a valid word outside the board to start collecting."}</p><div class="wallet-tools"><input id="wallet-search" aria-label="Search collected words" placeholder="Find a word…"><select id="wallet-sort" aria-label="Sort words"><option value="alpha">A to Z</option><option value="length">Longest first</option></select></div><div class="word-list" id="wallet-list"></div><button class="primary-button" id="copy-wallet">Copy my words</button><p class="room-note">Your collection clears when you refresh.</p>`,
  );
  $("#dialog").classList.add("wallet-drawer");
  const draw = () => {
    let words = [...wallet].filter((w) =>
      w.includes($("#wallet-search").value.toUpperCase()),
    );
    words.sort(
      $("#wallet-sort").value === "length"
        ? (a, b) => b.length - a.length || a.localeCompare(b)
        : (a, b) => a.localeCompare(b),
    );
    $("#wallet-list").innerHTML = words.length
      ? words.map((w) => `<span>${w}</span>`).join("")
      : '<p class="empty-state">Find a bonus word to start your collection.</p>';
  };
  $("#wallet-search").oninput = draw;
  $("#wallet-sort").onchange = draw;
  $("#copy-wallet").disabled = !wallet.size;
  $("#copy-wallet").onclick = () =>
    copyText([...wallet].sort().join(", "), "Your word collection is copied.");
  draw();
}
$("#wallet-nav").onclick = openWallet;
$("#open-wallet").onclick = openWallet;
$("#how-button").onclick = () => {
  modal(
    `<h2>A little how-to.</h2><ol><li>Drag across the wheel to submit a word. Or tap letters and press the arrow. Typing + Enter works too.</li><li>Use each tile once per word. Words have at least 3 letters. Backtrack your drag to undo a letter.</li><li>Word-length chips tell you what to find. Hard adds diagonals; Expert and Genius include reverse paths.</li><li>Valid extra words enter your wallet for this visit. Hints are free in solo play.</li><li>Challenge a friend. Both tap Ready, then race to fill the same board. First to two points wins, up to three rounds.</li></ol><button class="primary-button" id="show-demo">Show me a word</button><p class="room-note">Escape clears your selection when the input is focused. No login, no saved history.</p>`,
  );
  $("#show-demo").onclick = showDemo;
};
function soloResult(expired = false) {
  const title = expired
    ? "Chai break.\nClock’s up."
    : "Arre wah,\nword wizard.";
  const card = {
    title,
    subtitle: expired
      ? "A little less overthinking. One more go?"
      : "Puzzle solved. Your brain deserves a chai.",
    match: false,
    players: [
      {
        name: `${tiers.find((t) => t.id === puzzle.difficulty).name} · Puzzle ${puzzle.id}`,
        score: found.length,
      },
    ],
    rounds: [],
    details: [
      {
        label: "Time",
        value: timeLabel(run.elapsedMs || Date.now() - run.startedAt),
      },
      { label: "Bonus words", value: bonus.length },
      { label: "Hints · Mistakes", value: `${run.hints} · ${run.mistakes}` },
    ],
  };
  renderScore(
    card,
    `<button class="primary-button" id="next-solo">${soloMode === "daily" ? "Back to Zen play" : "One more little puzzle"} <span data-icon="arrow"></span></button>${expired ? '<button class="text-button" id="retry-solo">Retry this puzzle</button>' : ""}`,
  );
  $("#next-solo").onclick = () => {
    closeDialog();
    if (soloMode === "daily") soloMode = "zen";
    randomPuzzle();
  };
  if (expired)
    $("#retry-solo").onclick = () => {
      closeDialog();
      setPuzzle(puzzle.id);
    };
}
function leaveRoom() {
  stopRoomConnection(true);
  room = null;
  roomShown = "";
  history.replaceState(null, "", location.pathname);
  $("#race-strip").hidden = true;
  $("#countdown").hidden = true;
  closeDialog();
  randomPuzzle();
}
$("#solo-nav").onclick = () => {
  if (room) leaveRoom();
  $("#settings-dialog").close();
};
function challengeDialog(code) {
  modal(
    `<div class="dialog-symbol"><span>1</span><span>v</span><span>1</span></div><h2>Send words.<br>Start friendly trouble.</h2><p>Invite your favourite rival. Same puzzles, a simultaneous start, and a best-of-three showdown.</p><label for="player-name">What should your friend call you?</label><input id="player-name" maxlength="20" placeholder="Your name or nickname" value="${esc(window.playerName || "")}" autocomplete="nickname">${code ? "" : `<div class="room-settings"><label>Difficulty<select id="room-difficulty">${tiers.map((t) => `<option value="${t.id}" ${t.id === soloDifficulty ? "selected" : ""}>${t.name}</option>`).join("")}</select></label><label>Time per round<select id="room-time"><option value="60">1 minute</option><option value="180" selected>3 minutes</option><option value="300">5 minutes</option></select></label></div>`}<button class="primary-button" id="create-room">${code ? "Join the room" : "Create an invite link"} <span data-icon="arrow"></span></button><p class="room-note">No account needed. Links last up to 2 hours.</p>`,
  );
  $("#create-room").onclick = async () => {
    const button = $("#create-room");
    window.playerName = $("#player-name").value.trim() || "Chai champion";
    button.disabled = true;
    button.textContent = code ? "Joining…" : "Creating…";
    try {
      const roomCode =
        code ||
        (
          await api("/api/rooms", {
            difficulty: $("#room-difficulty")?.value || "easy",
            seconds: Number($("#room-time")?.value || 180),
          })
        ).code;
      connectRoom(roomCode);
    } catch (e) {
      toast(e.message);
      button.disabled = false;
      button.textContent = "Try again";
    }
  };
}
$("#race-nav").onclick = () => (room ? showRoom() : challengeDialog());
function stopRoomConnection(leave = false) {
  if (leave && roomCode)
    fetch(`/api/rooms/${roomCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "leave" }),
      keepalive: true,
    }).catch(() => {});
  connectionVersion++;
  clearTimeout(roomPoll);
  roomCode = null;
  roomOnline = false;
}
function applyRoomState(msg) {
  if (room && msg.room.code === room.code && msg.room.revision < room.revision)
    return;
  you = msg.you;
  roomClockOffset = msg.serverTime - Date.now();
  const previous = room;
  room = msg.room;
  const me = room.players.find((p) => p.id === you);
  if (
    room.round &&
    (!previous ||
      room.round !== previous.round ||
      room.match !== previous.match ||
      puzzle.id !== room.puzzleId)
  )
    setPuzzle(room.puzzleId);
  const mine = [...new Set([...me.found, ...pendingFound])],
    added = mine.filter((w) => !found.includes(w)),
    changed = found.length !== mine.length || added.length;
  visit.words += added.length;
  found = mine;
  if (changed) renderBoard(added[0]);
  renderSession();
  updateControls();
  renderRace();
  updateClock();
  const playersChanged =
    !previous ||
    room.players.length !== previous.players.length ||
    room.players.some(
      (p, i) =>
        p.ready !== previous.players[i]?.ready ||
        p.online !== previous.players[i]?.online ||
        p.name !== previous.players[i]?.name,
    );
  if (
    !previous ||
    room.status !== previous.status ||
    room.round !== previous.round ||
    room.match !== previous.match ||
    playersChanged
  )
    showRoom();
}
async function sendRoomAction(action) {
  if (!roomCode) return false;
  const version = connectionVersion,
    code = roomCode,
    round = room?.round,
    match = room?.match;
  try {
    const msg = await api(`/api/rooms/${code}`, { ...action, round, match });
    if (version !== connectionVersion) return false;
    roomOnline = true;
    if (msg.guess && room?.round === round && room?.match === match) {
      if (msg.guess.result === "early") toast("The round hasn’t started yet.");
      else if (
        msg.guess.result !== "inactive" &&
        !pendingFound.has(msg.guess.word)
      )
        result(msg.guess.word, msg.guess.result, false);
    }
    applyRoomState(msg);
    return true;
  } catch (error) {
    if (version === connectionVersion) {
      roomOnline = false;
      toast(error.message);
    }
    return false;
  }
}
async function connectRoom(code) {
  stopRoomConnection();
  roomCode = code;
  room = null;
  const version = connectionVersion;
  try {
    const msg = await api(`/api/rooms/${code}`, {
      type: "join",
      name: window.playerName || "Chai champion",
    });
    if (version !== connectionVersion) return;
    roomOnline = true;
    history.replaceState(null, "", `?room=${code}`);
    applyRoomState(msg);
    async function poll() {
      if (version !== connectionVersion) return;
      const started = Date.now();
      try {
        const state = await api(`/api/rooms/${code}`);
        if (version !== connectionVersion) return;
        roomOnline = true;
        applyRoomState(state);
      } catch (error) {
        if (version !== connectionVersion) return;
        if (roomOnline) toast(error.message);
        roomOnline = false;
        if ([401, 403, 404, 409].includes(error.status)) {
          connectionError(code, error.message);
          return;
        }
      }
      if (version === connectionVersion)
        roomPoll = setTimeout(
          poll,
          Math.max(
            0,
            (roomOnline && room?.status === "playing" ? 250 : 750) -
              (Date.now() - started),
          ),
        );
    }
    roomPoll = setTimeout(poll, 750);
  } catch (error) {
    if (version === connectionVersion) connectionError(code, error.message);
  }
}
function connectionError(code, message) {
  roomOnline = false;
  clearTimeout(roomPoll);
  modal(
    `<h2>Couldn’t connect.</h2><p>${esc(message)}</p><button class="primary-button" id="reconnect">Reconnect</button><button class="text-button" id="back-solo">Back to solo</button>`,
  );
  $("#reconnect").onclick = () => connectRoom(code);
  $("#back-solo").onclick = leaveRoom;
}
window.addEventListener("pagehide", () => {
  if (roomCode)
    fetch(`/api/rooms/${roomCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "leave" }),
      keepalive: true,
    }).catch(() => {});
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted && roomCode) connectRoom(roomCode);
});
function renderRace() {
  const strip = $("#race-strip");
  strip.hidden = false;
  const me = room.players.find((p) => p.id === you),
    other = room.players.find((p) => p.id !== you);
  strip.innerHTML = `<div class="racer you"><span>${esc(me.name)} · You <b>${me.score}</b></span><progress max="${puzzle.slots.length}" value="${found.length}" aria-label="Your words found"></progress></div><span class="race-status"></span><div class="racer them"><span>${esc(other?.name || "Waiting…")} <b>${other?.score || 0}</b> ${other && !other.online ? "· Offline" : ""}</span><progress max="${puzzle.slots.length}" value="${other?.found.length || 0}" aria-label="Opponent words found"></progress></div>`;
}
function updateClock() {
  if (!puzzle) return;
  $("#timer-label").hidden = !room && soloMode === "zen";
  const now = Date.now() + (room ? roomClockOffset : 0);
  if (room) {
    const remaining = Math.ceil((room.startAt - now) / 1000),
      status = $(".race-status");
    if (status)
      status.textContent =
        room.status === "playing"
          ? remaining > 0
            ? `Ready? ${remaining}`
            : timeLabel(Math.max(0, room.deadline - now))
          : room.status === "waiting"
            ? "Waiting"
            : room.status === "finished"
              ? "Final"
              : "Round over";
    const countdown = $("#countdown");
    const show = room.status === "playing" && remaining > 0;
    countdown.hidden = !show;
    if (show && countdown.dataset.number !== String(remaining)) {
      countdown.dataset.number = String(remaining);
      countdown.innerHTML = `<span>${remaining}</span><small>Same start. Deep breath.</small>`;
      beep("tick");
    }
    $("#timer-label").textContent =
      room.status === "playing"
        ? remaining > 0
          ? "Get ready…"
          : `${timeLabel(room.deadline - now)} left`
        : "Best of three";
  } else {
    const elapsed = run.elapsedMs || now - run.startedAt;
    $("#countdown").hidden = true;
    $("#timer-label").textContent =
      soloMode === "sprint"
        ? `${timeLabel(180000 - elapsed)} left`
        : soloMode === "daily"
          ? `Daily · ${timeLabel(elapsed)}`
          : "";
    $("#timer-label").classList.toggle(
      "urgent",
      soloMode === "sprint" && elapsed > 150000 && !run.ended,
    );
    if (soloMode === "sprint" && elapsed >= 180000 && !run.ended) {
      run.ended = true;
      run.elapsedMs = 180000;
      soloResult(true);
    }
  }
}
setInterval(updateClock, 200);
function showRoom() {
  if (!room) return;
  if (room.status === "playing") {
    closeDialog();
    roomShown = "";
    return;
  }
  if (room.status === "waiting") {
    const url = `${location.origin}/?room=${room.code}`,
      me = room.players.find((p) => p.id === you),
      other = room.players.find((p) => p.id !== you);
    modal(
      `<h2>Invite a friend<span class="brand-dot">.</span></h2><div class="room-rules">${esc(tiers.find((t) => t.id === room.settings.difficulty).name)} · ${room.settings.seconds / 60} min / round · Best of 3</div>${!other ? `<div class="invite-share"><img id="invite-qr" src="${qrSource(url)}" width="188" height="188" alt="Scan to join this Wordkind room"><button class="text-button" id="share-invite">Share invite <span data-icon="arrow"></span></button></div>` : ""}<div class="room-link"><input id="invite-link" aria-label="Room invite link" value="${esc(url)}" readonly><button id="copy-link">Copy</button></div><div class="ready-players"><span>${esc(me.name)}${me.ready ? " · Ready" : ""}</span><span>${other ? esc(other.name) + (!other.online ? " · Offline" : other.ready ? " · Ready" : " · Joined") : "Waiting for friend…"}</span></div><button class="primary-button" id="ready-button" ${me.ready ? "disabled" : ""}>${me.ready ? "Ready. Waiting for your friend…" : "I’m ready"}</button><p class="room-note">${other && !other.online ? "Your friend is offline. They can reopen this link to reconnect." : "Best of three. No hints. No excuses. Maybe one chai."}</p><button class="text-button" id="leave-room">Leave room</button>`,
    );
    if ($("#share-invite"))
      $("#share-invite").onclick = async (e) => {
        const button = e.currentTarget;
        button.disabled = true;
        try {
          const action = await shareInvite(url);
          if (action === "downloaded")
            toast("Invite saved. Send it to your favourite rival.");
        } catch (error) {
          if (error.name !== "AbortError")
            toast("Couldn’t share the invite. Copy the link instead.");
        } finally {
          button.disabled = false;
        }
      };
    $("#copy-link").onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        toast("Link copied. Send a little friendly trouble.");
      } catch {
        $("#invite-link").select();
        toast("Select and copy the invite link.");
      }
    };
    $("#ready-button").onclick = async (e) => {
      const button = e.currentTarget;
      button.disabled = true;
      if (!(await sendRoomAction({ type: "ready" }))) button.disabled = false;
    };
    $("#leave-room").onclick = leaveRoom;
    return;
  }
  const stateKey = `${room.status}-${room.round}`;
  if (roomShown === stateKey && $("#dialog").open && room.status !== "finished")
    return;
  roomShown = stateKey;
  const finished = room.status === "finished",
    winner = finished ? room.matchWinner : room.winner,
    won = winner === you,
    draw = !winner;
  const card = {
    match: true,
    title: draw
      ? finished
        ? "Same brain cell.\nShared custody."
        : "Ek ek.\nEven stevens."
      : finished
        ? won
          ? "Sharma ji’s kid\nhas competition."
          : "Chai break.\nRematch?"
        : won
          ? "Arre wah.\nRound yours."
          : "Picture abhi\nbaaki hai.",
    subtitle:
      room.reason === "disconnect"
        ? won
          ? "Your opponent left. You win by forfeit."
          : "You disconnected. Your friend wins by forfeit."
        : room.reason === "abandoned"
          ? "Both players left. No winner this time."
          : draw
            ? "No winner this time. The chai is on both of you."
            : finished
              ? won
                ? "Certified word wizard. Group chat menace."
                : "A little more chai. You’ll get the next one."
              : room.reason === "timeout"
                ? "Time’s up. Most words takes the point."
                : "One point on the board. Ready for another?",
    players: room.players.map((p) => ({ name: p.name, score: p.score })),
    rounds: room.results.map((r) => ({
      round: r.round,
      elapsedMs: r.elapsedMs,
      label: r.winner
        ? (room.players.find((p) => p.id === r.winner)?.name || "Winner") +
          " wins"
        : "Draw",
    })),
    details: [
      {
        label: "Challenge",
        value: tiers.find((t) => t.id === room.settings.difficulty).name,
      },
    ],
  };
  renderScore(
    card,
    `<button class="primary-button" id="next-round">${finished ? "Rematch? Same room." : "Ready for the next round"}</button><button class="text-button" id="leave-room">Back to solo play</button>`,
  );
  const me = room.players.find((p) => p.id === you);
  if (me.ready) {
    $("#next-round").disabled = true;
    $("#next-round").textContent = "Waiting for your friend…";
  }
  $("#next-round").onclick = async (e) => {
    const button = e.currentTarget,
      text = button.textContent;
    button.disabled = true;
    button.textContent = "Waiting for your friend…";
    if (!(await sendRoomAction({ type: finished ? "rematch" : "ready" }))) {
      button.disabled = false;
      button.textContent = text;
    }
  };
  $("#leave-room").onclick = leaveRoom;
}
function renderSession() {
  $("#visit-stats").textContent =
    `This visit · ${visit.solved} solved · ${visit.words} words`;
}
function beep(kind) {
  if (!soundOn) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    const osc = audio.createOscillator(),
      gain = audio.createGain(),
      now = audio.currentTime;
    osc.type = "sine";
    osc.frequency.setValueAtTime(
      kind === "bonus" ? 660 : kind === "tick" ? 330 : 520,
      now,
    );
    osc.frequency.exponentialRampToValueAtTime(
      kind === "tick" ? 440 : 780,
      now + 0.09,
    );
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(now + 0.16);
  } catch {
    soundOn = false;
  }
}
$("#sound-button").onclick = () => {
  soundOn = !soundOn;
  $("#sound-button").setAttribute("aria-pressed", String(soundOn));
  $("#sound-button").setAttribute(
    "aria-label",
    `Turn sound ${soundOn ? "off" : "on"}`,
  );
  $("#sound-button").title = `Sound ${soundOn ? "on" : "off"}`;
  $("#sound-state").textContent = soundOn ? "On" : "Off";
  beep("found");
  toast(
    soundOn
      ? "Sound on. A little happy feedback."
      : "Sound off. Back to quiet wordplay.",
  );
};
document.querySelectorAll("[data-mode]").forEach(
  (b) =>
    (b.onclick = () => {
      if (room || !puzzle) return;
      soloMode = b.dataset.mode;
      randomPuzzle();
      $("#settings-dialog").close();
      if (soloMode === "daily")
        toast(
          "Today’s shared puzzle. Same for everyone, changing at midnight UTC.",
        );
    }),
);
async function copyText(text, message = "Copied. Group chat, here we come.") {
  try {
    if (!navigator.clipboard) throw Error("No clipboard");
    await navigator.clipboard.writeText(text);
    toast(message);
  } catch {
    let box = $("#copy-fallback");
    if (!box) {
      box = document.createElement("textarea");
      box.id = "copy-fallback";
      box.setAttribute("aria-label", "Text to copy");
      $("#dialog-content").append(box);
    }
    box.value = text;
    box.readOnly = true;
    box.focus();
    box.select();
    toast("Select and copy this text.");
  }
}
function renderScore(card, actions) {
  modal(
    `<div class="score-scene"><div class="result-confetti" aria-hidden="true">${Array.from({ length: 16 }, (_, i) => `<i style="--i:${i};--c:${["#b5cb96", "#a78dbd", "#e4ca7b", "#ed827c"][i % 4]}"></i>`).join("")}</div><div class="dialog-symbol"><span>${card.title.includes("Clock") ? "C" : "W"}</span><span>${card.title.includes("Clock") ? "H" : "A"}</span><span>${card.title.includes("Clock") ? "A" : "H"}</span></div><div class="score-paper"><span class="score-brand">wordkind.</span><h2>${esc(card.title).replace(/\n/g, "<br>")}</h2><p>${esc(card.subtitle)}</p><div class="score-players ${card.match ? "duel" : ""}">${card.players.map((p) => `<div><span>${esc(p.name)}</span><b>${p.score}</b>${card.match ? "" : "<small>words found</small>"}</div>`).join("")}</div>${card.rounds.length ? `<div class="round-history">${card.rounds.map((r) => `<div><span>Round ${r.round}</span><strong>${esc(r.label)}</strong><span>${timeLabel(r.elapsedMs)}</span></div>`).join("")}</div>` : ""}<div class="score-details">${card.details.map((d) => `<div><span>${esc(d.label)}</span><b>${esc(d.value)}</b></div>`).join("")}</div><div class="score-share-link"><img src="${qrSource(location.origin)}" width="100" height="100" alt="Scan to play Wordkind"><div><strong>Pass the word.</strong><a href="${esc(location.origin)}">${esc(location.host)}</a></div></div></div><div class="score-actions"><button id="download-score" class="text-button">Save PNG</button><button id="copy-score" class="text-button">Copy result</button><button id="native-share" class="text-button">Share</button></div>${actions}</div>`,
  );
  $("#download-score").onclick = async () => {
    try {
      await downloadScore(card);
      toast("Scorecard saved. Frame-worthy, honestly.");
    } catch (e) {
      toast(e.message);
    }
  };
  $("#copy-score").onclick = () => copyText(scoreText(card));
  $("#native-share").onclick = async () => {
    try {
      const action = await shareScore(card);
      if (action === "downloaded")
        toast("Scorecard downloaded. Ready to send anywhere.");
    } catch (e) {
      if (e.name !== "AbortError") toast("Couldn’t share. Try Save PNG.");
    }
  };
  beep("bonus");
}
$("#expand-board").onclick = () => {
  if (!puzzle) return;
  modal(
    `<h2>A closer look.</h2><p>${tiers.find((t) => t.id === puzzle.difficulty).description}. Scroll the board if you need a little more room.</p><div class="expanded-board">${$("#board").outerHTML.replace('id="board"', 'id="board-expanded"')}</div><button class="primary-button" id="back-to-wheel">Back to the wheel</button>`,
    true,
  );
  const board = $("#board-expanded");
  board.style.setProperty("--tile", "40px");
  board.style.gridTemplateColumns = `repeat(${puzzle.width},40px)`;
  board.style.gridTemplateRows = `repeat(${puzzle.height},40px)`;
  board.querySelectorAll(".cell").forEach((c) => (c.style.fontSize = "20px"));
  $("#back-to-wheel").onclick = closeDialog;
};
function openLibrary() {
  if (!puzzles.length) {
    toast("The puzzle library is loading.");
    return;
  }
  let filter = soloDifficulty,
    page = 0;
  const pageSize = 24;
  modal(
    `<h2>A little library of aha.</h2><p>1,440 puzzles, six moods. Nothing to unlock. Pick what feels good.</p><div class="library-controls"><label>Difficulty<select id="library-tier">${tiers.map((t) => `<option value="${t.id}" ${t.id === filter ? "selected" : ""}>${t.name}</option>`).join("")}</select></label><label>Jump to puzzle<input id="library-jump" type="number" min="1" max="1440" placeholder="1–1440"></label><button id="library-go" class="text-button">Go</button></div><p id="library-description" class="room-note"></p><div id="puzzle-library" class="puzzle-library"></div><div class="library-pagination"><button class="text-button" id="library-prev">Previous</button><span id="library-page"></span><button class="text-button" id="library-next">Next</button></div><div class="recent-puzzles"><span>Recent this visit</span><div id="recent-puzzles"></div></div>`,
    true,
  );
  const launch = (id) => {
    closeDialog();
    if (room) leaveRoom();
    soloMode = "zen";
    soloDifficulty = puzzles[id - 1].difficulty;
    setPuzzle(id);
  };
  const draw = () => {
    const options = puzzles.filter((p) => p.difficulty === filter),
      slice = options.slice(page * pageSize, (page + 1) * pageSize);
    $("#library-description").textContent = tiers.find(
      (t) => t.id === filter,
    ).description;
    $("#puzzle-library").innerHTML = slice
      .map((p) => {
        const cells = new Set(
          p.slots.flatMap((s) => s.cells.map((c) => `${c.x},${c.y}`)),
        );
        return `<button data-puzzle="${p.id}" class="library-puzzle${p.id === puzzle.id ? " current" : ""}"><span class="mini-board" style="grid-template-columns:repeat(${p.width},4px);grid-template-rows:repeat(${p.height},4px)">${[
          ...cells,
        ]
          .map((k) => {
            const [x, y] = k.split(",").map(Number);
            return `<i style="grid-column:${x + 1};grid-row:${y + 1}"></i>`;
          })
          .join(
            "",
          )}</span><b>${String(p.id).padStart(3, "0")}</b><small>${p.slots.length} words</small></button>`;
      })
      .join("");
    $("#library-page").textContent =
      `${page + 1} / ${Math.ceil(options.length / pageSize)}`;
    $("#library-prev").disabled = page === 0;
    $("#library-next").disabled = (page + 1) * pageSize >= options.length;
    $("#puzzle-library")
      .querySelectorAll("[data-puzzle]")
      .forEach((b) => (b.onclick = () => launch(Number(b.dataset.puzzle))));
  };
  $("#library-tier").onchange = () => {
    filter = $("#library-tier").value;
    page = 0;
    draw();
  };
  $("#library-prev").onclick = () => {
    page--;
    draw();
  };
  $("#library-next").onclick = () => {
    page++;
    draw();
  };
  $("#library-go").onclick = () => {
    const id = Number($("#library-jump").value);
    if (!Number.isInteger(id) || id < 1 || id > puzzles.length) {
      toast("Choose a puzzle number from 1 to 1,440.");
      return;
    }
    launch(id);
  };
  $("#library-jump").onkeydown = (e) => {
    if (e.key === "Enter") $("#library-go").click();
  };
  $("#recent-puzzles").innerHTML = [...new Set(recent)]
    .slice(-6)
    .reverse()
    .map(
      (id) => `<button class="text-button" data-recent="${id}">#${id}</button>`,
    )
    .join("");
  $("#recent-puzzles")
    .querySelectorAll("button")
    .forEach((b) => (b.onclick = () => launch(Number(b.dataset.recent))));
  draw();
}
$("#library-button").onclick = openLibrary;
function showDemo() {
  modal(
    `<h2>One tiny aha.</h2><p>A demonstration, separate from your puzzle. Connect T, E, A. Watch the word find its home.</p><div class="tutorial-stage"><div class="tutorial-result"><span>T</span><span>E</span><span>A</span></div><div class="tutorial-wheel"><svg viewBox="0 0 240 240" aria-hidden="true"><path class="tutorial-path" d="M120 40 190 160 50 160"/></svg><span class="tutorial-t">T</span><span class="tutorial-e">E</span><span class="tutorial-a">A</span></div><span class="demo-caption">Connect. Submit. Aha.</span></div><button id="replay-demo" class="text-button">Replay demonstration</button><button id="done-demo" class="primary-button">Got it. Let’s play.</button>`,
  );
  $("#replay-demo").onclick = showDemo;
  $("#done-demo").onclick = closeDialog;
}

function openSettings() {
  if ($("#dialog").open) $("#dialog").close();
  $("#settings-dialog").showModal();
}
$("#menu-button").onclick = openSettings;
$("#difficulty-button").onclick = openSettings;
$("#close-settings").onclick = () => $("#settings-dialog").close();
$("#settings-dialog").addEventListener("click", (e) => {
  if (e.target === $("#settings-dialog")) {
    const r = e.target.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      e.target.close();
  }
});
$("#word-list-button").onclick = () => {
  if (!puzzle) return;
  modal(
    `<h2>Your words</h2><div class="word-checklist word-list-dialog">${$("#word-checklist").innerHTML}</div>`,
  );
};
function flyToWallet(word) {
  const target = $("#wallet-nav");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    toast(`${word} · Added to wallet`);
    return;
  }
  const origin = $("#word-input").getBoundingClientRect(),
    end = target.getBoundingClientRect();
  const token = document.createElement("div");
  token.className = "wallet-flight";
  token.textContent = word;
  document.body.append(token);
  const rect = token.getBoundingClientRect();
  const x = origin.x + origin.width / 2 - rect.width / 2,
    y = origin.y + origin.height / 2 - rect.height / 2;
  token.style.left = `${x}px`;
  token.style.top = `${y}px`;
  const dx = end.x + end.width / 2 - (x + rect.width / 2),
    dy = end.y + end.height / 2 - (y + rect.height / 2);
  const animation = token.animate(
    [
      { transform: "translate(0,0) scale(.95)", opacity: 1, offset: 0 },
      { transform: "translate(0,-22px) scale(1.06)", opacity: 1, offset: 0.2 },
      {
        transform: `translate(${dx * 0.65}px,${dy * 0.45 - 35}px) rotate(-8deg) scale(.9)`,
        opacity: 1,
        offset: 0.6,
      },
      {
        transform: `translate(${dx}px,${dy}px) rotate(0) scale(.25)`,
        opacity: 0,
        offset: 1,
      },
    ],
    { duration: 850, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" },
  );
  animation.finished
    .then(() => {
      token.remove();
      target.animate(
        [
          { transform: "translateY(0) scale(1)" },
          { transform: "translateY(-3px) scale(1.13)" },
          { transform: "translateY(0) scale(1)" },
        ],
        { duration: 320, easing: "ease-out" },
      );
    })
    .catch(() => token.remove());
}
try {
  puzzles = expandCatalog(
    await api(document.querySelector("script[data-catalog]").dataset.catalog),
  );
  randomPuzzle();
  const code = new URLSearchParams(location.search).get("room");
  if (code) challengeDialog(code);
} catch (e) {
  $("#board-message").textContent =
    "Couldn’t load the game. Refresh to try again.";
  toast(e.message);
}
