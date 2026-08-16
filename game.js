/**
 * 成語接龍 — solo challenge + local-first duel.
 * Future Invite transport contract: `chengyu.v1`.
 * Messages will describe room state/turn moves/timeouts; networking is intentionally not implemented.
 */

import {
  buildChoices,
  firstChar,
  isIdiom,
  lastChar,
  pickSeed,
  startersWith,
} from "./idioms.js";

/**
 * @typedef {'idle'|'playing'|'won'|'lost'} Status
 * @typedef {'challenge'|'duel'} Mode
 * @typedef {'easy'|'normal'|'hard'} Diff
 */

const TIME = { easy: 20, normal: 14, hard: 9 };

export class ChengyuGame {
  constructor() {
    /** @type {Status} */
    this.status = "idle";
    /** @type {Mode} */
    this.mode = "challenge";
    /** @type {Diff} */
    this.diff = "normal";
    this.message = "選模式後開局";
    this.score = 0;
    this.best = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.lives = 3;
    this.chain = 0;
    this.turnSec = TIME.normal;
    this.timeLeft = TIME.normal;
    /** @type {'player'|'ai'|null} */
    this.turn = null;
    /** @type {string[]} */
    this.history = [];
    /** @type {Set<string>} */
    this.used = new Set();
    this.needChar = "";
    /** @type {string[]} */
    this.choices = [];
    this.aiBusy = false;
  }

  /**
   * @param {Mode} mode
   * @param {Diff} diff
   * @param {number} [best]
   */
  start(mode, diff, best = 0) {
    this.mode = mode;
    this.diff = diff;
    this.best = best;
    this.status = "playing";
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.lives = diff === "hard" ? 2 : 3;
    this.chain = 0;
    this.turnSec = TIME[diff];
    this.timeLeft = this.turnSec;
    this.history = [];
    this.used = new Set();
    this.aiBusy = false;

    const seed = pickSeed(2);
    this.history.push(seed);
    this.used.add(seed);
    this.needChar = lastChar(seed);
    this.turn = "player";
    this.refreshChoices();
    this.message =
      mode === "duel"
        ? `開局成語：${seed} → 請接「${this.needChar}」`
        : `挑戰開始：${seed} → 接「${this.needChar}」`;
  }

  refreshChoices() {
    this.choices = buildChoices(this.needChar, this.used, 4);
  }

  canContinue() {
    return startersWith(this.needChar, this.used).length > 0;
  }

  /**
   * @param {number} dt
   * @returns {{ events: string[] }}
   */
  update(dt) {
    /** @type {string[]} */
    const events = [];
    if (this.status !== "playing" || this.turn !== "player" || this.aiBusy) return { events };
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      if (this.mode === "duel") {
        this.status = "lost";
        this.turn = null;
        this.message = "時間到，你被淘汰了";
        events.push("lose");
      } else {
        events.push(...this.fail("時間到"));
      }
    }
    return { events };
  }

  /**
   * @param {string} idiom
   * @returns {{ ok: boolean, events: string[], reason?: string }}
   */
  play(idiom) {
    /** @type {string[]} */
    const events = [];
    if (this.status !== "playing" || this.turn !== "player") {
      return { ok: false, events, reason: "noturn" };
    }
    const word = idiom.trim();
    if ([...word].length !== 4) return { ok: false, events, reason: "len" };
    if (!isIdiom(word)) return { ok: false, events, reason: "unknown" };
    if (this.used.has(word)) return { ok: false, events, reason: "used" };
    if (firstChar(word) !== this.needChar) return { ok: false, events, reason: "mismatch" };

    this.applyMove(word, "player");
    const bonus = Math.min(8, this.streak);
    const timeBonus = Math.ceil(this.timeLeft);
    this.score += 10 + bonus * 2 + Math.floor(timeBonus / 3);
    this.streak += 1;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.best = Math.max(this.best, this.score);
    events.push("ok");

    if (!this.canContinue()) {
      this.status = "won";
      this.turn = null;
      this.message = this.mode === "duel" ? "對手無語可接，你贏了！" : "詞庫接盡，挑戰成功！";
      events.push("win");
      return { ok: true, events };
    }

    if (this.mode === "duel") {
      this.turn = "ai";
      this.aiBusy = true;
      this.message = "對手思考中…";
      events.push("ai");
    } else {
      this.timeLeft = this.turnSec;
      this.refreshChoices();
      this.message = `接得漂亮！下一字「${this.needChar}」`;
    }
    return { ok: true, events };
  }

  /** AI plays one move after delay handled by app. */
  aiPlay() {
    /** @type {string[]} */
    const events = [];
    if (this.status !== "playing" || this.turn !== "ai") return { events };
    const opts = startersWith(this.needChar, this.used);
    if (!opts.length) {
      this.status = "won";
      this.turn = null;
      this.aiBusy = false;
      this.message = "對手接不上，你贏了！";
      events.push("win");
      return { events };
    }
    const pick = opts[Math.floor(Math.random() * opts.length)];
    this.applyMove(pick, "ai");
    this.aiBusy = false;

    if (!this.canContinue()) {
      this.status = "lost";
      this.turn = null;
      this.message = `對手接了「${pick}」，你已無路可接`;
      events.push("lose");
      return { events };
    }

    this.turn = "player";
    this.timeLeft = this.turnSec;
    this.refreshChoices();
    this.message = `對手：${pick} → 請接「${this.needChar}」`;
    events.push("ai-ok");
    return { events };
  }

  /**
   * @param {string} word
   * @param {'player'|'ai'} who
   */
  applyMove(word, who) {
    this.history.push(word);
    this.used.add(word);
    this.needChar = lastChar(word);
    this.chain = this.history.length - 1;
    void who;
  }

  /**
   * @param {string} why
   * @returns {string[]}
   */
  fail(why) {
    /** @type {string[]} */
    const events = ["fail"];
    this.streak = 0;
    this.lives -= 1;
    if (this.lives <= 0) {
      this.status = "lost";
      this.turn = null;
      this.message = `${why}，挑戰結束`;
      events.push("lose");
    } else {
      this.timeLeft = this.turnSec;
      this.refreshChoices();
      this.message = `${why}，剩 ${this.lives} 命 · 仍接「${this.needChar}」`;
    }
    return events;
  }

  /** Skip / pass when stuck (costs a life in challenge). */
  pass() {
    if (this.status !== "playing" || this.turn !== "player") return { events: /** @type {string[]} */ ([]) };
    if (this.mode === "duel") {
      this.status = "lost";
      this.turn = null;
      this.message = "你認輸了";
      return { events: ["lose"] };
    }
    return { events: this.fail("跳過") };
  }
}
