export const WIDTH = 1280,
  HEIGHT = 720,
  GROUND = 598,
  STEP = 1 / 60;
export const PILOTS = [
  {
    name: "홍염",
    title: "RED / 돌파형",
    color: "#ed4939",
    dark: "#aa2731",
    speed: 270,
    power: 1,
    skill: "상승권",
    note: "띄우기와 공중 콤보",
  },
  {
    name: "청류",
    title: "BLUE / 속공형",
    color: "#279cdb",
    dark: "#175582",
    speed: 320,
    power: 0.9,
    skill: "질풍각",
    note: "긴 돌진 · 빠른 교대",
  },
  {
    name: "금강",
    title: "YELLOW / 중량형",
    color: "#f4c445",
    dark: "#ad7e28",
    speed: 235,
    power: 1.2,
    skill: "진동권",
    note: "방패 파괴 · 넓은 충격파",
  },
];
export const STAGES = [
  {
    name: "유리빛 대로",
    tag: "01 / GLASS AVENUE",
    subtitle: "차단선을 넘어 드릴 비틀을 저지하라.",
    length: 2380,
    boss: "drill",
    waves: [
      ["crow", "crow", "shield"],
      ["crow", "shield", "crow"],
      ["shield", "crow", "crow", "shield"],
    ],
  },
  {
    name: "운하 교차로",
    tag: "02 / CANAL JUNCTION",
    subtitle: "글라스 맨티스의 공중 공격을 읽어라.",
    length: 2440,
    boss: "mantis",
    waves: [
      ["crow", "shield", "crow", "crow"],
      ["shield", "crow", "shield"],
      ["crow", "crow", "shield", "crow"],
    ],
  },
  {
    name: "중앙 관제탑",
    tag: "03 / CENTRAL TOWER",
    subtitle: "세 개의 신호를 연결하고 갈대왕을 호출하라.",
    length: 2520,
    boss: "core",
    waves: [
      ["shield", "crow", "crow", "shield"],
      ["crow", "shield", "crow", "crow"],
      ["shield", "crow", "shield", "crow"],
    ],
  },
];
const specs = {
  crow: {
    hp: 48,
    speed: 135,
    range: 78,
    damage: 9,
    windup: 0.58,
    recovery: 0.78,
    row: 0,
  },
  shield: {
    hp: 78,
    speed: 88,
    range: 86,
    damage: 13,
    windup: 0.8,
    recovery: 1.05,
    row: 1,
  },
  drill: {
    hp: 330,
    speed: 110,
    range: 170,
    damage: 20,
    windup: 0.95,
    recovery: 1.15,
    row: 2,
    boss: true,
  },
  mantis: {
    hp: 370,
    speed: 160,
    range: 220,
    damage: 17,
    windup: 0.72,
    recovery: 0.82,
    row: 3,
    boss: true,
  },
  core: {
    hp: 650,
    speed: 55,
    range: 300,
    damage: 26,
    windup: 1.05,
    recovery: 1.1,
    row: 4,
    boss: true,
  },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function createGame() {
  return {
    mode: "title",
    paused: false,
    clock: 0,
    time: 0,
    stage: 0,
    wave: 0,
    gate: 0,
    score: 0,
    kills: 0,
    combo: 0,
    bestCombo: 0,
    comboTime: 0,
    party: [120, 120, 120],
    pilot: 0,
    energy: 45,
    player: {
      x: 180,
      y: 0,
      vy: 0,
      facing: 1,
      hp: 120,
      max: 120,
      state: "idle",
      age: 0,
      attack: null,
      invuln: 0,
      stun: 0,
    },
    enemies: [],
    effects: [],
    camera: 0,
    shake: 0,
    hitstop: 0,
    tagCooldown: 0,
    lastTag: -99,
    id: 1,
    notice: "",
    noticeTime: 0,
    mech: false,
    modeTime: 0,
    stageTime: 240,
    events: [],
    seed: 1437,
  };
}
export function begin(g, pilot = 0) {
  Object.assign(g, createGame());
  g.pilot = clamp(pilot, 0, 2);
  enterStage(g, 0);
  return g;
}
export function enterStage(g, stage) {
  g.stage = stage;
  g.wave = 0;
  g.gate = 0;
  g.player.x = 180;
  g.player.y = 0;
  g.player.vy = 0;
  g.player.state = "idle";
  g.player.attack = null;
  g.player.hp = g.party[g.pilot];
  g.player.max = 120;
  g.player.invuln = 1;
  g.enemies = [];
  g.effects = [];
  g.camera = 0;
  g.mode = "intro";
  g.modeTime = 0;
  g.stageTime = 240;
  g.mech = false;
  g.energy = Math.max(45, g.energy);
  g.notice = STAGES[stage].subtitle;
  g.noticeTime = 4;
}
export function nextStage(g) {
  if (g.mode !== "stageclear") return false;
  if (g.stage === 2) {
    g.mode = "victory";
    return true;
  }
  g.party = g.party.map((v) => Math.min(120, Math.max(v, 50) + 35));
  enterStage(g, g.stage + 1);
  return true;
}
export function enemy(g, kind, x) {
  const s = specs[kind];
  const e = {
    ...s,
    kind,
    id: g.id++,
    x,
    y: 0,
    vy: 0,
    hp: s.hp,
    max: s.hp,
    facing: -1,
    state: "approach",
    age: 0,
    cooldown: 0.4,
    stun: 0,
    hit: false,
    pattern: 0,
    down: false,
  };
  g.enemies.push(e);
  return e;
}
function event(g, type, extra = {}) {
  g.events.push({ type, ...extra });
  if (g.events.length > 100) g.events.shift();
}
function fx(g, x, y, type, color = "#ffeaa3", amount = 8) {
  for (let i = 0; i < amount; i++) {
    g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0;
    const a = (g.seed / 4294967296) * Math.PI * 2;
    g.effects.push({
      x,
      y,
      type,
      color,
      vx: Math.cos(a) * (85 + i * 9),
      vy: Math.sin(a) * (75 + i * 7) - 40,
      life: 0.35 + (i % 4) * 0.08,
      max: 0.56,
    });
  }
  if (g.effects.length > 250) g.effects.splice(0, g.effects.length - 250);
}
function notify(g, text) {
  g.notice = text;
  g.noticeTime = 2;
}
export function activeAttack(g, kind) {
  const p = g.player;
  const data = {
    jab: {
      wind: 0.09,
      active: 0.1,
      recover: 0.18,
      damage: 20,
      range: 105,
      pose: 3,
      lift: 0,
    },
    cross: {
      wind: 0.08,
      active: 0.12,
      recover: 0.18,
      damage: 24,
      range: 118,
      pose: 3,
      lift: 0,
    },
    kick: {
      wind: 0.13,
      active: 0.15,
      recover: 0.28,
      damage: 34,
      range: 154,
      pose: 5,
      lift: 100,
    },
    air: {
      wind: 0.06,
      active: 0.22,
      recover: 0.15,
      damage: 28,
      range: 140,
      pose: 5,
      lift: 90,
    },
    launcher: {
      wind: 0.17,
      active: 0.15,
      recover: 0.27,
      damage: 33,
      range: 125,
      pose: 4,
      lift: 480,
      cost: 16,
    },
    dash: {
      wind: 0.1,
      active: 0.23,
      recover: 0.28,
      damage: 36,
      range: 155,
      pose: 5,
      lift: 170,
      cost: 22,
    },
    smash: {
      wind: 0.23,
      active: 0.2,
      recover: 0.35,
      damage: 48,
      range: 190,
      pose: 4,
      lift: 250,
      cost: 25,
    },
    mech: {
      wind: 0.22,
      active: 0.2,
      recover: 0.28,
      damage: 40,
      range: 300,
      pose: 3,
      lift: 0,
    },
    beam: {
      wind: 0.4,
      active: 0.25,
      recover: 0.5,
      damage: 85,
      range: 700,
      pose: 4,
      lift: 0,
      cost: 30,
    },
  }[kind];
  if (!data) return false;
  if (data.cost > g.energy) {
    notify(g, "기력이 부족합니다 · 기본 공격으로 충전");
    return false;
  }
  g.energy -= data.cost || 0;
  p.attack = { ...data, kind, time: 0, hits: new Set(), queued: false };
  p.state = "attack";
  p.age = 0;
  event(g, "swing", { kind });
  return true;
}
function hitEnemy(g, e, a) {
  if (e.down || a.hits.has(e.id)) return;
  a.hits.add(e.id);
  const p = g.player;
  const front = (p.x - e.x) * e.facing > 0;
  const shield =
    e.kind === "shield" &&
    front &&
    e.state !== "windup" &&
    e.state !== "strike" &&
    !["launcher", "smash", "air"].includes(a.kind);
  const damage = Math.round(
    a.damage * (g.mech ? 1 : PILOTS[g.pilot].power) * (shield ? 0.24 : 1),
  );
  e.hp = Math.max(0, e.hp - damage);
  e.stun = shield ? 0.13 : 0.34;
  e.state = "hurt";
  e.age = 0;
  e.x += p.facing * (shield ? 5 : 23);
  if (!shield) e.vy = a.lift || 0;
  g.combo++;
  g.bestCombo = Math.max(g.combo, g.bestCombo);
  g.comboTime = 2.4;
  g.energy = clamp(g.energy + (shield ? 3 : 9), 0, 100);
  g.score += damage * 10;
  g.hitstop = 0.055;
  g.shake = shield ? 2 : 6;
  fx(
    g,
    e.x,
    GROUND - e.y - 75,
    shield ? "metal" : "hit",
    shield ? "#a5e4ed" : "#ffe383",
    shield ? 6 : 13,
  );
  event(g, "hit", { shield, damage });
  if (e.hp <= 0) {
    if (e.boss) {
      e.down = true;
      e.state = "down";
      notify(g, "결정타! C를 빠르게 두 번 눌러라");
    } else {
      e.state = "dead";
      e.age = 0;
      g.kills++;
      g.score += 250;
    }
  }
}
function hurtPlayer(g, e) {
  const p = g.player;
  if (p.invuln > 0 || p.stun > 0 || e.hit) return;
  const high = e.kind === "mantis" && e.pattern % 2 === 1;
  const ground = e.kind === "core" && e.pattern % 3 === 0;
  const range = ground ? 1100 : e.range + 35;
  if (
    Math.abs(e.x - p.x) > range ||
    (!ground && Math.abs(p.y - e.y) > (high ? 170 : 110)) ||
    (ground && p.y > 60)
  )
    return;
  e.hit = true;
  const blocking =
    p.state === "guard" && (e.x - p.x) * p.facing >= 0 && !ground;
  const damage = blocking ? Math.ceil(e.damage * 0.12) : e.damage;
  p.hp = Math.max(0, p.hp - damage);
  if (!g.mech) g.party[g.pilot] = p.hp;
  p.invuln = blocking ? 0.2 : 0.62;
  p.stun = blocking ? 0.05 : 0.28;
  if (!blocking) {
    p.attack = null;
    p.state = "hurt";
    g.combo = 0;
    p.x = clamp(
      p.x + (e.x < p.x ? 1 : -1) * 28,
      40,
      STAGES[g.stage].length - 40,
    );
  } else {
    g.energy = clamp(g.energy + 4, 0, 100);
  }
  g.shake = blocking ? 2 : 9;
  fx(
    g,
    p.x,
    GROUND - p.y - 90,
    blocking ? "metal" : "hit",
    blocking ? "#9af1ff" : "#ef7758",
  );
  event(g, "hurt", { damage, blocking });
  if (p.hp <= 0) {
    if (g.mech || !g.party.some((v) => v > 0)) {
      g.mode = "defeat";
      g.modeTime = 0;
      event(g, "defeat");
    } else {
      g.tagCooldown = 0;
      switchPilot(g);
      notify(g, "대원 전투 불능 · 다른 대원으로 교대");
    }
  }
}
export function switchPilot(g) {
  if (g.mech || g.tagCooldown > 0) return false;
  const next = [1, 2].map((n) => (g.pilot + n) % 3).find((i) => g.party[i] > 0);
  if (next === undefined) return false;
  g.party[g.pilot] = g.player.hp;
  g.pilot = next;
  g.player.hp = g.party[next];
  g.player.attack = null;
  g.player.state = "idle";
  g.player.invuln = 0.65;
  g.tagCooldown = 1.2;
  fx(g, g.player.x, GROUND - g.player.y - 70, "tag", PILOTS[next].color, 18);
  event(g, "tag");
  return true;
}
function tagInput(g) {
  const double = g.clock - g.lastTag < 0.4;
  g.lastTag = g.clock;
  const boss = g.enemies.find((e) => e.down && e.boss);
  if (double && boss) {
    g.mode = "finisher";
    g.modeTime = 0;
    g.finisherTarget = boss.x;
    event(g, "finisher");
    return;
  }
  switchPilot(g);
}
function spawnWave(g) {
  const stage = STAGES[g.stage];
  if (g.wave < stage.waves.length) {
    const kinds = stage.waves[g.wave];
    kinds.forEach((kind, i) => enemy(g, kind, g.gate + 540 + i * 94));
    notify(g, `차단 구역 ${g.wave + 1} / 3`);
    g.wave++;
    g.gate = 560 + (g.wave - 1) * 570;
  } else if (!g.enemies.some((e) => e.boss) && g.gate < 2000) {
    g.gate = stage.length - 60;
    if (stage.boss === "core") {
      g.mode = "assembly";
      g.modeTime = 0;
      event(g, "assembly");
    } else {
      enemy(g, stage.boss, stage.length - 250);
      notify(
        g,
        stage.boss === "drill"
          ? "드릴 비틀 · 붉은 예고를 보고 피하라"
          : "글라스 맨티스 · 점프 공격에 주의",
      );
      event(g, "boss");
    }
  }
}
export function update(g, input = {}, dt = STEP) {
  if (!Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, 0.05);
  if (g.paused) return;
  g.clock += dt;
  g.modeTime += dt;
  if (g.mode === "intro") {
    if (g.modeTime > 2.8 || input.confirm) {
      g.mode = "combat";
      g.modeTime = 0;
      spawnWave(g);
    }
    return;
  }
  if (g.mode === "assembly") {
    if (g.modeTime > 4.5 || input.confirm) {
      g.mode = "combat";
      g.mech = true;
      g.player.max = 400;
      g.player.hp = 400;
      g.player.x = STAGES[g.stage].length - 820;
      g.energy = 80;
      enemy(g, "core", STAGES[g.stage].length - 270);
      notify(g, "갈대왕 합체 완료 · 지면 충격은 점프로 회피");
    }
    return;
  }
  if (g.mode === "finisher") {
    if (g.modeTime > 2.5) {
      g.score += 2500;
      g.mode = "stageclear";
      g.enemies = [];
      g.modeTime = 0;
      g.kills++;
      event(g, "clear");
    }
    return;
  }
  if (g.mode !== "combat") return;
  g.time += dt;
  g.stageTime = Math.max(0, g.stageTime - dt);
  if (!g.stageTime) {
    g.mode = "defeat";
    g.notice = "작전 시간 초과";
    return;
  }
  g.noticeTime = Math.max(0, g.noticeTime - dt);
  g.comboTime = Math.max(0, g.comboTime - dt);
  if (!g.comboTime) g.combo = 0;
  g.tagCooldown = Math.max(0, g.tagCooldown - dt);
  g.shake = Math.max(0, g.shake - dt * 45);
  g.effects = g.effects.filter((f) => {
    f.life -= dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vy += 290 * dt;
    return f.life > 0;
  });
  if (g.hitstop > 0) {
    if (input.attack && g.player.attack) g.player.attack.queued = true;
    g.hitstop -= dt;
    return;
  }
  const p = g.player;
  p.age += dt;
  p.invuln = Math.max(0, p.invuln - dt);
  p.stun = Math.max(0, p.stun - dt);
  if (input.tag) tagInput(g);
  if (g.mode !== "combat") return;
  if (p.y > 0 || p.vy > 0) {
    p.vy -= 1550 * dt;
    p.y = Math.max(0, p.y + p.vy * dt);
    if (p.y === 0) p.vy = 0;
  }
  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (!p.stun) {
    if (input.jump && p.y === 0 && !p.attack) {
      p.vy = g.mech ? 625 : 700;
      p.state = "jump";
      event(g, "jump");
    }
    if (p.attack) {
      const a = p.attack;
      a.time += dt;
      if (input.attack) a.queued = true;
      if (a.kind === "dash" && a.time >= a.wind && a.time < a.wind + a.active)
        p.x += p.facing * 650 * dt;
      if (a.time >= a.wind && a.time < a.wind + a.active) {
        for (const e of g.enemies) {
          if (e.hp <= 0 || e.down) continue;
          const distance = (e.x - p.x) * p.facing;
          if (
            distance > -25 &&
            distance < a.range + (e.boss ? 45 : 10) &&
            Math.abs(e.y - p.y) < (a.kind === "launcher" ? 190 : 125)
          )
            hitEnemy(g, e, a);
        }
      }
      if (a.time > a.wind + a.active + a.recover) {
        p.attack = null;
        if (a.queued && !g.mech && ["jab", "cross"].includes(a.kind))
          activeAttack(g, a.kind === "jab" ? "cross" : "kick");
        else p.state = "idle";
      }
    } else {
      if (direction) {
        p.facing = direction;
        p.x += direction * (g.mech ? 165 : PILOTS[g.pilot].speed) * dt;
        p.state = "run";
      } else p.state = p.y > 0 ? "jump" : "idle";
      if (input.guard && p.y === 0) p.state = "guard";
      if (input.attack && p.state !== "guard")
        activeAttack(g, g.mech ? "mech" : p.y > 0 ? "air" : "jab");
      if (input.special && p.state !== "guard")
        activeAttack(
          g,
          g.mech
            ? "beam"
            : input.up
              ? "launcher"
              : ["launcher", "dash", "smash"][g.pilot],
        );
    }
  }
  p.x = clamp(p.x, 40, Math.min(STAGES[g.stage].length - 50, g.gate + 320));
  for (const e of g.enemies) {
    e.age += dt;
    e.cooldown = Math.max(0, e.cooldown - dt);
    e.stun = Math.max(0, e.stun - dt);
    if (e.y > 0 || e.vy > 0) {
      e.vy -= 1350 * dt;
      e.y = Math.max(0, e.y + e.vy * dt);
      if (e.y === 0) e.vy = 0;
    }
    if (e.down || e.hp <= 0 || e.stun) continue;
    if (e.state === "hurt") {
      e.state = "approach";
      e.age = 0;
    }
    e.facing = p.x < e.x ? -1 : 1;
    const dist = Math.abs(e.x - p.x);
    if (e.state === "windup") {
      if (e.age >= e.windup) {
        e.state = "strike";
        e.age = 0;
        e.hit = false;
        e.pattern++;
        if (e.kind === "mantis" && e.pattern % 2) e.vy = 430;
        event(g, "enemyStrike", { kind: e.kind });
      }
    } else if (e.state === "strike") {
      if (e.kind === "drill") e.x += e.facing * 430 * dt;
      if (e.kind === "mantis") e.x += e.facing * 310 * dt;
      hurtPlayer(g, e);
      if (e.age > 0.3) {
        e.state = "recover";
        e.age = 0;
      }
    } else if (e.state === "recover") {
      if (e.age > e.recovery) {
        e.state = "approach";
        e.age = 0;
        e.cooldown = 0.18;
      }
    } else if (dist < e.range && e.cooldown === 0) {
      e.state = "windup";
      e.age = 0;
    } else if (dist > e.range * 0.8) {
      e.state = "approach";
      e.x += e.facing * e.speed * dt;
    }
    e.x = clamp(e.x, 35, STAGES[g.stage].length - 25);
  }
  g.enemies = g.enemies.filter((e) => e.hp > 0 || e.down || e.age < 0.75);
  const living = g.enemies.some((e) => e.hp > 0 || e.down);
  if (!living && p.x > g.gate - 160) spawnWave(g);
  g.camera = clamp(p.x - 420, 0, STAGES[g.stage].length - WIDTH);
}
export function createStepper(tick) {
  let previous = null,
    acc = 0;
  return {
    frame(ms, input) {
      if (previous === null) {
        previous = ms;
        return 0;
      }
      acc += Math.min(0.15, Math.max(0, (ms - previous) / 1000));
      previous = ms;
      let n = 0;
      while (acc + 1e-9 >= STEP && n < 9) {
        tick(
          n === 0
            ? input
            : {
                ...input,
                attack: false,
                special: false,
                jump: false,
                tag: false,
                confirm: false,
              },
          STEP,
        );
        acc -= STEP;
        n++;
      }
      return n;
    },
    reset() {
      previous = null;
      acc = 0;
    },
  };
}
