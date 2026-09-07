import { WIDTH, HEIGHT, GROUND, PILOTS, STAGES } from "./engine.mjs";
import { prepareAtlas } from "./atlas.mjs";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const HERO_CELLS = [
  [
    [0, 0, 211, 297],
    [214, 0, 235, 297],
    [451, 0, 244, 297],
    [695, 0, 253, 297],
    [948, 0, 178, 297],
    [1126, 0, 268, 297],
    [1394, 0, 191, 297],
    [1585, 0, 189, 297],
  ],
  [
    [0, 296, 215, 298],
    [215, 296, 235, 298],
    [450, 296, 245, 298],
    [695, 296, 247, 298],
    [942, 296, 174, 298],
    [1116, 296, 272, 298],
    [1388, 296, 195, 298],
    [1583, 296, 191, 298],
  ],
  [
    [0, 594, 217, 293],
    [217, 594, 231, 293],
    [448, 594, 245, 293],
    [693, 594, 240, 293],
    [933, 594, 184, 293],
    [1117, 594, 273, 293],
    [1390, 570, 192, 317],
    [1582, 594, 192, 293],
  ],
];
export { HERO_CELLS };
export function createRenderer(ctx, assets, { reducedMotion = false } = {}) {
  let reduced = reducedMotion;
  const makeCanvas =
    assets.makeCanvas ||
    ((w, h) => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      return canvas;
    });
  const heroFrames = prepareAtlas(
    assets.heroes,
    HERO_CELLS.map((row) =>
      row.map((cell, i) => [...cell, [95, 95, 97, 108, 93, 70, 88, 108][i]]),
    ),
    makeCanvas,
  );
  const enemyTargets = [
    [
      [26, 35, 258, 261],
      [330, 100, 262, 195],
      [549, 39, 406, 254],
      [994, 40, 244, 260],
    ],
    [
      [30, 338, 273, 251],
      [342, 364, 275, 215],
      [618, 353, 338, 225],
      [1021, 318, 214, 254],
    ],
    [
      [15, 599, 267, 285],
      [331, 642, 314, 232],
      [603, 664, 360, 194],
      [997, 598, 236, 285],
    ],
    [
      [9, 862, 288, 368],
      [327, 932, 322, 292],
      [560, 881, 380, 318],
      [992, 937, 251, 286],
    ],
  ];
  const enemyFrames = prepareAtlas(assets.enemies, enemyTargets, makeCanvas);
  const rect = (x, y, w, h, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  const line = (points, c = "#17323b", w = 3) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  };
  const poly = (points, c, stroke = "#143742", w = 3) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = w;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  };
  const ellipse = (x, y, rx, ry, c, stroke = null, w = 2) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = w;
      ctx.stroke();
    }
  };
  const text = (
    s,
    x,
    y,
    size = 20,
    c = "#fff",
    align = "left",
    outline = false,
  ) => {
    ctx.font = `${size}px Galmuri, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    if (outline) {
      ctx.strokeStyle = "#12333c";
      ctx.lineWidth = 5;
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = c;
    ctx.fillText(s, x, y);
  };
  function shadow(x, y, size = 48) {
    ellipse(x, y + 4, size, 10, "#16394055");
  }
  function background(g) {
    const image = assets.backdrops[g.stage];
    const aspect = image.width / image.height;
    const dw = HEIGHT * aspect;
    const shift = clamp(g.camera * 0.65, 0, dw - WIDTH);
    ctx.drawImage(image, -shift, 0, dw, HEIGHT);
    // Ground markings track the play plane; the painted architecture scrolls farther away.
    ctx.save();
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 8; i++) {
      const x = i * 345 - (g.camera % 345);
      line(
        [
          [x, 684],
          [x + 95, 684],
        ],
        g.stage === 2 ? "#c49757" : "#e4dfc4",
        4,
      );
    }
    ctx.restore();
    if (
      g.wave &&
      g.wave < 4 &&
      g.enemies.some((e) => e.hp > 0) &&
      g.gate - g.camera < 1250
    ) {
      const x = g.gate + 340 - g.camera;
      rect(x - 9, 528, 18, 78, "#343f3b");
      for (let i = 0; i < 6; i++)
        poly(
          [
            [x - 9, 530 + i * 12],
            [x + 9, 518 + i * 12],
            [x + 9, 526 + i * 12],
            [x - 9, 538 + i * 12],
          ],
          "#f3c448",
          null,
        );
    }
  }
  function sprite(row, pose, x, y, scale = 1, facing = 1, alpha = 1) {
    const frame = heroFrames[row][pose];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing * scale, scale);
    ctx.globalAlpha = alpha;
    const ratio = 0.61;
    ctx.drawImage(
      frame.image,
      -frame.pivot * ratio,
      -frame.height * ratio,
      frame.width * ratio,
      frame.height * ratio,
    );
    ctx.restore();
  }
  function heroPose(p, g) {
    if (p.state === "hurt") return 7;
    if (p.state === "guard") return 7;
    if (p.attack) {
      const a = p.attack;
      return a.time < a.wind ? 7 : a.time < a.wind + a.active ? a.pose : 0;
    }
    if (p.y > 0) return 6;
    if (p.state === "run") return 1 + (Math.floor(p.age * 9) % 2);
    return 0;
  }
  function drawHero(g) {
    const p = g.player,
      x = p.x - g.camera,
      y = GROUND - p.y;
    shadow(x, GROUND, g.mech ? 97 : 45);
    if (g.mech) {
      mecha(
        x,
        y,
        p.facing,
        p.attack?.time > p.attack?.wind
          ? p.attack.kind === "beam"
            ? 2
            : 1
          : 0,
        1,
        reduced ? 0 : g.clock,
      );
      if (
        p.attack?.kind === "beam" &&
        p.attack.time > p.attack.wind &&
        p.attack.time < p.attack.wind + p.attack.active
      ) {
        line(
          [
            [x + p.facing * 100, y - 180],
            [x + p.facing * 760, y - 180],
          ],
          "#9eeaff",
          30,
        );
        line(
          [
            [x + p.facing * 100, y - 180],
            [x + p.facing * 760, y - 180],
          ],
          "#edffff",
          13,
        );
      }
      return;
    }
    const pose = heroPose(p, g);
    const bob =
      !reduced && p.state === "idle" ? Math.sin(g.clock * 3) * 1.5 : 0;
    const alpha =
      p.invuln > 0.1 && !reduced && Math.floor(g.clock * 18) % 2 ? 0.65 : 1;
    sprite(g.pilot, pose, x, y + bob, 1, p.facing, alpha);
    if (p.state === "guard") {
      ctx.beginPath();
      ctx.arc(
        x + p.facing * 32,
        y - 83,
        64,
        p.facing === 1 ? -1.2 : 1.9,
        p.facing === 1 ? 1.2 : 4.4,
      );
      ctx.strokeStyle = "#aeeef1";
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    if (
      p.attack &&
      p.attack.time > p.attack.wind &&
      p.attack.time < p.attack.wind + p.attack.active
    ) {
      const a = p.attack;
      ctx.save();
      ctx.translate(x, y - 85);
      ctx.scale(p.facing, 1);
      if (a.kind === "launcher") {
        ctx.beginPath();
        ctx.arc(38, 0, 77, -1.65, 0.5);
        ctx.strokeStyle = "#ffe7a9";
        ctx.lineWidth = 7;
        ctx.stroke();
      } else if (a.kind === "smash") {
        ellipse(0, 78, 190, 20, "#ffdb5d55", "#ffe297", 5);
      } else {
        line(
          [
            [45, -5],
            [a.range - 10, -20],
            [a.range + 12, -5],
          ],
          "#ffe8b3",
          5,
        );
      }
      ctx.restore();
    }
  }
  function drawEnemy(e, g) {
    const x = e.x - g.camera,
      y = GROUND - e.y;
    shadow(x, GROUND, e.boss ? 65 : 44);
    if (e.kind === "core") {
      core(
        x,
        y,
        e.state === "windup" ? 1 : e.state === "strike" ? 2 : 0,
        reduced ? 0 : g.clock,
      );
      if (e.down) text("C + C", x, y - 354, 25, "#ffdf69", "center", true);
      return;
    }
    let pose =
      e.state === "windup"
        ? 1
        : e.state === "strike"
          ? 2
          : ["hurt", "dead", "down"].includes(e.state)
            ? 3
            : 0;
    const frame = enemyFrames[e.row][pose],
      scale = e.boss ? 0.78 : 0.57;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(e.facing === -1 ? 1 : -1, 1);
    if (e.state === "dead") ctx.globalAlpha = Math.max(0, 1 - e.age / 0.75);
    ctx.drawImage(
      frame.image,
      -frame.width * scale * 0.5,
      -frame.height * scale,
      frame.width * scale,
      frame.height * scale,
    );
    ctx.restore();
    if (e.state === "windup") {
      const pct = clamp(e.age / e.windup, 0, 1);
      ellipse(x, GROUND + 2, e.range * 0.78, 10, "#db674052", "#e27d51", 2);
      ctx.beginPath();
      ctx.arc(
        x,
        y - (e.boss ? 240 : 171),
        13,
        -Math.PI / 2,
        -Math.PI / 2 + pct * Math.PI * 2,
      );
      ctx.strokeStyle = "#ffd479";
      ctx.lineWidth = 4;
      ctx.stroke();
      text("!", x, y - (e.boss ? 234 : 165), 16, "#ffecbd", "center", true);
    }
    if (!e.boss && e.hp < e.max && e.hp > 0) {
      rect(x - 31, y - 182, 62, 6, "#243742");
      rect(x - 30, y - 181, (60 * e.hp) / e.max, 4, "#eeab66");
    }
    if (e.down) {
      text("C + C", x, y - (e.boss ? 246 : 180), 21, "#ffdf69", "center", true);
    }
  }
  function plate(points, color) {
    poly(points, color, "#172d36", 4);
    const a = points[0],
      b = points[1];
    line(
      [
        [a[0] + 4, a[1] + 4],
        [b[0] - 4, b[1] + 4],
      ],
      "#e6f1db99",
      2,
    );
  }
  function mechLimb(x, y, angle, len, w, color, fist = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    plate(
      [
        [-w / 2, 0],
        [w / 2, 0],
        [w * 0.42, len],
        [-w * 0.42, len],
      ],
      color,
    );
    rect(-w * 0.26, 12, w * 0.52, len - 22, "#263b45");
    line(
      [
        [-w * 0.37, 10],
        [-w * 0.3, len - 5],
      ],
      "#9fb2b6",
      4,
    );
    ellipse(0, 0, w * 0.58, w * 0.58, "#506a75", "#152c35", 4);
    ellipse(0, 0, w * 0.28, w * 0.28, "#b9c7c3");
    if (fist) {
      plate(
        [
          [-w * 0.65, len - 5],
          [w * 0.7, len - 7],
          [w * 0.82, len + 25],
          [-w * 0.72, len + 27],
        ],
        "#dbe4da",
      );
      for (let i = -1; i <= 1; i++)
        line(
          [
            [i * w * 0.35, len],
            [i * w * 0.35, len + 19],
          ],
          "#7c949d",
          3,
        );
    }
    ctx.restore();
  }
  function mecha(x, y, facing, pose, scale = 1, t = 0, assembly = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing * scale, scale);
    const split = (1 - assembly) * 220;
    ctx.save();
    ctx.translate(-split, split * 0.3);
    mechLimb(-38, -140, 0.12, 113, 60, "#2581b4");
    plate(
      [
        [-77, -28],
        [-11, -25],
        [3, 0],
        [-90, 0],
      ],
      "#d8e1d6",
    );
    plate(
      [
        [-71, -88],
        [-14, -83],
        [-16, -55],
        [-63, -60],
      ],
      "#52bae0",
    );
    ctx.restore();
    ctx.save();
    ctx.translate(split, split * 0.3);
    mechLimb(39, -140, -0.15, 113, 62, "#d8a530");
    plate(
      [
        [6, -25],
        [76, -28],
        [90, 0],
        [-5, 0],
      ],
      "#d8e1d6",
    );
    plate(
      [
        [13, -87],
        [70, -91],
        [64, -61],
        [16, -54],
      ],
      "#f6cf5c",
    );
    ctx.restore();
    ctx.save();
    ctx.translate(0, -split);
    plate(
      [
        [-72, -279],
        [64, -279],
        [83, -199],
        [36, -142],
        [-34, -142],
        [-88, -203],
      ],
      "#c3413d",
    );
    plate(
      [
        [-56, -257],
        [47, -257],
        [50, -223],
        [0, -170],
        [-59, -221],
      ],
      "#e75743",
    );
    ellipse(-1, -217, 43, 43, "#243f4d", "#b8c9c1", 6);
    ellipse(-1, -217, 31, 31, "#1974a4", "#0e2d3c", 4);
    for (let i = 0; i < 8; i++) {
      const a = t * 0.2 + (i * Math.PI) / 4;
      line(
        [
          [Math.cos(a) * 15 - 1, -217 + Math.sin(a) * 15],
          [Math.cos(a + 0.4) * 28 - 1, -217 + Math.sin(a + 0.4) * 28],
        ],
        "#54c3e4",
        4,
      );
    }
    ellipse(-1, -217, 12, 12, "#c2f7eb");
    plate(
      [
        [-53, -278],
        [0, -287],
        [54, -278],
        [34, -260],
        [-36, -260],
      ],
      "#e4e9d6",
    );
    mechLimb(-80, -253, 0.35, 104, 49, "#314d64", true);
    if (pose === 1) {
      mechLimb(77, -249, -1.5, 159, 56, "#dce3d5", true);
    } else if (pose === 2) {
      mechLimb(78, -249, -0.95, 114, 53, "#dce3d5", true);
      ellipse(134, -187, 28, 31, "#81dfed", "#e1ffff", 5);
    } else mechLimb(76, -253, -0.23, 104, 49, "#314d64", true);
    plate(
      [
        [-88, -252],
        [-137, -311],
        [-122, -317],
        [-42, -285],
      ],
      "#e3e7d5",
    );
    plate(
      [
        [74, -256],
        [132, -304],
        [112, -321],
        [39, -285],
      ],
      "#e3e7d5",
    );
    plate(
      [
        [-26, -278],
        [-32, -313],
        [-12, -337],
        [18, -338],
        [34, -308],
        [20, -276],
      ],
      "#ca493d",
    );
    plate(
      [
        [-26, -309],
        [17, -315],
        [34, -300],
        [10, -292],
        [-20, -299],
      ],
      "#143746",
    );
    poly(
      [
        [17, -305],
        [51, -298],
        [40, -287],
        [16, -289],
      ],
      "#e8c874",
      "#172c33",
      3,
    );
    poly(
      [
        [-12, -335],
        [-29, -360],
        [8, -346],
        [19, -335],
      ],
      "#eec966",
      "#17303c",
      3,
    );
    ctx.restore();
    ctx.restore();
  }
  function core(x, y, pose, t) {
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 3; i++) {
      const sx = (i - 1) * 48;
      for (const dir of [-1, 1]) {
        const px = dir * (75 + i * 13);
        line(
          [
            [dir * 55, -118],
            [px, -65],
            [px + dir * 40, -8],
          ],
          "#172b31",
          23,
        );
        line(
          [
            [dir * 55, -118],
            [px, -65],
            [px + dir * 40, -8],
          ],
          "#637366",
          15,
        );
        ellipse(px, -65, 14, 14, "#ad9672", "#24393b", 3);
        plate(
          [
            [px + dir * 30, -22],
            [px + dir * 51, -6],
            [px + dir * 41, 2],
            [px + dir * 22, -2],
          ],
          "#88907a",
        );
      }
      void sx;
    }
    plate(
      [
        [-73, -148],
        [-87, -227],
        [-52, -282],
        [51, -282],
        [93, -222],
        [75, -144],
      ],
      "#4e675d",
    );
    ellipse(0, -203, 79, 77, "#536b5d", "#18333a", 6);
    ellipse(0, -203, 57, 58, "#b7864a", "#263b3d", 8);
    ellipse(0, -203, 45, 45, "#d96732");
    for (let i = -2; i < 3; i++)
      line(
        [
          [i * 15, -243],
          [i * 15, -164],
        ],
        "#594a36",
        5,
      );
    ellipse(0, -199, 13, 24, "#ffd067");
    for (const dir of [-1, 1]) {
      plate(
        [
          [dir * 44, -255],
          [dir * 45, -307],
          [dir * 65, -307],
          [dir * 67, -251],
        ],
        "#786e56",
      );
      ellipse(dir * 55, -308, 13, 7, "#2a3d3b", "#92876e", 3);
      const raised = pose === 1,
        slam = pose === 2;
      const ax = dir * 112,
        ay = raised ? -292 : slam ? -67 : -186;
      line(
        [
          [dir * 71, -232],
          [dir * 119, raised ? -252 : -155],
          [ax, ay],
        ],
        "#253b3f",
        29,
      );
      line(
        [
          [dir * 71, -232],
          [dir * 119, raised ? -252 : -155],
          [ax, ay],
        ],
        "#7c8270",
        18,
      );
      ellipse(dir * 118, raised ? -253 : -155, 17, 17, "#b69361", "#253d42", 3);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(dir * (raised ? 0.1 : slam ? -1.35 : 1));
      plate(
        [
          [0, 0],
          [-31, -20],
          [-38, -64],
          [-13, -95],
          [-13, -43],
          [9, -24],
        ],
        "#94a28a",
      );
      plate(
        [
          [6, 0],
          [38, -16],
          [45, -63],
          [25, -86],
          [23, -43],
          [1, -23],
        ],
        "#819381",
      );
      ctx.restore();
    }
    ellipse(0, -288, 37, 27, "#748d6e", "#254348", 5);
    ellipse(0, -292, 15, 12, "#f28543", "#2b4545", 4);
    if (pose === 1) {
      ellipse(0, 5, 370, 12, "#e8784550", "#f2c477", 3);
      text("JUMP", 0, -360, 22, "#ffe5a7", "center", true);
    }
    if (pose === 2) {
      for (let i = 0; i < 8; i++)
        poly(
          [
            [i * 80 - 290, 9],
            [i * 80 - 269, -21 - (i % 3) * 10],
            [i * 80 - 249, 9],
          ],
          "#e8c668",
          "#ac5d3c",
          2,
        );
    }
    ctx.restore();
  }
  function hud(g) {
    const p = g.player;
    rect(20, 22, 404, 84, "#092b38e8");
    poly(
      [
        [20, 22],
        [109, 22],
        [87, 106],
        [20, 106],
      ],
      PILOTS[g.pilot].dark,
      null,
    );
    ctx.save();
    ctx.beginPath();
    ctx.rect(20, 22, 88, 84);
    ctx.clip();
    sprite(g.pilot, 0, 65, 184, 0.95, 1);
    ctx.restore();
    text(
      g.mech ? "合体 / 갈대왕" : PILOTS[g.pilot].title,
      117,
      47,
      14,
      "#d6e7da",
    );
    rect(116, 57, 291, 17, "#071b23");
    rect(
      118,
      59,
      287 * (p.hp / p.max),
      13,
      g.mech ? "#61dbe7" : PILOTS[g.pilot].color,
    );
    rect(116, 81, 220, 7, "#061d29");
    rect(117, 82, (218 * g.energy) / 100, 5, "#f4d15a");
    text(`${Math.ceil(p.hp)}/${p.max}`, 407, 97, 12, "#b9d5d7", "right");
    for (let i = 0; i < 3; i++) {
      rect(20 + i * 133, 111, 128, 30, "#17343dcf");
      rect(23 + i * 133, 113, 122, 5, "#193640");
      rect(23 + i * 133, 113, (122 * g.party[i]) / 120, 5, PILOTS[i].color);
      text(
        PILOTS[i].name,
        23 + i * 133,
        135,
        12,
        i === g.pilot ? "#fff7cc" : "#96bec5",
      );
    }
    text(STAGES[g.stage].tag, WIDTH / 2, 43, 17, "#e9ecd4", "center", true);
    text(
      String(Math.ceil(g.stageTime)).padStart(3, "0"),
      WIDTH / 2,
      82,
      27,
      "#fff4b9",
      "center",
      true,
    );
    const boss = g.enemies.find((e) => e.boss);
    if (boss) {
      rect(838, 68, 418, 54, "#17303be8");
      text(
        boss.kind === "drill"
          ? "DRILL BEETLE"
          : boss.kind === "mantis"
            ? "GLASS MANTIS"
            : "CLOCKWORK LEVIATHAN",
        850,
        88,
        13,
        "#f6d29f",
      );
      rect(850, 98, 392, 12, "#0b2028");
      rect(852, 100, (388 * boss.hp) / boss.max, 8, "#d98354");
    } else {
      text(
        `SECTOR ${Math.min(g.wave, 3)} / 3`,
        1247,
        90,
        16,
        "#2c5962",
        "right",
      );
    }
    rect(19, 665, 250, 32, "#17343ddb");
    text("SCORE", 29, 687, 12, "#9ac4cb");
    text(String(g.score).padStart(7, "0"), 255, 689, 22, "#fbebbd", "right");
    if (g.combo > 1) {
      text(`${g.combo}`, 1179, 205, 52, "#fff3b3", "right", true);
      text("HIT COMBO", 1179, 228, 15, "#f2b37b", "right", true);
    }
    if (g.noticeTime > 0) {
      rect(328, 142, 624, 37, "#0d313ccb");
      text(g.notice, 640, 167, 16, "#fff0bf", "center");
    }
    if (!g.enemies.some((e) => e.hp > 0 || e.down) && g.mode === "combat") {
      text("GO  ▶", 1114, 366, 33, "#ffe58d", "center", true);
    }
    if (!g.mech) {
      text(
        "Z 콤보  ·  X 특수  ·  C 교대  ·  SPACE 점프  ·  V 방어",
        640,
        699,
        13,
        "#deebe1",
        "center",
        true,
      );
    } else {
      text(
        "Z 강철권  ·  X 광선  ·  SPACE 지면 충격 회피  ·  V 방어",
        640,
        699,
        13,
        "#deebe1",
        "center",
        true,
      );
    }
  }
  function title(g) {
    background(g);
    rect(0, 0, WIDTH, HEIGHT, "#063043b8");
    for (let i = 0; i < 14; i++)
      poly(
        [
          [640 + i * 55, 0],
          [670 + i * 55, 0],
          [480 + i * 55, 720],
          [455 + i * 55, 720],
        ],
        "#8cbbc715",
        null,
      );
    sprite(1, 5, 833, 640, 1.52, 1);
    sprite(2, 4, 1115, 650, 1.62, -1);
    sprite(0, 3, 961, 657, 2.01, 1);
    text("FLAMINGO", 82, 366, 60, "#e4e9d0");
    text("RANGERS", 82, 430, 66, "#edb757");
    text("갈대 수호전대", 86, 476, 25, "#a9cad1");
  }
  function assembly(g) {
    rect(0, 0, 1280, 720, "#092a3a");
    for (let i = 0; i < 17; i++) {
      const x = i * 95 + ((reduced ? 0 : g.modeTime * 90) % 95);
      line(
        [
          [x, -30],
          [x - 370, 750],
        ],
        "#1e4e60",
        3,
      );
    }
    const phase = reduced ? 1 : clamp(g.modeTime / 3, 0, 1);
    mecha(650, 634, 1, 0, 1.4, reduced ? 0 : g.clock, phase);
    text("THREE SIGNALS. ONE GUARDIAN.", 640, 67, 20, "#83c6d4", "center");
    text("갈 대 왕  합 체", 640, 125, 44, "#fff0c3", "center", true);
    text(
      phase < 0.35
        ? "BLUE / 하체 구동부 접속"
        : phase < 0.7
          ? "YELLOW / 동력 장갑 접속"
          : "RED / 메인 코어 동기화",
      640,
      681,
      20,
      "#f2d47d",
      "center",
    );
  }
  function finisher(g) {
    background(g);
    rect(0, 0, 1280, 720, "#0a29379a");
    const beam = reduced
      ? Number(g.modeTime > 0.55)
      : clamp((g.modeTime - 0.55) * 3, 0, 1);
    if (g.mech) {
      mecha(400, 646, 1, 2, 1, reduced ? 0 : g.clock);
    } else {
      sprite(0, 3, 332, 571, 1.25, 1);
      sprite(1, 7, 480, 588, 1.17, 1);
      sprite(2, 4, 405, 591, 1.15, 1);
    }
    ellipse(548, 464, 17, 90, "#d1f4bf22", "#f3e796", 5);
    if (beam > 0) {
      line(
        [
          [546, 464],
          [546 + 730 * beam, 464],
        ],
        "#edc457",
        36,
      );
      line(
        [
          [546, 464],
          [546 + 730 * beam, 464],
        ],
        "#c5eef0",
        22,
      );
      line(
        [
          [546, 464],
          [546 + 730 * beam, 464],
        ],
        "#ffffff",
        8,
      );
    }
    text(
      g.mech ? "갈대왕 · 삼색 코어 해방" : "세 깃털 · 트리니티 버스트",
      640,
      181,
      38,
      "#fff0ba",
      "center",
      true,
    );
    text("TEAM FINISH", 640, 225, 20, "#abd6df", "center");
  }
  function draw(g) {
    ctx.save();
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    if (g.mode === "title" || g.mode === "select" || g.mode === "help") {
      title(g);
      ctx.restore();
      return;
    }
    if (g.mode === "assembly") {
      assembly(g);
      ctx.restore();
      return;
    }
    if (g.mode === "finisher") {
      finisher(g);
      ctx.restore();
      return;
    }
    if (!reduced && g.shake > 0)
      ctx.translate(
        Math.sin(g.clock * 147) * g.shake * 0.4,
        Math.cos(g.clock * 131) * g.shake * 0.2,
      );
    background(g);
    const sorted = g.enemies.filter(
      (e) => e.x - g.camera > -350 && e.x - g.camera < 1600,
    );
    for (const e of sorted) drawEnemy(e, g);
    drawHero(g);
    for (const f of g.effects) {
      ctx.globalAlpha = clamp(f.life / f.max, 0, 1);
      const x = f.x - g.camera;
      if (f.type === "hit") {
        line(
          [
            [x, f.y],
            [x - f.vx * 0.035, f.y - f.vy * 0.035],
          ],
          f.color,
          3,
        );
      } else {
        poly(
          [
            [x, f.y - 3],
            [x + 4, f.y],
            [x, f.y + 3],
            [x - 4, f.y],
          ],
          f.color,
          null,
        );
      }
    }
    ctx.globalAlpha = 1;
    hud(g);
    if (g.mode === "intro") {
      rect(0, 224, 1280, 207, "#0c3144ec");
      text(STAGES[g.stage].tag, 640, 271, 22, "#edbf66", "center");
      text(STAGES[g.stage].name, 640, 337, 51, "#fff0cc", "center");
      text(STAGES[g.stage].subtitle, 640, 386, 18, "#b3d7dd", "center");
    }
    ctx.restore();
  }
  return {
    draw,
    setReduced(v) {
      reduced = v;
    },
    drawPilot(target, row) {
      target.clearRect(0, 0, target.canvas.width, target.canvas.height);
      const frame = heroFrames[row][0];
      const h = target.canvas.height * 0.97,
        w = (h * frame.width) / frame.height;
      target.drawImage(frame.image, (target.canvas.width - w) / 2, 2, w, h);
    },
    sprite,
  };
}
