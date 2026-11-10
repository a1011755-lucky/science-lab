/* 實體右手。握拳的箭頭貼在指面上，並可沿彎曲方向流動。 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const UP = new THREE.Vector3(0, 1, 0);
const _p = new THREE.Vector3();
const _t = new THREE.Vector3();
const _n = new THREE.Vector3();
const skinCache = { skin: null, nail: null };
const matCache = {};

function skinMaterial() {
  if (!skinCache.skin) {
    skinCache.skin = new THREE.MeshPhysicalMaterial({
      color: 0xf0a888, roughness: 0.46, metalness: 0,
      clearcoat: 0.25, clearcoatRoughness: 0.4,
      sheen: 0.35, sheenColor: 0xffe4d4, sheenRoughness: 0.5,
      emissive: 0x5a2a1c, emissiveIntensity: 0.08
    });
    skinCache.nail = new THREE.MeshPhysicalMaterial({
      color: 0xf8e0d6, roughness: 0.28, metalness: 0.02,
      clearcoat: 0.7, clearcoatRoughness: 0.18
    });
  }
  return skinCache.skin;
}
function nailMaterial() { skinMaterial(); return skinCache.nail; }
function arrowMaterial(color) {
  if (!matCache[color]) {
    matCache[color] = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.62, roughness: 0.28, metalness: 0.04
    });
  }
  return matCache[color];
}
function shade(mesh) { mesh.castShadow = mesh.receiveShadow = true; return mesh; }

function capsuleBetween(a, b, r, mat) {
  const len = a.distanceTo(b);
  const m = shade(new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.015, len - r * 0.15), 6, 12), mat));
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, _t.copy(b).sub(a).normalize());
  return m;
}
function knuckle(p, r, mat) {
  const m = shade(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat));
  m.position.copy(p);
  return m;
}
function chevron(color, r, len) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, len, 12), arrowMaterial(color));
  m.castShadow = true;
  return m;
}
function marker(parent, x, y, z) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

/** 圓心在原點、軸為 Y。角度增加時從 +X 走向 +Z。磁場（電流向上）沿角度減少的方向。 */
function onArc(a, y, R, out) {
  return out.set(Math.cos(a) * R, y, Math.sin(a) * R);
}
function tangentTowardTip(a, out) {
  return out.set(Math.sin(a), 0, -Math.cos(a)).normalize();
}
function outward(a, out) {
  return out.set(Math.cos(a), 0, Math.sin(a)).normalize();
}

/**
 * 握拳，四指繞著軸心。
 * axis 'y'：拇指朝 +Y（直導線，指上箭頭＝磁場 B）。
 * axis 'x'：拇指朝 +X（螺線管，指上箭頭＝電流 I，拇指＝N 極）。
 * orbit：指心到軸的距離。
 */
export function makeGrip({ axis = 'y', orbit = 0.22, fingerColor = 0x1e88e5, thumbColor = 0xffb300 } = {}) {
  const g = new THREE.Group();
  const skin = skinMaterial(), nail = nailMaterial();
  const fr = Math.max(0.055, Math.min(0.09, orbit * 0.42));
  const arc = 3.5;
  const ys = [-0.36, -0.13, 0.11, 0.34];
  // 指根在導線左側，指尖繞過鏡頭這一側（+Z）再到右側，正面才看得到握住
  const a0s = [3.45, 3.32, 3.18, 3.05];
  ys.forEach((y, i) => {
    const a0 = a0s[i];
    const rr = fr * (1 - i * 0.07);
    const pts = [];
    for (let k = 0; k <= 4; k++) pts.push(onArc(a0 - arc * k / 4, y, orbit, new THREE.Vector3()));
    pts.forEach((p, k) => g.add(knuckle(p, rr * (k === 4 ? 0.85 : 1.18), k === 4 ? nail : skin)));
    for (let k = 0; k < 4; k++) g.add(capsuleBetween(pts[k], pts[k + 1], rr * (k === 3 ? 0.82 : 0.95), k === 3 ? nail : skin));
  });
  // 掌與腕在指根外側，讓「握住」看得出來
  const palm = shade(new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.88, 0.26, 4, 0.1), skin));
  palm.position.copy(onArc(3.9, -0.02, orbit + fr + 0.16, new THREE.Vector3()));
  g.add(palm);
  const wrist = shade(new THREE.Mesh(new THREE.CapsuleGeometry(fr * 1.5, 0.26, 5, 10), skin));
  wrist.position.copy(palm.position).add(new THREE.Vector3(-0.02, -0.52, 0.02));
  g.add(wrist);
  const thumbA = onArc(2.2, 0.22, orbit + fr * 0.3, new THREE.Vector3());
  const thumbB = onArc(1.7, 1.12, orbit + fr * 0.15, new THREE.Vector3());
  g.add(capsuleBetween(thumbA, thumbB, fr * 1.15, skin));
  g.add(knuckle(thumbB, fr * 1.05, nail));

  const chevrons = [];
  ys.forEach((y, i) => {
    for (let s = 0; s < 3; s++) {
      const mesh = chevron(fingerColor, fr * 0.55, fr * 2.5);
      g.add(mesh);
      chevrons.push({ mesh, y, a0: a0s[i], arc, R: orbit, lift: fr + 0.012, slot: s / 3 });
    }
  });
  const thumbChevrons = [];
  for (let s = 0; s < 3; s++) {
    const mesh = chevron(thumbColor, fr * 0.62, fr * 2.7);
    g.add(mesh);
    thumbChevrons.push({ mesh, slot: s / 3 });
  }
  const thumbMark = marker(g, thumbB.x, thumbB.y + 0.22, thumbB.z);
  const tip = onArc(a0s[1] - arc, ys[1], orbit, new THREE.Vector3());
  const curlMark = marker(g, tip.x, tip.y + 0.2, tip.z);

  const twist = new THREE.Group();
  twist.add(g);
  const root = new THREE.Group();
  if (axis === 'x') {
    const orient = new THREE.Group();
    orient.rotation.z = -Math.PI / 2;
    orient.rotation.x = -0.65;
    orient.add(twist);
    root.add(orient);
  } else root.add(twist);
  root.userData = {
    markers: { thumb: thumbMark, curl: curlMark },
    twist, chevrons, thumbChevrons, time: 0,
    thumbA, thumbB, fr
  };
  return root;
}

/** speed：沿指尖流動的角速度。0 表示斷電，箭頭停住、扭轉回到原位。手若已翻面，世界方向會跟著反轉。 */
export function stepGrip(root, dt, speed) {
  const u = root.userData;
  if (!u || !u.twist) return;
  const moving = speed > 0.001;
  if (moving) u.time += dt * speed;
  const want = moving ? Math.sin(u.time * 1.15) * 0.36 : 0;
  u.twist.rotation.y += (want - u.twist.rotation.y) * (1 - Math.exp(-dt * (moving ? 6 : 4)));
  const flow = moving ? u.time : u.time;
  for (const c of u.chevrons) {
    const phase = ((c.slot + flow / c.arc) % 1 + 1) % 1;
    const a = c.a0 - phase * c.arc;
    onArc(a, c.y, c.R, _p);
    outward(a, _n);
    _p.addScaledVector(_n, c.lift);
    tangentTowardTip(a, _t);
    c.mesh.position.copy(_p);
    c.mesh.quaternion.setFromUnitVectors(UP, _t);
  }
  const A = u.thumbA, B = u.thumbB;
  _t.copy(B).sub(A);
  const len = _t.length() || 1;
  _t.multiplyScalar(1 / len);
  _n.set(0.15, 0, 1).normalize();
  for (const c of u.thumbChevrons) {
    const phase = ((c.slot + (moving ? u.time * 0.38 : 0)) % 1 + 1) % 1;
    c.mesh.position.copy(A).addScaledVector(_t, phase * len * 0.92).addScaledVector(_n, u.fr * 1.15);
    c.mesh.quaternion.setFromUnitVectors(UP, _t);
    const pulse = moving ? 0.9 + 0.22 * Math.sin(u.time * 6 + c.slot * 4) : 0.85;
    c.mesh.scale.setScalar(pulse);
  }
}

/** 開掌：四指 +X（磁場）、拇指 +Z（電流）、掌心 +Y（受力）。箭頭貼在皮膚上。 */
export function makePalm() {
  const g = new THREE.Group();
  const skin = skinMaterial(), nail = nailMaterial();
  const palm = shade(new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.18, 0.78, 4, 0.08), skin));
  palm.position.set(0.05, 0, 0.02);
  g.add(palm);
  const wrist = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.24, 4, 10), skin));
  wrist.rotation.z = Math.PI / 2;
  wrist.position.set(-0.52, 0, 0);
  g.add(wrist);
  const zs = [-0.26, -0.09, 0.08, 0.25];
  const fingerArrows = [];
  zs.forEach((z, i) => {
    const r = 0.062 - i * 0.005;
    const pts = [0.38, 0.62, 0.86, 1.08].map((x, k) => new THREE.Vector3(x, 0.02 - k * 0.012, z));
    pts.forEach((p, k) => g.add(knuckle(p, r * (k === 3 ? 0.9 : 1.2), k === 3 ? nail : skin)));
    for (let k = 0; k < 3; k++) g.add(capsuleBetween(pts[k], pts[k + 1], r * (k === 2 ? 0.85 : 0.95), k === 2 ? nail : skin));
    for (let s = 0; s < 2; s++) {
      const mesh = chevron(0x1e88e5, 0.04, 0.2);
      mesh.position.set(0.55 + s * 0.28, r + 0.06, z);
      mesh.rotation.z = -Math.PI / 2;
      g.add(mesh);
      fingerArrows.push(mesh);
    }
  });
  const tb = new THREE.Vector3(0.05, 0.05, 0.42);
  const tm = new THREE.Vector3(0.08, 0.07, 0.72);
  const tt = new THREE.Vector3(0.1, 0.08, 1.02);
  g.add(capsuleBetween(tb, tm, 0.078, skin));
  g.add(capsuleBetween(tm, tt, 0.062, nail));
  g.add(knuckle(tm, 0.09, skin));
  const thumbArrows = [];
  for (let s = 0; s < 2; s++) {
    const mesh = chevron(0xffb300, 0.042, 0.2);
    mesh.position.set(0.08, 0.15, 0.55 + s * 0.24);
    mesh.rotation.x = Math.PI / 2;
    g.add(mesh);
    thumbArrows.push(mesh);
  }
  const fArrow = chevron(0xe53935, 0.07, 0.42);
  fArrow.position.set(0.12, 0.16, 0.02);
  g.add(fArrow);
  g.userData = {
    markers: {
      I: marker(g, 0.12, 0.22, 1.2),
      B: marker(g, 1.28, 0.2, 0.08),
      F: marker(g, 0.12, 0.62, 0.02)
    },
    fArrow, time: 0
  };
  return g;
}

/** 通電時受力箭頭輕輕起伏；斷電就停。 */
export function stepPalm(g, dt, powered) {
  const u = g.userData;
  if (!u || !u.fArrow) return;
  u.time += dt;
  const pulse = powered ? 1 + 0.18 * Math.sin(u.time * 5.5) : 1;
  u.fArrow.scale.set(pulse, 0.75 + pulse * 0.35, pulse);
  u.fArrow.position.y = 0.16 + (powered ? 0.03 * Math.sin(u.time * 5.5) : 0);
}
