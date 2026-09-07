import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import { writeFile, mkdir } from "node:fs/promises";
import { createGame, begin, update, enemy } from "../src/engine.mjs";
import { createRenderer } from "../src/renderer.mjs";
GlobalFonts.registerFromPath("public/fonts/Galmuri11.ttf", "Galmuri");
const canvas = createCanvas(1280, 720),
  ctx = canvas.getContext("2d");
const assets = {
  heroes: await loadImage("public/art/rangers-atlas.png"),
  enemies: await loadImage("public/art/enemies-atlas.png"),
  makeCanvas: createCanvas,
  backdrops: await Promise.all(
    ["glass-avenue", "canal-junction", "central-tower"].map((name) =>
      loadImage(`public/art/${name}.png`),
    ),
  ),
};
const renderer = createRenderer(ctx, assets, { reducedMotion: true });
await mkdir("docs/previews", { recursive: true });
const g = createGame();
renderer.draw(g);
await writeFile("docs/previews/title.png", canvas.toBuffer("image/png"));
begin(g);
update(g, { confirm: true });
g.player.x = 360;
g.enemies = [];
enemy(g, "crow", 525);
enemy(g, "shield", 770);
enemy(g, "drill", 1020);
g.enemies[0].state = "windup";
g.enemies[0].age = 0.3;
g.notice = "";
g.noticeTime = 0;
renderer.draw(g);
await writeFile("docs/previews/combat.png", canvas.toBuffer("image/png"));
g.mode = "assembly";
g.modeTime = 3.5;
renderer.draw(g);
await writeFile("docs/previews/assembly.png", canvas.toBuffer("image/png"));
g.mode = "combat";
g.stage = 2;
g.mech = true;
g.enemies = [];
g.player.x = 350;
g.player.hp = 400;
g.player.max = 400;
enemy(g, "core", 900);
g.enemies[0].state = "windup";
renderer.draw(g);
await writeFile("docs/previews/mecha.png", canvas.toBuffer("image/png"));
console.log(
  "Four deterministic CPU Canvas art captures written. Not browser-input verification.",
);
