import "./style.css";
import {
  createGame,
  begin,
  nextStage,
  createStepper,
  update,
  PILOTS,
} from "./engine.mjs";
import { createRenderer } from "./renderer.mjs";

const canvas = document.querySelector("#game"),
  ctx = canvas.getContext("2d", { alpha: false });
const overlay = document.querySelector("#overlay"),
  status = document.querySelector("#status");
const abort = new AbortController(),
  listen = (el, type, fn, opts = {}) =>
    el.addEventListener(type, fn, { ...opts, signal: abort.signal });
const game = createGame();
let selected = 0,
  soundOn = false,
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches,
  audio = null,
  raf = 0,
  disposed = false,
  lastUI = "",
  lastStatus = -1;
const held = new Set(),
  edges = new Set();
const known = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyA",
  "KeyD",
  "KeyW",
  "KeyZ",
  "KeyX",
  "KeyC",
  "KeyV",
  "Space",
  "Enter",
  "Escape",
]);
const actions = {
  attack: ["KeyZ"],
  special: ["KeyX"],
  jump: ["Space", "KeyW"],
  tag: ["KeyC"],
  confirm: ["Enter"],
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  up: ["ArrowUp"],
  guard: ["KeyV", "ArrowDown"],
};
function input() {
  const out = {};
  for (const [key, codes] of Object.entries(actions))
    out[key] = codes.some((c) =>
      (["left", "right", "up", "guard"].includes(key) ? held : edges).has(c),
    );
  return out;
}
let uiAbort = new AbortController();
const uiListen = (el, type, fn) =>
  el.addEventListener(type, fn, { signal: uiAbort.signal });
const clear = () => {
  held.clear();
  edges.clear();
};
function cue(type) {
  if (!soundOn) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    void audio.resume();
    const osc = audio.createOscillator(),
      gain = audio.createGain(),
      t = audio.currentTime;
    osc.type = type === "hit" ? "sawtooth" : "triangle";
    const freq =
      {
        hit: 210,
        swing: 330,
        hurt: 100,
        tag: 560,
        finisher: 700,
        jump: 430,
        clear: 840,
        boss: 120,
        assembly: 190,
      }[type] || 260;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(
      type === "hit" ? 52 : freq * 1.4,
      t + 0.11,
    );
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.15);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  } catch {
    soundOn = false;
    document.querySelector("#sound").textContent = "소리 사용 불가";
  }
}
function setPause(value) {
  if (game.mode !== "combat") return;
  game.paused = value;
  clear();
  stepper.reset();
  renderUI(true);
  if (!value) canvas.focus({ preventScroll: true });
}
listen(document, "keydown", (e) => {
  if (!known.has(e.code)) return;
  if (e.code === "Escape") {
    e.preventDefault();
    if (!e.repeat) setPause(!game.paused);
    return;
  }
  if (
    game.mode === "combat" ||
    game.mode === "intro" ||
    game.mode === "assembly"
  ) {
    e.preventDefault();
    if (!held.has(e.code)) edges.add(e.code);
    held.add(e.code);
  } else if (e.code === "Enter" && !e.repeat && e.target === canvas) {
    e.preventDefault();
    if (game.mode === "title") {
      game.mode = "select";
      renderUI(true);
    } else if (game.mode === "stageclear") {
      nextStage(game);
      renderUI(true);
    }
  }
});
listen(document, "keyup", (e) => {
  held.delete(e.code);
});
listen(window, "blur", clear);
listen(document, "visibilitychange", () => {
  clear();
  stepper.reset();
  if (document.hidden && game.mode === "combat") setPause(true);
});
listen(document.querySelector("#pause"), "click", () => setPause(!game.paused));
listen(document.querySelector("#sound"), "click", () => {
  soundOn = !soundOn;
  document.querySelector("#sound").textContent =
    `소리 ${soundOn ? "ON" : "OFF"}`;
  document
    .querySelector("#sound")
    .setAttribute("aria-pressed", String(soundOn));
  if (soundOn) cue("tag");
});
listen(document.querySelector("#motion"), "click", () => {
  reduced = !reduced;
  renderer.setReduced(reduced);
  document
    .querySelector("#motion")
    .setAttribute("aria-pressed", String(reduced));
});
for (const btn of document.querySelectorAll("[data-key]")) {
  listen(btn, "pointerdown", (e) => {
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    if (!held.has(btn.dataset.key)) edges.add(btn.dataset.key);
    held.add(btn.dataset.key);
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    listen(btn, name, () => held.delete(btn.dataset.key));
}
function wire(selector, fn) {
  const target = overlay.querySelector(selector);
  if (target) uiListen(target, "click", fn);
}
function start() {
  begin(game, selected);
  clear();
  stepper.reset();
  canvas.focus({ preventScroll: true });
  renderUI(true);
}
function renderUI(force = false) {
  const key = `${game.mode}:${game.paused}`;
  if (key === lastUI && !force) return;
  lastUI = key;
  uiAbort.abort();
  uiAbort = new AbortController();
  document.body.classList.toggle(
    "playing",
    game.mode === "combat" && !game.paused,
  );
  document.querySelector("#pause").hidden = game.mode !== "combat";
  document.querySelector("#pause").textContent = game.paused
    ? "계속하기 Esc"
    : "일시정지 Esc";
  if (game.paused) {
    overlay.innerHTML =
      '<section class="screen modal-screen"><p class="eyebrow">TRANSMISSION PAUSED</p><h2>잠시 숨을 고르자.</h2><p>적의 붉은 예고를 보고 방어하거나 점프하세요.<br>방패 병정은 X 상승권과 공중 공격에 약합니다.</p><div class="buttons"><button class="arcade-btn" id="resume">계속하기</button><button class="arcade-btn secondary" id="restart">처음부터</button></div></section>';
    wire("#resume", () => setPause(false));
    wire("#restart", start);
    return;
  }
  if (game.mode === "title") {
    overlay.innerHTML =
      '<section class="screen"><div class="title-copy"><p class="eyebrow">한 도시. 세 개의 신호.</p><h1>출동 준비.</h1><p>유리빛 대로에서 중앙 관제탑까지.<br>세 대원을 교대하며 도시를 되찾아라.</p></div><div class="title-actions"><button class="arcade-btn" id="select">출동하기</button><button class="arcade-btn secondary" id="help">조작 방법</button></div><p class="caption">ORIGINAL FLAMINGO PARODY · 1 PLAYER · 3 STAGES</p></section>';
    wire("#select", () => {
      game.mode = "select";
      renderUI(true);
    });
    wire("#help", () => {
      game.mode = "help";
      renderUI(true);
    });
  } else if (game.mode === "select") {
    overlay.innerHTML = `<section class="screen select-screen"><p class="eyebrow">SELECT YOUR LEAD RANGER</p><h2>첫 번째 대원을 선택하세요.</h2><div class="roster">${PILOTS.map((p, i) => `<button class="pilot" data-pilot="${i}" aria-pressed="${i === selected}"><canvas class="select-art" width="300" height="200" aria-hidden="true"></canvas><strong>${p.name} / ${["RED", "BLUE", "YELLOW"][i]}</strong><small>${p.note}<br>X · ${p.skill}</small></button>`).join("")}</div><div class="select-bottom"><button class="arcade-btn secondary" id="back">돌아가기</button><button class="arcade-btn" id="start">작전 시작</button></div></section>`;
    for (const button of overlay.querySelectorAll("[data-pilot]")) {
      renderer.drawPilot(
        button.querySelector("canvas").getContext("2d"),
        Number(button.dataset.pilot),
      );
      uiListen(button, "click", () => {
        selected = Number(button.dataset.pilot);
        for (const other of overlay.querySelectorAll("[data-pilot]"))
          other.setAttribute("aria-pressed", String(other === button));
      });
    }
    wire("#back", () => {
      game.mode = "title";
      renderUI(true);
    });
    wire("#start", start);
  } else if (game.mode === "help") {
    overlay.innerHTML =
      '<section class="screen modal-screen"><p class="eyebrow">FIELD MANUAL</p><h2>예고를 읽고, 틈을 파고들어라.</h2><div class="controls"><div><kbd>← / →</kbd>이동</div><div><kbd>SPACE</kbd>점프</div><div><kbd>Z · Z · Z</kbd>3단 콤보</div><div><kbd>공중 Z</kbd>점프 발차기</div><div><kbd>X</kbd>대원별 특수기</div><div><kbd>↑ + X</kbd>상승권</div><div><kbd>C</kbd>살아 있는 대원 교대</div><div><kbd>V / ↓</kbd>전방 방어</div><div><kbd>C · C</kbd>쓰러진 보스 결정타</div><div><kbd>Esc</kbd>일시정지</div></div><p>특수기는 기력을 쓰고, 기본 공격과 방어로 충전합니다.<br>세 구역을 돌파하면 보스가 등장합니다. 마지막에는 거대 로봇으로 합체합니다.</p><button class="arcade-btn" id="back">알겠습니다</button></section>';
    wire("#back", () => {
      game.mode = "title";
      renderUI(true);
    });
  } else if (game.mode === "stageclear") {
    overlay.innerHTML = `<section class="screen modal-screen"><p class="eyebrow">SECTOR SECURED</p><h2>${game.stage === 2 ? "도시의 불빛이 돌아왔다." : "구역 확보. 다음 신호로."}</h2><div class="result-stats"><div><strong>${game.score}</strong><span>SCORE</span></div><div><strong>${game.bestCombo}</strong><span>BEST COMBO</span></div><div><strong>${game.kills}</strong><span>DEFEATED</span></div></div><p>${game.stage === 2 ? "세 대원과 갈대왕의 작전이 완료되었습니다." : "다음 구역으로 이동하면 대원의 체력이 일부 회복됩니다."}</p><button class="arcade-btn" id="next">${game.stage === 2 ? "작전 결과" : "다음 구역으로"}</button></section>`;
    wire("#next", () => {
      nextStage(game);
      clear();
      stepper.reset();
      canvas.focus({ preventScroll: true });
      renderUI(true);
    });
  } else if (game.mode === "victory" || game.mode === "defeat") {
    const win = game.mode === "victory";
    overlay.innerHTML = `<section class="screen modal-screen"><p class="eyebrow">${win ? "MISSION COMPLETE" : "SIGNAL LOST"}</p><h2>${win ? "고생했다. 갈대 수호전대!" : "대원들이 잠시 물러납니다."}</h2><div class="result-stats"><div><strong>${game.score}</strong><span>SCORE</span></div><div><strong>${game.bestCombo}</strong><span>BEST COMBO</span></div></div><p>${win ? "세 구역 돌파 · 두 보스 격파 · 갈대왕 합체 완료" : "기력을 모아 특수기로 방패를 깨고, 피해를 입기 전에 교대해 보세요."}</p><div class="buttons"><button class="arcade-btn" id="restart">다시 출동</button><button class="arcade-btn secondary" id="title">제목으로</button></div></section>`;
    wire("#restart", start);
    wire("#title", () => {
      game.mode = "title";
      game.paused = false;
      clear();
      renderUI(true);
    });
  } else overlay.replaceChildren();
}
async function load(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}
let renderer;
const stepper = createStepper((i, dt) => update(game, i, dt));
function frame(now) {
  if (disposed) return;
  const n = stepper.frame(now, input());
  if (n > 0) edges.clear();
  renderer.draw(game);
  for (const e of game.events.splice(0)) cue(e.type);
  renderUI();
  const seconds = Math.floor(game.clock);
  if (seconds !== lastStatus) {
    lastStatus = seconds;
    status.textContent = `${PILOTS[game.pilot].name}, 체력 ${Math.ceil(game.player.hp)}, 점수 ${game.score}, ${game.stage + 1}구역`;
  }
  raf = requestAnimationFrame(frame);
}
function dispose() {
  if (disposed) return;
  disposed = true;
  cancelAnimationFrame(raf);
  clear();
  uiAbort.abort();
  abort.abort();
  void audio?.close();
}
listen(window, "pagehide", (e) => {
  if (!e.persisted) dispose();
  else {
    clear();
    stepper.reset();
  }
});
listen(window, "pageshow", () => stepper.reset());
try {
  const [heroes, enemies, ...backdrops] = await Promise.all([
    load("./art/rangers-atlas.png"),
    load("./art/enemies-atlas.png"),
    load("./art/glass-avenue.png"),
    load("./art/canal-junction.png"),
    load("./art/central-tower.png"),
  ]);
  await document.fonts.ready;
  renderer = createRenderer(
    ctx,
    { heroes, enemies, backdrops },
    { reducedMotion: reduced },
  );
  document
    .querySelector("#motion")
    .setAttribute("aria-pressed", String(reduced));
  renderUI(true);
  raf = requestAnimationFrame(frame);
} catch (error) {
  overlay.innerHTML =
    '<section class="screen modal-screen"><h2>그림을 불러오지 못했습니다.</h2><p>파일이 모두 있는지 확인한 뒤 새로고침해 주세요.</p><button class="arcade-btn" id="reload">다시 불러오기</button></section>';
  wire("#reload", () => location.reload());
  console.error("Game asset loading failed", error);
}
