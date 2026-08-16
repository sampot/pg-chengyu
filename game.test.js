import { describe, expect, it } from "vitest";
import { ChengyuGame } from "./game.js";
import { lastChar, startersWith } from "./idioms.js";

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
    let move;
    for (let attempt = 0; attempt < 20 && !move; attempt += 1) {
      game.start("duel", "normal");
      move = game.choices.find(
        (word) =>
          word.startsWith(game.needChar) &&
          startersWith(lastChar(word), new Set([...game.used, word])).length > 0,
      );
    }
    expect(move).toBeTruthy();
    expect(game.play(move).ok).toBe(true);
    expect(game.turn).toBe("ai");
  });
});
