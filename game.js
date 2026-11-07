// Bumerang-Duell VR – WebXR, first person, 1v1 P2P im WLAN
import * as THREE from './three.module.min.js';

// =====================================================================
// Konstanten / Tuning
// =====================================================================
const VERSION = 2;
const A = 6.0;                 // halbe Arenagroesse (12 x 12 m)
const MOVE_SPEED = 3.0;
const DASH_DIST = 3.2, DASH_TIME = 0.12, DASH_CD = 0.9;
const BOOM_MIN_SPEED = 10, BOOM_MAX_SPEED = 20, BOOM_RETURN_SPEED = 17;
const HIT_RADIUS = 0.42;       // Koerper-Radius fuer Treffer
const CATCH_RADIUS = 0.4;
const EXPLO_RADIUS = 2.0;
const WIN_SCORE = 5;
const COLORS = [0xff8a1f, 0x2ec8ff];
const NAMES = ['ORANGE', 'BLAU'];
const CSS = ['#ff8a1f', '#2ec8ff'];
const SPAWNS = [{ x: 0, z: -4.6, yaw: Math.PI }, { x: 0, z: 4.6, yaw: 0 }];
const BLOCKS = [
  { x: -3, z: -1.6, hw: 0.6, hd: 0.6, h: 1.5 }, { x: 3, z: 1.6, hw: 0.6, hd: 0.6, h: 1.5 },
  { x: 3, z: -1.6, hw: 0.6, hd: 0.6, h: 1.5 }, { x: -3, z: 1.6, hw: 0.6, hd: 0.6, h: 1.5 },
  { x: 0, z: 0, hw: 1.1, hd: 0.25, h: 0.7 },  // niedrige Mauer: Bumerangs fliegen drueber
];
const POWER_LABEL = { multi: 'MULTI-BUMERANG', explosive: 'EXPLOSIV', shield: 'SCHILD', teleport: 'TELEPORT' };
const POWER_COLOR = { multi: '#ffe14a', explosive: '#ff4040', shield: '#7dff9a', teleport: '#c37bff' };

// =====================================================================
// Grund-Setup
// =====================================================================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd3ff);
scene.fog = new THREE.Fog(0x8fd3ff, 25, 70);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 200);
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);
camera.position.set(0, 1.65, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x556644, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(5, 10, 3);
scene.add(sun);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- Hilfen ----------
const V = () => new THREE.Vector3();
const tmp1 = V(), tmp2 = V(), tmp3 = V();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function mat(color, emissive = 0x000000, ei = 0) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei, roughness: 0.6, metalness: 0.05 });
}
function canvasTex(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return { c, g: c.getContext('2d'), t };
}

// =====================================================================
// Arena
// =====================================================================
(function buildArena() {
  // Boden mit Kacheln
  const { c, g, t } = canvasTex(512, 512);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    g.fillStyle = (i + j) % 2 ? '#f3d9a4' : '#e9c98a'; g.fillRect(i * 64, j * 64, 64, 64);
  }
  g.fillStyle = 'rgba(255,138,31,.35)'; g.fillRect(0, 448, 512, 64);
  g.fillStyle = 'rgba(46,200,255,.35)'; g.fillRect(0, 0, 512, 64);
  t.magFilter = THREE.NearestFilter;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(A * 2, A * 2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  // Kachel-Textur: oben im Canvas = -Z nach Rotation? PlaneGeometry v=1 oben -> nach Rotation bei z=-A. Orange (Slot 0) soll bei z=-A liegen:
  floor.rotation.z = Math.PI;
  scene.add(floor);
  // Wiese drumherum
  const grass = new THREE.Mesh(new THREE.CircleGeometry(60, 32), mat(0x6cbf5a));
  grass.rotation.x = -Math.PI / 2; grass.position.y = -0.02; scene.add(grass);
  // Rand-Mauern
  const wallM = mat(0x8a5a3c);
  [[0, -A - 0.15, A * 2 + 0.6, 0.3], [0, A + 0.15, A * 2 + 0.6, 0.3], [-A - 0.15, 0, 0.3, A * 2], [A + 0.15, 0, 0.3, A * 2]].forEach(([x, z, w, d]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), wallM); m.position.set(x, 0.3, z); scene.add(m);
  });
  // Bloecke
  BLOCKS.forEach(b => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.hw * 2, b.h, b.hd * 2), mat(b.h < 1 ? 0x9a6b4a : 0x5f6b8a));
    m.position.set(b.x, b.h / 2, b.z); scene.add(m);
    const top = new THREE.Mesh(new THREE.BoxGeometry(b.hw * 2 + 0.04, 0.06, b.hd * 2 + 0.04), mat(0xffffff));
    top.position.set(b.x, b.h, b.z); scene.add(top);
  });
  // Deko: Baeume
  const trunk = mat(0x7a4a2a), leaf = mat(0x2f8f4a);
  for (let i = 0; i < 40; i++) {
    const a = i / 40 * Math.PI * 2 + Math.random() * 0.1, r = 12 + Math.random() * 18;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.8 + Math.random() * 1.2;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.2 * s, 1.2 * s, 6), trunk); tr.position.set(x, 0.6 * s, z); scene.add(tr);
    const lf = new THREE.Mesh(new THREE.ConeGeometry(1.0 * s, 2.4 * s, 7), leaf); lf.position.set(x, 2.2 * s, z); scene.add(lf);
  }
  // Spawn-Markierungen
  SPAWNS.forEach((s, i) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 32), new THREE.MeshBasicMaterial({ color: COLORS[i] }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(s.x, 0.01, s.z); scene.add(ring);
  });
})();

// Kollision Kreis (xz) gegen Arena -> gibt korrigierte Position zurueck
function resolveCircle(x, z, r) {
  x = clamp(x, -A + r, A - r); z = clamp(z, -A + r, A - r);
  for (const b of BLOCKS) {
    const ex = b.hw + r, ez = b.hd + r;
    const dx = x - b.x, dz = z - b.z;
    if (Math.abs(dx) < ex && Math.abs(dz) < ez) {
      const px = ex - Math.abs(dx), pz = ez - Math.abs(dz);
      if (px < pz) x = b.x + Math.sign(dx || 1) * ex; else z = b.z + Math.sign(dz || 1) * ez;
    }
  }
  return [x, z];
}

// =====================================================================
// Audio (synthetisch, keine Dateien)
// =====================================================================
let actx = null;
function initAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) {} }
function noiseBuf(d) {
  const b = actx.createBuffer(1, actx.sampleRate * d, actx.sampleRate), a = b.getChannelData(0);
  for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; return b;
}
function tone(type, f0, f1, dur, vol = 0.2, delay = 0) {
  if (!actx) return; const t = actx.currentTime + delay;
  const o = actx.createOscillator(), g = actx.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, ftype, f0, f1, vol = 0.3) {
  if (!actx) return; const t = actx.currentTime;
  const s = actx.createBufferSource(); s.buffer = noiseBuf(dur);
  const f = actx.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = 2;
  const g = actx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(actx.destination); s.start(t);
}
const sfx = {
  throw: () => noise(0.28, 'bandpass', 600, 2400, 0.35),
  catch: () => { tone('triangle', 700, 1300, 0.09, 0.25); },
  kill: () => { noise(0.5, 'lowpass', 2000, 100, 0.6); tone('sine', 160, 40, 0.5, 0.5); tone('square', 880, 1760, 0.15, 0.08, 0.1); },
  beep: (f = 660) => tone('square', f, f, 0.14, 0.12),
  power: () => [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.12, 0.18, i * 0.07)),
  parry: () => { tone('square', 2200, 1800, 0.08, 0.12); tone('square', 3100, 2600, 0.1, 0.08); },
  boom: () => { noise(0.8, 'lowpass', 1200, 60, 0.8); tone('sine', 90, 30, 0.7, 0.6); },
  dash: () => noise(0.15, 'highpass', 800, 3000, 0.25),
  bounce: () => tone('triangle', 300, 200, 0.06, 0.15),
  shield: () => { tone('sine', 400, 1200, 0.25, 0.2); },
  teleport: () => { tone('sine', 200, 2000, 0.25, 0.2); noise(0.25, 'bandpass', 3000, 400, 0.2); },
  incoming: (v) => noise(0.35, 'bandpass', 3000, 700, 0.35 * v),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone('square', f, f, 0.16, 0.1, i * 0.13)),
};

// =====================================================================
// HUD: Anzeigetafel, Kopf-HUD, Handgelenk
// =====================================================================
const board = canvasTex(1024, 320);
const boardMat = new THREE.MeshBasicMaterial({ map: board.t, transparent: true });
for (const rot of [0, Math.PI]) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.25), boardMat);
  p.position.set(0, 3.3, 0); p.rotation.y = rot; scene.add(p);
}
let boardMsg = 'Verbinde …';
function drawBoard() {
  const g = board.g; g.clearRect(0, 0, 1024, 320);
  g.fillStyle = 'rgba(13,16,32,.82)'; g.beginPath(); g.roundRect(8, 8, 1008, 304, 40); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (mode === 'match' || mode === 'over') {
    g.font = 'bold 120px system-ui'; g.fillStyle = CSS[0]; g.fillText(String(scoresArr[0]), 330, 130);
    g.fillStyle = '#fff'; g.fillText(':', 512, 125);
    g.fillStyle = CSS[1]; g.fillText(String(scoresArr[1]), 694, 130);
    g.font = 'bold 34px system-ui'; g.fillStyle = CSS[0]; g.fillText(NAMES[0], 160, 130);
    g.fillStyle = CSS[1]; g.fillText(NAMES[1], 864, 130);
  } else {
    g.font = 'bold 64px system-ui'; g.fillStyle = '#ffe14a'; g.fillText(mode === 'practice' ? 'ÜBUNG · Treffer: ' + practiceHits : 'BUMERANG-DUELL', 512, 120);
  }
  g.font = '40px system-ui'; g.fillStyle = '#fff'; g.fillText(boardMsg, 512, 250);
  board.t.needsUpdate = true;
}

const hudTex = canvasTex(1024, 512);
const hud = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: hudTex.t, transparent: true, depthTest: false }));
hud.renderOrder = 999; hud.position.set(0, 0.05, -1.3); camera.add(hud);
let hudTimer = 0;
function showHud(text, sub = '', color = '#fff', dur = 1.6) {
  const g = hudTex.g; g.clearRect(0, 0, 1024, 512); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 150px system-ui'; g.lineWidth = 14; g.strokeStyle = 'rgba(0,0,0,.65)';
  g.strokeText(text, 512, 220); g.fillStyle = color; g.fillText(text, 512, 220);
  if (sub) { g.font = 'bold 56px system-ui'; g.lineWidth = 10; g.strokeText(sub, 512, 360); g.fillStyle = '#fff'; g.fillText(sub, 512, 360); }
  hudTex.t.needsUpdate = true; hud.visible = true; hudTimer = dur;
}
hud.visible = false;
const flash = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false }));
flash.renderOrder = 998; flash.visible = false; camera.add(flash);
let flashT = 0;

const wristTex = canvasTex(512, 200);
const wrist = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.0625), new THREE.MeshBasicMaterial({ map: wristTex.t, transparent: true }));
let wristKey = '';
function drawWrist() {
  const key = mySlot + '|' + myPower + '|' + myShield + '|' + alive;
  if (key === wristKey) return; wristKey = key;
  const g = wristTex.g; g.clearRect(0, 0, 512, 200);
  g.fillStyle = 'rgba(13,16,32,.85)'; g.beginPath(); g.roundRect(4, 4, 504, 192, 30); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 44px system-ui'; g.fillStyle = mySlot >= 0 ? CSS[mySlot] : '#fff';
  g.fillText(mySlot >= 0 ? 'DU: ' + NAMES[mySlot] : '…', 256, 60);
  g.font = 'bold 46px system-ui';
  g.fillStyle = myPower ? POWER_COLOR[myPower] : '#888';
  g.fillText(myPower ? POWER_LABEL[myPower] + (myPower === 'shield' && !myShield ? ' (weg)' : '') : 'kein Power-up', 256, 140);
  wristTex.t.needsUpdate = true;
}

// =====================================================================
// Figuren
// =====================================================================
function makeBoomerangMesh(color) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const geo = new THREE.BoxGeometry(0.26, 0.022, 0.06); geo.translate(0.13, 0, 0);
  const m = mat(color, color, 0.25);
  const a1 = new THREE.Mesh(geo, m); a1.rotation.y = 0.55;
  const a2 = new THREE.Mesh(geo, m); a2.rotation.y = Math.PI - 0.55;
  inner.add(a1, a2); inner.position.z = 0.07;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat(0xffffff)); tip.position.z = -0.07; g.add(tip);
  g.userData.mat = m;
  return g;
}
function setBoomPowerLook(mesh, power, slot) {
  const m = mesh.userData.mat;
  const c = power === 'explosive' ? 0xff3030 : power === 'teleport' ? 0xb36bff : power === 'multi' ? 0xffe14a : COLORS[slot];
  m.color.setHex(c); m.emissive.setHex(c); m.emissiveIntensity = power ? 0.7 : 0.25;
}

function makeAvatar(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.55, 4, 10), mat(color));
  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), mat(color));
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.1), mat(0x111122, 0x223355, 0.6)); visor.position.set(0, 0.02, -0.12);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.025, 6, 20), mat(0xffffff)); band.rotation.x = Math.PI / 2; band.position.y = 0.06;
  head.add(skull, visor, band);
  const lh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(0xffffff));
  const rh = lh.clone();
  const shield = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 14), new THREE.MeshBasicMaterial({ color: 0x7dff9a, transparent: true, opacity: 0.22, depthWrite: false }));
  shield.visible = false;
  g.add(body, head, lh, rh, shield);
  return { g, body, head, lh, rh, shield };
}

// Eigene Haende (sichtbar in VR)
function makeHandMesh(color) {
  const g = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.11), mat(color)); g.add(palm);
  return g;
}

// =====================================================================
// Spielzustand
// =====================================================================
let mySlot = -1, mode = 'connecting'; // connecting | practice | match | over
let scoresArr = [0, 0];
let alive = true, canMove = true, myPower = null, myShield = false;
let practiceHits = 0;
let inXR = false;
const oppSlot = () => 1 - mySlot;

// Haende: in VR die Controller-Grips, am Bildschirm virtuelle Haende an der Kamera
const deskHands = { left: new THREE.Group(), right: new THREE.Group() };
deskHands.left.position.set(-0.3, -0.32, -0.7); deskHands.right.position.set(0.3, -0.32, -0.7);
deskHands.right.rotation.set(-0.2, 0, 0);
camera.add(deskHands.left, deskHands.right);
function mkHand(name) { return { name, obj: deskHands[name], src: null, hist: [], prevTrig: false, prevGrip: false, gripT: 0, prevA: false, prevStick: 0 }; }
const hands = { left: mkHand('left'), right: mkHand('right') };
const handMeshes = { left: makeHandMesh(0xffffff), right: makeHandMesh(0xffffff) };

for (let i = 0; i < 2; i++) {
  const grip = renderer.xr.getControllerGrip(i);
  rig.add(grip);
  grip.addEventListener('connected', e => {
    const h = hands[e.data.handedness]; if (!h) return;
    h.obj = grip; h.src = e.data; h.hist = [];
    grip.add(handMeshes[e.data.handedness]);
    if (e.data.handedness === 'left') { grip.add(wrist); wrist.position.set(0.0, 0.06, 0.06); wrist.rotation.set(-1.0, 0, 0); }
  });
  grip.addEventListener('disconnected', e => {
    const h = hands[e.data && e.data.handedness]; if (!h) return;
    h.obj = deskHands[h.name]; h.src = null;
  });
}

function handPos(h, out) { return h.obj.getWorldPosition(out); }
function handVel(h, out) {
  out.set(0, 0, 0);
  const H = h.hist; if (H.length < 2) return out;
  const now = H[H.length - 1];
  let old = H[0];
  for (let i = H.length - 1; i >= 0; i--) { if (now.t - H[i].t >= 0.07) { old = H[i]; break; } }
  const dt = now.t - old.t; if (dt <= 0) return out;
  out.copy(now.p).sub(old.p).divideScalar(dt).applyQuaternion(rig.quaternion);
  return out;
}
function haptic(h, intensity, ms) {
  try { const a = h.src && h.src.gamepad && h.src.gamepad.hapticActuators && h.src.gamepad.hapticActuators[0]; if (a) a.pulse(intensity, ms); } catch (e) {}
}

// ---------- Bodenschatten + Flugspur (Lesbarkeit in VR) ----------
const shadowGeo = new THREE.CircleGeometry(0.16, 16);
function makeShadow() {
  const m = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); return m;
}
function placeShadow(sh, pos, visible) {
  sh.visible = visible; if (!visible) return;
  sh.position.set(pos.x, 0.012, pos.z);
  const k = clamp(1 - pos.y / 3, 0.3, 1); sh.scale.setScalar(0.7 + (1 - k)); sh.material.opacity = 0.45 * k;
}
const trail = [];
const trailGeo = new THREE.SphereGeometry(0.045, 6, 4);
const trailMats = {};
function trailMat(hex) { return trailMats[hex] || (trailMats[hex] = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.55, depthWrite: false })); }
function addTrail(pos, hex) {
  const m = new THREE.Mesh(trailGeo, trailMat(hex)); m.position.copy(pos); m.userData.life = 0.22; scene.add(m); trail.push(m);
}

// ---------- Eigene Bumerangs ----------
let boomSeq = 1;
const myBooms = [];
function newBoom(extra = false) {
  const b = { id: (mySlot + 1) * 100000 + boomSeq++, mesh: makeBoomerangMesh(COLORS[Math.max(0, mySlot)]), state: 'held', hand: 'right',
    pos: V(), vel: V(), shadow: makeShadow(), trailT: 0, phase: 'out', traveled: 0, range: 8, speed: 12, tBack: 0, extra, hit: false, exploded: false, respawn: 0 };
  scene.add(b.mesh); myBooms.push(b); setBoomPowerLook(b.mesh, myPower, Math.max(0, mySlot));
  return b;
}
let mainBoom = null;
function resetMyBooms() {
  for (const b of myBooms) { scene.remove(b.mesh); scene.remove(b.shadow); }
  myBooms.length = 0;
  mainBoom = newBoom(false);
}
function removeBoom(b) { scene.remove(b.mesh); scene.remove(b.shadow); const i = myBooms.indexOf(b); if (i >= 0) myBooms.splice(i, 1); }

// ---------- Gegner ----------
const opp = { av: null, has: false, alive: true, shield: false, power: null, head: V(), lh: V(), rh: V(), headQ: new THREE.Quaternion(),
  tHead: V(), tLh: V(), tRh: V(), tQ: new THREE.Quaternion(), booms: new Map(), lastSeen: 0 };
function ensureOppAvatar() {
  if (opp.av || mySlot < 0) return;
  opp.av = makeAvatar(COLORS[oppSlot()]); scene.add(opp.av.g); opp.av.g.visible = false;
}

// ---------- Uebungs-Dummy ----------
const dummy = makeAvatar(0xdddddd); scene.add(dummy.g); dummy.g.visible = false;
let dummyT = 0, dummyDown = 0;
const dummyPos = V();

// ---------- Kisten ----------
const crates = new Map();
const crateTex = (() => {
  const { g, t } = canvasTex(128, 128);
  g.fillStyle = '#ffcc33'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#7a4a00'; g.lineWidth = 10; g.strokeRect(5, 5, 118, 118);
  g.fillStyle = '#7a4a00'; g.font = 'bold 96px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 64, 70);
  return t;
})();
function addCrate(id, x, z) {
  if (crates.has(id)) return;
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshStandardMaterial({ map: crateTex, emissive: 0xffaa00, emissiveIntensity: 0.35 }));
  m.position.set(x, 1.0, z); scene.add(m); crates.set(id, { m, x, z, pending: false });
}
function clearCrates() { crates.forEach(c => scene.remove(c.m)); crates.clear(); }

// ---------- Partikel ----------
const parts = [];
const partGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
function burst(pos, color, n = 30, spd = 4) {
  const m = new THREE.MeshBasicMaterial({ color });
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(partGeo, m); p.position.copy(pos);
    p.userData.v = V().set(Math.random() - 0.5, Math.random() * 0.9, Math.random() - 0.5).normalize().multiplyScalar(spd * (0.4 + Math.random()));
    p.userData.life = 0.7 + Math.random() * 0.5; scene.add(p); parts.push(p);
  }
}
const explos = [];
function explosionFx(pos) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xff7a20, transparent: true, opacity: 0.8, depthWrite: false }));
  s.position.copy(pos); s.scale.setScalar(0.1); scene.add(s); explos.push({ s, t: 0 });
  burst(pos, 0xffcc33, 40, 6);
}

// =====================================================================
// Netzwerk: PeerJS (WebRTC, direkt im WLAN). Host-Quest = Schiedsrichter.
// =====================================================================
let peer = null, conn = null, isHost = false, referee = null, roomId = '';
const statusEl = document.getElementById('status');
function setStatus(t) { statusEl.textContent = t; boardMsg = t; drawBoard(); }

function connect(room) {
  roomId = 'bumerangduell-vr-' + room.replace(/[^0-9a-zA-Z]/g, '');
  tryHost();
}
function tryHost() {
  setStatus('Verbinde mit Raum …');
  if (peer) try { peer.destroy(); } catch (e) {}
  peer = new Peer(roomId, { debug: 1 });
  peer.on('open', () => {
    isHost = true;
    referee = new Referee();
    referee.join(0);
  });
  peer.on('connection', c => {
    if (conn && conn.open) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); }); return; }
    conn = c;
    c.on('open', () => referee.join(1));
    c.on('data', d => { if (d.t === 's' || d.t === 'fx') handle(d); else referee.msg(1, d); });
    c.on('close', () => { if (conn === c) { conn = null; referee.leave(1); } });
    c.on('error', () => {});
  });
  peer.on('error', err => {
    if (err.type === 'unavailable-id') tryGuest();
    else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') setStatus('Keine Internet-Verbindung zum Vermittlungs-Server');
    else if (!isHost && err.type === 'peer-unavailable') { setStatus('Host nicht erreichbar – neuer Versuch …'); setTimeout(tryHost, 1500); }
    else console.warn('peer error', err.type);
  });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
}
function tryGuest() {
  isHost = false;
  try { peer.destroy(); } catch (e) {}
  setStatus('Raum gefunden – trete bei …');
  peer = new Peer({ debug: 1 });
  peer.on('open', () => {
    const c = peer.connect(roomId, { reliable: true });
    conn = c;
    const to = setTimeout(() => { if (!c.open) { setStatus('Host antwortet nicht – neuer Versuch …'); tryHost(); } }, 7000);
    c.on('open', () => { clearTimeout(to); });
    c.on('data', d => handle(d));
    c.on('close', () => { if (conn === c) { conn = null; mode = 'connecting'; setStatus('Verbindung zum Host verloren – Seite neu laden'); showHud('GETRENNT', 'Seite neu laden', '#ff6060', 5); } });
  });
  peer.on('error', err => {
    if (err.type === 'peer-unavailable') { setTimeout(tryHost, 800); }
    else console.warn('peer error', err.type);
  });
}
function netSend(m) {
  if (isHost) {
    if (m.t === 's' || m.t === 'fx') { if (conn && conn.open) conn.send(m); }
    else if (referee) referee.msg(0, m);
  } else if (conn && conn.open) conn.send(m);
}

// ---------- Schiedsrichter (laeuft nur auf dem Host) ----------
const CRATE_SPOTS = [[0, -1.2], [0, 1.2], [-4.6, 0], [4.6, 0], [-1.8, -3.4], [1.8, 3.4], [1.8, -3.4], [-1.8, 3.4]];
const POWERS = ['multi', 'explosive', 'shield', 'teleport'];
class Referee {
  constructor() {
    this.present = [false, false];
    this.P = [this.mk(), this.mk()];
    this.phase = 'lobby'; this.round = 0; this.crates = {}; this.cid = 1; this.ct = null; this.pt = null;
  }
  mk() { return { alive: true, shield: false, power: null, score: 0 }; }
  to(slot, o) { if (slot === 0) queueMicrotask(() => handle(o)); else if (conn && conn.open) conn.send(o); }
  bc(o) { this.to(0, o); this.to(1, o); }
  count() { return this.present.filter(Boolean).length; }
  join(slot) {
    this.present[slot] = true; this.to(slot, { t: 'welcome', slot });
    if (this.count() === 2) this.startMatch(); else this.startPractice();
  }
  leave(slot) { this.present[slot] = false; this.startPractice(); }
  stopCrates() { clearInterval(this.ct); this.ct = null; this.crates = {}; this.bc({ t: 'crates' }); }
  startCrates(first) {
    this.stopCrates();
    this.ft = setTimeout(() => this.spawnCrate(), first);
    this.ct = setInterval(() => this.spawnCrate(), 6500);
  }
  spawnCrate() {
    if (!(this.phase === 'fight' || this.phase === 'practice')) return;
    if (Object.keys(this.crates).length >= 2) return;
    const used = Object.values(this.crates).map(c => c.x + ',' + c.z);
    const free = CRATE_SPOTS.filter(s => !used.includes(s[0] + ',' + s[1]));
    const s = free[Math.floor(Math.random() * free.length)], id = this.cid++;
    this.crates[id] = { x: s[0], z: s[1] };
    this.bc({ t: 'crate', id, x: s[0], z: s[1] });
  }
  clear() { clearTimeout(this.pt); clearTimeout(this.ft); }
  startPractice() {
    this.clear(); this.phase = 'practice';
    this.P.forEach(p => Object.assign(p, this.mk()));
    this.bc({ t: 'practice' }); this.startCrates(1500);
  }
  startMatch() { this.clear(); this.round = 0; this.P.forEach(p => Object.assign(p, this.mk())); this.startRound(); }
  startRound() {
    this.round++; this.phase = 'countdown';
    this.P.forEach(p => { p.alive = true; p.shield = false; p.power = null; });
    this.stopCrates();
    this.bc({ t: 'round', round: this.round, scores: this.P.map(p => p.score) });
    this.pt = setTimeout(() => { this.phase = 'fight'; this.bc({ t: 'fight' }); this.startCrates(3500); }, 3000);
  }
  endCheck() {
    const al = [0, 1].filter(i => this.P[i].alive);
    if (al.length > 1 || this.phase !== 'fight') return;
    this.phase = 'roundEnd';
    this.pt = setTimeout(() => {
      const al2 = [0, 1].filter(i => this.P[i].alive);
      const w = al2.length === 1 ? al2[0] : -1;
      if (w >= 0) this.P[w].score++;
      this.stopCrates();
      const sc = this.P.map(p => p.score);
      if (w >= 0 && sc[w] >= WIN_SCORE) {
        this.phase = 'matchEnd'; this.bc({ t: 'match', winner: w, scores: sc });
        this.pt = setTimeout(() => { if (this.count() === 2) this.startMatch(); }, 7000);
      } else {
        this.bc({ t: 'roundEnd', winner: w, scores: sc });
        this.pt = setTimeout(() => { if (this.count() === 2) this.startRound(); }, 2600);
      }
    }, 900); // Fenster fuer Doppel-KO
  }
  msg(from, m) {
    if (m.t === 'hit') {
      const v = m.victim;
      if (!(v === 0 || v === 1) || !(this.phase === 'fight' || this.phase === 'roundEnd') || !this.P[v].alive) return;
      if (this.P[v].shield) { this.P[v].shield = false; this.bc({ t: 'shield', slot: v, on: false, x: m.x, y: m.y, z: m.z }); return; }
      this.P[v].alive = false;
      this.bc({ t: 'kill', victim: v, by: from, cause: m.cause, x: m.x, y: m.y, z: m.z });
      this.endCheck();
    } else if (m.t === 'pickup') {
      if (!this.crates[m.id] || !(this.phase === 'fight' || this.phase === 'practice') || !this.P[from].alive) return;
      delete this.crates[m.id];
      const type = POWERS[Math.floor(Math.random() * POWERS.length)];
      this.P[from].power = type; this.P[from].shield = type === 'shield';
      this.bc({ t: 'power', slot: from, type, id: m.id });
    }
  }
}

// =====================================================================
// Nachrichten verarbeiten
// =====================================================================
function handle(m) {
  switch (m.t) {
    case 'welcome':
      mySlot = m.slot; ensureOppAvatar();
      for (const b of myBooms) setBoomPowerLook(b.mesh, myPower, mySlot);
      ['left', 'right'].forEach(n => handMeshes[n].children[0].material.color.setHex(COLORS[mySlot]));
      wristKey = '';
      break;
    case 'full': setStatus('Raum ist voll (2 Spieler)'); break;
    case 'practice':
      mode = 'practice'; practiceHits = 0; alive = true; canMove = true; myPower = null; myShield = false;
      if (!mainBoom) resetMyBooms(); else resetMyBooms();
      dummy.g.visible = true; dummyDown = 0;
      if (opp.av) opp.av.g.visible = false; opp.has = false;
      setStatus('Warte auf Spieler 2 · triff den Dummy!');
      showHud('ÜBUNG', 'Warte auf Spieler 2', '#ffe14a', 2.5);
      break;
    case 'round':
      mode = 'match'; scoresArr = m.scores; alive = true; canMove = false; myPower = null; myShield = false;
      dummy.g.visible = false; clearCrates(); resetMyBooms(); placeAtSpawn();
      opp.alive = true; opp.shield = false; if (opp.av) { opp.av.shield.visible = false; }
      setStatus('Runde ' + m.round + ' · erster mit ' + WIN_SCORE + ' Punkten gewinnt');
      countdown = 3; countdownT = 0; showHud('3', 'Du bist ' + NAMES[mySlot], CSS[mySlot], 1); sfx.beep(523);
      break;
    case 'fight':
      canMove = true; countdown = 0; showHud('LOS!', '', '#ffe14a', 0.9); sfx.beep(1046);
      break;
    case 'crates': clearCrates(); break;
    case 'crate': addCrate(m.id, m.x, m.z); break;
    case 'power': {
      const c = crates.get(m.id); if (c) { burst(c.m.position, 0xffcc33, 20, 3); scene.remove(c.m); crates.delete(m.id); }
      if (m.slot === mySlot) {
        myPower = m.type; myShield = m.type === 'shield';
        for (const b of myBooms) setBoomPowerLook(b.mesh, myPower, mySlot);
        showHud(POWER_LABEL[m.type], powerHint(m.type), POWER_COLOR[m.type], 2.2); sfx.power();
        haptic(hands.left, 0.6, 80); haptic(hands.right, 0.6, 80);
      } else {
        opp.power = m.type; opp.shield = m.type === 'shield';
        if (opp.av) opp.av.shield.visible = opp.shield;
      }
      break;
    }
    case 'shield':
      if (m.slot === mySlot) { myShield = false; showHud('SCHILD WEG!', '', '#7dff9a', 1.2); haptic(hands.left, 1, 150); haptic(hands.right, 1, 150); }
      else { opp.shield = false; if (opp.av) opp.av.shield.visible = false; }
      sfx.shield(); if (m.x !== undefined) burst(tmp1.set(m.x, m.y, m.z), 0x7dff9a, 25, 4);
      break;
    case 'kill': {
      sfx.kill();
      if (m.victim === mySlot) {
        flashT = 0.9; flash.visible = true;
        alive = false; canMove = false;
        for (const b of myBooms) b.mesh.visible = false;
        showHud(m.cause === 'boom' && m.by === mySlot ? 'EIGENTOR!' : 'GETROFFEN!', '', '#ff4d4d', 2.2);
        camera.getWorldPosition(tmp1); burst(tmp1.setY(1.0), COLORS[mySlot], 40, 5);
        haptic(hands.left, 1, 300); haptic(hands.right, 1, 300);
      } else {
        opp.alive = false;
        if (opp.av) { burst(opp.head, COLORS[oppSlot()], 50, 5); opp.av.g.visible = false; }
        showHud('KO!', 'Treffer!', '#ffe14a', 1.5);
        haptic(hands.right, 0.8, 120);
      }
      break;
    }
    case 'roundEnd':
      scoresArr = m.scores; drawBoard();
      if (m.winner < 0) showHud('DOPPEL-KO', 'kein Punkt', '#fff', 2.2);
      else showHud(m.winner === mySlot ? 'PUNKT FÜR DICH' : 'PUNKT FÜR ' + NAMES[m.winner], scoresArr[0] + ' : ' + scoresArr[1], CSS[m.winner], 2.2);
      break;
    case 'match':
      scoresArr = m.scores; mode = 'over';
      showHud(m.winner === mySlot ? 'DU GEWINNST!' : NAMES[m.winner] + ' GEWINNT', scoresArr[0] + ' : ' + scoresArr[1] + ' · Neues Match gleich', CSS[m.winner], 6.5);
      setStatus(NAMES[m.winner] + ' gewinnt das Match!');
      if (m.winner === mySlot) { sfx.win(); for (let i = 0; i < 5; i++) setTimeout(() => { camera.getWorldPosition(tmp2); burst(tmp2.add(tmp3.set(Math.random() * 4 - 2, 1.5, Math.random() * 4 - 2)), [0xff8a1f, 0x2ec8ff, 0xffe14a, 0xff4dd2][i % 4], 40, 5); }, i * 300); }
      break;
    case 's': checkVersion(m.v); applyRemoteState(m); break;
    case 'fx': onFx(m); break;
  }
  drawBoard();
}
let versionWarned = false;
function checkVersion(v) {
  if (v === VERSION || versionWarned) return;
  versionWarned = true;
  showHud('ANDERE VERSION', 'Beide Quests: Seite neu laden', '#ff6060', 8);
  setStatus('Versionen unterschiedlich – auf beiden Quests neu laden');
}
function powerHint(t) {
  return { multi: 'Wirf 3 auf einmal', explosive: 'Explodiert beim Aufprall – Abstand halten!', shield: 'Hält einen Treffer aus', teleport: 'Trigger während Flug = hinbeamen' }[t];
}

function placeAtSpawn() {
  const s = SPAWNS[mySlot];
  if (inXR) {
    const hl = camera.position; // rig-lokal
    const headYawLocal = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y;
    rig.rotation.y = s.yaw - headYawLocal;
    tmp1.set(hl.x, 0, hl.z).applyAxisAngle(tmp2.set(0, 1, 0), rig.rotation.y);
    rig.position.set(s.x - tmp1.x, 0, s.z - tmp1.z);
  } else {
    rig.position.set(s.x, 0, s.z); rig.rotation.y = s.yaw; deskPitch = 0; camera.rotation.x = 0;
  }
}

// ---------- Remote-State ----------
function applyRemoteState(m) {
  ensureOppAvatar();
  opp.has = true; opp.lastSeen = performance.now();
  opp.tHead.fromArray(m.h); opp.tQ.fromArray(m.q);
  if (m.l) opp.tLh.fromArray(m.l); if (m.r) opp.tRh.fromArray(m.r);
  if (!opp.inited) { opp.head.copy(opp.tHead); opp.lh.copy(opp.tLh); opp.rh.copy(opp.tRh); opp.headQ.copy(opp.tQ); opp.inited = true; }
  // Bumerangs
  const seen = new Set();
  for (const [id, x, y, z, fly, pw] of m.b) {
    seen.add(id);
    let rb = opp.booms.get(id);
    if (!rb) { rb = { mesh: makeBoomerangMesh(COLORS[oppSlot()]), shadow: makeShadow(), pos: V(), tgt: V(), fly: 0, pw: null, parryCd: 0, trailT: 0, warned: false }; scene.add(rb.mesh); opp.booms.set(id, rb); rb.pos.set(x, y, z); }
    rb.tgt.set(x, y, z); rb.fly = fly;
    if (rb.pw !== pw) { rb.pw = pw; setBoomPowerLook(rb.mesh, pw || null, oppSlot()); }
  }
  for (const [id, rb] of opp.booms) if (!seen.has(id)) { scene.remove(rb.mesh); scene.remove(rb.shadow); opp.booms.delete(id); }
  if (opp.av) opp.av.g.visible = opp.alive && m.a === 1 && mode !== 'practice';
}

function onFx(m) {
  if (m.kind === 'parry') {
    const b = myBooms.find(x => x.id === m.id);
    if (b && b.state === 'fly') {
      b.vel.multiplyScalar(-1.1); b.phase = 'back'; b.tBack = 0;
      burst(b.pos, 0xffffff, 15, 3); sfx.parry();
    }
  } else if (m.kind === 'boom') { tmp1.set(m.x, m.y, m.z); explosionFx(tmp1); sfx.boom(); }
  else if (m.kind === 'tele') { burst(tmp1.set(m.x, 1, m.z), 0xb36bff, 25, 3); sfx.teleport(); }
  else if (m.kind === 'parried') { burst(tmp1.set(m.x, m.y, m.z), 0xffffff, 15, 3); sfx.parry(); }
}

// =====================================================================
// Aktionen
// =====================================================================
function throwBoom(h, velWorld, isDesktop = false) {
  if (!alive || !canMove || !mainBoom || mainBoom.state !== 'held') return;
  let spd = velWorld.length();
  const dir = V();
  if (spd < 1.6 || isDesktop) {
    // langsamer Wurf: in Zeigerichtung der Hand / Blickrichtung
    if (isDesktop) camera.getWorldDirection(dir);
    else { h.obj.getWorldQuaternion(tmpQ); dir.set(0, 0, -1).applyQuaternion(tmpQ); }
    spd = isDesktop ? 5.5 : 2.5;
  } else dir.copy(velWorld).normalize();
  dir.y = clamp(dir.y, -0.2, 0.3); dir.normalize();
  // Zielhilfe Richtung Gegner/Dummy
  const target = getTargetPos(tmp2);
  if (target) {
    const from = handPos(h, tmp3);
    const to = V().subVectors(target, from); to.y = 0;
    const d2 = V(dir.x, 0, dir.z);
    if (to.lengthSq() > 0.01 && d2.lengthSq() > 0.01) {
      const ang = d2.angleTo(to);
      if (ang < 0.45) {
        const blend = 0.6;
        const yaw = Math.atan2(d2.x, d2.z), yawT = Math.atan2(to.x, to.z);
        let dy = yawT - yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
        dir.applyAxisAngle(tmp1.set(0, 1, 0), dy * blend);
      }
    }
  }
  const speed = clamp(spd * 3.0, BOOM_MIN_SPEED, BOOM_MAX_SPEED);
  const range = clamp(4.5 + spd * 1.5, 5, 13);
  const launch = (b, d) => {
    handPos(h, b.pos); b.state = 'fly'; b.phase = 'out'; b.traveled = 0; b.tBack = 0; b.hit = false; b.exploded = false;
    b.vel.copy(d).multiplyScalar(speed); b.speed = speed; b.range = range; b.hand = h.name; b.mesh.visible = true;
  };
  launch(mainBoom, dir);
  if (myPower === 'multi') {
    for (const a of [-0.3, 0.3]) { const e = newBoom(true); launch(e, dir.clone().applyAxisAngle(tmp1.set(0, 1, 0), a)); }
  }
  sfx.throw(); haptic(h, 0.5, 40);
}
const tmpQ = new THREE.Quaternion();

function getTargetPos(out) {
  if (mode === 'practice' && dummy.g.visible && dummyDown <= 0) return out.copy(dummyPos).setY(1.1);
  if (mode === 'match' && opp.has && opp.alive) return out.copy(opp.head).setY(opp.head.y - 0.4);
  return null;
}

function recallOrTeleport() {
  if (!mainBoom || mainBoom.state !== 'fly' || !alive) return;
  if (myPower === 'teleport' && canMove) {
    const [x, z] = resolveCircle(mainBoom.pos.x, mainBoom.pos.z, 0.35);
    camera.getWorldPosition(tmp1);
    netSend({ t: 'fx', kind: 'tele', x: tmp1.x, z: tmp1.z });
    burst(tmp1.setY(1), 0xb36bff, 25, 3);
    rig.position.x += x - tmp1.x; rig.position.z += z - tmp1.z;
    catchBoom(mainBoom, hands[mainBoom.hand]); sfx.teleport();
    netSend({ t: 'fx', kind: 'tele', x, z });
    return;
  }
  if (mainBoom.phase === 'out') { mainBoom.phase = 'back'; mainBoom.tBack = 0; }
}

function catchBoom(b, h) {
  if (b.extra) { removeBoom(b); return; }
  b.state = 'held'; b.hand = h.name; b.vel.set(0, 0, 0);
  sfx.catch(); haptic(h, 0.4, 30);
}

let dashT = 0, dashCd = 0; const dashV = V();
function doDash(dirWorld) {
  if (!alive || !canMove || dashCd > 0) return;
  dashV.copy(dirWorld).setY(0);
  if (dashV.lengthSq() < 0.01) { camera.getWorldDirection(dashV); dashV.y = 0; }
  dashV.normalize().multiplyScalar(DASH_DIST / DASH_TIME);
  dashT = DASH_TIME; dashCd = DASH_CD; sfx.dash();
}

function sendHit(victim, cause, pos) {
  netSend({ t: 'hit', victim, cause, x: pos.x, y: pos.y, z: pos.z });
}
function explode(b) {
  if (b.exploded) return; b.exploded = true;
  explosionFx(b.pos); sfx.boom();
  netSend({ t: 'fx', kind: 'boom', x: b.pos.x, y: b.pos.y, z: b.pos.z });
  // Gegner / Dummy
  if (mode === 'match' && opp.has && opp.alive) {
    const dx = opp.head.x - b.pos.x, dz = opp.head.z - b.pos.z;
    if (Math.hypot(dx, dz) < EXPLO_RADIUS) sendHit(oppSlot(), 'boom', b.pos);
  }
  if (mode === 'practice' && dummyDown <= 0 && dummyPos.distanceTo(tmp1.copy(b.pos).setY(0)) < EXPLO_RADIUS) hitDummy();
  // sich selbst
  camera.getWorldPosition(tmp1);
  if (mode === 'match' && Math.hypot(tmp1.x - b.pos.x, tmp1.z - b.pos.z) < EXPLO_RADIUS * 0.8) sendHit(mySlot, 'boom', b.pos);
  // Bumerang kommt nach kurzer Zeit zurueck in die Hand
  if (b.extra) { removeBoom(b); return; }
  b.state = 'gone'; b.mesh.visible = false; b.respawn = 0.9;
}

function hitDummy() {
  dummyDown = 1.5; practiceHits++; burst(tmp1.copy(dummyPos).setY(1.1), 0xffffff, 40, 5); sfx.kill(); dummy.g.visible = false; drawBoard();
  showHud('TREFFER!', practiceHits + ' im Training', '#ffe14a', 1.0);
}

// Pruefen: Punkt p trifft Gegner-Koerper?
function hitsOpp(p, extra = 0) {
  if (!(mode === 'match' && opp.has && opp.alive)) return false;
  const d = Math.hypot(p.x - opp.head.x, p.z - opp.head.z);
  return d < HIT_RADIUS + extra && p.y < opp.head.y + 0.25 && p.y > 0.05;
}
function hitsDummy(p, extra = 0) {
  if (!(mode === 'practice' && dummyDown <= 0)) return false;
  return Math.hypot(p.x - dummyPos.x, p.z - dummyPos.z) < HIT_RADIUS + extra && p.y < 1.9;
}

// =====================================================================
// Update-Schleife
// =====================================================================
let countdown = 0, countdownT = 0, sendAcc = 0, last = performance.now();
let slashCd = 0, deskPitch = 0;
const keys = {};

function update(dt, t) {
  scene.updateMatrixWorld();
  if (hudTimer > 0) { hudTimer -= dt; if (hudTimer <= 0) hud.visible = false; }
  if (countdown > 0) { countdownT += dt; if (countdownT >= 1) { countdownT -= 1; countdown--; if (countdown > 0) { showHud(String(countdown), '', '#fff', 1); sfx.beep(523); } } }
  dashCd -= dt; slashCd -= dt;

  // ---------- Eingabe VR ----------
  let moveX = 0, moveY = 0;
  for (const name of ['left', 'right']) {
    const h = hands[name];
    // Haendverlauf (rig-lokal) fuer Wurfgeschwindigkeit
    h.hist.push({ t, p: h.obj.position.clone() }); while (h.hist.length > 12) h.hist.shift();
    const gp = h.src && h.src.gamepad; if (!gp) continue;
    const trig = gp.buttons[0] && gp.buttons[0].pressed;
    const grip = gp.buttons[1] && gp.buttons[1].pressed;
    const aBtn = (gp.buttons[4] && gp.buttons[4].pressed) || (gp.buttons[5] && gp.buttons[5].pressed);
    const ax = gp.axes[2] || 0, ay = gp.axes[3] || 0;
    if (name === 'left') { moveX = ax; moveY = ay; }
    else {
      // Snap-Turn
      if (Math.abs(ax) > 0.7 && h.prevStick === 0) { snapTurn(ax > 0 ? -Math.PI / 4 : Math.PI / 4); h.prevStick = 1; }
      if (Math.abs(ax) < 0.3) h.prevStick = 0;
    }
    const holding = mainBoom && mainBoom.state === 'held' && mainBoom.hand === name;
    if (trig && !h.prevTrig) {
      if (holding) throwBoom(h, handVel(h, tmp1));
      else if (mainBoom && mainBoom.state === 'fly') recallOrTeleport();
      else if (mainBoom && mainBoom.state === 'held' && mainBoom.hand !== name) { mainBoom.hand = name; sfx.catch(); } // Hand wechseln
    }
    if (grip) h.gripT += dt;
    if (!grip && h.prevGrip && holding && h.gripT > 0.15) { const v = handVel(h, tmp1); if (v.length() > 2.0) throwBoom(h, v); }
    if (!grip) h.gripT = 0;
    if (aBtn && !h.prevA) {
      const d = V();
      if (Math.abs(moveX) + Math.abs(moveY) > 0.2) { camera.getWorldDirection(tmp2); tmp2.y = 0; tmp2.normalize(); d.copy(tmp2).multiplyScalar(-moveY).add(tmp3.set(-tmp2.z, 0, tmp2.x).multiplyScalar(moveX)); }
      doDash(d);
    }
    h.prevTrig = trig; h.prevGrip = grip; h.prevA = aBtn;
  }

  // ---------- Eingabe Bildschirm ----------
  if (!inXR) {
    moveX = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    moveY = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
  }

  // ---------- Laufen ----------
  if (alive && canMove) {
    camera.getWorldDirection(tmp2); tmp2.y = 0; tmp2.normalize();
    const right = tmp3.set(-tmp2.z, 0, tmp2.x);
    const mv = V().addScaledVector(tmp2, -moveY).addScaledVector(right, moveX);
    if (mv.lengthSq() > 0.02) { if (mv.length() > 1) mv.normalize(); rig.position.addScaledVector(mv, MOVE_SPEED * dt); }
    if (dashT > 0) { const s = Math.min(dt, dashT); rig.position.addScaledVector(dashV, s); dashT -= dt; }
  }
  // Kollision (Kopfposition als Koerpermitte)
  rig.updateMatrixWorld(true);
  camera.getWorldPosition(tmp1);
  const [cx, cz] = resolveCircle(tmp1.x, tmp1.z, 0.3);
  rig.position.x += cx - tmp1.x; rig.position.z += cz - tmp1.z;
  rig.updateMatrixWorld(true);
  const myHead = camera.getWorldPosition(V());

  // ---------- Dummy ----------
  if (mode === 'practice') {
    dummyT += dt;
    if (dummyDown > 0) { dummyDown -= dt; if (dummyDown <= 0) dummy.g.visible = true; }
    dummyPos.set(Math.sin(dummyT * 0.6) * 3.8, 0, 3.6 + Math.sin(dummyT * 0.37) * 0.8);
    dummy.g.position.set(0, 0, 0);
    dummy.body.position.set(dummyPos.x, 0.8, dummyPos.z);
    dummy.head.position.set(dummyPos.x, 1.6, dummyPos.z); dummy.head.rotation.y = Math.atan2(myHead.x - dummyPos.x, myHead.z - dummyPos.z) + Math.PI;
    dummy.lh.position.set(dummyPos.x - 0.3, 1.1, dummyPos.z); dummy.rh.position.set(dummyPos.x + 0.3, 1.1, dummyPos.z);
  }

  // ---------- Gegner glaetten ----------
  if (opp.av && opp.has) {
    const k = 1 - Math.exp(-18 * dt);
    opp.head.lerp(opp.tHead, k); opp.lh.lerp(opp.tLh, k); opp.rh.lerp(opp.tRh, k); opp.headQ.slerp(opp.tQ, k);
    const av = opp.av;
    av.head.position.copy(opp.head); av.head.quaternion.copy(opp.headQ);
    const e = new THREE.Euler().setFromQuaternion(opp.headQ, 'YXZ');
    av.body.position.set(opp.head.x, Math.max(0.45, opp.head.y - 0.62), opp.head.z); av.body.rotation.set(0, e.y, 0);
    av.lh.position.copy(opp.lh); av.rh.position.copy(opp.rh);
    av.shield.position.set(opp.head.x, Math.max(0.6, opp.head.y - 0.5), opp.head.z);
    av.shield.visible = opp.shield && opp.alive;
    for (const rb of opp.booms.values()) {
      rb.pos.lerp(rb.tgt, 1 - Math.exp(-25 * dt)); rb.mesh.position.copy(rb.pos);
      rb.mesh.visible = opp.alive && mode !== 'practice';
      if (rb.fly) rb.mesh.rotation.set(0, rb.mesh.rotation.y + 25 * dt, 0); else rb.mesh.rotation.set(-Math.PI / 2, 0, 0);
      rb.parryCd -= dt;
      const vis = rb.mesh.visible && rb.fly === 1;
      placeShadow(rb.shadow, rb.pos, vis);
      if (vis) {
        rb.trailT -= dt; if (rb.trailT <= 0) { rb.trailT = 0.02; addTrail(rb.pos, rb.mesh.userData.mat.color.getHex()); }
        const d = Math.hypot(rb.pos.x - myHead.x, rb.pos.z - myHead.z);
        if (d < 2.6 && !rb.warned && alive) { rb.warned = true; sfx.incoming(clamp(1 - d / 2.6, 0.25, 1)); haptic(hands.left, 0.25, 40); haptic(hands.right, 0.25, 40); }
        if (d > 3.5) rb.warned = false;
      } else rb.warned = false;
    }
    if (performance.now() - opp.lastSeen > 3000 && mode === 'match') boardMsg = 'Gegner reagiert nicht …';
  }

  // ---------- Kisten ----------
  for (const [id, c] of crates) {
    c.m.rotation.y += dt * 1.5; c.m.position.y = 1.0 + Math.sin(t * 2 + id) * 0.08;
    if (!alive || c.pending) continue;
    const touch = Math.hypot(myHead.x - c.x, myHead.z - c.z) < 0.55 ||
      handPos(hands.left, tmp1).distanceTo(c.m.position) < 0.4 || handPos(hands.right, tmp1).distanceTo(c.m.position) < 0.4;
    if (touch) { c.pending = true; netSend({ t: 'pickup', id }); setTimeout(() => { c.pending = false; }, 1000); }
  }

  // ---------- Eigene Bumerangs ----------
  for (const b of [...myBooms]) updateBoom(b, dt, myHead);

  // ---------- Partikel ----------
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.userData.life -= dt;
    p.userData.v.y -= 9 * dt; p.position.addScaledVector(p.userData.v, dt);
    if (p.position.y < 0.03) { p.position.y = 0.03; p.userData.v.multiplyScalar(0.5); p.userData.v.y *= -0.4; }
    p.rotation.x += dt * 8; p.scale.setScalar(Math.max(0.01, p.userData.life));
    if (p.userData.life <= 0) { scene.remove(p); parts.splice(i, 1); }
  }
  for (let i = trail.length - 1; i >= 0; i--) {
    const m = trail[i]; m.userData.life -= dt; m.scale.setScalar(Math.max(0.01, m.userData.life / 0.22));
    if (m.userData.life <= 0) { scene.remove(m); trail.splice(i, 1); }
  }
  if (flashT > 0) { flashT -= dt; flash.material.opacity = Math.max(0, flashT / 0.9) * 0.55; flash.visible = flashT > 0; }
  for (let i = explos.length - 1; i >= 0; i--) {
    const e = explos[i]; e.t += dt; e.s.scale.setScalar(0.1 + e.t / 0.35 * EXPLO_RADIUS);
    e.s.material.opacity = Math.max(0, 0.8 - e.t * 2);
    if (e.t > 0.4) { scene.remove(e.s); explos.splice(i, 1); }
  }

  drawWrist();

  // ---------- Netzwerk senden (30 Hz) ----------
  sendAcc += dt;
  if (sendAcc > 1 / 30 && mySlot >= 0) {
    sendAcc = 0;
    camera.getWorldQuaternion(tmpQ);
    const r3 = v => [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
    netSend({ t: 's', v: VERSION, h: r3(myHead), q: tmpQ.toArray().map(x => +x.toFixed(3)),
      l: r3(handPos(hands.left, tmp1)), r: r3(handPos(hands.right, tmp2)), a: alive ? 1 : 0,
      b: myBooms.filter(b => b.state !== 'gone' && alive).map(b => [b.id, ...r3(b.mesh.position), b.state === 'fly' ? 1 : 0, myPower]) });
  }
}

function updateBoom(b, dt, myHead) {
  const h = hands[b.hand];
  if (b.state === 'gone') {
    b.shadow.visible = false;
    b.respawn -= dt; if (b.respawn <= 0 && alive) { b.state = 'held'; b.mesh.visible = true; sfx.catch(); }
    return;
  }
  b.mesh.visible = alive;
  b.shadow.visible = false;
  if (b.state === 'held') {
    handPos(h, b.pos); h.obj.getWorldQuaternion(tmpQ);
    b.mesh.position.copy(b.pos).add(tmp1.set(0, 0, -0.06).applyQuaternion(tmpQ));
    b.mesh.quaternion.copy(tmpQ); b.mesh.rotateX(-Math.PI / 2);
    // Nahkampf + Parade
    if (alive && canMove) {
      const spd = handVel(h, tmp2).length();
      if (spd > 2.3 && slashCd <= 0) {
        if (hitsOpp(b.mesh.position, 0.08)) { slashCd = 0.6; sendHit(oppSlot(), 'slash', b.mesh.position); haptic(h, 1, 80); }
        else if (hitsDummy(b.mesh.position, 0.08)) { slashCd = 0.6; hitDummy(); haptic(h, 1, 80); }
      }
      for (const [id, rb] of opp.booms) {
        if (rb.fly && rb.parryCd <= 0 && rb.pos.distanceTo(b.mesh.position) < 0.38) {
          rb.parryCd = 0.6; netSend({ t: 'fx', kind: 'parry', id });
          burst(rb.pos, 0xffffff, 15, 3); sfx.parry(); haptic(h, 1, 60);
        }
      }
    }
    return;
  }
  // ---- Flug ----
  if (!alive) { b.mesh.visible = false; return; }
  const step = tmp1.copy(b.vel).multiplyScalar(dt);
  const np = tmp2.copy(b.pos).add(step);
  if (b.phase === 'out') {
    b.traveled += step.length();
    b.vel.y *= Math.max(0, 1 - 1.5 * dt);
    if (b.traveled >= b.range) { b.phase = 'back'; b.tBack = 0; }
  } else {
    b.tBack += dt;
    const target = handPos(h, tmp3);
    const to = V().subVectors(target, b.pos), dist = to.length();
    if (dist < CATCH_RADIUS + (b.extra ? 0.3 : 0)) { catchBoom(b, h); return; }
    const want = to.normalize().multiplyScalar(BOOM_RETURN_SPEED + b.tBack * 6);
    b.vel.lerp(want, Math.min(1, (5 + b.tBack * 4) * dt));
  }
  np.y = clamp(np.y, 0.25, 2.4);
  // Kollision mit Waenden / Bloecken (nicht mehr nach 2 s Rueckflug -> kommt garantiert zurueck)
  if (b.tBack < 2.0) {
    let bounced = false;
    const lim = A - 0.1;
    if (np.x < -lim || np.x > lim) { b.vel.x *= -1; np.x = clamp(np.x, -lim, lim); bounced = true; }
    if (np.z < -lim || np.z > lim) { b.vel.z *= -1; np.z = clamp(np.z, -lim, lim); bounced = true; }
    for (const k of BLOCKS) {
      if (np.y > k.h + 0.05) continue;
      const ex = k.hw + 0.06, ez = k.hd + 0.06, dx = np.x - k.x, dz = np.z - k.z;
      if (Math.abs(dx) < ex && Math.abs(dz) < ez) {
        const px = ex - Math.abs(dx), pz = ez - Math.abs(dz);
        if (px < pz) { b.vel.x *= -1; np.x = k.x + Math.sign(dx || 1) * ex; } else { b.vel.z *= -1; np.z = k.z + Math.sign(dz || 1) * ez; }
        bounced = true;
      }
    }
    if (bounced) {
      if (myPower === 'explosive') { b.pos.copy(np); b.mesh.position.copy(np); explode(b); return; }
      sfx.bounce();
    }
  }
  b.pos.copy(np);
  b.mesh.position.copy(b.pos);
  b.mesh.rotation.set(0, b.mesh.rotation.y + 26 * dt, 0);
  placeShadow(b.shadow, b.pos, true);
  b.trailT -= dt; if (b.trailT <= 0) { b.trailT = 0.02; addTrail(b.pos, b.mesh.userData.mat.color.getHex()); }
  // Treffer
  if (!b.hit) {
    if (hitsOpp(b.pos)) {
      b.hit = true;
      if (myPower === 'explosive') { explode(b); return; }
      sendHit(oppSlot(), 'boomerang', b.pos);
    } else if (hitsDummy(b.pos)) {
      if (myPower === 'explosive') { explode(b); return; }
      hitDummy();
    }
  }
}

function snapTurn(a) {
  camera.getWorldPosition(tmp1);
  rig.rotation.y += a;
  rig.updateMatrixWorld(true);
  camera.getWorldPosition(tmp2);
  rig.position.x += tmp1.x - tmp2.x; rig.position.z += tmp1.z - tmp2.z;
}

// =====================================================================
// Bildschirm-Steuerung
// =====================================================================
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (inXR || mode === 'connecting' && !started) return;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'Space') {
    const d = V(); camera.getWorldDirection(tmp2); tmp2.y = 0; tmp2.normalize();
    const mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), my = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
    d.copy(tmp2).multiplyScalar(-my).add(tmp3.set(-tmp2.z, 0, tmp2.x).multiplyScalar(mx)); doDash(d);
  }
  if (e.code === 'KeyE' && alive && canMove && slashCd <= 0) {
    camera.getWorldPosition(tmp1); camera.getWorldDirection(tmp2);
    const p = tmp1.addScaledVector(tmp2.setY(0).normalize(), 0.8).setY(1.1);
    slashCd = 0.6;
    if (hitsOpp(p, 0.35)) sendHit(oppSlot(), 'slash', p); else if (hitsDummy(p, 0.35)) hitDummy();
    sfx.dash();
  }
});
addEventListener('keyup', e => { keys[e.code] = false; });
renderer.domElement.addEventListener('mousedown', e => {
  if (inXR || !started) return;
  if (document.pointerLockElement !== renderer.domElement) { renderer.domElement.requestPointerLock(); return; }
  if (e.button === 0) throwBoom(hands.right, tmp1.set(0, 0, 0), true);
  if (e.button === 2) recallOrTeleport();
});
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => {
  if (inXR || document.pointerLockElement !== renderer.domElement) return;
  rig.rotation.y -= e.movementX * 0.0025;
  deskPitch = clamp(deskPitch - e.movementY * 0.0025, -1.2, 1.2); camera.rotation.x = deskPitch;
});

// =====================================================================
// Start
// =====================================================================
let started = false;
const lobby = document.getElementById('lobby');
const vrBtn = document.getElementById('vrBtn'), deskBtn = document.getElementById('deskBtn');
function startGame() {
  if (started) return; started = true;
  initAudio();
  connect(document.getElementById('room').value || '1');
}
if (navigator.xr) {
  navigator.xr.isSessionSupported('immersive-vr').then(ok => {
    vrBtn.disabled = !ok; setStatus(ok ? 'Bereit · Raum-Code wählen und VR starten' : 'VR nicht verfügbar – Bildschirm-Modus geht');
  }).catch(() => setStatus('VR nicht verfügbar'));
} else setStatus(location.protocol === 'https:' ? 'Kein WebXR in diesem Browser' : 'WebXR braucht HTTPS');

vrBtn.onclick = async () => {
  try {
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
    await renderer.xr.setSession(session);
    inXR = true; lobby.style.display = 'none';
    session.addEventListener('end', () => { inXR = false; lobby.style.display = 'flex'; camera.position.set(0, 1.65, 0); camera.quaternion.identity(); });
    startGame();
    if (mySlot >= 0 && mode === 'match') setTimeout(placeAtSpawn, 300);
  } catch (e) { setStatus('VR-Start fehlgeschlagen: ' + e.message); }
};
deskBtn.onclick = () => {
  lobby.style.display = 'none'; document.getElementById('deskHud').style.display = 'block';
  startGame(); renderer.domElement.requestPointerLock();
  deskHands.right.add(handMeshes.right);
};

// Initial
resetMyBooms(); drawBoard(); drawWrist();
rig.position.set(0, 0, -4.6); rig.rotation.y = Math.PI;
renderer.setAnimationLoop((time) => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt, now / 1000);
  renderer.render(scene, camera);
});
// Fuer Tests
window.__bd = { handle, throw: () => throwBoom(hands.right, V(), true), get state() { return { mySlot, mode, alive, canMove, scoresArr, isHost, myPower, oppHas: opp.has, oppAlive: opp.alive, booms: myBooms.map(b=>b.state), crates: crates.size }; } };
