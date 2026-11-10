/* 實體右手：握拳（直導線／螺線管）與開掌（電動機）。圓面朝向在各頁再轉。 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const UP = new THREE.Vector3(0, 1, 0);
const skinCache = { skin: null, nail: null };

export function skinMaterial() {
  if (!skinCache.skin) {
    skinCache.skin = new THREE.MeshPhysicalMaterial({
      color: 0xf0a888,
      roughness: 0.48,
      metalness: 0,
      clearcoat: 0.22,
      clearcoatRoughness: 0.42,
      sheen: 0.35,
      sheenColor: 0xffe4d4,
      sheenRoughness: 0.55,
      emissive: 0x5a2a1c,
      emissiveIntensity: 0.08
    });
    skinCache.nail = new THREE.MeshPhysicalMaterial({
      color: 0xf7ddd2,
      roughness: 0.32,
      metalness: 0.02,
      clearcoat: 0.65,
      clearcoatRoughness: 0.2
    });
  }
  return skinCache.skin;
}

function nailMaterial() { skinMaterial(); return skinCache.nail; }

function shade(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function capsuleBetween(a, b, r, mat) {
  const len = a.distanceTo(b);
  const m = shade(new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.02, len - r * 0.2), 5, 10), mat));
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
  return m;
}

/** 不進光暈層的粗箭頭，沿 +Y */
export function solidArrow(color, { r = 0.055, len = 0.7 } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.45, roughness: 0.32, metalness: 0.08
  });
  const g = new THREE.Group();
  const shaft = shade(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len * 0.62, 14), mat));
  shaft.position.y = len * 0.31;
  const head = shade(new THREE.Mesh(new THREE.ConeGeometry(r * 2.35, len * 0.4, 16), mat));
  head.position.y = len * 0.8;
  g.add(shaft, head);
  g.userData = { len, r, mat };
  return g;
}

/** 圓弧箭頭，位於 XY 平面，從角度 0 往 +Y 方向掃過 arc 弧度 */
export function curlArrow(radius, tube, arc, color) {
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.06
  });
  const g = new THREE.Group();
  g.add(shade(new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 36, arc), mat)));
  const cone = shade(new THREE.Mesh(new THREE.ConeGeometry(tube * 2.6, tube * 7, 14), mat));
  const end = arc - 0.08;
  cone.position.set(Math.cos(end) * radius, Math.sin(end) * radius, 0);
  cone.quaternion.setFromUnitVectors(UP, new THREE.Vector3(-Math.sin(end), Math.cos(end), 0).normalize());
  g.add(cone);
  return g;
}

function marker(parent, x, y, z) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

/**
 * 握拳。thumb 'y'：拇指朝 +Y（直導線）。thumb 'x'：拇指朝 +X（螺線管 N 極）。
 * 指頭沿右手定則繞拇指彎曲。
 */
export function makeGrip(thumb = 'y') {
  const g = new THREE.Group();
  const skin = skinMaterial(), nail = nailMaterial();
  const aroundY = thumb !== 'x';
  // 掌心包在導線外側，關節朝 +Z（鏡頭）
  const palm = shade(new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.92, 0.32, 3, 0.1), skin));
  palm.position.set(0.42, -0.02, 0.36);
  g.add(palm);
  const wrist = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.26, 4, 10), skin));
  wrist.position.set(0.55, -0.48, 0.28);
  wrist.rotation.z = 0.55;
  g.add(wrist);
  // 四指分開繞 Y 軸。俯視（拇指朝上）為逆時針，和「電流向上、磁場逆時針」一致
  const ys = [-0.36, -0.12, 0.12, 0.36];
  ys.forEach((y, i) => {
    const a0 = 0.35 - i * 0.08;
    const arc = 2.35;
    const R = 0.55;
    const parts = 3;
    for (let s = 0; s < parts; s++) {
      const t0 = a0 + arc * s / parts, t1 = a0 + arc * (s + 1) / parts;
      const rad = (s === parts - 1 ? 0.045 : 0.058 - s * 0.004) * (1 - i * 0.06);
      const p = (t) => new THREE.Vector3(Math.sin(t) * R, y + Math.sin(t) * 0.02, Math.cos(t) * R);
      g.add(capsuleBetween(p(t0), p(t1), rad, s === parts - 1 ? nail : skin));
    }
  });
  const thumbBase = new THREE.Vector3(0.28, 0.32, 0.5);
  const thumbMid = new THREE.Vector3(0.12, 0.78, 0.46);
  const thumbTip = thumbMid.clone().add(new THREE.Vector3(-0.02, 0.28, -0.04));
  g.add(capsuleBetween(thumbBase, thumbMid, 0.095, skin));
  g.add(capsuleBetween(thumbMid, thumbTip, 0.075, nail));

  const iColor = aroundY ? 0xffb300 : 0xe53935;
  const cColor = aroundY ? 0x1e88e5 : 0xffb300;
  const iArrow = solidArrow(iColor, { r: 0.055, len: 0.72 });
  iArrow.position.set(0.06, 1.02, 0.34);
  g.add(iArrow);
  const arc = curlArrow(0.62, 0.04, 2.05, cColor);
  arc.rotation.x = Math.PI / 2; arc.rotation.y = Math.PI; arc.position.y = 0.46;
  g.add(arc);
  const arc2 = curlArrow(0.52, 0.032, 1.75, cColor);
  arc2.rotation.x = Math.PI / 2; arc2.rotation.y = Math.PI; arc2.position.y = -0.08;
  g.add(arc2);
  const thumbMark = marker(g, 0.1, 1.62, 0.38);
  const curlMark = marker(g, -0.62, 0.5, -0.05);
  const root = new THREE.Group();
  const spin = new THREE.Group();
  spin.add(g);
  root.add(spin);
  if (!aroundY) {
    g.rotation.z = -Math.PI / 2;
    // 繞螺線管軸轉一點，讓指節朝鏡頭，手指包在線圈外側
    spin.rotation.x = -0.9;
  }
  root.userData.markers = { thumb: thumbMark, curl: curlMark };
  return root;
}

/** 開掌：四指 +X（磁場）、拇指 +Z（電流）、掌心 +Y（受力） */
export function makePalm() {
  const g = new THREE.Group();
  const skin = skinMaterial(), nail = nailMaterial();
  const palm = shade(new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.16, 0.7, 3, 0.08), skin));
  palm.position.set(0.02, 0, 0.02);
  g.add(palm);
  const wrist = shade(new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.22, 4, 8), skin));
  wrist.rotation.z = Math.PI / 2;
  wrist.position.set(-0.48, 0, 0);
  g.add(wrist);
  const zs = [-0.24, -0.08, 0.08, 0.24];
  zs.forEach((z, i) => {
    const r = 0.058 - i * 0.004;
    const a = new THREE.Vector3(0.36, 0.02, z);
    const b = new THREE.Vector3(0.78, -0.02, z);
    const c = new THREE.Vector3(1.12, -0.06, z);
    g.add(capsuleBetween(a, b, r, skin));
    g.add(capsuleBetween(b, c, r * 0.86, nail));
  });
  const tb = new THREE.Vector3(0.02, 0.04, 0.38);
  const tt = new THREE.Vector3(0.08, 0.08, 0.95);
  g.add(capsuleBetween(tb, tt, 0.075, skin));
  g.add(capsuleBetween(tt, tt.clone().add(new THREE.Vector3(0.02, 0.02, 0.16)), 0.06, nail));

  const iArrow = solidArrow(0xffb300, { r: 0.045, len: 0.48 });
  iArrow.position.set(0.1, 0.12, 1.05);
  iArrow.rotation.x = Math.PI / 2;
  g.add(iArrow);
  const bArrow = solidArrow(0x1e88e5, { r: 0.045, len: 0.5 });
  bArrow.position.set(1.15, 0.14, 0);
  bArrow.rotation.z = -Math.PI / 2;
  g.add(bArrow);
  const fArrow = solidArrow(0xe53935, { r: 0.05, len: 0.62 });
  fArrow.position.set(0.15, 0.12, 0);
  g.add(fArrow);

  g.userData.markers = {
    I: marker(g, 0.12, 0.28, 1.35),
    B: marker(g, 1.45, 0.28, 0.05),
    F: marker(g, 0.15, 0.85, 0)
  };
  return g;
}
