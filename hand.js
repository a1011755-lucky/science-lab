/* 可辨認的右手：圓掌、分開的拇指、四根漸細的手指，箭頭貼在皮膚上。 */
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();

const skinMat = new THREE.MeshPhysicalMaterial({
  color: 0xf3b497, roughness: 0.58, metalness: 0,
  clearcoat: 0.12, clearcoatRoughness: 0.55,
  sheen: 0.65, sheenColor: 0xffc2ae, sheenRoughness: 0.35,
  emissive: 0x8a3d2a, emissiveIntensity: 0.07
});
function skinMaterial() { return skinMat; }
const nailMat = new THREE.MeshPhysicalMaterial({
  color: 0xffe4d8, roughness: 0.32, metalness: 0.02, clearcoat: 0.55, clearcoatRoughness: 0.25
});

function chevronTex(fill) {
  const c = document.createElement('canvas');
  c.width = 160; c.height = 64;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 160, 64);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 160, 5);
  g.fillRect(0, 59, 160, 5);
  const draw = (color, w) => {
    g.strokeStyle = color;
    g.lineWidth = w;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(28, 12);
    g.lineTo(78, 32);
    g.lineTo(28, 52);
    g.stroke();
  };
  draw('#ffffff', 16);
  draw(fill, 8);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(3.2, 1);
  return t;
}
const texBlue = chevronTex('#0a3d86');
const texOrange = chevronTex('#e65100');

function ribbonMat(tex) {
  return new THREE.MeshBasicMaterial({
    map: tex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide,
    depthWrite: false, toneMapped: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
  });
}

function shade(mesh) { mesh.castShadow = mesh.receiveShadow = true; return mesh; }

function smoothTube(points, radAt, radial = 14) {
  const n = points.length;
  const tang = [];
  for (let i = 0; i < n; i++) {
    const t = new THREE.Vector3();
    if (i === 0) t.subVectors(points[1], points[0]);
    else if (i === n - 1) t.subVectors(points[n - 1], points[n - 2]);
    else t.subVectors(points[i + 1], points[i - 1]);
    if (t.lengthSq() < 1e-10) t.set(0, 1, 0);
    tang.push(t.normalize());
  }
  const ref = Math.abs(tang[0].dot(UP)) > 0.85 ? new THREE.Vector3(1, 0, 0) : UP;
  let prev = new THREE.Vector3().crossVectors(tang[0], ref).normalize();
  const pos = [], nrm = [], uv = [], idx = [];
  const row = radial + 1;
  for (let i = 0; i < n; i++) {
    const t = tang[i];
    const p = prev.clone().addScaledVector(t, -prev.dot(t));
    if (p.lengthSq() < 1e-8) p.crossVectors(t, ref);
    p.normalize();
    prev = p;
    const b = new THREE.Vector3().crossVectors(t, p).normalize();
    const r = radAt(i / (n - 1));
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const N = p.clone().multiplyScalar(Math.cos(a)).addScaledVector(b, Math.sin(a));
      const P = points[i];
      pos.push(P.x + N.x * r, P.y + N.y * r, P.z + N.z * r);
      nrm.push(N.x, N.y, N.z);
      uv.push(i / (n - 1), j / radial);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) {
    const a = i * row + j, c = a + row;
    idx.push(a, c, a + 1, a + 1, c, c + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

function skinMesh(geo) {
  return shade(new THREE.Mesh(geo, skinMaterial()));
}

/** 沿著曲線、貼在外側的箭頭帶。normalFn(i) 決定帶面朝外的方向。 */
function makeRibbon(points, radAt, normalFn, tex) {
  const n = points.length;
  const pos = [], uv = [], idx = [];
  const half = 0.034;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const t = new THREE.Vector3();
    if (i === 0) t.subVectors(points[1], points[0]);
    else if (i === n - 1) t.subVectors(points[n - 1], points[n - 2]);
    else t.subVectors(points[i + 1], points[i - 1]);
    t.normalize();
    const N = normalFn(i, t);
    const side = new THREE.Vector3().crossVectors(t, N).normalize();
    const c = points[i].clone().addScaledVector(N, radAt(u) + 0.012);
    const L = c.clone().addScaledVector(side, half);
    const R = c.clone().addScaledVector(side, -half);
    pos.push(L.x, L.y, L.z, R.x, R.y, R.z);
    uv.push(u * 3.2, 0, u * 3.2, 1);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = ribbonMat(tex);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 4;
  return { mesh, mat };
}

function arcPoints(y, a0, arc, orbit, n = 28) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 - arc * (i / n);
    pts.push(new THREE.Vector3(Math.cos(a) * orbit, y, Math.sin(a) * orbit));
  }
  return pts;
}
function fingerRad(scale) {
  return u => {
    const taper = 0.074 * scale * (1 - u * 0.5);
    const bump = 0.012 * scale * (Math.exp(-(((u - 0.32) / 0.07) ** 2)) + 0.85 * Math.exp(-(((u - 0.64) / 0.07) ** 2)));
    return taper + bump;
  };
}

function boldArrow(color, len, r) {
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.28, roughness: 0.35, metalness: 0.05 });
  const g = new THREE.Group();
  g.userData.mat = mat;
  const shaft = shade(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r, len * 0.72, 16), mat));
  shaft.position.y = len * 0.36;
  const head = shade(new THREE.Mesh(new THREE.ConeGeometry(r * 2.1, len * 0.34, 18), mat));
  head.position.y = len * 0.82;
  g.add(shaft, head);
  return g;
}

function placeArrow(arrow, from, to) {
  const dir = to.clone().sub(from);
  const len = dir.length();
  arrow.position.copy(from);
  arrow.quaternion.setFromUnitVectors(UP, dir.normalize());
  arrow.scale.set(1, len / 0.7, 1);
}

/**
 * 握拳。axis y＝拇指沿導線朝上；axis x＝拇指沿螺線管指向 N。
 * 直導線的四指帶是深藍箭頭；螺線管的四指帶是橘色電流。
 */
export function makeGrip({ axis = 'y', orbit = 0.3, fingerColor = 0x1e88e5 } = {}) {
  const g = new THREE.Group();
  const palm = shade(new THREE.Mesh(new THREE.SphereGeometry(0.34, 36, 28), skinMaterial()));
  palm.scale.set(1.05, 1.55, 0.72);
  palm.position.set(0.5, 0.02, 0.02);
  g.add(palm);
  const thenar = shade(new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), skinMaterial()));
  thenar.scale.set(1, 1.15, 0.85);
  thenar.position.set(0.46, 0.38, 0.2);
  g.add(thenar);

  const fingers = [
    { name: 'index', y: 0.3, arc: 3.15, len: 1 },
    { name: 'middle', y: 0.1, arc: 3.55, len: 1.08 },
    { name: 'ring', y: -0.1, arc: 3.25, len: 0.96 },
    { name: 'pinky', y: -0.3, arc: 2.7, len: 0.82 }
  ];
  const ribbons = [];
  const tex = (fingerColor === 0x1e88e5 ? texBlue : texOrange).clone();
  tex.needsUpdate = true;
  fingers.forEach(f => {
    const pts = arcPoints(f.y, 2.25, f.arc, orbit);
    const rad = fingerRad(f.len);
    const mesh = skinMesh(smoothTube(pts, rad));
    g.add(mesh);
    const tip = pts[pts.length - 1];
    const nail = shade(new THREE.Mesh(new THREE.SphereGeometry(rad(1) * 0.95, 14, 10), nailMat));
    nail.scale.set(1, 0.72, 1.15);
    nail.position.copy(tip);
    g.add(nail);
    const rib = makeRibbon(pts, rad, (i) => {
      const p = pts[i];
      return _a.set(p.x, 0, p.z).normalize();
    }, tex);
    g.add(rib.mesh);
    ribbons.push(rib);
  });

  const thumbPts = [
    new THREE.Vector3(0.5, 0.42, 0.28),
    new THREE.Vector3(0.38, 0.72, 0.34),
    new THREE.Vector3(0.22, 1.08, 0.26),
    new THREE.Vector3(0.14, 1.38, 0.14)
  ];
  const thumbRad = u => 0.095 * (1 - u * 0.42);
  g.add(skinMesh(smoothTube(thumbPts, thumbRad, 16)));
  const tTip = thumbPts[thumbPts.length - 1];
  const tNail = shade(new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), nailMat));
  tNail.scale.set(1.1, 0.7, 1);
  tNail.position.copy(tTip);
  g.add(tNail);

  const thumbArrow = boldArrow(fingerColor === 0x1e88e5 ? 0xf57c00 : 0xe53935, 0.7, 0.055);
  placeArrow(thumbArrow, thumbPts[0].clone().add(new THREE.Vector3(0.02, 0.05, 0.1)), tTip.clone().add(new THREE.Vector3(0, 0.18, 0.06)));
  g.add(thumbArrow);

  const thumbMark = new THREE.Object3D();
  thumbMark.position.copy(tTip).add(new THREE.Vector3(0, 0.28, 0.08));
  g.add(thumbMark);
  const mid = fingers[1];
  const tipArc = arcPoints(mid.y, 2.25, mid.arc, orbit);
  const curlMark = new THREE.Object3D();
  curlMark.position.copy(tipArc[tipArc.length - 1]).add(new THREE.Vector3(0, 0.16, 0));
  g.add(curlMark);

  const twist = new THREE.Group();
  twist.add(g);
  const root = new THREE.Group();
  if (axis === 'x') {
    const orient = new THREE.Group();
    orient.rotation.z = -Math.PI / 2;
    orient.rotation.x = -0.5;
    orient.add(twist);
    root.add(orient);
  } else root.add(twist);
  root.userData = { markers: { thumb: thumbMark, curl: curlMark }, twist, ribbons, thumbArrow, time: 0, texHold: 0 };
  return root;
}

export function stepGrip(root, dt, speed) {
  const u = root.userData;
  if (!u || !u.twist) return;
  const moving = speed > 0.001;
  if (moving) u.time += dt * speed;
  else u.texHold = u.time;
  const want = moving ? Math.sin(u.time * 1.1) * 0.3 : 0;
  u.twist.rotation.y += (want - u.twist.rotation.y) * (1 - Math.exp(-dt * 5));
  const shift = (moving ? u.time : u.texHold) * 0.22;
  for (const r of u.ribbons) if (r.mat.map) r.mat.map.offset.x = -shift;
  if (u.thumbArrow.userData.mat) u.thumbArrow.userData.mat.emissiveIntensity = moving ? 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(u.time * 4)) : 0.28;
}

/** 開掌：四指 +X、拇指 +Z、掌心 +Y。 */
export function makePalm() {
  const g = new THREE.Group();
  const palm = shade(new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 24), skinMaterial()));
  palm.scale.set(1.15, 0.42, 1.25);
  palm.position.set(0.02, 0, 0.02);
  g.add(palm);
  const specs = [
    { z: 0.26, len: 0.78 },
    { z: 0.09, len: 0.92 },
    { z: -0.08, len: 0.84 },
    { z: -0.25, len: 0.66 }
  ];
  const ribbons = [];
  const tex = texBlue.clone();
  tex.needsUpdate = true;
  specs.forEach(s => {
    const pts = [0, 0.35, 0.65, 1].map(u => new THREE.Vector3(0.32 + s.len * u, 0.02 - u * 0.03, s.z));
    const rad = u => 0.062 * (1 - u * 0.4) * (s.len / 0.8);
    g.add(skinMesh(smoothTube(pts, rad, 12)));
    const nail = shade(new THREE.Mesh(new THREE.SphereGeometry(rad(1), 12, 8), nailMat));
    nail.position.copy(pts[3]);
    g.add(nail);
    const rib = makeRibbon(pts, rad, () => _a.set(0, 1, 0), tex);
    g.add(rib.mesh);
    ribbons.push(rib);
  });
  const thumbPts = [
    new THREE.Vector3(0.02, 0.06, 0.38),
    new THREE.Vector3(0.06, 0.08, 0.62),
    new THREE.Vector3(0.1, 0.1, 0.92)
  ];
  g.add(skinMesh(smoothTube(thumbPts, u => 0.078 * (1 - u * 0.35), 12)));
  const iArrow = boldArrow(0xf57c00, 0.7, 0.048);
  placeArrow(iArrow, thumbPts[0].clone().add(new THREE.Vector3(0, 0.08, 0)), thumbPts[2].clone().add(new THREE.Vector3(0, 0.08, 0.12)));
  g.add(iArrow);
  const fArrow = boldArrow(0xe53935, 0.7, 0.06);
  fArrow.position.set(0.08, 0.2, 0.02);
  g.add(fArrow);
  const mI = new THREE.Object3D(); mI.position.set(0.12, 0.22, 1.12);
  const mB = new THREE.Object3D(); mB.position.set(1.2, 0.2, 0.08);
  const mF = new THREE.Object3D(); mF.position.set(0.08, 0.7, 0.02);
  g.add(mI, mB, mF);
  g.userData = { markers: { I: mI, B: mB, F: mF }, fArrow, ribbons, time: 0 };
  return g;
}

export function stepPalm(g, dt, powered) {
  const u = g.userData;
  if (!u || !u.fArrow) return;
  u.time += dt;
  const pulse = powered ? 1 + 0.16 * Math.sin(u.time * 5.2) : 1;
  u.fArrow.scale.set(pulse, pulse, pulse);
  if (u.ribbons) {
    const shift = powered ? u.time * 0.15 : 0;
    for (const r of u.ribbons) if (r.mat.map) r.mat.map.offset.x = powered ? -shift : r.mat.map.offset.x;
  }
}
