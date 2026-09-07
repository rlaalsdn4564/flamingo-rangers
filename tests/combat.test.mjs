import test from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  begin,
  update,
  enemy,
  activeAttack,
  switchPilot,
  nextStage,
  createStepper,
  STEP,
  STAGES,
} from "../src/engine.mjs";
function playing(pilot = 0) {
  const g = createGame();
  begin(g, pilot);
  update(g, { confirm: true });
  g.enemies = [];
  g.gate = 1000;
  return g;
}
function step(g, n = 60, input = {}) {
  for (let i = 0; i < n; i++) update(g, input);
}
test("three distinct stages and nine wave compositions", () => {
  assert.equal(STAGES.length, 3);
  assert.deepEqual(
    STAGES.map((s) => s.boss),
    ["drill", "mantis", "core"],
  );
  assert.equal(STAGES.flatMap((s) => s.waves).length, 9);
});
test("start resets prior progression without retaining attack targets", () => {
  const g = playing(1);
  g.score = 998;
  g.player.x = 900;
  begin(g, 2);
  assert.equal(g.score, 0);
  assert.equal(g.player.x, 180);
  assert.equal(g.pilot, 2);
  assert.equal(g.mode, "intro");
});
test("intro proceeds by time and spawns initial wave", () => {
  const g = createGame();
  begin(g);
  step(g, 180);
  assert.equal(g.mode, "combat");
  assert.equal(g.wave, 1);
  assert.equal(g.enemies.length, 3);
});
test("one attack damages target once even across active frames", () => {
  const g = playing(),
    e = enemy(g, "drill", g.player.x + 70);
  e.cooldown = 10;
  activeAttack(g, "jab");
  step(g, 20);
  assert.equal(e.hp, e.max - 20);
  assert.equal(g.combo, 1);
});
test("attack has real anticipation frames before a hit", () => {
  const g = playing(),
    e = enemy(g, "crow", 250);
  e.cooldown = 10;
  activeAttack(g, "jab");
  step(g, 4);
  assert.equal(e.hp, e.max);
  step(g, 5);
  assert.equal(e.hp, e.max - 20);
});
test("out-of-range enemy is never hit", () => {
  const g = playing(),
    e = enemy(g, "crow", 800);
  e.speed = 0;
  activeAttack(g, "kick");
  step(g, 40);
  assert.equal(e.hp, e.max);
});
test("enemy behind player is not hit by forward jab", () => {
  const g = playing(),
    e = enemy(g, "crow", 120);
  e.speed = 0;
  e.cooldown = 10;
  activeAttack(g, "jab");
  step(g, 20);
  assert.equal(e.hp, e.max);
});
test("shield reduces frontal normal hit", () => {
  const g = playing(),
    e = enemy(g, "shield", 245);
  e.cooldown = 10;
  activeAttack(g, "jab");
  step(g, 20);
  assert.equal(e.hp, e.max - 5);
});
test("launcher bypasses shield and imparts upward velocity", () => {
  const g = playing(),
    e = enemy(g, "shield", 245);
  e.cooldown = 10;
  activeAttack(g, "launcher");
  step(g, 16);
  assert.equal(e.hp, e.max - 33);
  assert.ok(e.vy > 0 || e.y > 0);
});
test("special cannot consume unavailable energy", () => {
  const g = playing();
  g.energy = 0;
  assert.equal(activeAttack(g, "smash"), false);
  assert.equal(g.player.attack, null);
  assert.equal(g.energy, 0);
});
test("red blue yellow each has a different special", () => {
  for (const [i, kind] of ["launcher", "dash", "smash"].entries()) {
    const g = playing(i);
    update(g, { special: true });
    assert.equal(g.player.attack.kind, kind);
  }
});
test("buffered three-hit sequence progresses jab cross kick", () => {
  const g = playing();
  update(g, { attack: true });
  update(g, { attack: true });
  step(g, 24);
  assert.equal(g.player.attack?.kind, "cross");
  update(g, { attack: true });
  step(g, 24);
  assert.equal(g.player.attack?.kind, "kick");
});
test("air attack only selects air pose after a genuine jump", () => {
  const g = playing();
  update(g, { jump: true });
  step(g, 3);
  update(g, { attack: true });
  assert.equal(g.player.attack.kind, "air");
  assert.ok(g.player.y > 0);
});
test("jump lands and never crosses below the ground", () => {
  const g = playing();
  update(g, { jump: true });
  step(g, 180);
  assert.equal(g.player.y, 0);
  assert.equal(g.player.vy, 0);
});
test("enemy must finish windup before strike damage", () => {
  const g = playing(),
    e = enemy(g, "crow", 220);
  g.player.invuln = 0;
  e.cooldown = 0;
  update(g);
  assert.equal(e.state, "windup");
  step(g, 20);
  assert.equal(g.player.hp, 120);
  step(g, 25);
  assert.ok(g.player.hp < 120);
});
test("front guard reduces incoming damage", () => {
  const g = playing(),
    e = enemy(g, "crow", 225);
  e.state = "strike";
  e.cooldown = 0;
  g.player.invuln = 0;
  update(g, { guard: true });
  assert.equal(g.player.hp, 118);
  assert.equal(g.player.state, "guard");
});
test("rear attack is not blocked by facing-forward guard", () => {
  const g = playing(),
    e = enemy(g, "crow", 120);
  e.state = "strike";
  g.player.invuln = 0;
  update(g, { guard: true });
  assert.equal(g.player.hp, 111);
});
test("one enemy swing cannot damage twice", () => {
  const g = playing(),
    e = enemy(g, "crow", 225);
  e.state = "strike";
  g.player.invuln = 0;
  update(g);
  g.player.invuln = 0;
  g.player.stun = 0;
  update(g);
  assert.equal(g.player.hp, 111);
});
test("tag preserves individual hp and has cooldown", () => {
  const g = playing();
  g.player.hp = 44;
  assert.equal(switchPilot(g), true);
  assert.equal(g.party[0], 44);
  assert.equal(g.player.hp, 120);
  assert.equal(switchPilot(g), false);
});
test("tag skips knocked-out teammates", () => {
  const g = playing();
  g.party[1] = 0;
  switchPilot(g);
  assert.equal(g.pilot, 2);
});
test("all teammates out enters defeat", () => {
  const g = playing();
  g.party = [1, 0, 0];
  g.player.hp = 1;
  g.player.invuln = 0;
  const e = enemy(g, "crow", 230);
  e.state = "strike";
  update(g);
  assert.equal(g.mode, "defeat");
});
test("dead boss stays down awaiting intentional double C", () => {
  const g = playing(),
    e = enemy(g, "drill", 245);
  e.hp = 1;
  e.cooldown = 10;
  activeAttack(g, "jab");
  step(g, 30);
  assert.equal(e.down, true);
  assert.equal(g.mode, "combat");
  update(g, { tag: true });
  step(g, 4);
  update(g, { tag: true });
  assert.equal(g.mode, "finisher");
  step(g, 160);
  assert.equal(g.mode, "stageclear");
});
test("single C never accidentally triggers a finisher", () => {
  const g = playing(),
    e = enemy(g, "drill", 260);
  e.hp = 0;
  e.down = true;
  update(g, { tag: true });
  step(g, 40);
  assert.equal(g.mode, "combat");
});
test("next stage replenishes and revives hp only on cleared screen", () => {
  const g = playing();
  assert.equal(nextStage(g), false);
  g.mode = "stageclear";
  g.party = [10, 0, 100];
  assert.equal(nextStage(g), true);
  assert.equal(g.stage, 1);
  assert.deepEqual(g.party, [85, 85, 120]);
});
test("final stage wave completion enters actual assembly", () => {
  const g = playing();
  g.stage = 2;
  g.wave = 3;
  g.gate = 1700;
  g.player.x = 1700;
  update(g);
  assert.equal(g.mode, "assembly");
  update(g, { confirm: true });
  assert.equal(g.mech, true);
  assert.equal(g.player.max, 400);
  assert.equal(g.enemies[0].kind, "core");
});
test("mech disables character swaps and uses its own attacks", () => {
  const g = playing();
  g.mech = true;
  assert.equal(switchPilot(g), false);
  update(g, { attack: true });
  assert.equal(g.player.attack.kind, "mech");
});
test("jump avoids whole-lane core ground slam", () => {
  const g = playing();
  g.mech = true;
  g.player.invuln = 0;
  g.player.y = 140;
  g.player.vy = 0;
  const e = enemy(g, "core", 600);
  e.state = "strike";
  e.pattern = 3;
  update(g);
  assert.equal(g.player.hp, 120);
});
test("grounded core slam hits across lane", () => {
  const g = playing();
  g.mech = true;
  g.player.invuln = 0;
  const e = enemy(g, "core", 600);
  e.state = "strike";
  e.pattern = 3;
  update(g);
  assert.equal(g.player.hp, 94);
});
test("paused game advances no clock or world state", () => {
  const g = playing();
  g.paused = true;
  const snapshot = JSON.stringify(g);
  step(g, 50, { right: true });
  assert.equal(JSON.stringify(g), snapshot);
});
test("movement is clamped to locked sector and finite", () => {
  const g = playing();
  step(g, 400, { right: true });
  assert.ok(g.player.x <= g.gate + 320);
  assert.ok(Number.isFinite(g.camera));
});
test("NaN and negative dt have no effect", () => {
  const g = playing(),
    x = g.clock;
  update(g, {}, NaN);
  update(g, {}, -1);
  assert.equal(g.clock, x);
});
test("fixed-step yields same movement at 30 60 120 Hz", () => {
  const positions = [30, 60, 120].map((hz) => {
    const g = playing();
    g.gate = 4000;
    const s = createStepper((i, dt) => update(g, i, dt));
    for (let i = 0; i <= hz; i++) s.frame((i * 1000) / hz, { right: true });
    return g.player.x;
  });
  assert.ok(Math.max(...positions) - Math.min(...positions) < 1e-5);
});
test("fixed-step bounds a long background stall", () => {
  let count = 0;
  const s = createStepper(() => count++);
  s.frame(0, {});
  s.frame(999999, {});
  assert.ok(count <= 9);
  s.reset();
  assert.equal(s.frame(9999999, {}), 0);
});
test("single edge input is not repeated by low-refresh catch-up steps", () => {
  let edges = 0;
  const s = createStepper((i) => {
    if (i.attack) edges++;
  });
  s.frame(0, {});
  s.frame(100, { attack: true });
  assert.equal(edges, 1);
});
test("legal input policy can clear all nine waves, bosses, assembly and final ending", () => {
  const g = createGame();
  begin(g);
  const visited = new Set();
  for (
    let i = 0;
    i < 60 * 240 && g.mode !== "victory" && g.mode !== "defeat";
    i++
  ) {
    visited.add(`${g.stage}:${g.mode}`);
    if (g.mode === "stageclear") {
      nextStage(g);
      continue;
    }
    const p = g.player,
      target = g.enemies
        .filter((e) => e.hp > 0 || e.down)
        .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    const input = { confirm: true };
    if (g.mode === "combat") {
      if (target?.down) input.tag = i % 8 === 0;
      else if (target) {
        const d = target.x - p.x;
        input.left = d < -65;
        input.right = d > 65;
        input.attack = i % 12 === 0;
        input.special =
          g.energy > 27 &&
          (target.kind === "shield" || target.boss) &&
          i % 30 === 0;
        input.jump =
          target.state === "windup" && target.age > 0.25 && i % 15 === 0;
        input.tag = p.hp < 35 && g.tagCooldown === 0 && i % 30 === 0;
      } else input.right = true;
    }
    update(g, input);
  }
  assert.equal(g.mode, "victory");
  assert.ok(visited.has("2:assembly"));
  for (let i = 0; i < 3; i++) assert.ok(visited.has(`${i}:finisher`));
  assert.ok(g.score > 40000);
});
