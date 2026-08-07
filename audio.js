/**
 * Idiom-chain SFX — original Web Audio tones.
 */

export class ChengyuAudio {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.enabled = true;
    this.master = 0.22;
  }

  async unlock() {
    this.ensure();
    if (this.ctx?.state === "suspended") await this.ctx.resume();
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
  }

  setEnabled(on) {
    this.enabled = on;
  }

  /**
   * @param {number} freq
   * @param {number} dur
   * @param {OscillatorType} [type]
   * @param {number} [gain]
   * @param {number} [when]
   * @param {number} [slide]
   */
  tone(freq, dur, type = "sine", gain = 0.12, when = 0, slide = 0) {
    if (!this.enabled) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * this.master, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.03, dur));
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.04);
  }

  click() {
    this.tone(520, 0.04, "triangle", 0.05);
  }

  ok() {
    this.tone(523, 0.07, "sine", 0.09);
    this.tone(659, 0.1, "sine", 0.08, 0.06);
    this.tone(784, 0.14, "triangle", 0.07, 0.12);
  }

  fail() {
    this.tone(220, 0.12, "sawtooth", 0.05, 0, -40);
    this.tone(160, 0.18, "triangle", 0.06, 0.08);
  }

  win() {
    this.tone(523, 0.08, "sine", 0.08);
    this.tone(659, 0.08, "sine", 0.08, 0.08);
    this.tone(784, 0.08, "sine", 0.08, 0.16);
    this.tone(1046, 0.2, "triangle", 0.09, 0.24);
  }

  lose() {
    this.tone(392, 0.14, "triangle", 0.07);
    this.tone(311, 0.18, "sine", 0.07, 0.12);
    this.tone(247, 0.28, "sine", 0.08, 0.26);
  }

  ai() {
    this.tone(440, 0.06, "triangle", 0.05);
    this.tone(554, 0.08, "sine", 0.05, 0.07);
  }

  tick() {
    this.tone(880, 0.03, "square", 0.03);
  }
}
