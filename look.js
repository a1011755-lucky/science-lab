/* 磁學頁共用質感：工作室環境光、烤漆磁鐵、金屬、磁力線粗細 */
import * as THREE from 'three';

const TAU = Math.PI * 2;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(canvas, colorSpace) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = colorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** 烤漆＋邊緣微磨：每面 UV 0–1，磨損落在面的四周 */
const paintCache = new Map();
function paintPack(hex) {
  const key = hex >>> 0;
  if (paintCache.has(key)) return paintCache.get(key);
  const s = 256;
  const rnd = mulberry32(key || 1);
  const R = (key >> 16) & 255, G = (key >> 8) & 255, B = key & 255;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = `rgb(${R},${G},${B})`;
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < 900; i++) {
    const x = rnd() * s, y = rnd() * s, rad = 6 + rnd() * 18;
    const lift = rnd() > 0.5 ? 28 : -22;
    g.fillStyle = `rgba(${Math.min(255, R + lift)},${Math.min(255, G + lift)},${Math.min(255, B + lift)},${0.03 + rnd() * 0.04})`;
    g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  }
  const img = g.getImageData(0, 0, s, s);
  const roughC = document.createElement('canvas'); roughC.width = roughC.height = s;
  const metalC = document.createElement('canvas'); metalC.width = metalC.height = s;
  const rimg = roughC.getContext('2d').createImageData(s, s);
  const mimg = metalC.getContext('2d').createImageData(s, s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const edge = Math.min(x, y, s - 1 - x, s - 1 - y) / s;
    const wear = Math.max(0, 1 - edge / 0.085);
    const scratch = Math.abs(Math.sin(x * 0.47 + y * 0.08)) > 0.988 && wear > 0.2 ? 0.55 : 0;
    const i = (y * s + x) * 4;
    const k = Math.min(1, wear * 0.4 + scratch * 0.35);
    const steel = 138;
    img.data[i] = img.data[i] * (1 - k) + steel * k;
    img.data[i + 1] = img.data[i + 1] * (1 - k) + (steel + 4) * k;
    img.data[i + 2] = img.data[i + 2] * (1 - k) + (steel + 8) * k;
    const rv = Math.min(255, 62 + wear * 130 + scratch * 70);
    rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = rv;
    rimg.data[i + 3] = 255;
    const mv = Math.min(255, wear * 150 + scratch * 90);
    mimg.data[i] = mimg.data[i + 1] = mimg.data[i + 2] = mv;
    mimg.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.globalAlpha = 0.1;
  const band = g.createLinearGradient(0, 0, s, s * 0.6);
  band.addColorStop(0, '#ffffff');
  band.addColorStop(0.42, 'rgba(255,255,255,0)');
  band.addColorStop(1, '#ffffff');
  g.fillStyle = band;
  g.fillRect(0, 0, s, s);
  g.globalAlpha = 1;
  g.strokeStyle = 'rgba(70,72,78,.45)';
  g.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const side = i % 4;
    g.beginPath();
    if (side === 0) { g.moveTo(rnd() * s, 3); g.lineTo(rnd() * s, 14); }
    else if (side === 1) { g.moveTo(3, rnd() * s); g.lineTo(16, rnd() * s); }
    else if (side === 2) { g.moveTo(rnd() * s, s - 4); g.lineTo(rnd() * s, s - 16); }
    else { g.moveTo(s - 4, rnd() * s); g.lineTo(s - 16, rnd() * s); }
    g.stroke();
  }
  roughC.getContext('2d').putImageData(rimg, 0, 0);
  metalC.getContext('2d').putImageData(mimg, 0, 0);
  const pack = {
    map: canvasTex(c, THREE.SRGBColorSpace),
    roughnessMap: canvasTex(roughC, THREE.NoColorSpace),
    metalnessMap: canvasTex(metalC, THREE.NoColorSpace)
  };
  paintCache.set(key, pack);
  return pack;
}

/** 方盒磁極：漆面貼圖含邊緣磨損 */
export function lacquer(hex) {
  const p = paintPack(hex);
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: p.map,
    roughnessMap: p.roughnessMap,
    metalnessMap: p.metalnessMap,
    metalness: 1,
    roughness: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.25,
    sheen: 0.28,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(hex).lerp(new THREE.Color(0xfff6ee), 0.55)
  });
}

/** 擠出造型（U 型）用純色烤漆，避免 UV 被拉花 */
export function lacquerSolid(hex) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    metalness: 0.2,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.2,
    sheen: 0.3,
    sheenRoughness: 0.48,
    sheenColor: 0xfff4ea
  });
}

const badgeCache = new Map();
function badgeTextures(letter, hex) {
  const key = letter + ':' + (hex >>> 0);
  if (badgeCache.has(key)) return badgeCache.get(key);
  const s = 256;
  const R = (hex >> 16) & 255, G = (hex >> 8) & 255, Bch = hex & 255;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  g.fillStyle = `rgb(${R},${G},${Bch})`;
  g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 8;
  g.beginPath(); g.arc(128, 128, 108, 0, TAU); g.stroke();
  g.font = '900 158px Georgia, "Times New Roman", serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 14;
  g.strokeStyle = 'rgba(0,0,0,.35)';
  g.strokeText(letter, 128, 140);
  g.fillStyle = '#fffaf6';
  g.fillText(letter, 128, 136);

  const h = document.createElement('canvas');
  h.width = h.height = s;
  const hg = h.getContext('2d');
  hg.fillStyle = '#000';
  hg.fillRect(0, 0, s, s);
  hg.fillStyle = '#fff';
  hg.beginPath(); hg.arc(128, 128, 108, 0, TAU); hg.fill();
  hg.fillStyle = '#000';
  hg.font = '900 150px Georgia, "Times New Roman", serif';
  hg.textAlign = 'center';
  hg.textBaseline = 'middle';
  hg.fillText(letter, 128, 138);
  const hd = hg.getImageData(0, 0, s, s);
  const nc = document.createElement('canvas');
  nc.width = nc.height = s;
  const nd = nc.getContext('2d').createImageData(s, s);
  for (let i = 0; i < nd.data.length; i += 4) { nd.data[i] = 128; nd.data[i + 1] = 128; nd.data[i + 2] = 255; nd.data[i + 3] = 255; }
  const H = (x, y) => hd.data[((y * s + x) * 4)] / 255;
  for (let y = 1; y < s - 1; y++) for (let x = 1; x < s - 1; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 3.2;
    const dy = (H(x, y + 1) - H(x, y - 1)) * 3.2;
    let nx = -dx, ny = -dy, nz = 1;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    const i = (y * s + x) * 4;
    nd.data[i] = (nx * 0.5 + 0.5) * 255;
    nd.data[i + 1] = (ny * 0.5 + 0.5) * 255;
    nd.data[i + 2] = nz * 255;
    nd.data[i + 3] = 255;
  }
  nc.getContext('2d').putImageData(nd, 0, 0);
  const map = canvasTex(c, THREE.SRGBColorSpace);
  const normalMap = canvasTex(nc, THREE.NoColorSpace);
  const pack = { map, normalMap };
  badgeCache.set(key, pack);
  return pack;
}

/** 極面浮凸 N／S。圓面朝 +Z，呼叫端再轉到極面 */
export function poleBadge(letter, hex, radius = 0.2) {
  const { map, normalMap } = badgeTextures(letter, hex);
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map,
    normalMap,
    normalScale: new THREE.Vector2(0.7, 0.7),
    metalness: 0.16,
    roughness: 0.34,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.15,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 36), mat);
  mesh.receiveShadow = true;
  return mesh;
}

export function bareCopper(o = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xd4894a,
    metalness: 1,
    roughness: 0.18,
    clearcoat: 0.28,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.55,
    ...o
  });
}

export function enamelCopper(o = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xc67a3e,
    metalness: 1,
    roughness: 0.22,
    clearcoat: 0.75,
    clearcoatRoughness: 0.26,
    envMapIntensity: 1.45,
    ...o
  });
}

export function brushedSteel(o = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xd7dde4,
    metalness: 1,
    roughness: 0.26,
    clearcoat: 0.22,
    clearcoatRoughness: 0.3,
    envMapIntensity: 1.45,
    ...o
  });
}

export function softIron(o = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xd4d9e0,
    metalness: 0.94,
    roughness: 0.24,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.4,
    ...o
  });
}

export function pvc(color, o = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.04,
    roughness: 0.42,
    clearcoat: 0.48,
    clearcoatRoughness: 0.34,
    ...o
  });
}

function studioScene() {
  const env = new THREE.Scene();
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(16, 10, 16),
    new THREE.MeshStandardMaterial({
      color: 0x000000, emissive: 0xf4eee4, emissiveIntensity: 1.15,
      roughness: 1, metalness: 0, side: THREE.BackSide, toneMapped: false
    })
  );
  env.add(wall);
  const panel = (w, h, color, intensity, x, y, z, tx, ty, tz) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        color: 0x000000, emissive: color, emissiveIntensity: intensity, roughness: 1, metalness: 0, toneMapped: false
      })
    );
    m.position.set(x, y, z);
    m.lookAt(tx, ty, tz);
    env.add(m);
  };
  panel(5.4, 3.6, 0xfff7ec, 9, -3.4, 2.8, 5.2, 0, 0.3, 0);
  panel(1.15, 0.75, 0xffffff, 22, -2.2, 3.35, 4.6, 0, 0.4, 0);
  panel(3.4, 2.6, 0xfff3e6, 4.2, 3.6, 1.1, 4.8, 0, 0.2, 0);
  panel(1.3, 5.2, 0xd5e6f6, 11, 5.2, 1.7, -4.2, 0, 0.6, 0);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshStandardMaterial({
      color: 0x000000, emissive: 0xe8c49a, emissiveIntensity: 2.4, roughness: 1, metalness: 0, toneMapped: false
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.6;
  env.add(floor);
  return env;
}

/**
 * 奶油色背景上的主光、補光、輪廓光，以及會讓金屬發亮的環境貼圖。
 * 畫質：課堂壓低 DPR／陰影／光暈，錄影 DPR 最高 3。
 */
export function mountLook(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studioScene(), 0.03).texture;

  scene.add(new THREE.HemisphereLight(0xfff8ef, 0xe6c7a2, 0.58));
  const sun = new THREE.DirectionalLight(0xfff2e0, 1.85);
  sun.position.set(-6.2, 14.5, 8.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 14, bottom: -10, near: 1, far: 50 });
  sun.shadow.bias = -0.00045;
  sun.shadow.radius = 5;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xfff6ea, 0.46);
  fill.position.set(10, 6, 8);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xd7e6f6, 0.62);
  rim.position.set(5, 8, -12);
  scene.add(rim);

  let saved = null;
  try { saved = localStorage.getItem('scilab-q'); } catch (e) { /* 無痕 */ }
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const weak = (navigator.hardwareConcurrency || 8) <= 4;
  let tier = saved === 'class' || saved === 'record' ? saved : (coarse || weak ? 'class' : 'record');

  function apply() {
    const rec = tier === 'record';
    const dpr = Math.min(window.devicePixelRatio || 1, rec ? 3 : 1.25);
    renderer.setPixelRatio(dpr);
    renderer.toneMappingExposure = rec ? 1.05 : 1.0;
    const sh = rec ? 2048 : 1024;
    if (sun.shadow.mapSize.x !== sh) {
      sun.shadow.mapSize.set(sh, sh);
      if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    }
    sun.shadow.radius = rec ? 5 : 2;
    return { dpr, rec };
  }

  function setTier(t) {
    tier = t === 'record' ? 'record' : 'class';
    try { localStorage.setItem('scilab-q', tier); } catch (e) { /* 無痕 */ }
  }

  return { sun, fill, rim, apply, setTier, tier: () => tier };
}

/** 依樣本強度做對數正規化，回傳 0（弱）～ 1（強） */
export function strengthNorm(values) {
  const arr = values.filter(v => v > 1e-8).sort((a, b) => a - b);
  if (!arr.length) return () => 0.55;
  const lo = arr[Math.floor(arr.length * 0.05)] || arr[0];
  const hi = arr[Math.min(arr.length - 1, Math.floor(arr.length * 0.97))];
  const a = Math.log(lo + 1e-4);
  const b = Math.log(Math.max(hi, lo * 1.08) + 1e-4);
  const span = b - a || 1;
  return m => {
    const u = Math.min(1, Math.max(0, (Math.log(m + 1e-4) - a) / span));
    return u * u * (3 - 2 * u);
  };
}

/** 磁力線圓管：weights 0–1，越強越粗、越亮（頂點色可超過 1，交給光暈） */
export function strengthTube(points, weights, baseR, radial = 6) {
  const geo = new THREE.BufferGeometry();
  const n = points.length;
  if (n < 2) return geo;
  const tang = [];
  for (let i = 0; i < n; i++) {
    const t = new THREE.Vector3();
    if (i === 0) t.subVectors(points[1], points[0]);
    else if (i === n - 1) t.subVectors(points[n - 1], points[n - 2]);
    else t.subVectors(points[i + 1], points[i - 1]);
    if (t.lengthSq() < 1e-12) t.set(0, 1, 0);
    tang.push(t.normalize());
  }
  const normals = [];
  const binorms = [];
  const ref = Math.abs(tang[0].y) < 0.85 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  normals.push(new THREE.Vector3().crossVectors(tang[0], ref).normalize());
  binorms.push(new THREE.Vector3().crossVectors(tang[0], normals[0]).normalize());
  for (let i = 1; i < n; i++) {
    const proj = normals[i - 1].clone().addScaledVector(tang[i], -normals[i - 1].dot(tang[i]));
    if (proj.lengthSq() < 1e-10) proj.crossVectors(tang[i], binorms[i - 1]);
    normals.push(proj.normalize());
    binorms.push(new THREE.Vector3().crossVectors(tang[i], normals[i]).normalize());
  }
  const pos = new Float32Array(n * radial * 3);
  const nrm = new Float32Array(n * radial * 3);
  const col = new Float32Array(n * radial * 3);
  const tmp = new THREE.Vector3();
  const nn = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const u = weights[i] ?? 0.5;
    const rad = baseR * (0.32 + 2.55 * Math.pow(u, 0.72));
    const cr = 0.42 + u * 1.15;
    const cg = 0.2 + u * 0.9;
    const cb = 0.06 + u * 0.48;
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * TAU;
      nn.copy(normals[i]).multiplyScalar(Math.cos(a)).addScaledVector(binorms[i], Math.sin(a));
      tmp.copy(points[i]).addScaledVector(nn, rad);
      const o = (i * radial + j) * 3;
      pos[o] = tmp.x; pos[o + 1] = tmp.y; pos[o + 2] = tmp.z;
      nrm[o] = nn.x; nrm[o + 1] = nn.y; nrm[o + 2] = nn.z;
      col[o] = cr; col[o + 1] = cg; col[o + 2] = cb;
    }
  }
  const idx = new Uint16Array((n - 1) * radial * 6);
  let p = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j;
      const b = i * radial + ((j + 1) % radial);
      const c = (i + 1) * radial + j;
      const d = (i + 1) * radial + ((j + 1) % radial);
      idx[p++] = a; idx[p++] = c; idx[p++] = b;
      idx[p++] = b; idx[p++] = c; idx[p++] = d;
    }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return geo;
}
