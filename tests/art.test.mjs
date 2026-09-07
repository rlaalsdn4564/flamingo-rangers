import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { prepareAtlas } from "../src/atlas.mjs";
import { HERO_CELLS, createRenderer } from "../src/renderer.mjs";
import { createGame, begin, update } from "../src/engine.mjs";
const assets = {
  heroes: await loadImage("public/art/rangers-atlas.png"),
  enemies: await loadImage("public/art/enemies-atlas.png"),
  backdrops: await Promise.all(
    ["glass-avenue", "canal-junction", "central-tower"].map((name) =>
      loadImage(`public/art/${name}.png`),
    ),
  ),
  makeCanvas: createCanvas,
};
test("all 24 hero poses resolve to distinct complete RGBA components", () => {
  const frames = prepareAtlas(assets.heroes, HERO_CELLS, createCanvas).flat();
  assert.equal(frames.length, 24);
  assert.equal(new Set(frames.map((f) => String(f.sourceRect))).size, 24);
  for (const frame of frames) {
    assert.ok(frame.width > 145);
    assert.ok(frame.height > 170);
    assert.ok(frame.width < 280);
    assert.ok(frame.height < 330);
    const data = frame.image
      .getContext("2d")
      .getImageData(0, 0, frame.width, frame.height).data;
    let transparent = 0;
    for (let j = 3; j < data.length; j += 4) if (!data[j]) transparent++;
    assert.ok(transparent > 1000);
  }
});
test("three illustrated stage files are distinct", async () => {
  const hashes = await Promise.all(
    ["glass-avenue", "canal-junction", "central-tower"].map(async (name) =>
      createHash("sha256")
        .update(await readFile(`public/art/${name}.png`))
        .digest("hex"),
    ),
  );
  assert.equal(new Set(hashes).size, 3);
  for (const image of assets.backdrops)
    assert.ok(image.width / image.height >= 2.9);
});
test("renderer leaves state untouched in every gameplay and cinematic mode", () => {
  const canvas = createCanvas(1280, 720),
    renderer = createRenderer(canvas.getContext("2d"), assets, {
      reducedMotion: true,
    });
  const g = createGame();
  begin(g);
  update(g, { confirm: true });
  for (const mode of [
    "title",
    "select",
    "help",
    "combat",
    "intro",
    "assembly",
    "finisher",
    "stageclear",
    "victory",
    "defeat",
  ]) {
    g.mode = mode;
    g.modeTime = 2;
    const before = JSON.stringify(g);
    renderer.draw(g);
    assert.equal(JSON.stringify(g), before, mode);
  }
});
test("all sprites stay visible during all eight action poses", () => {
  const canvas = createCanvas(1280, 720),
    renderer = createRenderer(canvas.getContext("2d"), assets);
  for (let row = 0; row < 3; row++)
    for (let pose = 0; pose < 8; pose++) {
      canvas.getContext("2d").clearRect(0, 0, 1280, 720);
      renderer.sprite(row, pose, 600, 600, 1, 1);
      const data = canvas.getContext("2d").getImageData(0, 0, 1280, 720).data;
      let filled = 0;
      for (let j = 3; j < data.length; j += 4) if (data[j] > 0) filled++;
      assert.ok(filled > 2500, `${row}/${pose} empty`);
      const bottom = canvas
        .getContext("2d")
        .getImageData(0, 603, 1280, 117).data;
      assert.ok(
        bottom.every((v) => v === 0),
        `${row}/${pose} below foot anchor`,
      );
    }
});
