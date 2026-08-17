import { ChengyuAudio } from "./audio.js";
import { ChengyuGame } from "./game.js";

const BEST_KEY = "pg-chengyu-best";

const audio = new ChengyuAudio();
const game = new ChengyuGame();

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const streakEl = document.getElementById("streak");
const livesEl = document.getElementById("lives");
const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("status");
const needEl = document.getElementById("need-char");
const lastEl = document.getElementById("last-idiom");
const choicesEl = document.getElementById("choices");
const historyEl = document.getElementById("history");
const timerFill = document.getElementById("timer-fill");
const typeInput = /** @type {HTMLInputElement} */ (document.getElementById("type-input"));
const typeForm = /** @type {HTMLFormElement} */ (document.getElementById("type-form"));
const btnStart = document.getElementById("btn-start");
const btnPass = document.getElementById("btn-pass");
const btnMute = document.getElementById("btn-mute");
const btnSubmit = document.getElementById("btn-submit");
const modeBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (
  document.querySelectorAll("[data-mode]")
);
const diffBtns = /** @type {NodeListOf<HTMLButtonElement>} */ (
  document.querySelectorAll("[data-diff]")
);

/** @type {import('./game.js').Mode} */
let mode = "challenge";
/** @type {import('./game.js').Diff} */
let diff = "normal";
let best = loadBest();
let lastTs = 0;
/** @type {ReturnType<typeof setTimeout> | null} */
let aiTimer = null;
let lastTickSec = -1;

function loadBest() {
  try {
    return Math.max(0, Number(localStorage.getItem(BEST_KEY) || 0));
  } catch {
    return 0;
  }
}

function saveBest() {
  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    /* */
  }
  // KV 為權威；LS 僅快取
  void fetch(`/api/kv/${BEST_KEY}`, { method: "PUT", body: String(best) }).catch(() => {});
}

/**
 * @param {string} msg
 * @param {string} [tone]
 */
function setStatus(msg, tone = "") {
  statusEl.textContent = msg;
  statusEl.dataset.tone = tone;
}

function syncChips() {
  for (const b of modeBtns) b.classList.toggle("is-active", b.dataset.mode === mode);
  for (const b of diffBtns) b.classList.toggle("is-active", b.dataset.diff === diff);
}

function renderHistory() {
  historyEl.replaceChildren();
  for (const w of game.history) {
    const li = document.createElement("li");
    li.textContent = w;
    historyEl.appendChild(li);
  }
  if (historyEl.lastElementChild) {
    historyEl.lastElementChild.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function renderChoices() {
  choicesEl.replaceChildren();
  const playing = game.status === "playing" && game.turn === "player" && !game.aiBusy;
  for (const word of game.choices) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.textContent = word;
    btn.disabled = !playing;
    btn.addEventListener("click", () => void onPick(word, btn));
    choicesEl.appendChild(btn);
  }
}

function syncHud() {
  scoreEl.textContent = String(game.score);
  bestEl.textContent = String(Math.max(best, game.best, game.score));
  streakEl.textContent = String(game.streak);
  livesEl.textContent = game.mode === "duel" ? "淘汰制" : String(Math.max(0, game.lives));
  if (game.status === "playing" && game.turn === "player") {
    timerEl.textContent = String(Math.ceil(game.timeLeft));
    const pct = Math.max(0, Math.min(1, game.timeLeft / game.turnSec));
    timerFill.style.transform = `scaleX(${pct})`;
  } else {
    timerEl.textContent = game.status === "playing" ? "…" : "—";
    timerFill.style.transform = "scaleX(0)";
  }

  const last = game.history[game.history.length - 1];
  needEl.textContent = game.needChar || "—";
  if (last) {
    const chars = [...last];
    lastEl.textContent = `${chars.slice(0, -1).join("")}〔${chars[chars.length - 1]}〕`;
  } else {
    lastEl.textContent = "尚未開局";
  }

  btnStart.textContent = game.status === "idle" ? "開局" : "重開";
  const canAct = game.status === "playing" && game.turn === "player" && !game.aiBusy;
  btnPass.disabled = !canAct;
  typeInput.disabled = !canAct;
  btnSubmit.disabled = !canAct;
  btnPass.textContent = game.mode === "duel" ? "認輸" : "跳過";

  renderHistory();
  renderChoices();
  syncChips();
}

/**
 * @param {string[]} events
 */
function handleEvents(events) {
  for (const e of events) {
    if (e === "ok") audio.ok();
    else if (e === "fail") audio.fail();
    else if (e === "win") {
      audio.win();
      best = Math.max(best, game.score);
      saveBest();
    } else if (e === "lose") {
      audio.lose();
      best = Math.max(best, game.score);
      saveBest();
    } else if (e === "ai") scheduleAi();
    else if (e === "ai-ok") audio.ai();
  }
}

function scheduleAi() {
  if (aiTimer) clearTimeout(aiTimer);
  aiTimer = setTimeout(() => {
    aiTimer = null;
    const { events } = game.aiPlay();
    handleEvents(events);
    setStatus(game.message, game.status === "won" ? "ok" : game.status === "lost" ? "bad" : "");
    syncHud();
  }, 650 + Math.random() * 500);
}

/**
 * @param {string} word
 * @param {HTMLButtonElement | null} [btn]
 */
async function onPick(word, btn = null) {
  await audio.unlock();
  const r = game.play(word);
  if (!r.ok) {
    audio.fail();
    if (btn) {
      btn.classList.add("is-flash-bad");
      setTimeout(() => btn.classList.remove("is-flash-bad"), 280);
    }
    const hint =
      r.reason === "mismatch"
        ? `要以「${game.needChar}」開頭`
        : r.reason === "used"
          ? "這句用過了"
          : r.reason === "unknown"
            ? "詞庫沒有這句"
            : "再試一次";
    // In challenge, wrong choice costs a life
    if (game.status === "playing" && game.mode === "challenge" && game.turn === "player") {
      const failEvents = game.fail(hint);
      handleEvents(failEvents);
      setStatus(game.message, game.status === "lost" ? "bad" : "warn");
    } else {
      setStatus(hint, "warn");
    }
    syncHud();
    return;
  }
  if (btn) {
    btn.classList.add("is-flash-ok");
    setTimeout(() => btn.classList.remove("is-flash-ok"), 280);
  }
  handleEvents(r.events);
  setStatus(game.message, game.status === "won" ? "ok" : "ok");
  typeInput.value = "";
  syncHud();
}

for (const b of modeBtns) {
  b.addEventListener("click", async () => {
    await audio.unlock();
    audio.click();
    mode = /** @type {import('./game.js').Mode} */ (b.dataset.mode || "challenge");
    syncChips();
  });
}

for (const b of diffBtns) {
  b.addEventListener("click", async () => {
    await audio.unlock();
    audio.click();
    diff = /** @type {import('./game.js').Diff} */ (b.dataset.diff || "normal");
    syncChips();
  });
}

btnStart.addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  if (aiTimer) {
    clearTimeout(aiTimer);
    aiTimer = null;
  }
  game.start(mode, diff, best);
  lastTickSec = -1;
  setStatus(game.message);
  syncHud();
});

btnPass.addEventListener("click", async () => {
  await audio.unlock();
  audio.click();
  const { events } = game.pass();
  handleEvents(events);
  setStatus(game.message, game.status === "lost" ? "bad" : "warn");
  syncHud();
});

btnMute.addEventListener("click", async () => {
  await audio.unlock();
  const on = btnMute.getAttribute("aria-pressed") !== "true";
  btnMute.setAttribute("aria-pressed", on ? "true" : "false");
  btnMute.textContent = on ? "音效" : "靜音";
  audio.setEnabled(on);
  audio.click();
});

typeForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  await audio.unlock();
  const word = typeInput.value.trim();
  if (!word) return;
  await onPick(word, null);
});

function frame(ts) {
  const dt = Math.min(0.05, (ts - (lastTs || ts)) / 1000);
  lastTs = ts;
  const { events } = game.update(dt);
  if (events.length) {
    handleEvents(events);
    setStatus(game.message, game.status === "lost" ? "bad" : "warn");
  }
  if (game.status === "playing" && game.turn === "player") {
    const sec = Math.ceil(game.timeLeft);
    if (sec <= 3 && sec !== lastTickSec && sec > 0) {
      lastTickSec = sec;
      audio.tick();
    }
    timerEl.textContent = String(sec);
    const pct = Math.max(0, Math.min(1, game.timeLeft / game.turnSec));
    timerFill.style.transform = `scaleX(${pct})`;
  }
  requestAnimationFrame(frame);
}

bestEl.textContent = String(best);
// KV 為權威；本地快取過舊時以遠端為準
void fetch(`/api/kv/${BEST_KEY}`)
  .then((r) => (r.ok ? r.text() : null))
  .then((raw) => {
    const n = Math.max(0, Number(raw) || 0);
    if (n > best) {
      best = n;
      bestEl.textContent = String(Math.max(best, game.best, game.score));
    }
  })
  .catch(() => {});
syncHud();
setStatus(game.message);
requestAnimationFrame(frame);
