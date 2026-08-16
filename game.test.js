import { describe, expect, it } from "vitest";
import { ChengyuGame } from "./game.js";

describe("ChengyuGame duel", () => {
  it("keeps challenge timeout lives", () => {
    const game = new ChengyuGame();
    game.start("challenge", "normal");
    game.update(99);
    expect(game.status).toBe("playing");
    expect(game.lives).toBe(2);
  });

  it("eliminates the timed-out player in duel", () => {
    const game = new ChengyuGame();
    game.start("duel", "normal");
    game.update(99);
    expect(game.status).toBe("lost");
    expect(game.turn).toBe(null);
    expect(game.message).toContain("淘汰");
  });

  it("hands a valid duel play to the AI", () => {
    const game = new ChengyuGame();
    game.start("duel", "normal");
    const move = game.choices.find((word) => word.startsWith(game.needChar));
    expect(move).toBeTruthy();
    expect(game.play(move).ok).toBe(true);
    expect(game.turn).toBe("ai");
  });
});
