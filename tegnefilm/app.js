import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const $ = id => document.getElementById(id);
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const BUILTIN = [
  { kind: 'builtin', id: 'b:Kate', name: 'Kate', url: 'figurer/Kate.vrm' },
  { kind: 'builtin', id: 'b:Erika', name: 'Erika', url: 'figurer/Erika.vrm' },
  { kind: 'builtin', id: 'b:Jimmy', name: 'Jimmy', url: 'figurer/Jimmy.vrm' },
  { kind: 'builtin', id: 'b:OldMoustache', name: 'Bartemann', url: 'figurer/OldMoustache.vrm' },
  { kind: 'builtin', id: 'b:Teddy', name: 'Bamse', url: 'figurer/Teddy.vrm' },
  { kind: 'builtin', id: 'b:Froggy', name: 'Frosk', url: 'figurer/Froggy.vrm' },
  { kind: 'builtin', id: 'b:ChillPenguin', name: 'Pingvin', url: 'figurer/ChillPenguin.vrm' },
  { kind: 'builtin', id: 'b:LordPiggington', name: 'Herr Gris', url: 'figurer/LordPiggington.vrm' },
  { kind: 'builtin', id: 'b:CoolPirate', name: 'Pirat', url: 'figurer/CoolPirate.vrm' },
  { kind: 'builtin', id: 'b:Wizzir', name: 'Trollmann', url: 'figurer/Wizzir.vrm' },
  { kind: 'builtin', id: 'b:Witch', name: 'Heks', url: 'figurer/Witch.vrm' },
  { kind: 'builtin', id: 'b:SaintClaus', name: 'Julenisse', url: 'figurer/SaintClaus.vrm' },
  { kind: 'builtin', id: 'b:Astronaut', name: 'Astronaut', url: 'figurer/Astronaut.vrm' },
  { kind: 'builtin', id: 'b:Polybot', name: 'Robot', url: 'figurer/Polybot.vrm' },
  { kind: 'builtin', id: 'b:Sample', name: 'Animejente (full ansiktsmimikk)', url: 'figurer/VRM1_Constraint_Twist_Sample.vrm' }
];
const settings = Object.assign({ avatar: BUILTIN[0], recent: [], env: 'eng', monitor: true }, LS.get('tf_settings', {}));
const saveSettings = () => LS.set('tf_settings', settings);
function setStatus(t) { $('status').textContent = t || ''; }

// ---------- IndexedDB ----------
function idb() { return new Promise((res, rej) => { const r = indexedDB.open('tegnefilm', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function dbSet(k, v) { const d = await idb(); return new Promise((res, rej) => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
async function dbGet(k) { const d = await idb(); return new Promise((res, rej) => { const r = d.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }

// ---------- renderer og sett ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(1);
renderer.setSize(1280, 720, false);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
$('screen').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.02, 200);
scene.add(camera);
const FP_LAYER = 9, TP_LAYER = 10;
camera.layers.enable(FP_LAYER);

// Settet: skuespilleren står i origo og ser mot +z. Hovedkameraet står på +z-siden.
const set = new THREE.Group(); scene.add(set);
set.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.9));
const sun = new THREE.DirectionalLight(0xfff4e0, 1.6); sun.position.set(2, 5, 4); set.add(sun); set.add(sun.target);
const env = new THREE.Group(); set.add(env);
const filmCam = new THREE.PerspectiveCamera(32, 16 / 9, 0.05, 200); set.add(filmCam);
filmCam.layers.enable(TP_LAYER);

const toon = c => new THREE.MeshToonMaterial({ color: c });
function skyTexture(top, bottom) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(0.55, bottom); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function buildEnv() {
  env.traverse(o => { if (o.isMesh) { o.geometry.dispose(); if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
  env.clear();
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); env.add(m); return m; };
  const dome = (top, bottom) => add(new THREE.SphereGeometry(90, 24, 16), new THREE.MeshBasicMaterial({ map: skyTexture(top, bottom), side: THREE.BackSide }), 0, 0, 0);
  const ground = c => { const g = add(new THREE.CircleGeometry(90, 48), toon(c), 0, 0, 0); g.rotation.x = -Math.PI / 2; };
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const e = settings.env;
  if (e === 'gronn') { dome('#00d000', '#00d000'); const g = add(new THREE.CircleGeometry(90, 32), new THREE.MeshBasicMaterial({ color: 0x00d000 }), 0, 0, 0); g.rotation.x = -Math.PI / 2; return; }
  if (e === 'rom') {
    dome('#f4ead8', '#f4ead8');
    const fl = add(new THREE.PlaneGeometry(9, 9), toon(0xc9955c), 0, 0, 0); fl.rotation.x = -Math.PI / 2;
    add(new THREE.BoxGeometry(9, 3.2, 0.1), toon(0xf2d9b8), 0, 1.6, -3);
    add(new THREE.BoxGeometry(0.1, 3.2, 9), toon(0xe9cfae), -4.5, 1.6, 0);
    add(new THREE.BoxGeometry(0.1, 3.2, 9), toon(0xe9cfae), 4.5, 1.6, 0);
    add(new THREE.BoxGeometry(9, 0.14, 0.14), toon(0xffffff), 0, 0.07, -2.93);
    add(new THREE.BoxGeometry(1.7, 1.3, 0.06), toon(0xffffff), -1.6, 1.75, -2.93);
    add(new THREE.BoxGeometry(1.5, 1.1, 0.08), new THREE.MeshBasicMaterial({ color: 0x9fd8ff }), -1.6, 1.75, -2.92);
    add(new THREE.BoxGeometry(0.05, 1.1, 0.1), toon(0xffffff), -1.6, 1.75, -2.9);
    add(new THREE.BoxGeometry(1.5, 0.05, 0.1), toon(0xffffff), -1.6, 1.75, -2.9);
    const rug = add(new THREE.CircleGeometry(1.5, 40), toon(0xc8553d), 0, 0.01, 0); rug.rotation.x = -Math.PI / 2;
    add(new THREE.BoxGeometry(1.9, 0.45, 0.85), toon(0x4f7fb8), 2.0, 0.3, -2.3); add(new THREE.BoxGeometry(1.9, 0.6, 0.25), toon(0x4a76ab), 2.0, 0.75, -2.65);
    add(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8), toon(0x333333), 3.6, 0.75, -2.4); add(new THREE.ConeGeometry(0.28, 0.35, 20, 1, true), new THREE.MeshToonMaterial({ color: 0xffe9a8, side: THREE.DoubleSide }), 3.6, 1.6, -2.4);
    add(new THREE.BoxGeometry(0.8, 0.6, 0.04), toon(0x7a5a3c), 1.3, 1.9, -2.93); add(new THREE.BoxGeometry(0.68, 0.48, 0.05), toon(0xf3c969), 1.3, 1.9, -2.92);
    return;
  }
  const night = e === 'natt';
  dome(night ? '#070b24' : '#5fb4ee', night ? '#2a3570' : '#d9f1ff');
  ground(night ? 0x1f4a3a : 0x7ccf5c);
  add(new THREE.SphereGeometry(4, 24, 16), new THREE.MeshBasicMaterial({ color: night ? 0xf4f1d0 : 0xffe066 }), 30, 42, -70);
  for (let i = 0; i < 7; i++) add(new THREE.SphereGeometry(1, 24, 12), toon(night ? 0x1a3f33 : 0x66bd4e), -45 + i * 15 + rnd() * 6, -3, -32 - rnd() * 14, 11 + rnd() * 6, 6 + rnd() * 3, 9);
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, r = 6 + rnd() * 16, x = Math.cos(a) * r, z = -Math.abs(Math.sin(a) * r) - 3, h = 1.6 + rnd() * 1.6;
    add(new THREE.CylinderGeometry(0.12, 0.17, h, 8), toon(0x8a5a36), x, h / 2, z);
    add(new THREE.SphereGeometry(1, 12, 10), toon(night ? 0x1d5a40 : [0x3fa34d, 0x55b85a, 0x2f8f4a][i % 3]), x, h + 0.7, z, 1.0 + rnd() * 0.5, 1.1 + rnd() * 0.5, 1.0 + rnd() * 0.5);
  }
  if (night) { const g = new THREE.BufferGeometry(), p = []; for (let i = 0; i < 400; i++) { const a = rnd() * Math.PI * 2, b = 0.15 + rnd() * 1.3, R = 85; p.push(Math.cos(a) * Math.cos(b) * R, Math.sin(b) * R, Math.sin(a) * Math.cos(b) * R); } g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); env.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 }))); }
  else for (let i = 0; i < 6; i++) { const x = -40 + i * 16 + rnd() * 8, y = 20 + rnd() * 10, z = -50 - rnd() * 20; for (let k = 0; k < 4; k++) add(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }), x + k * 2.2 - 3, y + (k % 2) * 0.8, z, 2.6, 1.6, 2); }
  for (let i = 0; i < 60; i++) { const x = (rnd() - 0.5) * 16, z = -1 - rnd() * 9; add(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: night ? 0x9fb4ff : [0xffffff, 0xffd84a, 0xff7fa8][i % 3] }), x, 0.05, z); }
}

// speil-skjerm og infotavle (vises bare for skuespilleren)
const rt = new THREE.WebGLRenderTarget(960, 540);
const monitor = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.35), new THREE.MeshBasicMaterial({ map: rt.texture, side: THREE.DoubleSide }));
monitor.position.set(0, 1.5, 3.6); monitor.rotation.y = Math.PI; monitor.scale.x = -1; set.add(monitor);
const boardCanvas = document.createElement('canvas'); boardCanvas.width = 1024; boardCanvas.height = 420;
const boardTex = new THREE.CanvasTexture(boardCanvas); boardTex.colorSpace = THREE.SRGBColorSpace;
const board = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.7), new THREE.MeshBasicMaterial({ map: boardTex, transparent: true }));
board.position.set(0, 0.42, 3.55); board.rotation.y = Math.PI; set.add(board);
let boardKey = '';
function setBoard(title, color, rows) {
  const key = title + color + rows.join('|'); if (key === boardKey) return; boardKey = key;
  const c = boardCanvas.getContext('2d'); c.clearRect(0, 0, 1024, 420);
  c.fillStyle = 'rgba(18,20,28,0.9)'; c.beginPath(); c.roundRect(4, 4, 1016, 412, 30); c.fill();
  c.fillStyle = color; c.font = 'bold 56px system-ui, sans-serif'; c.fillText(title, 40, 80);
  c.fillStyle = '#fff'; c.font = '34px system-ui, sans-serif';
  rows.forEach((l, i) => c.fillText(l, 40, 146 + i * 52));
  boardTex.needsUpdate = true;
}

// ---------- matte ----------
const V = () => new THREE.Vector3(), Qn = () => new THREE.Quaternion();
const YAX = new THREE.Vector3(0, 1, 0), ZAX = new THREE.Vector3(0, 0, 1), IQ = new THREE.Quaternion();
const RY180 = new THREE.Quaternion().setFromAxisAngle(YAX, Math.PI);
const M4 = new THREE.Matrix4();
const basisQ = (out, x, y) => { const z = V().crossVectors(x, y); return out.setFromRotationMatrix(M4.makeBasis(x, y, z)); };
const HAND_M = { 1: basisQ(Qn(), new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0)), [-1]: basisQ(Qn(), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)) };
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
// to-ledds IK: gir albue/kne E og (avkortet) mål T
function ik2(S, T, L1, L2, pole, E) {
  const dir = V().subVectors(T, S); let d = dir.length(); if (d < 1e-5) { dir.set(0, -1, 0); d = 1e-5; } dir.divideScalar(d);
  const dd = THREE.MathUtils.clamp(d, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
  T.copy(S).addScaledVector(dir, dd);
  const cosA = THREE.MathUtils.clamp((L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  const perp = V().copy(pole).addScaledVector(dir, -pole.dot(dir)); if (perp.lengthSq() < 1e-8) perp.set(0, 0, 1).addScaledVector(dir, -dir.z); perp.normalize();
  return E.copy(S).addScaledVector(dir, L1 * cosA).addScaledVector(perp, L1 * sinA);
}

// ---------- figurer ----------
const bufCache = new Map();
async function loadBuffer(src) {
  if (bufCache.has(src.id)) return bufCache.get(src.id);
  let buf = null;
  if (src.kind !== 'builtin') { try { buf = await dbGet('buf:' + src.id); } catch (e) {} }
  if (!buf) {
    if (!src.url) throw new Error('Finner ikke filen til figuren «' + src.name + '».');
    const r = await fetch(src.url); if (!r.ok) throw new Error('Kunne ikke hente figuren (' + r.status + ').');
    buf = await r.arrayBuffer();
    if (src.kind !== 'builtin') { try { await dbSet('buf:' + src.id, buf); } catch (e) {} }
  }
  bufCache.set(src.id, buf); return buf;
}
function parseVRM(buf) {
  return new Promise((res, rej) => {
    const loader = new GLTFLoader(); loader.register(p => new VRMLoaderPlugin(p));
    loader.parse(buf, '', g => { const vrm = g.userData.vrm; if (!vrm) return rej(new Error('Filen er ikke en VRM-figur.')); res(vrm); }, e => rej(e));
  });
}
const EXPR = [['happy', 'Glad'], ['angry', 'Sint'], ['sad', 'Trist'], ['surprised', 'Overrasket'], ['relaxed', 'Rolig']];
const FINGERS = ['Index', 'Middle', 'Ring', 'Little'], SEGS = ['Proximal', 'Intermediate', 'Distal'];
const mkPose = () => ({ hp: V(), hq: Qn(), hands: [{ on: 0, p: V(), q: Qn(), curl: 0 }, { on: 0, p: V(), q: Qn(), curl: 0 }], m: 0, e: 0, ei: 0, b: 0, ex: 0, ey: 0 });

class Actor {
  constructor(vrm, src) {
    this.vrm = vrm; this.src = src; this.v0 = vrm.meta && vrm.meta.metaVersion === '0';
    VRMUtils.rotateVRM0(vrm);
    vrm.scene.traverse(o => { o.frustumCulled = false; });
    this.root = new THREE.Group(); this.root.add(vrm.scene); set.add(this.root);
    set.updateMatrixWorld(true);
    const H = vrm.humanoid; this.bn = n => H.getNormalizedBoneNode(n);
    const P = n => { const b = this.bn(n); return b ? this.root.worldToLocal(b.getWorldPosition(V())) : null; };
    const hips = this.bn('hips'); this.hipsRest = hips.position.clone();
    const head = P('head'); this.headY = head.y; this.sz = head.y / 1.45;
    const top = this.root.worldToLocal(V().set(0, new THREE.Box3().setFromObject(vrm.scene).max.y, 0)).y;
    this.hr = THREE.MathUtils.clamp((top - head.y) / 2, 0.07 * this.sz, 0.5 * this.sz);
    let eyeUp = this.hr, eyeFwd = this.hr * 0.9;
    const off = vrm.lookAt && vrm.lookAt.offsetFromHeadBone;
    if (off && off.y > 0.01) { eyeUp = off.y; eyeFwd = Math.abs(off.z) || eyeFwd; }
    this.eyeOff = new THREE.Vector3(0, eyeUp, eyeFwd); this.eyeH = head.y + eyeUp;
    const len = (a, b) => P(a).distanceTo(P(b));
    this.arm = { 1: [len('leftUpperArm', 'leftLowerArm'), len('leftLowerArm', 'leftHand')], [-1]: [len('rightUpperArm', 'rightLowerArm'), len('rightLowerArm', 'rightHand')] };
    this.leg = [len('leftUpperLeg', 'leftLowerLeg'), len('leftLowerLeg', 'leftFoot')];
    this.ankleH = P('leftFoot').y; this.hipW = Math.abs(P('leftUpperLeg').x);
    this.hasChest = !!this.bn('chest');
    // første-/tredjepersonslag: skuespilleren ser ikke sitt eget hode innenfra
    this.tp = []; this.fp = [];
    try { if (vrm.firstPerson) vrm.firstPerson.setup({ firstPersonOnlyLayer: FP_LAYER, thirdPersonOnlyLayer: TP_LAYER }); } catch (e) {}
    vrm.scene.traverse(o => { if (o.layers.mask === (1 << TP_LAYER)) this.tp.push(o); else if (o.layers.mask === (1 << FP_LAYER)) this.fp.push(o); });
    this.lookT = new THREE.Object3D(); set.add(this.lookT); if (vrm.lookAt) vrm.lookAt.target = this.lookT;
    this.feet = [{ sx: 1, pos: V(), yaw: 0, step: null }, { sx: -1, pos: V(), yaw: 0, step: null }];
    this.bodyYaw = 0; this.init = false; this.headC = V(); this.prevHips = V(); this.vel = V();
    this.live = false; this.setLive(false);
  }
  setLive(on) { this.live = on; for (const o of this.tp) o.layers.set(on ? TP_LAYER : 0); for (const o of this.fp) o.visible = on; }
  dispose() { this.root.removeFromParent(); this.lookT.removeFromParent(); try { VRMUtils.deepDispose(this.vrm.scene); } catch (e) {} }
  setQ(name, q) { const b = this.bn(name); if (!b) return; b.quaternion.copy(q); if (this.v0) { b.quaternion.x *= -1; b.quaternion.z *= -1; } }
  rootPos(name, out) { return this.root.worldToLocal(this.bn(name).getWorldPosition(out)); }
  update(pose, dt) {
    const sz = this.sz, vrm = this.vrm;
    // kroppens retning følger hodet med litt treghet
    const f = V().copy(ZAX).applyQuaternion(pose.hq), headYaw = Math.atan2(f.x, f.z);
    if (!this.init) this.bodyYaw = headYaw;
    let diff = wrap(headYaw - this.bodyYaw); this.bodyYaw += diff * (1 - Math.exp(-dt * 3.5));
    diff = wrap(headYaw - this.bodyYaw); if (Math.abs(diff) > 1.0) this.bodyYaw = headYaw - Math.sign(diff) * 1.0;
    const qYaw = Qn().setFromAxisAngle(YAX, this.bodyYaw), qYawInv = qYaw.clone().invert();
    const qRel = qYawInv.clone().multiply(pose.hq);
    const qSp = Qn().slerpQuaternions(IQ, qRel, 0.14), qCh = this.hasChest ? qSp.clone() : Qn(), qNk = Qn().slerpQuaternions(IQ, qRel, 0.25);
    const qTorso = qSp.clone().multiply(qCh);
    const qHead = qTorso.clone().multiply(qNk).invert().multiply(qRel);
    this.setQ('spine', qSp); if (this.hasChest) this.setQ('chest', qCh); this.setQ('neck', qNk); this.setQ('head', qHead);
    // plasser hoften slik at hodet havner der det spores
    const hips = this.bn('hips'); hips.position.copy(this.hipsRest);
    this.root.position.set(pose.hp.x, 0, pose.hp.z); this.root.quaternion.copy(qYaw); this.root.updateMatrixWorld(true);
    const hA = this.rootPos('head', V());
    const hT = V().copy(this.eyeOff).applyQuaternion(pose.hq).negate().add(pose.hp).sub(this.root.position).applyQuaternion(qYawInv);
    const d = hT.sub(hA); d.y = Math.min(d.y, 0.03 * sz);
    hips.position.x += this.v0 ? -d.x : d.x; hips.position.y += d.y; hips.position.z += this.v0 ? -d.z : d.z;
    this.root.updateMatrixWorld(true);
    const toRoot = v => v.sub(this.root.position).applyQuaternion(qYawInv);
    // armer
    for (let i = 0; i < 2; i++) {
      const sx = i === 0 ? 1 : -1, side = i === 0 ? 'left' : 'right', h = pose.hands[i];
      if (h.on) {
        const S = this.rootPos(side + 'UpperArm', V());
        const T = toRoot(V().set(0, 0, 0.075 * sz).applyQuaternion(h.q).add(h.p));
        const [L1, L2] = this.arm[sx], E = ik2(S, T, L1, L2, V().set(sx * 0.45, -1, -0.55), V());
        const d1 = V().subVectors(E, S).normalize(), d2 = V().subVectors(T, E).normalize();
        const n = V().crossVectors(d1, d2); if (n.lengthSq() < 1e-6) n.set(0, -sx, 0);
        n.multiplyScalar(-sx);
        const x1 = d1.clone().multiplyScalar(sx), n1 = n.clone().addScaledVector(x1, -n.dot(x1)).normalize();
        const x2 = d2.clone().multiplyScalar(sx), n2 = n.clone().addScaledVector(x2, -n.dot(x2)).normalize();
        const Qu = basisQ(Qn(), x1, n1), Ql = basisQ(Qn(), x2, n2), Qh = qYawInv.clone().multiply(h.q).multiply(HAND_M[sx]);
        this.setQ(side + 'UpperArm', qTorso.clone().invert().multiply(Qu));
        this.setQ(side + 'LowerArm', Qu.clone().invert().multiply(Ql));
        this.setQ(side + 'Hand', Ql.clone().invert().multiply(Qh));
      } else {
        this.setQ(side + 'UpperArm', Qn().setFromAxisAngle(ZAX, -sx * 1.22));
        this.setQ(side + 'LowerArm', Qn().setFromAxisAngle(YAX, -sx * 0.25));
        this.setQ(side + 'Hand', IQ);
      }
      const curl = Qn().setFromAxisAngle(ZAX, -sx * (0.18 + h.curl * 1.15));
      for (const fn of FINGERS) for (const sg of SEGS) this.setQ(side + fn + sg, curl);
    }
    // føtter: plantet i gulvet, tar et skritt når kroppen flytter seg
    const hipsSet = hips.getWorldPosition(V()); set.worldToLocal(hipsSet);
    if (!this.init) this.prevHips.copy(hipsSet);
    this.vel.lerp(V().subVectors(hipsSet, this.prevHips).divideScalar(Math.max(dt, 1e-3)), 0.2); this.prevHips.copy(hipsSet);
    for (const ft of this.feet) {
      const other = this.feet[ft.sx === 1 ? 1 : 0];
      const home = V().set(ft.sx * this.hipW * 1.15, 0, 0).applyQuaternion(qYaw).add(hipsSet); home.y = 0;
      if (!this.init) { ft.pos.copy(home); ft.yaw = this.bodyYaw; ft.step = null; }
      const dist = Math.hypot(home.x - ft.pos.x, home.z - ft.pos.z), dyaw = Math.abs(wrap(this.bodyYaw - ft.yaw));
      if (dist > 0.7 * sz) { ft.pos.copy(home); ft.yaw = this.bodyYaw; ft.step = null; }
      else if (!ft.step && (!other.step || dist > 0.4 * sz) && (dist > 0.13 * sz || dyaw > 0.6)) {
        const lead = V().copy(this.vel); lead.y = 0; lead.multiplyScalar(0.12); if (lead.length() > 0.2 * sz) lead.setLength(0.2 * sz);
        ft.step = { t: 0, from: ft.pos.clone(), to: home.clone().add(lead), y0: ft.yaw, y1: this.bodyYaw };
      }
      let lift = 0;
      if (ft.step) {
        const s = ft.step; s.t = Math.min(1, s.t + dt / 0.2); const k = s.t * s.t * (3 - 2 * s.t);
        ft.pos.lerpVectors(s.from, s.to, k); ft.yaw = s.y0 + wrap(s.y1 - s.y0) * k; lift = Math.sin(Math.PI * s.t) * 0.07 * sz;
        if (s.t >= 1) ft.step = null;
      }
      const side = ft.sx === 1 ? 'left' : 'right';
      const S = this.rootPos(side + 'UpperLeg', V()), T = toRoot(V().copy(ft.pos)); T.y = this.ankleH + lift;
      const pole = V().set(0, 0.15, 1).applyAxisAngle(YAX, wrap(ft.yaw - this.bodyYaw));
      const E = ik2(S, T, this.leg[0], this.leg[1], pole, V());
      const d1 = V().subVectors(E, S).normalize(), d2 = V().subVectors(T, E).normalize();
      const n = V().crossVectors(d1, d2); if (n.lengthSq() < 1e-6) n.crossVectors(pole, d1);
      const y1 = d1.clone().negate(), y2 = d2.clone().negate();
      const n1 = n.clone().addScaledVector(y1, -n.dot(y1)).normalize(), n2 = n.clone().addScaledVector(y2, -n.dot(y2)).normalize();
      const Qt = basisQ(Qn(), n1, y1), Qs = basisQ(Qn(), n2, y2), Qf = Qn().setFromAxisAngle(YAX, wrap(ft.yaw - this.bodyYaw));
      this.setQ(side + 'UpperLeg', Qt); this.setQ(side + 'LowerLeg', Qt.clone().invert().multiply(Qs)); this.setQ(side + 'Foot', Qs.clone().invert().multiply(Qf));
    }
    // ansikt
    const em = vrm.expressionManager;
    if (em) {
      const sv = (n, v) => { if (em.getExpression(n)) em.setValue(n, v); };
      sv('aa', pose.m); sv('blink', pose.b);
      for (let k = 0; k < EXPR.length; k++) sv(EXPR[k][0], k === pose.ei ? pose.e : 0);
    }
    this.headC.set(0, this.hr - this.eyeOff.y, -this.eyeOff.z).applyQuaternion(pose.hq).add(pose.hp);
    this.lookT.position.set(-pose.ex * 1.3, pose.ey * 0.9, 2.2).applyQuaternion(pose.hq).add(pose.hp);
    this.lookT.updateMatrixWorld(true);
    vrm.update(dt);
    this.init = true;
  }
}

// ---------- opptak: flere roller oppå hverandre ----------
const FPS = 30, PF = 31, TAKE_V = 3, MAXN = FPS * 300, MAXTRACKS = 5;
function pack(a, p) {
  a.push(p.hp.x, p.hp.y, p.hp.z, p.hq.x, p.hq.y, p.hq.z, p.hq.w);
  for (const h of p.hands) a.push(h.on, h.p.x, h.p.y, h.p.z, h.q.x, h.q.y, h.q.z, h.q.w, h.curl);
  a.push(p.m, p.e, p.ei, p.b, p.ex, p.ey);
}
function unpack(d, o, p) {
  p.hp.set(d[o], d[o + 1], d[o + 2]); p.hq.set(d[o + 3], d[o + 4], d[o + 5], d[o + 6]); o += 7;
  for (const h of p.hands) { h.on = d[o]; h.p.set(d[o + 1], d[o + 2], d[o + 3]); h.q.set(d[o + 4], d[o + 5], d[o + 6], d[o + 7]); h.curl = d[o + 8]; o += 9; }
  p.m = d[o]; p.e = d[o + 1]; p.ei = d[o + 2] | 0; p.b = d[o + 3]; p.ex = d[o + 4]; p.ey = d[o + 5];
}
let take = { v: TAKE_V, fps: FPS, tracks: [], cam: [] };
let live = null, liveLoading = null, rec = null, playing = null, micStream = null, camIdx = 0, camManual = false, exprIdx = 0;
const trackActors = [], trackAudio = [], trackPose = [];
const takeLen = () => Math.max(0, ...take.tracks.map(t => t.n));
async function saveTake() { try { await dbSet('film', take); } catch (e) { setStatus('Opptaket ligger i minnet, men kunne ikke lagres til neste gang.'); } }
async function syncTracks() {
  while (trackActors.length > take.tracks.length) { const a = trackActors.pop(); if (a) a.dispose(); const au = trackAudio.pop(); if (au && au.src) URL.revokeObjectURL(au.src); trackPose.pop(); }
  for (let i = 0; i < take.tracks.length; i++) {
    if (trackActors[i] && trackActors[i].src.id === take.tracks[i].avatar.id) continue;
    if (trackActors[i]) trackActors[i].dispose();
    trackActors[i] = null; trackPose[i] = mkPose();
    const t = take.tracks[i];
    trackAudio[i] = null; if (t.audio) { const a = new Audio(); a.src = URL.createObjectURL(t.audio); trackAudio[i] = a; }
    try { const a = new Actor(await parseVRM(await loadBuffer(t.avatar)), t.avatar); a.root.visible = false; if (take.tracks[i] === t) trackActors[i] = a; else a.dispose(); }
    catch (e) { setStatus('Rolle ' + (i + 1) + ': ' + e.message); }
  }
  renderTracks();
}
function renderTracks() {
  const box = $('tracks'); box.textContent = '';
  take.tracks.forEach((t, i) => {
    const row = document.createElement('div'); row.className = 'row trk';
    const s = document.createElement('span'); s.textContent = `Rolle ${i + 1}: ${t.avatar.name} · ${(t.n / FPS).toFixed(1)} sek${t.audio ? ' · lyd' : ''}`;
    const b = document.createElement('button'); b.className = 'sec'; b.textContent = 'Slett';
    b.onclick = async () => { stopPlay(); take.tracks.splice(i, 1); const a = trackActors.splice(i, 1)[0]; if (a) a.dispose(); trackAudio.splice(i, 1); trackPose.splice(i, 1); if (!take.tracks.length) take.cam = []; await saveTake(); renderTracks(); };
    row.append(s, b); box.append(row);
  });
  const has = take.tracks.length > 0, xr = renderer.xr.isPresenting;
  $('takeInfo').textContent = has ? `Filmen er ${(takeLen() / FPS).toFixed(1)} sek. Neste opptak legges oppå som en ny rolle mens de andre spilles av.` : 'Ingen opptak ennå.';
  $('play').disabled = $('video').disabled = !has || xr; $('play').textContent = playing ? 'Stopp' : 'Spill av';
}
function startClock() { return { t0: performance.now() }; }
function startRec() {
  if (rec || !live) return; stopPlay();
  if (take.tracks.length >= MAXTRACKS) { flash('Maks ' + MAXTRACKS + ' roller. Slett en på siden.'); return; }
  rec = { data: [], n: 0, mr: null, chunks: [], avatar: live.src };
  if (micStream) { try { rec.mr = new MediaRecorder(micStream); rec.mr.ondataavailable = e => { if (e.data.size) rec && rec.chunks.push(e.data); }; rec.mr.start(); } catch (e) { rec.mr = null; } }
  camManual = false; startPlay(null, true);
}
async function stopRec() {
  if (!rec) return; const r = rec; rec = null; stopPlay();
  let audio = null;
  if (r.mr) { await new Promise(res => { r.mr.ondataavailable = e => { if (e.data.size) r.chunks.push(e.data); }; r.mr.onstop = res; try { r.mr.stop(); } catch (e) { res(); } }); if (r.chunks.length) audio = new Blob(r.chunks, { type: r.mr.mimeType }); }
  if (r.n < FPS / 2) return;
  take.tracks.push({ avatar: r.avatar, n: r.n, data: new Float32Array(r.data), audio });
  await saveTake(); await syncTracks();
}
function startPlay(onEnd, forRec) {
  if (playing) return; if (!forRec && (!take.tracks.length || rec)) return;
  playing = { t0: performance.now(), onEnd, forRec };
  for (const a of trackActors) if (a) a.init = false;
  trackAudio.forEach(a => { if (a) { try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {} } });
  renderTracks();
}
function stopPlay() {
  if (!playing) return; const p = playing; playing = null;
  trackAudio.forEach(a => { if (a) { try { a.pause(); } catch (e) {} } });
  if (p.onEnd) p.onEnd(); renderTracks();
}

// ---------- kamera ----------
const CAMS = ['Halvtotal', 'Total', 'Nærbilde', 'Skrått fra siden'];
const focus = V().set(0, 1.2, 0), camPos = V().set(0, 1.3, 3.2), camLook = V().set(0, 1.1, 0); let camInit = false, lastCam = -1;
function updateCam(dt, actors) {
  const c = V(); let n = 0, sz = 1, hr = 0.12;
  for (const a of actors) { c.add(a.headC); n++; sz = a.sz; hr = a.hr; }
  if (!n) { c.set(0, 1.3, 0); n = 1; }
  c.divideScalar(n);
  const cut = !camInit || lastCam !== camIdx; lastCam = camIdx; camInit = true;
  focus.lerp(c, cut ? 1 : 1 - Math.exp(-dt * 5));
  const P = V(), L = V(); let fov = 32;
  if (camIdx === 0) { P.set(focus.x * 0.5, focus.y * 0.95, 3.0 * sz + focus.z * 0.5); L.set(focus.x, focus.y - 0.28 * sz, focus.z); }
  else if (camIdx === 1) { P.set(focus.x * 0.3, focus.y * 0.85, 4.3 * sz + focus.z * 0.3); L.set(focus.x * 0.7, focus.y * 0.55, focus.z * 0.7); fov = 34; }
  else if (camIdx === 2) { P.set(focus.x, focus.y, focus.z + hr * 9); L.set(focus.x, focus.y - hr * 0.25, focus.z); fov = 26; }
  else { P.set(2.0 * sz + focus.x * 0.3, focus.y, focus.z + 2.4 * sz); L.set(focus.x, focus.y - 0.25 * sz, focus.z); fov = 30; }
  if (cut) { camPos.copy(P); camLook.copy(L); } else { const k = 1 - Math.exp(-dt * 6); camPos.lerp(P, k); camLook.lerp(L, k); }
  filmCam.position.copy(camPos); filmCam.lookAt(set.localToWorld(V().copy(camLook)));
  if (filmCam.fov !== fov) { filmCam.fov = fov; filmCam.updateProjectionMatrix(); }
}

// ---------- inndata ----------
const ctrls = [0, 1].map(i => {
  const c = renderer.xr.getController(i); scene.add(c);
  const o = { c, src: null, prev: [] };
  c.addEventListener('connected', e => { o.src = e.data; o.prev = []; });
  c.addEventListener('disconnected', () => { o.src = null; });
  return o;
});
const byHand = h => ctrls.find(o => o.src && o.src.handedness === h && o.src.gamepad && !o.src.hand);
const btn = (o, i) => { const b = o.src.gamepad.buttons[i]; return b ? b.value || (b.pressed ? 1 : 0) : 0; };
function edge(o, i) { const now = btn(o, i) > 0.5, was = !!o.prev[i]; o.prev[i] = now; return now && !was; }
const livePose = mkPose(), setInv = new THREE.Matrix4(), setQInv = Qn(), tv = V(), tq = Qn();
let blinkT = 3, msg = '', msgUntil = 0, calibrated = false;
const flash = (t, ms = 2500) => { msg = t; msgUntil = performance.now() + ms; };
function capture(dt) {
  const p = livePose, L = byHand('left'), R = byHand('right');
  camera.getWorldPosition(p.hp).applyMatrix4(setInv);
  p.hq.copy(setQInv).multiply(camera.quaternion).multiply(RY180);
  [L, R].forEach((o, i) => {
    const h = p.hands[i]; h.on = 0;
    if (!o || !o.c.visible) return;
    h.p.copy(o.c.position).applyMatrix4(setInv); h.q.copy(setQInv).multiply(o.c.quaternion); h.on = 1;
    h.curl += (btn(o, 1) - h.curl) * Math.min(1, dt * 20);
  });
  const m = R ? btn(R, 0) : 0, e = L ? btn(L, 0) : 0;
  p.m += (m - p.m) * Math.min(1, dt * 25); p.e += (e - p.e) * Math.min(1, dt * 12); p.ei = exprIdx;
  const ax = R ? R.src.gamepad.axes : []; p.ex = ax[2] || 0; p.ey = -(ax[3] || 0);
  blinkT -= dt; if (blinkT < -0.12) blinkT = 2.5 + Math.random() * 3.5; p.b = blinkT < 0 ? 1 : 0;
}
function idlePose(p, t, a) {
  const eh = a.eyeH, sz = a.sz;
  p.hp.set(Math.sin(t * 0.6) * 0.04 * sz, eh - 0.01 * sz + Math.sin(t * 1.4) * 0.006, 0);
  p.hq.setFromEuler(new THREE.Euler(Math.sin(t * 0.9) * 0.08, Math.sin(t * 0.5) * 0.3, Math.sin(t * 0.7) * 0.05));
  const wave = Math.sin(t * 6) * 0.3;
  const l = p.hands[0]; l.on = 1; l.curl = 0;
  const qh = basisQ(Qn(), V().set(Math.sin(wave), Math.cos(wave), 0), V().set(0, 0, -1));
  l.q.copy(qh).multiply(HAND_M[1].clone().invert()); l.p.set(0.34 * sz + Math.sin(wave) * 0.1 * sz, eh * 0.98, 0.14 * sz);
  const r = p.hands[1]; r.on = (t % 12) < 6 ? 1 : 0; r.curl = 0.3;
  r.q.copy(basisQ(Qn(), V().set(0, 0, -1), V().set(0, 1, 0))).multiply(HAND_M[-1].clone().invert()); r.p.set(-0.2 * sz, eh * 0.68, 0.3 * sz);
  p.m = Math.max(0, Math.sin(t * 5)) * 0.8; p.e = (Math.sin(t * 0.8) + 1) / 2; p.ei = 0; p.b = t % 3.5 < 0.12 ? 1 : 0; p.ex = Math.sin(t * 0.9) * 0.6; p.ey = 0;
}
function calibrate() {
  if (!live) return false;
  camera.getWorldPosition(tv); if (tv.y < 0.4) return false;
  const f = V().set(0, 0, -1).applyQuaternion(camera.quaternion);
  set.scale.setScalar(tv.y / live.eyeH); set.rotation.set(0, Math.atan2(f.x, f.z), 0); set.position.set(tv.x, 0, tv.z);
  live.init = false; calibrated = true; return true;
}

// ---------- bytte figur ----------
async function setLive(src) {
  const job = liveLoading = (async () => {
    setStatus('Henter «' + src.name + '» …');
    const a = new Actor(await parseVRM(await loadBuffer(src)), src);
    if (liveLoading !== job) { a.dispose(); return; }
    if (live) live.dispose(); live = a; a.setLive(true);
    settings.avatar = src; if (src.kind !== 'builtin') settings.recent = [src, ...settings.recent.filter(r => r.id !== src.id)].slice(0, 8);
    saveSettings(); renderAvatarSelect(); setStatus('');
    if (renderer.xr.isPresenting) calibrated = false;
  })();
  try { await job; } catch (e) { setStatus(e.message || String(e)); }
}

// ---------- økt og hovedløkke ----------
async function start(ar) {
  try {
    const session = await navigator.xr.requestSession(ar ? 'immersive-ar' : 'immersive-vr', { optionalFeatures: ['local-floor'] });
    passthrough = ar;
    await renderer.xr.setSession(session);
    calibrated = false; stopPlay(); renderTracks();
    session.addEventListener('end', async () => { stopPlay(); await stopRec(); set.position.set(0, 0, 0); set.rotation.set(0, 0, 0); set.scale.setScalar(1); if (live) live.init = false; camInit = false; renderTracks(); setStatus('VR avsluttet.'); });
  } catch (e) { setStatus('Kunne ikke starte: ' + e.message); }
}
let passthrough = false, lastT = performance.now();
const clockStr = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const idleP = mkPose();
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  const xr = renderer.xr.isPresenting;
  if (xr) {
    if (!calibrated) calibrate();
    const L = byHand('left'), R = byHand('right');
    if (L) {
      if (edge(L, 4)) { if (calibrate()) flash('Kalibrert. Du står på merket.'); }
      if (edge(L, 5)) { if (rec) { /* opptak styres med B */ } else playing ? stopPlay() : startPlay(); }
      if (edge(L, 3)) { exprIdx = (exprIdx + 1) % EXPR.length; flash('Venstre avtrekker: ' + EXPR[exprIdx][1]); }
      const ax = L.src.gamepad.axes, sx = Math.abs(ax[2] || 0) > 0.2 ? ax[2] : 0, sy = Math.abs(ax[3] || 0) > 0.2 ? ax[3] : 0;
      if (sx || sy) {
        const f = V().set(0, 0, -1).applyQuaternion(camera.quaternion); f.y = 0; f.normalize(); const r = V().set(-f.z, 0, f.x);
        set.position.addScaledVector(f, sy * 1.3 * dt).addScaledVector(r, -sx * 1.3 * dt);
      }
    }
    if (R) {
      if (edge(R, 4)) { camIdx = (camIdx + 1) % CAMS.length; camManual = true; flash('Kamera: ' + CAMS[camIdx], 1500); }
      if (edge(R, 5)) { rec ? stopRec() : startRec(); }
      if (edge(R, 3)) { settings.monitor = !settings.monitor; saveSettings(); }
    }
    set.updateMatrixWorld(true); setInv.copy(set.matrixWorld).invert(); setQInv.copy(set.quaternion).invert();
    capture(dt);
  }
  // avspilling av rollene som er tatt opp
  let idx = -1;
  if (playing) {
    idx = Math.floor((now - playing.t0) / 1000 * FPS);
    if (!playing.forRec && idx >= takeLen()) { stopPlay(); idx = -1; }
  }
  const shown = [];
  for (let i = 0; i < trackActors.length; i++) {
    const a = trackActors[i], t = take.tracks[i]; if (!a || !t) continue;
    a.root.visible = idx >= 0;
    if (idx >= 0) { unpack(t.data, Math.min(idx, t.n - 1) * PF, trackPose[i]); a.update(trackPose[i], dt); shown.push(a); }
  }
  if (idx >= 0 && idx < take.cam.length && !(rec && camManual)) camIdx = take.cam[idx];
  if (live) {
    live.root.visible = xr || idx < 0 || !!playing.forRec;
    if (xr) { live.update(livePose, dt); if (shown.length === 0 || rec) shown.unshift(live); }
    else if (idx < 0) { idlePose(idleP, now / 1000, live); live.update(idleP, dt); shown.push(live); }
  }
  if (rec && live && idx >= 0) {
    while (rec.n <= idx && rec.n < MAXN) { pack(rec.data, livePose); take.cam[rec.n] = camIdx; rec.n++; }
    if (rec.n >= MAXN) stopRec();
  }
  updateCam(dt, shown);

  if (xr) {
    const note = now < msgUntil ? msg : '';
    if (rec) setBoard('● TAR OPP  ' + clockStr(rec.n / FPS), '#ff5a5a', ['B: stopp   ·   A: bytt kamera (' + CAMS[camIdx] + ')', 'Rolle ' + (take.tracks.length + 1) + (take.tracks.length ? ', de andre rollene spilles av' : ''), note]);
    else if (playing) setBoard('▶ Spiller av', '#7fd67f', ['Y: stopp', note]);
    else setBoard('Klar', '#f3c969', ['B: ta opp   ·   Y: spill av   ·   A: kamera (' + CAMS[camIdx] + ')', 'Høyre: avtrekker munn, spak øyne, grep knytter hånden', 'Venstre: avtrekker ' + EXPR[exprIdx][1].toLowerCase() + ', spak gå, spakklikk bytter uttrykk', 'X: still deg på merket   ·   høyre spakklikk: skjerm av/på', (take.tracks.length ? take.tracks.length + ' rolle(r) tatt opp.  ' : '') + note]);
    monitor.visible = false; board.visible = false; env.visible = true;
    if (settings.monitor) {
      const prevRT = renderer.getRenderTarget();
      renderer.xr.enabled = false; renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, filmCam);
      renderer.xr.enabled = true; renderer.setRenderTarget(prevRT);
    }
    monitor.visible = settings.monitor; board.visible = true; env.visible = !passthrough;
    renderer.render(scene, camera);
  } else {
    monitor.visible = false; board.visible = false; env.visible = true;
    renderer.render(scene, filmCam);
  }
});

// ---------- side-UI ----------
function renderAvatarSelect() {
  const sel = $('avatar'); sel.textContent = '';
  const list = [...BUILTIN.map(b => ({ ...b, kind: 'builtin' })), ...settings.recent];
  if (!list.find(a => a.id === settings.avatar.id)) list.push(settings.avatar);
  list.forEach(a => { const o = document.createElement('option'); o.value = a.id; o.textContent = a.name + (a.kind === 'upload' ? ' (egen fil)' : ''); sel.append(o); });
  sel.value = settings.avatar.id; sel.onchange = () => setLive(list.find(a => a.id === sel.value));
}
$('env').value = settings.env; $('env').onchange = e => { settings.env = e.target.value; saveSettings(); buildEnv(); };
$('upload').addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  const src = { kind: 'upload', id: 'u:' + file.name + ':' + file.size, name: file.name.replace(/\.vrm$/i, '') };
  try { const buf = await file.arrayBuffer(); bufCache.set(src.id, buf); try { await dbSet('buf:' + src.id, buf); } catch (er) {} await setLive(src); } catch (er) { setStatus(er.message); }
});
let catalogLoaded = false;
$('browse').onclick = async () => {
  const box = $('catalog'); box.hidden = !box.hidden; if (box.hidden || catalogLoaded) return; catalogLoaded = true;
  try {
    const cat = await (await fetch('catalog.json')).json();
    for (const c of cat) {
      const b = document.createElement('button'); b.className = 'cat'; b.title = c.name;
      const im = document.createElement('img'); im.loading = 'lazy'; im.src = c.thumb; im.alt = c.name;
      const s = document.createElement('span'); s.textContent = c.name;
      b.append(im, s); b.onclick = () => { setLive({ kind: 'catalog', id: 'c:' + c.n, name: c.name, url: c.url }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      box.append(b);
    }
  } catch (e) { box.textContent = 'Kunne ikke hente listen.'; }
};
$('mic').onclick = async () => {
  try { micStream = await navigator.mediaDevices.getUserMedia({ audio: true }); $('micInfo').textContent = 'Mikrofonen er på. Stemmen din tas opp med hver rolle.'; $('mic').disabled = true; }
  catch (e) { $('micInfo').textContent = 'Fikk ikke tilgang til mikrofonen: ' + e.message; }
};
$('vr').onclick = () => start(false);
$('ar').onclick = () => start(true);
$('play').onclick = () => { playing ? stopPlay() : startPlay(); };
$('clear').onclick = async () => {
  const b = $('clear');
  if (b.dataset.armed) { stopPlay(); take = { v: TAKE_V, fps: FPS, tracks: [], cam: [] }; await saveTake(); await syncTracks(); delete b.dataset.armed; b.textContent = 'Slett hele filmen'; }
  else { b.dataset.armed = 1; b.textContent = 'Trykk igjen for å slette'; setTimeout(() => { delete b.dataset.armed; b.textContent = 'Slett hele filmen'; }, 3000); }
};
let actx = null, audioDest = null; const wired = new WeakSet();
$('video').onclick = () => {
  if (!take.tracks.length || playing) return;
  const type = ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  if (!type) return setStatus('Denne nettleseren kan ikke lage video.');
  const stream = renderer.domElement.captureStream(30);
  if (trackAudio.some(a => a)) {
    try {
      if (!actx) { actx = new AudioContext(); audioDest = actx.createMediaStreamDestination(); }
      for (const a of trackAudio) if (a && !wired.has(a)) { const s = actx.createMediaElementSource(a); s.connect(actx.destination); s.connect(audioDest); wired.add(a); }
      actx.resume(); audioDest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    } catch (e) { setStatus('Lyden kunne ikke tas med i videoen.'); }
  }
  const chunks = [], mr = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8e6 });
  mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  mr.onstop = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type }));
    a.download = 'tegnefilm.' + (type.startsWith('video/mp4') ? 'mp4' : 'webm'); document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    $('video').textContent = 'Lag video'; setStatus('Videoen er lastet ned.');
  };
  $('video').textContent = 'Lager video …'; setStatus('Spiller gjennom filmen og tar den opp som video.');
  mr.start(); startPlay(() => setTimeout(() => mr.stop(), 200));
};

(async () => {
  buildEnv(); renderAvatarSelect(); renderTracks();
  try { const t = await dbGet('film'); if (t && t.v === TAKE_V && t.tracks) { take = t; } } catch (e) {}
  await setLive(settings.avatar.url || settings.avatar.kind === 'upload' ? settings.avatar : BUILTIN[0]).catch(() => {});
  if (!live) await setLive({ ...BUILTIN[0], kind: 'builtin' });
  syncTracks();
  window.__ready = true;
  if (!window.isSecureContext) { setStatus('Siden må åpnes via https for at VR skal fungere.'); return; }
  if (!navigator.xr) { setStatus('WebXR finnes ikke i denne nettleseren. Åpne siden i Quest-nettleseren for å spille.'); return; }
  const [vr, ar] = await Promise.all([
    navigator.xr.isSessionSupported('immersive-vr').catch(() => false),
    navigator.xr.isSessionSupported('immersive-ar').catch(() => false)
  ]);
  $('vr').disabled = !vr; $('ar').disabled = !ar;
  if (!vr && !ar) setStatus('Denne enheten støtter ikke VR. Åpne siden i Quest-nettleseren for å spille.');
})();
window.__dbg = {
  setCam: i => { camIdx = i; }, setLive, play: () => startPlay(),
  fake: async (sec, dx) => {
    const data = [], p = mkPose(), n = Math.floor(sec * FPS);
    for (let i = 0; i < n; i++) { idlePose(p, i / FPS, live); p.hp.x += dx; p.hands[0].p.x += dx; p.hands[1].p.x += dx; pack(data, p); take.cam[i] = i < n / 2 ? 1 : 0; }
    take.tracks.push({ avatar: live.src, n, data: new Float32Array(data), audio: null }); await saveTake(); await syncTracks();
  }
};
