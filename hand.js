/* 全息投影右手（美學規範 B）：半透明科技藍玻璃＋邊緣發光，像一張物理輔助藍圖，不擋視線。
   手型：圓掌、分開的拇指、四根漸細的手指，箭頭帶貼在指面上。 */
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();

/** 每隻手一組材質：glass＝半透明玻璃本體；rim＝越靠輪廓越亮的邊緣光（通電時更亮） */
function holoSet() {
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x4fc3f7, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08,
    emissive: 0x0088ff, emissiveIntensity: 0.22, transparent: true, opacity: 0.34
  });
  const rim = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0x0a84ff) }, uGain: { value: 0.75 }, uPow: { value: 1.7 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main() { vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uGain; uniform float uPow; varying vec3 vN; varying vec3 vV; void main() { float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPow) * uGain; gl_FragColor = vec4(uColor, clamp(f, 0.0, 0.92)); }',
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false
  });
  /** 玻璃本體＋同形狀的邊緣光 */
  const mesh = geo => { const m = new THREE.Mesh(geo, glass); m.renderOrder = 2; const e = new THREE.Mesh(geo, rim); e.renderOrder = 3; m.add(e); return m; };
  return { glass, rim, mesh };
}

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
const texBlue = chevronTex('#0b57d0');
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
  const g = new THREE.Group(), H = holoSet();
  /* 右手握住沿 y 軸的導線（從上往下看）：
     手掌在 +x 側、掌心朝導線；指根在手掌的 −z 邊，四指繞過導線的另一側，指尖回到 +z 邊；
     拇指從 +z 邊的虎口往上伸。四指彎曲方向（指根→指尖）從上往下看是逆時針 ＝ 拇指朝上的右手。 */
  const PX = orbit + 0.13, W = Math.max(0.3, orbit * 0.98);
  const palm = H.mesh(new THREE.SphereGeometry(1, 36, 28));
  palm.scale.set(0.15, 0.52, W * 1.05);
  palm.position.set(PX, 0, 0);
  g.add(palm);
  const thenar = H.mesh(new THREE.SphereGeometry(0.2, 24, 18));          // 拇指根部的肉（虎口）
  thenar.scale.set(0.8, 1.2, 0.95);
  thenar.position.set(PX - 0.03, 0.3, W * 0.55);
  g.add(thenar);
  // 手腕：從掌根（+z 邊）往外伸一小段，一看就知道哪邊接手臂
  g.add(H.mesh(smoothTube([new THREE.Vector3(PX, -0.06, W * 0.55), new THREE.Vector3(PX + 0.03, -0.1, W * 0.95), new THREE.Vector3(PX + 0.08, -0.16, W + 0.5)], u => 0.2 - 0.03 * u, 18)));

  const fingers = [
    { name: 'index', y: 0.3, arc: 3.25, len: 1 },
    { name: 'middle', y: 0.1, arc: 3.5, len: 1.08 },
    { name: 'ring', y: -0.1, arc: 3.3, len: 0.96 },
    { name: 'pinky', y: -0.3, arc: 2.85, len: 0.82 }
  ];
  const A0 = -1.15;                                                       // 四指離開手掌、開始繞導線的角度
  const fingerPath = f => {
    const base = [];                                                      // 指根：從手掌 −z 邊平順接到圓弧
    for (let i = 0; i < 5; i++) { const k = i / 5; base.push(new THREE.Vector3(PX - 0.02 + (Math.cos(A0) * orbit - PX + 0.02) * k, f.y, -W * 0.9 + (Math.sin(A0) * orbit + W * 0.9) * k * k)); }
    return base.concat(arcPoints(f.y, A0, f.arc, orbit));
  };
  const ribbons = [];
  const tex = (fingerColor === 0x1e88e5 ? texBlue : texOrange).clone();
  tex.needsUpdate = true;
  fingers.forEach(f => {
    const pts = fingerPath(f);
    const rad = fingerRad(f.len);
    g.add(H.mesh(smoothTube(pts, rad)));
    const knuckle = H.mesh(new THREE.SphereGeometry(rad(0) * 1.12, 14, 10));   // 指根關節
    knuckle.position.copy(pts[0]);
    g.add(knuckle);
    const tip = pts[pts.length - 1];
    const cap = H.mesh(new THREE.SphereGeometry(rad(1), 14, 10));      // 指尖圓頭（全息風格不畫指甲）
    cap.position.copy(tip);
    g.add(cap);
    const rib = makeRibbon(pts, rad, (i) => {
      const p = pts[i];
      return _a.set(p.x, 0, p.z).normalize();
    }, tex);
    g.add(rib.mesh);
    ribbons.push(rib);
  });

  const thumbPts = [
    new THREE.Vector3(PX - 0.02, 0.34, W * 0.6),
    new THREE.Vector3(PX - 0.09, 0.6, W * 0.66),
    new THREE.Vector3(PX - 0.17, 0.86, W * 0.62),
    new THREE.Vector3(PX - 0.23, 1.1, W * 0.55)
  ];
  const thumbRad = u => 0.12 * (1 - u * 0.36);
  g.add(H.mesh(smoothTube(thumbPts, thumbRad, 16)));
  const tTip = thumbPts[thumbPts.length - 1];
  const tCap = H.mesh(new THREE.SphereGeometry(thumbRad(1), 14, 10));
  tCap.position.copy(tTip);
  g.add(tCap);

  const thumbArrow = boldArrow(fingerColor === 0x1e88e5 ? 0xf57c00 : 0xe53935, 0.7, 0.055);
  placeArrow(thumbArrow, thumbPts[0].clone().add(new THREE.Vector3(0.12, 0.05, 0.1)), tTip.clone().add(new THREE.Vector3(0.12, 0.2, 0.06)));
  g.add(thumbArrow);

  const thumbMark = new THREE.Object3D();
  thumbMark.position.copy(tTip).add(new THREE.Vector3(0.1, 0.3, 0.08));
  g.add(thumbMark);
  const mid = fingers[1];
  const midPts = fingerPath(mid);
  const curlMark = new THREE.Object3D();
  curlMark.position.copy(midPts[Math.floor(midPts.length * 0.5)]).multiplyScalar(1.25).add(new THREE.Vector3(0, 0.1, 0));
  g.add(curlMark);

  const twist = new THREE.Group();
  twist.add(g);
  const root = new THREE.Group();
  if (axis === 'x') {
    const orient = new THREE.Group();
    orient.rotation.z = -Math.PI / 2;
    orient.rotation.x = 1.3;                 // 手掌在螺線管後方、手腕朝下，四指從前面繞過來，看得最清楚
    orient.add(twist);
    root.add(orient);
  } else root.add(twist);
  root.userData = { markers: { thumb: thumbMark, curl: curlMark }, twist, ribbons, thumbArrow, holo: H, time: 0, texHold: 0 };
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
  // 全息邊緣光：通電時變亮並輕輕脈動，斷電變暗
  if (u.holo) { const want = moving ? 1.25 + 0.2 * Math.sin(u.time * 4) : 0.7, k = 1 - Math.exp(-dt * 6); u.holo.rim.uniforms.uGain.value += (want - u.holo.rim.uniforms.uGain.value) * k; u.holo.glass.emissiveIntensity += ((moving ? 0.4 : 0.18) - u.holo.glass.emissiveIntensity) * k; }
}

/** 開掌：四指 +X、拇指 +Z、掌心 +Y。 */
export function makePalm() {
  const g = new THREE.Group(), H = holoSet();
  const palm = H.mesh(new THREE.SphereGeometry(0.36, 32, 24));
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
    g.add(H.mesh(smoothTube(pts, rad, 12)));
    const cap = H.mesh(new THREE.SphereGeometry(rad(1), 12, 8));
    cap.position.copy(pts[3]);
    g.add(cap);
    const rib = makeRibbon(pts, rad, () => _a.set(0, 1, 0), tex);
    g.add(rib.mesh);
    ribbons.push(rib);
  });
  const thumbPts = [
    new THREE.Vector3(0.02, 0.06, 0.38),
    new THREE.Vector3(0.06, 0.08, 0.62),
    new THREE.Vector3(0.1, 0.1, 0.92)
  ];
  g.add(H.mesh(smoothTube(thumbPts, u => 0.078 * (1 - u * 0.35), 12)));
  { const c = H.mesh(new THREE.SphereGeometry(0.078 * 0.65, 12, 8)); c.position.copy(thumbPts[2]); g.add(c); }
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
  g.userData = { markers: { I: mI, B: mB, F: mF }, fArrow, ribbons, holo: H, time: 0 };
  return g;
}

export function stepPalm(g, dt, powered) {
  const u = g.userData;
  if (!u || !u.fArrow) return;
  u.time += dt;
  const pulse = powered ? 1 + 0.16 * Math.sin(u.time * 5.2) : 1;
  u.fArrow.scale.set(pulse, pulse, pulse);
  if (u.holo) { const k = 1 - Math.exp(-dt * 6); u.holo.rim.uniforms.uGain.value += ((powered ? 1.25 + 0.2 * Math.sin(u.time * 4) : 0.7) - u.holo.rim.uniforms.uGain.value) * k; u.holo.glass.emissiveIntensity += ((powered ? 0.4 : 0.18) - u.holo.glass.emissiveIntensity) * k; }
  if (u.ribbons) {
    const shift = powered ? u.time * 0.15 : 0;
    for (const r of u.ribbons) if (r.mat.map) r.mat.map.offset.x = powered ? -shift : r.mat.map.offset.x;
  }
}
