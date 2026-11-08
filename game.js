// Bumerang-Duell VR – WebXR, first person, 1v1 P2P im WLAN + Bot-Training
import * as THREE from './three.module.min.js';

// =====================================================================
// Konstanten / Tuning
// =====================================================================
const VERSION = 5;
const A = 8.0;                 // halbe Arenagroesse (16 x 16 m)
const MOVE_SPEED = 3.0;
const DASH_DIST = 3.0, DASH_TIME = 0.12, DASH_CD = 0.9;
const FLY_H = 1.25;            // Flughoehe Bot
const FLY_MIN = 0.3, FLY_MAX = 1.9; // Bumerang bleibt zwischen Knie- und Kopfhoehe
const BOOM_MIN_SPEED = 6, BOOM_MAX_SPEED = 24, BOOM_RETURN_SPEED = 16;
const HIT_RADIUS = 0.4;
const CATCH_RADIUS = 0.42;
const EXPLO_RADIUS = 2.0;
const WIN_SCORE = 5;
const COLORS = [0xff8a1f, 0x2ec8ff];
const NAMES = ['ORANGE', 'BLAU'];
const CSS = ['#ff8a1f', '#2ec8ff'];
const BOT_COLOR = 0xff4d6d;
const SPAWNS = [{ x: 0, z: -6.8, yaw: Math.PI }, { x: 0, z: 6.8, yaw: 0 }];
// ---------- Arenen (jede mit eigenem Gimmick) ----------
// blocks: solide Quader | circles: runde Hindernisse (bumper = Flipper-Pilz) | bushes: hohes Gras
// bamboo: Bambus-Haine (Bumerang schneidet durch) | rotor: drehender Balken | portals: Portal-Paare
const MAPS = [
  { name: 'BAMBUS-DOJO', floor: 'wood', wall: 'wood',
    blocks: [
      { x: -3.6, z: -2.4, hw: 0.45, hd: 0.45, h: 1.6, kind: 'lantern' }, { x: 3.6, z: 2.4, hw: 0.45, hd: 0.45, h: 1.6, kind: 'lantern' },
      { x: 3.6, z: -2.4, hw: 0.45, hd: 0.45, h: 1.6, kind: 'lantern' }, { x: -3.6, z: 2.4, hw: 0.45, hd: 0.45, h: 1.6, kind: 'lantern' },
      { x: -1.9, z: 0, hw: 0.9, hd: 0.2, h: 0.7 }, { x: 1.9, z: 0, hw: 0.9, hd: 0.2, h: 0.7 },
      { x: -6.2, z: -2.6, hw: 0.2, hd: 1.0, h: 0.7 }, { x: 6.2, z: 2.6, hw: 0.2, hd: 1.0, h: 0.7 },
    ],
    circles: [],
    bushes: [{ x: -5.4, z: -5.2 }, { x: 5.4, z: 5.2 }, { x: 5.4, z: -5.2 }, { x: -5.4, z: 5.2 }],
    bamboo: [{ x: 0, z: -3.6 }, { x: 0, z: 3.6 }, { x: -4.4, z: 0 }, { x: 4.4, z: 0 }, { x: 0, z: 0 }],
    crates: [[0, -1.8], [0, 1.8], [-6.5, 0], [6.5, 0], [-2.2, -5.6], [2.2, 5.6], [-2.4, 3.2], [2.4, -3.2]] },
  { name: 'FLIPPER-GARTEN', floor: 'tiles', wall: 'neon',
    blocks: [{ x: -6.3, z: 0, hw: 0.25, hd: 1.4, h: 1.6 }, { x: 6.3, z: 0, hw: 0.25, hd: 1.4, h: 1.6 }],
    circles: [
      { x: 0, z: 0, r: 0.75, h: 1.6, bumper: true },
      { x: -3, z: -3, r: 0.5, h: 1.6, bumper: true }, { x: 3, z: 3, r: 0.5, h: 1.6, bumper: true },
      { x: 3, z: -3, r: 0.5, h: 1.6, bumper: true }, { x: -3, z: 3, r: 0.5, h: 1.6, bumper: true },
      { x: -5.3, z: -5.0, r: 0.45, h: 1.6, bumper: true }, { x: 5.3, z: 5.0, r: 0.45, h: 1.6, bumper: true },
      { x: 5.3, z: -5.0, r: 0.45, h: 1.6, bumper: true }, { x: -5.3, z: 5.0, r: 0.45, h: 1.6, bumper: true },
    ],
    bushes: [{ x: -1.6, z: -5.4 }, { x: 1.6, z: 5.4 }],
    bamboo: [],
    crates: [[0, -2], [0, 2], [-6.6, -6.2], [6.6, 6.2], [6.6, -6.2], [-6.6, 6.2], [-3.2, 0], [3.2, 0]] },
  { name: 'ROTOR-TEMPEL', floor: 'sand', wall: 'stone',
    blocks: [
      { x: -5.2, z: -4.8, hw: 0.6, hd: 0.6, h: 1.7 }, { x: 5.2, z: 4.8, hw: 0.6, hd: 0.6, h: 1.7 },
      { x: 5.2, z: -4.8, hw: 0.6, hd: 0.6, h: 1.7 }, { x: -5.2, z: 4.8, hw: 0.6, hd: 0.6, h: 1.7 },
      { x: -2.4, z: -5.2, hw: 0.8, hd: 0.22, h: 0.7 }, { x: 2.4, z: 5.2, hw: 0.8, hd: 0.22, h: 0.7 },
    ],
    circles: [],
    bushes: [{ x: -4.9, z: 0.0 }, { x: 4.9, z: 0.0 }],
    bamboo: [],
    rotor: { len: 7.0, w: 0.35, h: 1.6, speed: 0.5 },
    portals: [[{ x: -7.1, z: -2.8 }, { x: 7.1, z: 2.8 }], [{ x: 7.1, z: -2.8 }, { x: -7.1, z: 2.8 }]],
    crates: [[0, -4.7], [0, 4.7], [-6.6, -6.5], [6.6, 6.5], [-3.4, 6.5], [3.4, -6.5]] },
];
let curMap = -1, MAP = MAPS[0];
let mapPref = 'rot';
try { mapPref = localStorage.getItem('bd_map') || 'rot'; } catch (e) {}
const PORTAL_COLORS = [0xb36bff, 0x37e0c0];
const POWER_LABEL = { multi: 'MULTI-BUMERANG', explosive: 'EXPLOSIV', shield: 'SCHILD', teleport: 'TELEPORT' };
const POWER_COLOR = { multi: '#ffe14a', explosive: '#ff4040', shield: '#7dff9a', teleport: '#c37bff' };
const BOT_LV = {
  leicht: { speed: 1.5, cd: [3.2, 4.8], err: 0.30, lead: 0.0, dodge: 0.0, react: 0.8, boom: 11, melee: false, label: 'LEICHT' },
  mittel: { speed: 2.3, cd: [2.0, 3.2], err: 0.13, lead: 0.5, dodge: 0.45, react: 0.5, boom: 14, melee: true, label: 'MITTEL' },
  schwer: { speed: 3.0, cd: [1.1, 2.0], err: 0.04, lead: 1.0, dodge: 0.85, react: 0.3, boom: 17, melee: true, label: 'SCHWER' },
};
const LV_ORDER = ['leicht', 'mittel', 'schwer'];
let difficulty = 'mittel';
try { difficulty = localStorage.getItem('bd_diff') || 'mittel'; if (!BOT_LV[difficulty]) difficulty = 'mittel'; } catch (e) {}

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
scene.fog = new THREE.Fog(0x8fd3ff, 30, 80);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 200);
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);
camera.position.set(0, 1.65, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x557744, 1.6));
const sun = new THREE.DirectionalLight(0xfff4e0, 1.7);
sun.position.set(5, 10, 3);
scene.add(sun);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- Hilfen ----------
const V = () => new THREE.Vector3();
const tmp1 = V(), tmp2 = V(), tmp3 = V();
const UP = new THREE.Vector3(0, 1, 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
function mat(color, emissive = 0x000000, ei = 0) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei, roughness: 0.7, metalness: 0.0 });
}
function canvasTex(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return { c, g: c.getContext('2d'), t };
}
function inPond() { return false; }
// =====================================================================
// Texturen (eigene, Cartoon-Look)
// =====================================================================
function grassTexture() {
  const { g, t } = canvasTex(512, 512);
  g.fillStyle = '#7cc44f'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)'; g.fillRect(i * 128, j * 128, 128, 128); }
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    g.strokeStyle = Math.random() < 0.5 ? '#68b03f' : '#93d660'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-3, 3), y - rand(5, 11)); g.stroke();
  }
  for (let i = 0; i < 30; i++) { g.fillStyle = ['#fff7a8', '#ffffff', '#ffb3d1'][i % 3]; g.beginPath(); g.arc(Math.random() * 512, Math.random() * 512, 3, 0, 7); g.fill(); }
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); t.anisotropy = 4;
  return t;
}
function stoneTexture() {
  const { g, t } = canvasTex(256, 256);
  g.fillStyle = '#8c8fa3'; g.fillRect(0, 0, 256, 256);
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? 32 : 0;
    for (let c = -1; c < 4; c++) {
      const x = c * 64 + off, y = r * 64;
      g.fillStyle = ['#9a9db2', '#878aa0', '#a3a6ba'][(r + c + 3) % 3];
      g.beginPath(); g.roundRect(x + 3, y + 3, 58, 58, 10); g.fill();
    }
  }
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function waterTexture() {
  const { g, t } = canvasTex(256, 256);
  g.fillStyle = '#2f9be8'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 4;
  for (let i = 0; i < 14; i++) { const x = Math.random() * 256, y = Math.random() * 256; g.beginPath(); g.arc(x, y, rand(10, 22), 3.6, 5.8); g.stroke(); }
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function plankTexture() {
  const { g, t } = canvasTex(512, 512);
  for (let r = 0; r < 8; r++) {
    g.fillStyle = ['#c99a62', '#bf8f57', '#d1a46c', '#c4945b'][r % 4]; g.fillRect(0, r * 64, 512, 64);
    g.fillStyle = 'rgba(90,50,20,.5)'; g.fillRect(0, r * 64, 512, 3);
    const off = (r * 173) % 512; g.fillRect(off, r * 64, 3, 64); g.fillRect((off + 256) % 512, r * 64, 3, 64);
    g.strokeStyle = 'rgba(120,70,30,.25)'; g.lineWidth = 2;
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(0, r * 64 + 12 + k * 13); g.bezierCurveTo(170, r * 64 + 8 + k * 13, 340, r * 64 + 18 + k * 13, 512, r * 64 + 12 + k * 13); g.stroke(); }
  }
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = 4; return t;
}
function tileTexture() {
  const { g, t } = canvasTex(256, 256);
  const c = ['#ffd6e8', '#c9f2ff', '#fff3b8', '#d6ffd9'];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = c[(i + j * 2) % 4]; g.fillRect(i * 64, j * 64, 64, 64); g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.strokeRect(i * 64, j * 64, 64, 64); }
  for (let k = 0; k < 10; k++) { g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 4, 0, 7); g.fill(); }
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); t.anisotropy = 4; return t;
}
function sandTexture() {
  const { g, t } = canvasTex(256, 256);
  g.fillStyle = '#e8cf98'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#e2c48a' : '#ecd6a4'; g.beginPath(); g.roundRect(i * 64 + 3, j * 64 + 3, 58, 58, 8); g.fill(); }
  g.strokeStyle = 'rgba(160,110,50,.35)'; g.lineWidth = 3;
  for (let k = 0; k < 6; k++) { const x = Math.random() * 256, y = Math.random() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-20, 20), y + rand(-20, 20)); g.stroke(); }
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); t.anisotropy = 4; return t;
}
function woodTexture() {
  const { g, t } = canvasTex(128, 128);
  g.fillStyle = '#b07a48'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#8a5a32'; g.lineWidth = 3;
  for (let y = 0; y < 128; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
  return t;
}

// =====================================================================
// Arena
// =====================================================================
const tufts = [], bamboos = [], bumpers = [], portalMeshes = [];
let waterTex = null, rotorMesh = null, roundT0 = 0;
const mapGroup = new THREE.Group(); scene.add(mapGroup);
const TEX = {};
(function buildWorld() {
  TEX.grass = grassTexture(); TEX.wood = plankTexture(); TEX.tiles = tileTexture(); TEX.sand = sandTexture(); TEX.stone = stoneTexture(); TEX.box = woodTexture();
  const cliff = new THREE.Mesh(new THREE.BoxGeometry(A * 2 + 0.9, 3, A * 2 + 0.9), mat(0x9b6b43));
  cliff.position.y = -1.51; scene.add(cliff);
  const sea = new THREE.Mesh(new THREE.CircleGeometry(80, 40), new THREE.MeshStandardMaterial({ color: 0x3fa7e0, roughness: 0.3 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -2.6; scene.add(sea);
  const trunk = mat(0x7a4a2a), leaf = mat(0x2f8f4a), leaf2 = mat(0x3fa65a);
  for (let i = 0; i < 46; i++) {
    const a = i / 46 * Math.PI * 2 + Math.random() * 0.1, r = 15 + Math.random() * 20;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.9 + Math.random() * 1.4;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.2 * s, 1.2 * s, 6), trunk); tr.position.set(x, -2.6 + 0.6 * s + 1.5, z); scene.add(tr);
    const lf = new THREE.Mesh(new THREE.SphereGeometry(0.9 * s, 8, 6), i % 2 ? leaf : leaf2); lf.position.set(x, -2.6 + 2.2 * s + 1.5, z); scene.add(lf);
  }
  const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.3 });
  for (let i = 0; i < 10; i++) {
    const g = new THREE.Group(), a = Math.random() * 6.28, r = 30 + Math.random() * 20;
    for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(rand(1.5, 2.6), 8, 6), cloudM); s.position.set(k * 1.8, rand(-0.3, 0.5), rand(-0.6, 0.6)); g.add(s); }
    g.position.set(Math.cos(a) * r, rand(12, 18), Math.sin(a) * r); scene.add(g);
  }
})();

function buildMap(id) {
  curMap = id; MAP = MAPS[id];
  while (mapGroup.children.length) mapGroup.remove(mapGroup.children[0]);
  tufts.length = 0; bamboos.length = 0; bumpers.length = 0; portalMeshes.length = 0; rotorMesh = null;
  const add = m => { mapGroup.add(m); return m; };
  // Boden
  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(A * 2, A * 2), new THREE.MeshStandardMaterial({ map: TEX[MAP.floor], roughness: 0.9 })));
  floor.rotation.x = -Math.PI / 2;
  // Spawn-Zonen
  SPAWNS.forEach((sp, i) => {
    const z = add(new THREE.Mesh(new THREE.PlaneGeometry(3, 1.4), new THREE.MeshBasicMaterial({ color: COLORS[i], transparent: true, opacity: 0.25, depthWrite: false })));
    z.rotation.x = -Math.PI / 2; z.position.set(sp.x, 0.006, sp.z);
    const ring = add(new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 32), new THREE.MeshBasicMaterial({ color: COLORS[i] })));
    ring.rotation.x = -Math.PI / 2; ring.position.set(sp.x, 0.01, sp.z);
  });
  // Rand
  const wallMat = MAP.wall === 'wood' ? new THREE.MeshStandardMaterial({ map: TEX.box, roughness: 0.9 })
    : MAP.wall === 'neon' ? new THREE.MeshStandardMaterial({ color: 0xff5fb0, emissive: 0xff2f90, emissiveIntensity: 0.5, roughness: 0.4 })
    : new THREE.MeshStandardMaterial({ map: TEX.stone, roughness: 0.9 });
  [[0, -A - 0.2, A * 2 + 0.8, 0.4], [0, A + 0.2, A * 2 + 0.8, 0.4], [-A - 0.2, 0, 0.4, A * 2], [A + 0.2, 0, 0.4, A * 2]].forEach(([x, z, w, d]) => {
    add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), wallMat)).position.set(x, 0.3, z);
  });
  // Bloecke
  MAP.blocks.forEach(b => {
    const low = b.h < 1;
    let m;
    if (b.kind === 'lantern') {
      m = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(b.hw * 2, 0.5, b.hd * 2), mat(0x8d8f9e)); base.position.y = 0.25;
      const post = new THREE.Mesh(new THREE.BoxGeometry(b.hw, 0.6, b.hd), mat(0x9a9cab)); post.position.y = 0.8;
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(b.hw * 1.7, 0.35, b.hd * 1.7), mat(0xffe9a8, 0xffb347, 0.9)); lamp.position.y = 1.25;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(b.hw * 1.6, 0.35, 4), mat(0x6b6d7a)); roof.position.y = 1.58; roof.rotation.y = Math.PI / 4;
      m.add(base, post, lamp, roof); m.position.set(b.x, 0, b.z);
    } else {
      const tex = low ? TEX.box : TEX.stone.clone();
      if (!low) { tex.needsUpdate = true; tex.repeat.set(b.hw * 1.6, b.h * 0.8); }
      m = new THREE.Mesh(new THREE.BoxGeometry(b.hw * 2, b.h, b.hd * 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
      m.position.set(b.x, b.h / 2, b.z);
    }
    add(m);
  });
  // Flipper-Pilze
  MAP.circles.forEach(c => {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 0.85, c.r * 0.95, c.h - 0.3, 20), mat(0xffffff));
    stem.position.y = (c.h - 0.3) / 2;
    const capM = mat(0xff3d7f, 0xff3d7f, 0.35);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 1.1, c.r, 0.3, 24), capM); cap.position.y = c.h - 0.15;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(c.r * 0.95, 0.06, 8, 24), mat(0xffe14a, 0xffe14a, 0.5)); ring.rotation.x = Math.PI / 2; ring.position.y = 1.1;
    g.add(stem, cap, ring); g.position.set(c.x, 0, c.z); add(g);
    bumpers.push({ g, capM, c, flash: 0 });
  });
  // Hohes Gras
  const tuftGeo = new THREE.ConeGeometry(0.2, 1.35, 5); tuftGeo.translate(0, 0.675, 0);
  const tuftMats = [mat(0x3f9a3a), mat(0x4fae42), mat(0x58b84a)];
  MAP.bushes.forEach(b => {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = b.x - 0.75 + i * 0.5 + rand(-0.1, 0.1), z = b.z - 0.75 + j * 0.5 + rand(-0.1, 0.1);
      const m = add(new THREE.Mesh(tuftGeo, tuftMats[(i + j) % 3])); m.position.set(x, 0, z); m.rotation.y = Math.random() * 6;
      tufts.push({ m, x, z, cut: false });
    }
  });
  // Bambus
  const stalkGeo = new THREE.CylinderGeometry(0.05, 0.06, 2.4, 6); stalkGeo.translate(0, 1.2, 0);
  const stalkM = [mat(0x7fbf3f), mat(0x9ad14f), mat(0x6aa836)];
  MAP.bamboo.forEach(b => {
    for (let k = 0; k < 11; k++) {
      const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 0.8, x = b.x + Math.cos(a) * r, z = b.z + Math.sin(a) * r;
      const m = add(new THREE.Mesh(stalkGeo, stalkM[k % 3])); m.position.set(x, 0, z); m.scale.y = rand(0.8, 1.15);
      bamboos.push({ m, x, z, cut: false, sy: m.scale.y });
    }
  });
  // Rotor
  if (MAP.rotor) {
    const R = MAP.rotor, g = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(R.len, R.h, R.w), new THREE.MeshStandardMaterial({ map: TEX.stone, roughness: 0.8 })); bar.position.y = R.h / 2;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(R.len + 0.02, 0.14, R.w + 0.02), mat(0xffc93c, 0xffa000, 0.6)); stripe.position.y = R.h - 0.2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, R.h + 0.3, 16), mat(0x8a6a4a)); hub.position.y = (R.h + 0.3) / 2;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), mat(0x37e0c0, 0x37e0c0, 0.9)); gem.position.y = R.h + 0.6;
    g.add(bar, stripe, hub, gem); add(g); rotorMesh = g;
  }
  // Portale
  (MAP.portals || []).forEach((pair, pi) => pair.forEach(pt => {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.09, 10, 32), mat(PORTAL_COLORS[pi], PORTAL_COLORS[pi], 0.9));
    ring.position.y = 1.15;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.7, 32), new THREE.MeshBasicMaterial({ color: PORTAL_COLORS[pi], transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
    disc.position.y = 1.15;
    const pad = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.6, 32), new THREE.MeshBasicMaterial({ color: PORTAL_COLORS[pi] })); pad.rotation.x = -Math.PI / 2; pad.position.y = 0.012;
    g.add(ring, disc, pad); g.position.set(pt.x, 0, pt.z); g.rotation.y = Math.PI / 2; add(g);
    portalMeshes.push({ g, disc });
  }));
  // Deko je Arena
  if (id === 0) { // Torii-Tore hinter den Spawns
    for (const z of [-A - 1.4, A + 1.4]) {
      const red = mat(0xd8332b);
      for (const x of [-1.6, 1.6]) { const p = add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 3.2, 10), red)); p.position.set(x, 1.6, z); }
      const top = add(new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.25, 0.35), mat(0x2b2b2b))); top.position.set(0, 3.25, z);
      const beam = add(new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.18, 0.25), red)); beam.position.set(0, 2.75, z);
    }
  } else if (id === 1) { // bunte Lichtsaeulen
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, x = Math.cos(a) * (A + 1.6), z = Math.sin(a) * (A + 1.6);
      const col = [0xff5fb0, 0x37e0c0, 0xffe14a][i % 3];
      const p = add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 8), mat(col, col, 0.8))); p.position.set(x, 1.3, z);
      const b = add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), mat(0xffffff, col, 1))); b.position.set(x, 2.7, z);
    }
  } else if (id === 2) { // Tempelsaeulen
    for (const [x, z] of [[-A - 1.2, -A - 1.2], [A + 1.2, -A - 1.2], [-A - 1.2, A + 1.2], [A + 1.2, A + 1.2]]) {
      const p = add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 4, 12), new THREE.MeshStandardMaterial({ map: TEX.stone }))); p.position.set(x, 2, z);
      const c = add(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 1.3), mat(0xd8c49a))); c.position.set(x, 4.1, z);
    }
  }
}
function applyMap(id) { if (id !== curMap) buildMap(id); regrowGrass(); }
function rotorAngle() { return MAP.rotor ? (performance.now() / 1000 - roundT0) * MAP.rotor.speed : 0; }
// Weltpunkt -> lokales Rotor-System (Balken liegt auf lokaler x-Achse)
function rotorLocal(x, z, ang) { const c = Math.cos(ang), s = Math.sin(ang); return [x * c - z * s, x * s + z * c]; }
function rotorWorld(lx, lz, ang) { const c = Math.cos(ang), s = Math.sin(ang); return [lx * c + lz * s, -lx * s + lz * c]; }
function regrowGrass() {
  for (const t of tufts) { t.cut = false; t.m.scale.set(1, 1, 1); }
  for (const b of bamboos) { b.cut = false; b.m.scale.set(1, b.sy, 1); }
}
function cutGrassAt(p) {
  if (p.y > 2.4) return;
  if (p.y < 1.4) for (const t of tufts) {
    if (t.cut) continue;
    if (Math.abs(p.x - t.x) < 0.32 && Math.abs(p.z - t.z) < 0.32) { t.cut = true; t.m.scale.set(1.2, 0.1, 1.2); burst(tmp3.set(t.x, 0.5, t.z), 0x58b84a, 5, 2); }
  }
  for (const b of bamboos) {
    if (b.cut) continue;
    if (Math.abs(p.x - b.x) < 0.22 && Math.abs(p.z - b.z) < 0.22) { b.cut = true; b.m.scale.set(1, Math.min(b.sy, p.y / 2.4), 1); burst(tmp3.set(b.x, p.y, b.z), 0x9ad14f, 6, 3); sfx.chop(); }
  }
}
// Portal-Check: gibt Ziel zurueck oder null
function portalExit(x, z, rad) {
  if (!MAP.portals) return null;
  for (const pair of MAP.portals) for (let i = 0; i < 2; i++) {
    const a = pair[i];
    if (Math.hypot(x - a.x, z - a.z) < rad) return { from: a, to: pair[1 - i] };
  }
  return null;
}

// Kollision Kreis (xz) gegen Arena -> korrigierte Position
function resolveCircle(x, z, r) {
  x = clamp(x, -A + r, A - r); z = clamp(z, -A + r, A - r);
  for (const b of MAP.blocks) {
    const ex = b.hw + r, ez = b.hd + r;
    const dx = x - b.x, dz = z - b.z;
    if (Math.abs(dx) < ex && Math.abs(dz) < ez) {
      const px = ex - Math.abs(dx), pz = ez - Math.abs(dz);
      if (px < pz) x = b.x + Math.sign(dx || 1) * ex; else z = b.z + Math.sign(dz || 1) * ez;
    }
  }
  for (const c of MAP.circles) {
    const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
    if (d < m) { const k = d > 1e-4 ? m / d : 0; x = c.x + (d > 1e-4 ? dx * k : m); z = c.z + dz * k; }
  }
  if (MAP.rotor) {
    const R = MAP.rotor, ang = rotorAngle();
    let [lx, lz] = rotorLocal(x, z, ang);
    const ex = R.len / 2 + r, ez = R.w / 2 + r;
    if (Math.abs(lx) < ex && Math.abs(lz) < ez) {
      if (ex - Math.abs(lx) < ez - Math.abs(lz)) lx = Math.sign(lx || 1) * ex; else lz = Math.sign(lz || 1) * ez;
      [x, z] = rotorWorld(lx, lz, ang);
    }
    const dh = Math.hypot(x, z), mh = 0.6 + r;   // Nabe
    if (dh < mh) { const k = dh > 1e-4 ? mh / dh : 0; x = dh > 1e-4 ? x * k : mh; z = z * k; }
  }
  return [x, z];
}
// Bumerang-Kollision: veraendert np und vel. 0 = nichts, 1 = Abprall, 2 = Flipper-Pilz
let lastBumper = -1;
function collideBoom(np, vel) {
  let res = 0;
  const lim = A - 0.1;
  if (np.x < -lim || np.x > lim) { vel.x = -vel.x; np.x = clamp(np.x, -lim, lim); res = 1; }
  if (np.z < -lim || np.z > lim) { vel.z = -vel.z; np.z = clamp(np.z, -lim, lim); res = 1; }
  for (const k of MAP.blocks) {
    if (np.y > k.h + 0.05) continue;
    const ex = k.hw + 0.06, ez = k.hd + 0.06, dx = np.x - k.x, dz = np.z - k.z;
    if (Math.abs(dx) < ex && Math.abs(dz) < ez) {
      const px = ex - Math.abs(dx), pz = ez - Math.abs(dz);
      if (px < pz) { vel.x = -vel.x; np.x = k.x + Math.sign(dx || 1) * ex; } else { vel.z = -vel.z; np.z = k.z + Math.sign(dz || 1) * ez; }
      res = Math.max(res, 1);
    }
  }
  MAP.circles.forEach((c, i) => {
    if (np.y > c.h + 0.05) return;
    const dx = np.x - c.x, dz = np.z - c.z, d = Math.hypot(dx, dz), m = c.r + 0.07;
    if (d < m && d > 1e-4) {
      const nx = dx / d, nz = dz / d, dot = vel.x * nx + vel.z * nz;
      if (dot < 0) { vel.x -= 2 * dot * nx; vel.z -= 2 * dot * nz; }
      np.x = c.x + nx * m; np.z = c.z + nz * m;
      if (c.bumper) {
        const sp = Math.hypot(vel.x, vel.z), ns = Math.min(26, sp * 1.3);
        vel.x *= ns / sp; vel.z *= ns / sp; res = 2; lastBumper = i;
      } else res = Math.max(res, 1);
    }
  });
  if (MAP.rotor && np.y < MAP.rotor.h + 0.05) {
    const R = MAP.rotor, ang = rotorAngle();
    let [lx, lz] = rotorLocal(np.x, np.z, ang);
    const ex = R.len / 2 + 0.06, ez = R.w / 2 + 0.06;
    if (Math.abs(lx) < ex && Math.abs(lz) < ez) {
      let [vx, vz] = rotorLocal(vel.x, vel.z, ang);
      if (ex - Math.abs(lx) < ez - Math.abs(lz)) { lx = Math.sign(lx || 1) * ex; vx = -vx; } else { lz = Math.sign(lz || 1) * ez; vz = -vz; }
      [np.x, np.z] = rotorWorld(lx, lz, ang); [vel.x, vel.z] = rotorWorld(vx, vz, ang);
      res = Math.max(res, 1);
    }
  }
  return res;
}
// Bumerang durch Portal schicken
function boomPortal(b, dt) {
  b.portalCd = (b.portalCd || 0) - dt;
  if (b.portalCd > 0) return false;
  const e = portalExit(b.pos.x, b.pos.z, 0.6); if (!e) return false;
  const sp = Math.hypot(b.vel.x, b.vel.z) || 1;
  b.pos.x = e.to.x + (b.vel.x / sp) * 0.75; b.pos.z = e.to.z + (b.vel.z / sp) * 0.75;
  [b.pos.x, b.pos.z] = [clamp(b.pos.x, -A + 0.3, A - 0.3), clamp(b.pos.z, -A + 0.3, A - 0.3)];
  // nach innen zeigen, falls Richtung in die Wand ginge
  if (Math.abs(e.to.x) > A - 1.2 && Math.sign(b.vel.x) === Math.sign(e.to.x)) b.vel.x = -b.vel.x;
  b.portalCd = 0.5; burst(tmp3.set(e.from.x, 1.15, e.from.z), 0xb36bff, 10, 3); burst(tmp3.set(e.to.x, 1.15, e.to.z), 0x37e0c0, 10, 3); sfx.portal();
  if (b.phase === 'out') b.range += 4;
  return true;
}

// =====================================================================
// Audio (synthetisch)
// =====================================================================
let actx = null;
function initAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) {} }
function noiseBuf(d) {
  const b = actx.createBuffer(1, Math.max(1, actx.sampleRate * d), actx.sampleRate), a = b.getChannelData(0);
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
  grab: () => tone('triangle', 420, 520, 0.05, 0.12),
  catch: () => tone('triangle', 700, 1300, 0.09, 0.25),
  kill: () => { noise(0.5, 'lowpass', 2000, 100, 0.6); tone('sine', 160, 40, 0.5, 0.5); tone('square', 880, 1760, 0.15, 0.08, 0.1); },
  beep: (f = 660) => tone('square', f, f, 0.14, 0.12),
  power: () => [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.12, 0.18, i * 0.07)),
  parry: () => { tone('square', 2200, 1800, 0.08, 0.12); tone('square', 3100, 2600, 0.1, 0.08); },
  boom: () => { noise(0.8, 'lowpass', 1200, 60, 0.8); tone('sine', 90, 30, 0.7, 0.6); },
  dash: () => noise(0.15, 'highpass', 800, 3000, 0.25),
  bounce: () => tone('triangle', 300, 200, 0.06, 0.15),
  shield: () => tone('sine', 400, 1200, 0.25, 0.2),
  teleport: () => { tone('sine', 200, 2000, 0.25, 0.2); noise(0.25, 'bandpass', 3000, 400, 0.2); },
  boing: () => { tone('sine', 300, 900, 0.15, 0.3); tone('square', 600, 1500, 0.08, 0.08); },
  chop: () => noise(0.08, 'highpass', 2500, 5000, 0.2),
  portal: () => tone('sine', 1500, 300, 0.2, 0.18),
  splash: () => { noise(0.6, 'bandpass', 1500, 300, 0.5); tone('sine', 300, 120, 0.3, 0.2); },
  incoming: (v) => noise(0.35, 'bandpass', 3000, 700, 0.35 * v),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone('square', f, f, 0.16, 0.1, i * 0.13)),
};

// =====================================================================
// HUD
// =====================================================================
const board = canvasTex(1024, 320);
const boardMat = new THREE.MeshBasicMaterial({ map: board.t, transparent: true });
for (const rot of [0, Math.PI]) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.375), boardMat);
  p.position.set(0, 3.6, 0); p.rotation.y = rot; scene.add(p);
}
let boardMsg = 'Verbinde …';
function drawBoard() {
  const g = board.g; g.clearRect(0, 0, 1024, 320);
  g.fillStyle = 'rgba(13,16,32,.82)'; g.beginPath(); g.roundRect(8, 8, 1008, 304, 40); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let l = ['', '', ''], r = ['', '', ''], cl = '#fff', cr = '#fff';
  if (mode === 'match' || mode === 'over') { l = [NAMES[0], scoresArr[0]]; r = [NAMES[1], scoresArr[1]]; cl = CSS[0]; cr = CSS[1]; }
  else if (mode === 'practice') { l = ['DU', pScore]; r = ['BOT', bScore]; cl = CSS[Math.max(0, mySlot)]; cr = '#ff4d6d'; }
  if (l[0]) {
    g.font = 'bold 120px system-ui'; g.fillStyle = cl; g.fillText(String(l[1]), 330, 130);
    g.fillStyle = '#fff'; g.fillText(':', 512, 125);
    g.fillStyle = cr; g.fillText(String(r[1]), 694, 130);
    g.font = 'bold 34px system-ui'; g.fillStyle = cl; g.fillText(l[0], 160, 130);
    g.fillStyle = cr; g.fillText(r[0], 864, 130);
  } else { g.font = 'bold 64px system-ui'; g.fillStyle = '#ffe14a'; g.fillText('BUMERANG-DUELL', 512, 120); }
  g.font = '38px system-ui'; g.fillStyle = '#fff'; g.fillText(boardMsg, 512, 250);
  board.t.needsUpdate = true;
}

const hudTex = canvasTex(1024, 512);
const hud = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), new THREE.MeshBasicMaterial({ map: hudTex.t, transparent: true, depthTest: false }));
hud.renderOrder = 999; hud.position.set(0, 0.05, -1.3); camera.add(hud);
let hudTimer = 0;
function showHud(text, sub = '', color = '#fff', dur = 1.6) {
  const g = hudTex.g; g.clearRect(0, 0, 1024, 512); g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = 140; g.font = 'bold ' + fs + 'px system-ui'; while (g.measureText(text).width > 960 && fs > 60) { fs -= 8; g.font = 'bold ' + fs + 'px system-ui'; }
  g.lineWidth = 14; g.strokeStyle = 'rgba(0,0,0,.65)';
  g.strokeText(text, 512, 220); g.fillStyle = color; g.fillText(text, 512, 220);
  if (sub) { g.font = 'bold 54px system-ui'; g.lineWidth = 10; g.strokeText(sub, 512, 360); g.fillStyle = '#fff'; g.fillText(sub, 512, 360); }
  hudTex.t.needsUpdate = true; hud.visible = true; hudTimer = dur;
}
hud.visible = false;
const flash = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false }));
flash.renderOrder = 998; flash.visible = false; camera.add(flash);
let flashT = 0, flashColor = 0xff2020;
function doFlash(color = 0xff2020, t = 0.9) { flash.material.color.setHex(color); flashT = t; flash.visible = true; }

const wristTex = canvasTex(512, 256);
const wrist = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.08), new THREE.MeshBasicMaterial({ map: wristTex.t, transparent: true }));
let wristKey = '';
function drawWrist() {
  const key = [mySlot, myPower, myShield, alive, mode, difficulty].join('|');
  if (key === wristKey) return; wristKey = key;
  const g = wristTex.g; g.clearRect(0, 0, 512, 256);
  g.fillStyle = 'rgba(13,16,32,.85)'; g.beginPath(); g.roundRect(4, 4, 504, 248, 30); g.fill();
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 44px system-ui'; g.fillStyle = mySlot >= 0 ? CSS[mySlot] : '#fff';
  g.fillText(mySlot >= 0 ? 'DU: ' + NAMES[mySlot] : '…', 256, 55);
  g.font = 'bold 44px system-ui';
  g.fillStyle = myPower ? POWER_COLOR[myPower] : '#888';
  g.fillText(myPower ? POWER_LABEL[myPower] + (myPower === 'shield' && !myShield ? ' (weg)' : '') : 'kein Power-up', 256, 130);
  if (mode === 'practice') { g.font = 'bold 36px system-ui'; g.fillStyle = '#ff8fa3'; g.fillText('BOT: ' + BOT_LV[difficulty].label + '  (B/Y)', 256, 205); }
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
  g.userData.mat = m; g.userData.base = color;
  return g;
}
function setBoomPowerLook(mesh, power) {
  const m = mesh.userData.mat;
  const c = power === 'explosive' ? 0xff3030 : power === 'teleport' ? 0xb36bff : power === 'multi' ? 0xffe14a : mesh.userData.base;
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
function makeHandMesh(color) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.11), mat(color)));
  return g;
}

// =====================================================================
// Spielzustand
// =====================================================================
let mySlot = -1, mode = 'connecting'; // connecting | practice | match | over
let scoresArr = [0, 0];
let alive = true, canMove = true, myPower = null, myShield = false;
let pScore = 0, bScore = 0;
let inXR = false;
let drowned = false, playerPortalCd = 0;
const oppSlot = () => 1 - mySlot;

// Haende
const deskHands = { left: new THREE.Group(), right: new THREE.Group() };
deskHands.left.position.set(-0.3, -0.32, -0.7); deskHands.right.position.set(0.3, -0.32, -0.7);
deskHands.right.rotation.set(-0.2, 0, 0);
camera.add(deskHands.left, deskHands.right);
function mkHand(name) {
  return { name, obj: deskHands[name], grip: null, src: null, vh: [], lastLocal: null, prevBtn: false, prevA: false, prevB: false, prevStick: 0, grabbed: false };
}
const hands = { left: mkHand('left'), right: mkHand('right') };
const handMeshes = { left: makeHandMesh(0xffffff), right: makeHandMesh(0xffffff) };

for (let i = 0; i < 2; i++) {
  const grip = renderer.xr.getControllerGrip(i);
  rig.add(grip);
  grip.addEventListener('connected', e => {
    const h = hands[e.data.handedness]; if (!h) return;
    h.obj = grip; h.grip = grip; h.src = e.data; h.vh = []; h.lastLocal = null;
    grip.add(handMeshes[e.data.handedness]);
    if (e.data.handedness === 'left') { grip.add(wrist); wrist.position.set(0.0, 0.06, 0.06); wrist.rotation.set(-1.0, 0, 0); }
  });
  grip.addEventListener('disconnected', e => {
    const h = hands[e.data && e.data.handedness]; if (!h) return;
    h.obj = deskHands[h.name]; h.grip = null; h.src = null;
  });
}
function handPos(h, out) { return h.obj.getWorldPosition(out); }
// Handgeschwindigkeit pro Frame aufzeichnen (Quest liefert sie direkt aus dem Tracking)
function sampleHand(h, t, dt) {
  const v = V();
  if (h.grip && h.grip.hasLinearVelocity) v.copy(h.grip.linearVelocity).applyQuaternion(rig.quaternion);
  else {
    const p = h.obj.position;
    if (h.lastLocal && dt > 0) v.copy(p).sub(h.lastLocal).divideScalar(dt).applyQuaternion(rig.quaternion);
    h.lastLocal = (h.lastLocal || V()).copy(p);
  }
  h.vh.push({ t, v }); while (h.vh.length && t - h.vh[0].t > 0.25) h.vh.shift();
}
function curVel(h, out) { return out.copy(h.vh.length ? h.vh[h.vh.length - 1].v : tmp3.set(0, 0, 0)); }
// Abwurf-Geschwindigkeit: Spitze der letzten 120 ms, geglaettet mit Nachbarn
function releaseVel(h, out) {
  out.set(0, 0, 0);
  const H = h.vh; if (!H.length) return out;
  const tEnd = H[H.length - 1].t;
  let best = -1, bi = -1;
  for (let i = 0; i < H.length; i++) { if (tEnd - H[i].t > 0.12) continue; const s = H[i].v.lengthSq(); if (s > best) { best = s; bi = i; } }
  if (bi < 0) return out;
  let n = 0;
  for (let i = Math.max(0, bi - 1); i <= Math.min(H.length - 1, bi + 1); i++) { out.add(H[i].v); n++; }
  return out.divideScalar(n);
}
function haptic(h, intensity, ms) {
  try { const a = h.src && h.src.gamepad && h.src.gamepad.hapticActuators && h.src.gamepad.hapticActuators[0]; if (a) a.pulse(intensity, ms); } catch (e) {}
}

// ---------- Schatten + Spur ----------
const shadowGeo = new THREE.CircleGeometry(0.16, 16);
function makeShadow() {
  const m = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); return m;
}
function placeShadow(sh, pos, visible) {
  sh.visible = visible; if (!visible) return;
  sh.position.set(pos.x, 0.02, pos.z);
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
  const b = { id: (mySlot + 1) * 100000 + boomSeq++, mesh: makeBoomerangMesh(COLORS[Math.max(0, mySlot)]), shadow: makeShadow(), trailT: 0,
    state: 'held', hand: 'right', pos: V(), vel: V(), phase: 'out', traveled: 0, range: 8, curve: 0, tBack: 0, extra, hit: false, exploded: false, respawn: 0 };
  scene.add(b.mesh); myBooms.push(b); setBoomPowerLook(b.mesh, myPower);
  return b;
}
let mainBoom = null;
function resetMyBooms() {
  for (const b of myBooms) { scene.remove(b.mesh); scene.remove(b.shadow); }
  myBooms.length = 0;
  mainBoom = newBoom(false);
  hands.left.grabbed = hands.right.grabbed = false;
}
function removeBoom(b) { scene.remove(b.mesh); scene.remove(b.shadow); const i = myBooms.indexOf(b); if (i >= 0) myBooms.splice(i, 1); }

// ---------- Gegner (Mensch) ----------
const opp = { av: null, has: false, alive: true, shield: false, power: null, head: V(), lh: V(), rh: V(), headQ: new THREE.Quaternion(),
  tHead: V(), tLh: V(), tRh: V(), tQ: new THREE.Quaternion(), booms: new Map(), lastSeen: 0, inited: false };
function ensureOppAvatar() {
  if (opp.av || mySlot < 0) return;
  opp.av = makeAvatar(COLORS[oppSlot()]); scene.add(opp.av.g); opp.av.g.visible = false;
}

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
const partMats = {};
function burst(pos, color, n = 30, spd = 4) {
  const m = partMats[color] || (partMats[color] = new THREE.MeshBasicMaterial({ color }));
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
// Bot (nur im Training, laeuft lokal)
// =====================================================================
const bot = { av: makeAvatar(BOT_COLOR), pos: V(), alive: false, respawn: 0.5, strafe: 1, strafeT: 0, nextThrow: 2.5, dodgeCd: 0, dashT: 0, dashV: V(),
  meleeT: 0, meleeCd: 0, boom: null, lastPlayer: V(), playerVel: V() };
scene.add(bot.av.g); bot.av.g.visible = false;
bot.boom = { mesh: makeBoomerangMesh(BOT_COLOR), shadow: makeShadow(), state: 'held', pos: V(), vel: V(), phase: 'out', traveled: 0, range: 8, tBack: 0, trailT: 0, hit: false };
scene.add(bot.boom.mesh); bot.boom.mesh.visible = false;
const BOT_SPOTS = [[0, 6.8], [-6.5, 6.5], [6.5, 6.5], [-6.5, -6.5], [6.5, -6.5], [0, -6.8], [-6.8, 0.0], [6.8, 0.0]];
function botSpawn(myHead) {
  let best = null, bd = -1;
  for (const s of BOT_SPOTS) { const [rx, rz] = resolveCircle(s[0], s[1], 0.35); if (Math.hypot(rx - s[0], rz - s[1]) > 0.01) continue; const d = Math.hypot(s[0] - myHead.x, s[1] - myHead.z); if (d > bd) { bd = d; best = s; } }
  bot.pos.set(best[0], 0, best[1]); bot.alive = true; bot.boom.state = 'held'; bot.nextThrow = rand(1.5, 2.5); bot.av.g.visible = true;
}
// Sichtlinie (xz) frei von hohen Bloecken?
function lineFree(ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
  for (let i = 1; i < n; i++) {
    const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n;
    for (const k of MAP.blocks) if (k.h > FLY_H && Math.abs(x - k.x) < k.hw + 0.15 && Math.abs(z - k.z) < k.hd + 0.15) return false;
    for (const c of MAP.circles) if (Math.hypot(x - c.x, z - c.z) < c.r + 0.15) return false;
    if (MAP.rotor) { const [lx, lz] = rotorLocal(x, z, rotorAngle()); if (Math.abs(lx) < MAP.rotor.len / 2 + 0.15 && Math.abs(lz) < MAP.rotor.w / 2 + 0.15) return false; }
  }
  return true;
}
function hitBot() {
  if (!bot.alive) return;
  bot.alive = false; bot.respawn = 1.6; pScore++;
  burst(tmp1.copy(bot.pos).setY(1.1), BOT_COLOR, 45, 5); sfx.kill(); bot.av.g.visible = false;
  bot.boom.state = 'held'; bot.boom.mesh.visible = false; bot.boom.shadow.visible = false;
  showHud('TREFFER!', 'Du ' + pScore + ' : ' + bScore + ' Bot', '#ffe14a', 1.2); drawBoard();
}
function hitsBot(p, extra = 0) {
  if (!(mode === 'practice' && bot.alive)) return false;
  return Math.hypot(p.x - bot.pos.x, p.z - bot.pos.z) < HIT_RADIUS + extra && p.y < 1.75;
}
let practiceDownT = 0;
function practiceDeath(title, sub) {
  if (!alive) return;
  if (myShield) { myShield = false; showHud('SCHILD WEG!', '', '#7dff9a', 1.2); sfx.shield(); return; }
  alive = false; canMove = false; bScore++;
  doFlash(); sfx.kill();
  for (const b of myBooms) { b.mesh.visible = false; b.shadow.visible = false; }
  showHud(title, sub || ('Du ' + pScore + ' : ' + bScore + ' Bot'), '#ff4d4d', 1.8);
  practiceDownT = 1.8; drawBoard();
  haptic(hands.left, 1, 250); haptic(hands.right, 1, 250);
}
function updateBot(dt, myHead) {
  const L = BOT_LV[difficulty];
  if (mode !== 'practice') { bot.av.g.visible = false; bot.boom.mesh.visible = false; bot.boom.shadow.visible = false; bot.alive = false; bot.respawn = 1; return; }
  // Spielergeschwindigkeit schaetzen (fuer Vorhalt)
  if (dt > 0) { tmp1.copy(myHead).sub(bot.lastPlayer).divideScalar(dt).setY(0); if (tmp1.length() < 15) bot.playerVel.lerp(tmp1, 0.15); }
  bot.lastPlayer.copy(myHead);
  if (!bot.alive) {
    bot.respawn -= dt; if (bot.respawn <= 0) botSpawn(myHead);
    else return;
  }
  bot.dodgeCd -= dt; bot.meleeCd -= dt; bot.strafeT -= dt;
  const to = V().set(myHead.x - bot.pos.x, 0, myHead.z - bot.pos.z); const dist = to.length(); to.normalize();
  const perp = V().set(-to.z, 0, to.x);
  if (bot.strafeT <= 0) { bot.strafeT = rand(1.2, 2.8); bot.strafe = Math.random() < 0.5 ? -1 : 1; }
  const want = difficulty === 'leicht' ? 6.5 : 5.0;
  const radial = dist > want + 1 ? 1 : dist < want - 1 ? -1 : 0;
  let mvx = to.x * radial + perp.x * bot.strafe * 0.7, mvz = to.z * radial + perp.z * bot.strafe * 0.7;
  const ml = Math.hypot(mvx, mvz) || 1; mvx /= ml; mvz /= ml;
  // Nahkampf-Druck auf Schwer/Mittel, wenn Spieler den Bumerang nicht hat
  if (L.melee && mainBoom && mainBoom.state !== 'held' && dist < 4) { mvx = to.x; mvz = to.z; }
  // Ausweichen
  if (bot.dodgeCd <= 0 && L.dodge > 0) {
    for (const b of myBooms) {
      if (b.state !== 'fly') continue;
      const rel = tmp3.set(bot.pos.x - b.pos.x, 0, bot.pos.z - b.pos.z), d = rel.length();
      if (d < 3.2 && b.vel.x * rel.x + b.vel.z * rel.z > 0) {
        bot.dodgeCd = L.react + 0.6;
        if (Math.random() < L.dodge) {
          const side = (b.vel.x * rel.z - b.vel.z * rel.x) > 0 ? 1 : -1;
          bot.dashV.set(-b.vel.z, 0, b.vel.x).normalize().multiplyScalar(side * DASH_DIST / DASH_TIME); bot.dashT = DASH_TIME;
        }
        break;
      }
    }
  }
  let nx = bot.pos.x + mvx * L.speed * dt, nz = bot.pos.z + mvz * L.speed * dt;
  if (bot.dashT > 0) { const s = Math.min(dt, bot.dashT); nx += bot.dashV.x * s; nz += bot.dashV.z * s; bot.dashT -= dt; }
  [nx, nz] = resolveCircle(nx, nz, 0.3);
  if (!inPond(nx, nz, -0.4)) { bot.pos.x = nx; bot.pos.z = nz; }
  else if (!inPond(nx, bot.pos.z, -0.4)) bot.pos.x = nx;
  else if (!inPond(bot.pos.x, nz, -0.4)) bot.pos.z = nz;
  else bot.strafe *= -1;
  // an der Wand festgeklebt? Richtung wechseln
  if (Math.abs(bot.pos.x) > A - 0.5 || Math.abs(bot.pos.z) > A - 0.5) { if (bot.strafeT > 0.6) bot.strafeT = 0.6; }
  // Nahkampf
  if (L.melee && bot.boom.state === 'held' && dist < 1.3 && bot.meleeCd <= 0 && alive) { bot.meleeT = 0.4; bot.meleeCd = 1.6; }
  if (bot.meleeT > 0) { bot.meleeT -= dt; if (bot.meleeT <= 0 && dist < 1.4 && alive) practiceDeath('ERWISCHT!'); }
  // Werfen
  bot.nextThrow -= dt;
  const los = lineFree(bot.pos.x, bot.pos.z, myHead.x, myHead.z);
  if (!los && bot.boom.state === 'held' && bot.nextThrow < 0.4 && bot.strafeT > 0.8) bot.strafeT = 0.8; // Position wechseln
  if (bot.boom.state === 'held' && bot.nextThrow <= 0 && alive && dist > 1.8 && !los) bot.nextThrow = 0.3;
  if (bot.boom.state === 'held' && bot.nextThrow <= 0 && alive && dist > 1.8 && los) {
    const tt = dist / L.boom;
    const aim = tmp3.set(myHead.x + bot.playerVel.x * tt * L.lead - bot.pos.x, 0, myHead.z + bot.playerVel.z * tt * L.lead - bot.pos.z).normalize();
    aim.applyAxisAngle(UP, rand(-L.err, L.err));
    const b = bot.boom;
    b.state = 'fly'; b.phase = 'out'; b.traveled = 0; b.tBack = 0; b.hit = false;
    b.pos.set(bot.pos.x + aim.x * 0.4, FLY_H, bot.pos.z + aim.z * 0.4);
    b.vel.copy(aim).multiplyScalar(L.boom); b.range = clamp(dist + 3, 5, 15);
    bot.nextThrow = rand(L.cd[0], L.cd[1]); sfx.throw();
  }
  // Bot-Bumerang fliegen lassen
  const b = bot.boom;
  const handP = V().set(bot.pos.x + perp.x * 0.3, 1.2, bot.pos.z + perp.z * 0.3);
  if (b.state === 'fly') {
    const steps = Math.max(1, Math.ceil(b.vel.length() * dt / 0.1)), h = dt / steps;
    for (let s = 0; s < steps && b.state === 'fly'; s++) {
      if (b.phase === 'out') { b.traveled += b.vel.length() * h; if (b.traveled >= b.range) { b.phase = 'back'; b.tBack = 0; } }
      else {
        b.tBack += h;
        const d = tmp3.subVectors(handP, b.pos); const dl = d.length();
        if (dl < 0.5) { b.state = 'held'; break; }
        b.vel.lerp(d.normalize().multiplyScalar(BOOM_RETURN_SPEED * 0.85 + b.tBack * 5), Math.min(1, (5 + b.tBack * 4) * h));
      }
      const np = tmp3.copy(b.pos).addScaledVector(b.vel, h); np.y += (FLY_H - np.y) * Math.min(1, 8 * h); b.vel.y = 0;
      const cr = b.tBack < 2 ? collideBoom(np, b.vel) : 0;
      if (cr === 2) { sfx.boing(); flashBumper(); if (b.phase === 'out') b.range += 3; } else if (cr === 1) sfx.bounce();
      b.pos.copy(np);
      boomPortal(b, h);
      // trifft Spieler? (Ducken unter Flughoehe = Ausweichen)
      if (!b.hit && alive && Math.hypot(b.pos.x - myHead.x, b.pos.z - myHead.z) < HIT_RADIUS && b.pos.y < myHead.y + 0.05) { b.hit = true; practiceDeath('GETROFFEN!'); }
      // Parade mit eigenem Bumerang
      if (mainBoom && mainBoom.state === 'held' && alive && b.pos.distanceTo(mainBoom.mesh.position) < 0.4 && b.phase === 'out') {
        b.vel.multiplyScalar(-1); b.phase = 'back'; b.tBack = 0; burst(b.pos, 0xffffff, 15, 3); sfx.parry(); haptic(hands[mainBoom.hand], 1, 60);
      }
    }
    cutGrassAt(b.pos);
    b.mesh.visible = true; b.mesh.position.copy(b.pos); b.mesh.rotation.set(0, b.mesh.rotation.y + 26 * dt, 0);
    placeShadow(b.shadow, b.pos, true);
    b.trailT -= dt; if (b.trailT <= 0) { b.trailT = 0.02; addTrail(b.pos, BOT_COLOR); }
  } else {
    b.mesh.visible = true; b.shadow.visible = false;
    b.mesh.position.copy(handP); b.mesh.rotation.set(Math.PI / 2, 0, Math.atan2(to.x, to.z));
  }
  // Avatar
  const av = bot.av;
  const bob = Math.sin(performance.now() / 120) * 0.03 * (Math.abs(mvx) + Math.abs(mvz) > 0.1 ? 1 : 0);
  av.body.position.set(bot.pos.x, 0.85 + bob, bot.pos.z);
  av.head.position.set(bot.pos.x, 1.62 + bob, bot.pos.z); av.head.rotation.set(0, Math.atan2(-to.x, -to.z), 0);
  const swing = bot.meleeT > 0 ? 0.5 : 0;
  av.lh.position.set(bot.pos.x - perp.x * 0.32, 1.1, bot.pos.z - perp.z * 0.32);
  av.rh.position.set(handP.x + to.x * swing, 1.2 + swing * 0.4, handP.z + to.z * swing);
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
  peer.on('open', () => { isHost = true; referee = new Referee(); referee.join(0); });
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
    c.on('open', () => clearTimeout(to));
    c.on('data', d => handle(d));
    c.on('close', () => { if (conn === c) { conn = null; mode = 'connecting'; setStatus('Verbindung zum Host verloren – Seite neu laden'); showHud('GETRENNT', 'Seite neu laden', '#ff6060', 5); } });
  });
  peer.on('error', err => { if (err.type === 'peer-unavailable') setTimeout(tryHost, 800); else console.warn('peer error', err.type); });
}
function netSend(m) {
  if (isHost) {
    if (m.t === 's' || m.t === 'fx') { if (conn && conn.open) conn.send(m); }
    else if (referee) referee.msg(0, m);
  } else if (conn && conn.open) conn.send(m);
}

// ---------- Schiedsrichter (nur Host) ----------
const POWERS = ['multi', 'explosive', 'shield', 'teleport'];
class Referee {
  constructor() { this.present = [false, false]; this.P = [this.mk(), this.mk()]; this.phase = 'lobby'; this.round = 0; this.crates = {}; this.cid = 1; this.ct = null; this.pt = null; this.ft = null; }
  mk() { return { alive: true, shield: false, power: null, score: 0 }; }
  to(slot, o) { if (slot === 0) queueMicrotask(() => handle(o)); else if (conn && conn.open) conn.send(o); }
  bc(o) { this.to(0, o); this.to(1, o); }
  count() { return this.present.filter(Boolean).length; }
  join(slot) { this.present[slot] = true; this.to(slot, { t: 'welcome', slot, v: VERSION }); if (this.count() === 2) this.startMatch(); else this.startPractice(); }
  leave(slot) { this.present[slot] = false; this.startPractice(); }
  stopCrates() { clearInterval(this.ct); clearTimeout(this.ft); this.ct = null; this.crates = {}; this.bc({ t: 'crates' }); }
  startCrates(first) { this.stopCrates(); this.ft = setTimeout(() => this.spawnCrate(), first); this.ct = setInterval(() => this.spawnCrate(), 6500); }
  spawnCrate() {
    if (!(this.phase === 'fight' || this.phase === 'practice')) return;
    if (Object.keys(this.crates).length >= 2) return;
    const used = Object.values(this.crates).map(c => c.x + ',' + c.z);
    const free = MAP.crates.filter(s => !used.includes(s[0] + ',' + s[1]));
    const s = free[Math.floor(Math.random() * free.length)], id = this.cid++;
    this.crates[id] = { x: s[0], z: s[1] };
    this.bc({ t: 'crate', id, x: s[0], z: s[1] });
  }
  clear() { clearTimeout(this.pt); clearTimeout(this.ft); }
  startPractice() { this.clear(); this.phase = 'practice'; this.P.forEach(p => Object.assign(p, this.mk())); this.bc({ t: 'practice', map: mapPref === 'rot' ? Math.max(0, curMap) : +mapPref }); this.startCrates(1500); }
  startMatch() { this.clear(); this.round = 0; this.mapBase = Math.floor(Math.random() * MAPS.length); this.P.forEach(p => Object.assign(p, this.mk())); this.startRound(); }
  startRound() {
    this.round++; this.phase = 'countdown';
    this.P.forEach(p => { p.alive = true; p.shield = false; p.power = null; });
    this.stopCrates();
    this.bc({ t: 'round', round: this.round, scores: this.P.map(p => p.score), map: mapPref === 'rot' ? (this.mapBase + this.round - 1) % MAPS.length : +mapPref });
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
    }, 900);
  }
  msg(from, m) {
    if (m.t === 'hit') {
      const v = m.victim;
      if (!(v === 0 || v === 1) || !(this.phase === 'fight' || this.phase === 'roundEnd') || !this.P[v].alive) return;
      if (this.P[v].shield && m.cause !== 'water') { this.P[v].shield = false; this.bc({ t: 'shield', slot: v, on: false, x: m.x, y: m.y, z: m.z }); return; }
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
// Nachrichten
// =====================================================================
let versionWarned = false;
function checkVersion(v) {
  if (v === VERSION || versionWarned) return;
  versionWarned = true;
  showHud('ANDERE VERSION', 'Beide Quests: Seite neu laden', '#ff6060', 8);
  setStatus('Versionen unterschiedlich – auf beiden Quests neu laden');
}
function handle(m) {
  switch (m.t) {
    case 'welcome':
      checkVersion(m.v);
      mySlot = m.slot; ensureOppAvatar();
      for (const b of myBooms) { b.mesh.userData.base = COLORS[mySlot]; setBoomPowerLook(b.mesh, myPower); }
      ['left', 'right'].forEach(n => handMeshes[n].children[0].material.color.setHex(COLORS[mySlot]));
      wristKey = '';
      break;
    case 'full': setStatus('Raum ist voll (2 Spieler)'); break;
    case 'practice':
      mode = 'practice'; pScore = 0; bScore = 0; alive = true; canMove = true; myPower = null; myShield = false; drowned = false;
      applyMap(m.map || 0); roundT0 = performance.now() / 1000;
      resetMyBooms(); placeAtSpawn();
      bot.alive = false; bot.respawn = 1.5;
      if (opp.av) opp.av.g.visible = false; opp.has = false; opp.inited = false;
      setStatus('Training gegen Bot · warte auf Spieler 2');
      showHud('TRAINING', MAP.name + ' · Bot: ' + BOT_LV[difficulty].label, '#ffe14a', 2.5);
      break;
    case 'round':
      mode = 'match'; scoresArr = m.scores; alive = true; canMove = false; myPower = null; myShield = false; drowned = false;
      applyMap(m.map || 0); roundT0 = performance.now() / 1000;
      clearCrates(); resetMyBooms(); placeAtSpawn();
      opp.alive = true; opp.shield = false; if (opp.av) opp.av.shield.visible = false;
      setStatus('Runde ' + m.round + ' · ' + MAP.name + ' · erster mit ' + WIN_SCORE + ' gewinnt');
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
        for (const b of myBooms) setBoomPowerLook(b.mesh, myPower);
        showHud(POWER_LABEL[m.type], powerHint(m.type), POWER_COLOR[m.type], 2.2); sfx.power();
        haptic(hands.left, 0.6, 80); haptic(hands.right, 0.6, 80);
      } else { opp.power = m.type; opp.shield = m.type === 'shield'; if (opp.av) opp.av.shield.visible = opp.shield; }
      break;
    }
    case 'shield':
      if (m.slot === mySlot) { myShield = false; showHud('SCHILD WEG!', '', '#7dff9a', 1.2); haptic(hands.left, 1, 150); haptic(hands.right, 1, 150); }
      else { opp.shield = false; if (opp.av) opp.av.shield.visible = false; }
      sfx.shield(); if (m.x !== undefined) burst(tmp1.set(m.x, m.y, m.z), 0x7dff9a, 25, 4);
      break;
    case 'kill': {
      if (m.cause === 'water') sfx.splash(); else sfx.kill();
      if (m.victim === mySlot) {
        doFlash(m.cause === 'water' ? 0x2f9be8 : 0xff2020);
        alive = false; canMove = false;
        for (const b of myBooms) { b.mesh.visible = false; b.shadow.visible = false; }
        const title = m.cause === 'water' ? 'INS WASSER!' : (m.cause === 'boom' && m.by === mySlot ? 'EIGENTOR!' : 'GETROFFEN!');
        showHud(title, '', '#ff4d4d', 2.2);
        camera.getWorldPosition(tmp1); burst(tmp1.setY(1.0), m.cause === 'water' ? 0x2f9be8 : COLORS[mySlot], 40, 5);
        haptic(hands.left, 1, 300); haptic(hands.right, 1, 300);
      } else {
        opp.alive = false;
        if (opp.av) { burst(opp.head, m.cause === 'water' ? 0x2f9be8 : COLORS[oppSlot()], 50, 5); opp.av.g.visible = false; }
        showHud(m.cause === 'water' ? 'ERTRUNKEN!' : 'KO!', m.cause === 'water' ? 'Gegner ist ins Wasser gefallen' : 'Treffer!', '#ffe14a', 1.5);
        haptic(hands.right, 0.8, 120);
      }
      break;
    }
    case 'roundEnd':
      scoresArr = m.scores;
      if (m.winner < 0) showHud('DOPPEL-KO', 'kein Punkt', '#fff', 2.2);
      else showHud(m.winner === mySlot ? 'PUNKT FÜR DICH' : 'PUNKT FÜR ' + NAMES[m.winner], scoresArr[0] + ' : ' + scoresArr[1], CSS[m.winner], 2.2);
      break;
    case 'match':
      scoresArr = m.scores; mode = 'over';
      showHud(m.winner === mySlot ? 'DU GEWINNST!' : NAMES[m.winner] + ' GEWINNT', scoresArr[0] + ' : ' + scoresArr[1] + ' · Neues Match gleich', CSS[m.winner], 6.5);
      setStatus(NAMES[m.winner] + ' gewinnt das Match!');
      if (m.winner === mySlot) { sfx.win(); for (let i = 0; i < 5; i++) setTimeout(() => { camera.getWorldPosition(tmp2); burst(tmp2.add(tmp3.set(rand(-2, 2), 1.5, rand(-2, 2))), [0xff8a1f, 0x2ec8ff, 0xffe14a, 0xff4dd2][i % 4], 40, 5); }, i * 300); }
      break;
    case 's': checkVersion(m.v); applyRemoteState(m); break;
    case 'fx': onFx(m); break;
  }
  drawBoard();
}
function powerHint(t) {
  return { multi: 'Wirf 3 auf einmal', explosive: 'Explodiert beim Aufprall – Abstand halten!', shield: 'Hält einen Treffer aus', teleport: 'Knopf während Flug = hinbeamen' }[t];
}
function placeAtSpawn() {
  const s = SPAWNS[Math.max(0, mySlot)];
  if (inXR) {
    const hl = camera.position;
    const headYawLocal = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y;
    rig.rotation.y = s.yaw - headYawLocal;
    tmp1.set(hl.x, 0, hl.z).applyAxisAngle(UP, rig.rotation.y);
    rig.position.set(s.x - tmp1.x, 0, s.z - tmp1.z);
  } else { rig.position.set(s.x, 0, s.z); rig.rotation.y = s.yaw; deskPitch = 0; camera.rotation.x = 0; }
}

function applyRemoteState(m) {
  ensureOppAvatar();
  opp.has = true; opp.lastSeen = performance.now();
  opp.tHead.fromArray(m.h); opp.tQ.fromArray(m.q);
  if (m.l) opp.tLh.fromArray(m.l); if (m.r) opp.tRh.fromArray(m.r);
  if (!opp.inited) { opp.head.copy(opp.tHead); opp.lh.copy(opp.tLh); opp.rh.copy(opp.tRh); opp.headQ.copy(opp.tQ); opp.inited = true; }
  const seen = new Set();
  for (const [id, x, y, z, fly, pw] of m.b) {
    seen.add(id);
    let rb = opp.booms.get(id);
    if (!rb) { rb = { mesh: makeBoomerangMesh(COLORS[oppSlot()]), shadow: makeShadow(), pos: V(), tgt: V(), fly: 0, pw: null, parryCd: 0, trailT: 0, warned: false }; scene.add(rb.mesh); opp.booms.set(id, rb); rb.pos.set(x, y, z); }
    rb.tgt.set(x, y, z); rb.fly = fly;
    if (rb.pos.distanceTo(rb.tgt) > 3) rb.pos.copy(rb.tgt); // Portal-Sprung nicht durchziehen
    if (rb.pw !== pw) { rb.pw = pw; setBoomPowerLook(rb.mesh, pw || null); }
  }
  for (const [id, rb] of opp.booms) if (!seen.has(id)) { scene.remove(rb.mesh); scene.remove(rb.shadow); opp.booms.delete(id); }
  if (opp.av) opp.av.g.visible = opp.alive && m.a === 1 && mode !== 'practice';
}
function onFx(m) {
  if (m.kind === 'parry') {
    const b = myBooms.find(x => x.id === m.id);
    if (b && b.state === 'fly') { b.vel.multiplyScalar(-1.1); b.phase = 'back'; b.tBack = 0; burst(b.pos, 0xffffff, 15, 3); sfx.parry(); }
  } else if (m.kind === 'boom') { explosionFx(tmp1.set(m.x, m.y, m.z)); sfx.boom(); }
  else if (m.kind === 'tele') { burst(tmp1.set(m.x, 1, m.z), 0xb36bff, 25, 3); sfx.teleport(); }
}

// =====================================================================
// Aktionen
// =====================================================================
const tmpQ = new THREE.Quaternion();
function getTargetPos(out) {
  if (mode === 'practice' && bot.alive) return out.copy(bot.pos).setY(1.1);
  if (mode === 'match' && opp.has && opp.alive) return out.copy(opp.head).setY(opp.head.y - 0.4);
  return null;
}
// velWorld = echte Abwurfgeschwindigkeit der Hand (m/s)
function throwBoom(h, velWorld, isDesktop = false) {
  if (!alive || !canMove || !mainBoom || mainBoom.state !== 'held') return false;
  let hs = velWorld.length();
  const dir = V();
  let pitch = 0;
  const headF = V(); camera.getWorldDirection(headF); headF.y = 0; headF.normalize();
  if (isDesktop) { dir.copy(headF); hs = 9; camera.getWorldDirection(tmp3); pitch = Math.asin(clamp(tmp3.y, -1, 1)); }
  else {
    dir.set(velWorld.x, 0, velWorld.z);
    const horiz = dir.length();
    pitch = Math.atan2(velWorld.y, Math.max(horiz, 0.01));
    if (horiz < hs * 0.45) pitch = 0; // Ueberkopf-Wurf: Hoehe halten statt in den Boden
    // Ueberkopf-Wurf (viel vertikal): Richtung mit Blickrichtung stabilisieren
    if (horiz < hs * 0.45) dir.addScaledVector(headF, hs * 0.5);
    if (dir.lengthSq() < 1e-4) dir.copy(headF);
    dir.normalize();
  }
  // Wurfkraft bestimmt Tempo UND Weite deutlich (schwacher Wurf = kurz, harter Wurf = quer ueber die Map)
  const speed = clamp(hs * 2.2, BOOM_MIN_SPEED, BOOM_MAX_SPEED);
  const range = clamp(hs * 1.9, 3, 18);
  // Neigung des Handgelenks beim Loslassen (wie Disc Golf in Sports Champions):
  // linke Kante tiefer -> Kurve nach links, rechte Kante tiefer -> Kurve nach rechts, flach -> fast gerade
  let tilt = 0;
  if (!isDesktop) { h.obj.getWorldQuaternion(tmpQ); tilt = Math.asin(clamp(tmp3.set(1, 0, 0).applyQuaternion(tmpQ).y, -1, 1)); }
  tilt = clamp(tilt, -0.8, 0.8);
  const curve = tilt * 1.5 * speed / range;
  // Zielhilfe: nur wenn fast drauf gezielt; gleicht den Bogen aus
  const target = getTargetPos(tmp2);
  if (target) {
    const from = handPos(h, tmp3);
    const to = V().subVectors(target, from); to.y = 0;
    const d = to.length();
    if (d > 0.1 && d < range + 1) {
      const T = d / speed;
      const yaw = Math.atan2(dir.x, dir.z), yawT = Math.atan2(to.x, to.z) - curve * T / 2;
      let dy = yawT - yaw; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
      if (Math.abs(dy) < 0.25) dir.applyAxisAngle(UP, dy * (isDesktop ? 1 : 0.5));
    }
  }
  // Hoehe: folgt der Wurfrichtung, aber stark gedaempft (max. ca. +-0,6 m Steigen/Sinken)
  const vy = speed * Math.tan(clamp(pitch * 0.5, -0.08, 0.08));
  const launch = (b, d) => {
    handPos(h, b.pos); b.pos.y = clamp(b.pos.y, 0.5, FLY_MAX); b.vy = vy;
    b.state = 'fly'; b.phase = 'out'; b.traveled = 0; b.tBack = 0; b.hit = false; b.exploded = false;
    b.vel.copy(d).multiplyScalar(speed); b.range = range; b.curve = curve; b.tilt = tilt; b.spin = 0; b.hand = h.name; b.mesh.visible = true;
  };
  launch(mainBoom, dir);
  if (myPower === 'multi') for (const a of [-0.3, 0.3]) { const e = newBoom(true); launch(e, dir.clone().applyAxisAngle(UP, a)); }
  sfx.throw(); haptic(h, 0.6, 40);
  return true;
}
function recallOrTeleport() {
  if (!mainBoom || mainBoom.state !== 'fly' || !alive) return;
  if (myPower === 'teleport' && canMove) {
    const [x, z] = resolveCircle(mainBoom.pos.x, mainBoom.pos.z, 0.35);
    camera.getWorldPosition(tmp1);
    netSend({ t: 'fx', kind: 'tele', x: tmp1.x, z: tmp1.z }); burst(tmp1.setY(1), 0xb36bff, 25, 3);
    rig.position.x += x - tmp1.x; rig.position.z += z - tmp1.z;
    catchBoom(mainBoom, hands[mainBoom.hand]); sfx.teleport();
    netSend({ t: 'fx', kind: 'tele', x, z });
    return;
  }
  if (mainBoom.phase === 'out') { mainBoom.phase = 'back'; mainBoom.tBack = 0; }
}
function catchBoom(b, h) {
  if (b.extra) { removeBoom(b); return; }
  b.state = 'held'; b.hand = h.name; b.vel.set(0, 0, 0); h.grabbed = false;
  sfx.catch(); haptic(h, 0.5, 40);
}
let dashT = 0, dashCd = 0; const dashV = V();
function doDash(dirWorld) {
  if (!alive || !canMove || dashCd > 0) return;
  dashV.copy(dirWorld).setY(0);
  if (dashV.lengthSq() < 0.01) { camera.getWorldDirection(dashV); dashV.y = 0; }
  dashV.normalize().multiplyScalar(DASH_DIST / DASH_TIME);
  dashT = DASH_TIME; dashCd = DASH_CD; sfx.dash();
}
function sendHit(victim, cause, pos) { netSend({ t: 'hit', victim, cause, x: pos.x, y: pos.y, z: pos.z }); }
function explode(b) {
  if (b.exploded) return; b.exploded = true;
  explosionFx(b.pos); sfx.boom();
  netSend({ t: 'fx', kind: 'boom', x: b.pos.x, y: b.pos.y, z: b.pos.z });
  if (mode === 'match' && opp.has && opp.alive && Math.hypot(opp.head.x - b.pos.x, opp.head.z - b.pos.z) < EXPLO_RADIUS) sendHit(oppSlot(), 'boom', b.pos);
  if (mode === 'practice' && bot.alive && Math.hypot(bot.pos.x - b.pos.x, bot.pos.z - b.pos.z) < EXPLO_RADIUS) hitBot();
  camera.getWorldPosition(tmp1);
  if (Math.hypot(tmp1.x - b.pos.x, tmp1.z - b.pos.z) < EXPLO_RADIUS * 0.8) {
    if (mode === 'match') sendHit(mySlot, 'boom', b.pos); else if (mode === 'practice') practiceDeath('EIGENTOR!');
  }
  if (b.extra) { removeBoom(b); return; }
  b.state = 'gone'; b.mesh.visible = false; b.respawn = 0.9;
}
function hitsOpp(p, extraR = 0, extraY = 0.05) {
  if (!(mode === 'match' && opp.has && opp.alive)) return false;
  return Math.hypot(p.x - opp.head.x, p.z - opp.head.z) < HIT_RADIUS + extraR && p.y < opp.head.y + extraY && p.y > 0.05;
}

// =====================================================================
// Update
// =====================================================================
let countdown = 0, countdownT = 0, sendAcc = 0, last = performance.now();
let slashCd = 0, deskPitch = 0;
const keys = {};

function update(dt, t) {
  scene.updateMatrixWorld();
  if (hudTimer > 0) { hudTimer -= dt; if (hudTimer <= 0) hud.visible = false; }
  if (countdown > 0) { countdownT += dt; if (countdownT >= 1) { countdownT -= 1; countdown--; if (countdown > 0) { showHud(String(countdown), '', '#fff', 1); sfx.beep(523); } } }
  dashCd -= dt; slashCd -= dt;
  if (waterTex) { waterTex.offset.x = t * 0.03; waterTex.offset.y = Math.sin(t * 0.5) * 0.05; }
  if (practiceDownT > 0) {
    practiceDownT -= dt;
    if (practiceDownT <= 0 && mode === 'practice') { alive = true; canMove = true; drowned = false; placeAtSpawn(); resetMyBooms(); }
  }

  // ---------- Eingabe VR ----------
  let moveX = 0, moveY = 0;
  for (const name of ['left', 'right']) {
    const h = hands[name];
    sampleHand(h, t, dt);
    const gp = h.src && h.src.gamepad; if (!gp) continue;
    const btn = !!((gp.buttons[0] && gp.buttons[0].pressed) || (gp.buttons[1] && gp.buttons[1].pressed)); // Trigger oder Grip = packen
    const aBtn = !!(gp.buttons[4] && gp.buttons[4].pressed);  // A / X = Dash
    const bBtn = !!(gp.buttons[5] && gp.buttons[5].pressed);  // B / Y = Bot-Stufe
    const sBtn = !!(gp.buttons[3] && gp.buttons[3].pressed);  // Stick druecken = Arena wechseln (Training)
    const ax = gp.axes[2] || 0, ay = gp.axes[3] || 0;
    if (name === 'left') { moveX = ax; moveY = ay; }
    else {
      if (Math.abs(ax) > 0.7 && h.prevStick === 0) { snapTurn(ax > 0 ? -Math.PI / 4 : Math.PI / 4); h.prevStick = 1; }
      if (Math.abs(ax) < 0.3) h.prevStick = 0;
    }
    const holding = mainBoom && mainBoom.state === 'held' && mainBoom.hand === name;
    if (btn && !h.prevBtn) {
      if (holding) { h.grabbed = true; sfx.grab(); haptic(h, 0.3, 25); }
      else if (mainBoom && mainBoom.state === 'fly') recallOrTeleport();
      else if (mainBoom && mainBoom.state === 'held' && !hands[mainBoom.hand].grabbed) { mainBoom.hand = name; h.grabbed = true; sfx.grab(); haptic(h, 0.3, 25); }
    }
    // Loslassen = Wurf (wie Wii Bowling). Zu langsam = nur loslassen, kein Wurf.
    if (!btn && h.prevBtn && h.grabbed) {
      h.grabbed = false;
      if (holding) { const v = releaseVel(h, tmp1); if (v.length() > 1.2) throwBoom(h, v); }
    }
    if (aBtn && !h.prevA) {
      const d = V();
      if (Math.abs(moveX) + Math.abs(moveY) > 0.2) { camera.getWorldDirection(tmp2); tmp2.y = 0; tmp2.normalize(); d.copy(tmp2).multiplyScalar(-moveY).add(tmp3.set(-tmp2.z, 0, tmp2.x).multiplyScalar(moveX)); }
      doDash(d);
    }
    if (bBtn && !h.prevB && mode === 'practice') cycleDifficulty();
    if (sBtn && !h.prevS && mode === 'practice' && isHost) cycleMap();
    h.prevS = sBtn;
    h.prevBtn = btn; h.prevA = aBtn; h.prevB = bBtn;
  }
  if (!inXR) { moveX = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0); moveY = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0); }

  // ---------- Laufen ----------
  if (alive && canMove) {
    camera.getWorldDirection(tmp2); tmp2.y = 0; tmp2.normalize();
    const right = tmp3.set(-tmp2.z, 0, tmp2.x);
    const mv = V().addScaledVector(tmp2, -moveY).addScaledVector(right, moveX);
    if (mv.lengthSq() > 0.02) { if (mv.length() > 1) mv.normalize(); rig.position.addScaledVector(mv, MOVE_SPEED * dt); }
    if (dashT > 0) { const s = Math.min(dt, dashT); rig.position.addScaledVector(dashV, s); dashT -= dt; }
  }
  rig.updateMatrixWorld(true);
  camera.getWorldPosition(tmp1);
  const [cx, cz] = resolveCircle(tmp1.x, tmp1.z, 0.3);
  rig.position.x += cx - tmp1.x; rig.position.z += cz - tmp1.z;
  rig.updateMatrixWorld(true);
  const myHead = camera.getWorldPosition(V());

  // ---------- Arena-Gimmicks ----------
  if (rotorMesh) rotorMesh.rotation.y = rotorAngle();
  for (const bp of bumpers) { bp.flash = Math.max(0, bp.flash - dt); bp.capM.emissiveIntensity = 0.35 + bp.flash * 4; bp.g.scale.setScalar(1 + bp.flash * 0.4); }
  for (const pm of portalMeshes) { pm.disc.material.opacity = 0.35 + Math.sin(t * 4) * 0.12; }
  playerPortalCd -= dt;
  if (alive && canMove && playerPortalCd <= 0) {
    const e = portalExit(myHead.x, myHead.z, 0.55);
    if (e) {
      const cx2 = -Math.sign(e.to.x) * 1.1;
      const [px, pz] = resolveCircle(e.to.x + cx2, e.to.z, 0.35);
      rig.position.x += px - myHead.x; rig.position.z += pz - myHead.z; rig.updateMatrixWorld(true);
      camera.getWorldPosition(myHead); playerPortalCd = 1.2; sfx.teleport(); doFlash(0xb36bff, 0.4);
    }
  }
  // Rotor schiebt Spieler weg (resolveCircle oben deckt es ab, hier nochmal nach Drehung)

  updateBot(dt, myHead);  updateBot(dt, myHead);

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
        cutGrassAt(rb.pos);
        rb.trailT -= dt; if (rb.trailT <= 0) { rb.trailT = 0.02; addTrail(rb.pos, rb.mesh.userData.mat.color.getHex()); }
        const d = Math.hypot(rb.pos.x - myHead.x, rb.pos.z - myHead.z);
        if (d < 2.6 && !rb.warned && alive) { rb.warned = true; sfx.incoming(clamp(1 - d / 2.6, 0.25, 1)); haptic(hands.left, 0.25, 40); haptic(hands.right, 0.25, 40); }
        if (d > 3.5) rb.warned = false;
      } else rb.warned = false;
    }
    if (performance.now() - opp.lastSeen > 3000 && mode === 'match') boardMsg = 'Gegner reagiert nicht …';
  }
  // Warnung auch fuer Bot-Bumerang
  if (bot.boom.state === 'fly' && mode === 'practice') {
    const d = Math.hypot(bot.boom.pos.x - myHead.x, bot.boom.pos.z - myHead.z);
    if (d < 2.6 && !bot.boom.warned && alive) { bot.boom.warned = true; sfx.incoming(clamp(1 - d / 2.6, 0.25, 1)); haptic(hands.left, 0.25, 40); haptic(hands.right, 0.25, 40); }
    if (d > 3.5) bot.boom.warned = false;
  }

  // ---------- Kisten ----------
  for (const [id, c] of crates) {
    c.m.rotation.y += dt * 1.5; c.m.position.y = 1.0 + Math.sin(t * 2 + id) * 0.08;
    if (!alive || c.pending) continue;
    const touch = Math.hypot(myHead.x - c.x, myHead.z - c.z) < 0.55 ||
      handPos(hands.left, tmp1).distanceTo(c.m.position) < 0.4 || handPos(hands.right, tmp1).distanceTo(c.m.position) < 0.4;
    if (touch) { c.pending = true; netSend({ t: 'pickup', id }); setTimeout(() => { c.pending = false; }, 1000); }
  }

  for (const b of [...myBooms]) updateBoom(b, dt, myHead);

  // ---------- Effekte ----------
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

  // ---------- Senden (30 Hz) ----------
  sendAcc += dt;
  if (sendAcc > 1 / 30 && mySlot >= 0 && mode !== 'practice') {
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
    // In der Hand: senkrecht im Griff, Knick nach vorne. Gepackt = leuchtet.
    handPos(h, b.pos); h.obj.getWorldQuaternion(tmpQ);
    b.mesh.quaternion.copy(tmpQ);
    b.mesh.position.copy(b.pos).add(tmp1.set(0, 0.0, -0.09).applyQuaternion(tmpQ));
    b.mesh.userData.mat.emissiveIntensity = h.grabbed ? 0.9 : (myPower ? 0.7 : 0.25);
    if (alive && canMove) {
      const spd = curVel(h, tmp2).length();
      // Nahkampf: schneller Schlag mit dem Bumerang in der Hand
      if (spd > 2.3 && slashCd <= 0) {
        if (hitsOpp(b.mesh.position, 0.08, 0.3)) { slashCd = 0.6; sendHit(oppSlot(), 'slash', b.mesh.position); haptic(h, 1, 80); }
        else if (hitsBot(b.mesh.position, 0.08)) { slashCd = 0.6; hitBot(); haptic(h, 1, 80); }
      }
      // Parade gegen menschlichen Gegner
      for (const [id, rb] of opp.booms) {
        if (rb.fly && rb.parryCd <= 0 && rb.pos.distanceTo(b.mesh.position) < 0.4) {
          rb.parryCd = 0.6; netSend({ t: 'fx', kind: 'parry', id });
          burst(rb.pos, 0xffffff, 15, 3); sfx.parry(); haptic(h, 1, 60);
        }
      }
    }
    return;
  }
  // ---- Flug (in Teilschritten, damit nichts durchtunnelt) ----
  if (!alive) { b.mesh.visible = false; return; }
  const steps = Math.max(1, Math.ceil(b.vel.length() * dt / 0.08)), sdt = dt / steps;
  for (let s = 0; s < steps; s++) {
    if (b.phase === 'out') {
      b.traveled += b.vel.length() * sdt;
      b.vel.applyAxisAngle(UP, b.curve * sdt);           // Bogenflug
      if (b.traveled >= b.range) { b.phase = 'back'; b.tBack = 0; }
    } else {
      b.tBack += sdt;
      const target = handPos(h, tmp3);
      const to = V().subVectors(target, b.pos), dist = to.length();
      if (dist < CATCH_RADIUS + (b.extra ? 0.3 : 0)) { catchBoom(b, h); return; }
      const want = to.normalize().multiplyScalar(BOOM_RETURN_SPEED + b.tBack * 6);
      b.vel.lerp(want, Math.min(1, (5 + b.tBack * 4) * sdt));
    }
    const np = tmp2.copy(b.pos).addScaledVector(b.vel, sdt);
    // Hoehe: Hinflug auf Brusthoehe, Rueckflug in den letzten 2,5 m zur Handhoehe
    if (b.phase === 'out') { np.y += (b.vy || 0) * sdt; b.vy = (b.vy || 0) * Math.exp(-2 * sdt); }
    else { const hp = handPos(h, tmp3); if (Math.hypot(hp.x - np.x, hp.z - np.z) < 2.5) np.y += (clamp(hp.y, 0.4, FLY_MAX) - np.y) * Math.min(1, 8 * sdt); }
    np.y = clamp(np.y, FLY_MIN, FLY_MAX); b.vel.y = 0;
    const cr = b.tBack < 2.0 ? collideBoom(np, b.vel) : 0;
    if (cr) {
      if (myPower === 'explosive') { b.pos.copy(np); b.mesh.position.copy(np); explode(b); return; }
      if (cr === 2) { sfx.boing(); flashBumper(); if (b.phase === 'out') b.range += 3; } else sfx.bounce();
    }
    b.pos.copy(np);
    boomPortal(b, sdt);
    if (!b.hit) {
      if (hitsOpp(b.pos)) { b.hit = true; if (myPower === 'explosive') { explode(b); return; } sendHit(oppSlot(), 'boomerang', b.pos); }
      else if (hitsBot(b.pos)) { if (myPower === 'explosive') { explode(b); return; } hitBot(); }
    }
  }
  cutGrassAt(b.pos);
  b.mesh.position.copy(b.pos);
  b.spin = (b.spin || 0) + 26 * dt; b.tilt = (b.tilt || 0) * Math.exp(-0.6 * dt);
  tmp1.set(b.vel.x, 0, b.vel.z).normalize();
  b.mesh.quaternion.setFromAxisAngle(tmp1, -b.tilt).multiply(tmpQ.setFromAxisAngle(UP, b.spin));
  placeShadow(b.shadow, b.pos, true);
  b.trailT -= dt; if (b.trailT <= 0) { b.trailT = 0.02; addTrail(b.pos, b.mesh.userData.mat.color.getHex()); }
}

function flashBumper() { const bp = bumpers[lastBumper]; if (bp) bp.flash = 0.25; }
function snapTurn(a) {
  camera.getWorldPosition(tmp1);
  rig.rotation.y += a; rig.updateMatrixWorld(true);
  camera.getWorldPosition(tmp2);
  rig.position.x += tmp1.x - tmp2.x; rig.position.z += tmp1.z - tmp2.z;
}
function cycleMap() {
  const next = (curMap + 1) % MAPS.length;
  applyMap(next); roundT0 = performance.now() / 1000;
  clearCrates(); if (referee) referee.startCrates(800);
  resetMyBooms(); placeAtSpawn(); bot.alive = false; bot.respawn = 1.2; bot.boom.state = 'held';
  showHud(MAP.name, 'Stick drücken = nächste Arena', '#ffe14a', 2); sfx.beep(990);
}
function cycleDifficulty() {
  difficulty = LV_ORDER[(LV_ORDER.indexOf(difficulty) + 1) % 3];
  try { localStorage.setItem('bd_diff', difficulty); } catch (e) {}
  pScore = 0; bScore = 0; drawBoard(); updateDiffButtons();
  showHud('BOT: ' + BOT_LV[difficulty].label, 'Punkte zurückgesetzt', '#ff8fa3', 1.5); sfx.beep(880);
}

// =====================================================================
// Bildschirm-Steuerung
// =====================================================================
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (inXR || !started) return;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'Space') {
    const d = V(); camera.getWorldDirection(tmp2); tmp2.y = 0; tmp2.normalize();
    const mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), my = (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0);
    d.copy(tmp2).multiplyScalar(-my).add(tmp3.set(-tmp2.z, 0, tmp2.x).multiplyScalar(mx)); doDash(d);
  }
  if (e.code === 'KeyB' && mode === 'practice') cycleDifficulty();
  if (e.code === 'KeyM' && mode === 'practice' && isHost) cycleMap();
  if (e.code === 'KeyE' && alive && canMove && slashCd <= 0) {
    camera.getWorldPosition(tmp1); camera.getWorldDirection(tmp2);
    const p = tmp1.addScaledVector(tmp2.setY(0).normalize(), 0.8).setY(1.1);
    slashCd = 0.6;
    if (hitsOpp(p, 0.35, 0.6)) sendHit(oppSlot(), 'slash', p); else if (hitsBot(p, 0.35)) hitBot();
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
// Start / Lobby
// =====================================================================
let started = false;
const lobby = document.getElementById('lobby');
const vrBtn = document.getElementById('vrBtn'), deskBtn = document.getElementById('deskBtn');
function updateDiffButtons() { document.querySelectorAll('[data-diff]').forEach(b => b.classList.toggle('on', b.dataset.diff === difficulty)); }
document.querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => {
  difficulty = b.dataset.diff; try { localStorage.setItem('bd_diff', difficulty); } catch (e) {} updateDiffButtons(); wristKey = '';
}));
updateDiffButtons();
function updateMapButtons() { document.querySelectorAll('[data-map]').forEach(b => b.classList.toggle('on', b.dataset.map === mapPref)); }
document.querySelectorAll('[data-map]').forEach(b => b.addEventListener('click', () => {
  mapPref = b.dataset.map; try { localStorage.setItem('bd_map', mapPref); } catch (e) {} updateMapButtons();
  applyMap(mapPref === 'rot' ? 0 : +mapPref);
}));
updateMapButtons();
{ const ve = document.getElementById('ver'); if (ve) ve.textContent = 'Version ' + VERSION; }
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
    setTimeout(placeAtSpawn, 300);
  } catch (e) { setStatus('VR-Start fehlgeschlagen: ' + e.message); }
};
deskBtn.onclick = () => {
  lobby.style.display = 'none'; document.getElementById('deskHud').style.display = 'block';
  startGame(); renderer.domElement.requestPointerLock();
  deskHands.right.add(handMeshes.right);
};

applyMap(mapPref === 'rot' ? 0 : +mapPref);
resetMyBooms(); drawBoard(); drawWrist();
rig.position.set(SPAWNS[0].x, 0, SPAWNS[0].z); rig.rotation.y = SPAWNS[0].yaw;
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt, now / 1000);
  renderer.render(scene, camera);
});
// Test-Hooks
window.__bd = {
  handle, throw: () => throwBoom(hands.right, V(), true),
  throwVel: (x, y, z) => throwBoom(hands.right, V().set(x, y, z), false),
  bot, get state() { return { mySlot, mode, alive, canMove, scoresArr, isHost, myPower, oppHas: opp.has, oppAlive: opp.alive, booms: myBooms.map(b => b.state), crates: crates.size, pScore, bScore, difficulty, botAlive: bot.alive }; },
};
