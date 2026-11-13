/* =========================================================
   立體霧面玻璃人體（各實驗室共用）
   ---------------------------------------------------------
   取代舊的「扁平剪影擠出＋橘色描邊」人形（看起來像薑餅人）：
   1. 軀幹：頭、頸、肩、胸、腰、臀一體成形的立體曲面（一圈一圈橢圓斷面疊起來）
   2. 四肢：上粗下細、帶一點肌肉弧度的圓潤肢段；手掌、腳掌是壓扁的橢球
   3. 材質：霧面玻璃。正對鏡頭的地方很透（看得到裡面的器官），
      輪廓邊緣自然變亮變實（菲涅耳效果），不需要另外描邊
   材質保留 color／emissive／opacity 三個屬性，各頁原本調顏色、透明度的程式不用改。
   不使用 transmission：穿透材質會讓後面的半透明物件消失，而且每個都要多畫一次場景。
   使用方式：
     import { figSkin, figTorso, figLimb, figHand, figFoot } from './figure.js';
   ========================================================= */
import * as THREE from 'three';

/** 霧面玻璃皮膚。op：整體濃度（0.1 很淡 ～ 0.4 明顯） */
export function figSkin(op = 0.3, color = 0xf4d6c4) {
  const m = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.45, metalness: 0, clearcoat: 0.45, clearcoatRoughness: 0.45,
    transparent: true, opacity: op, depthWrite: false, emissive: 0x000000, envMapIntensity: 0.6
  });
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
      float figF = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 1.7);   // 0＝正對鏡頭，1＝輪廓邊緣
      // 背景是米白色，所以邊緣要比皮膚色「深一階」的暖陶土色才看得清楚（用白色亮邊會整個融進背景）
      outgoingLight = mix(outgoingLight, diffuseColor.rgb * vec3(0.80, 0.62, 0.52) + totalEmissiveRadiance, figF * 0.72);
      float figO = diffuseColor.a;
      diffuseColor.a = clamp(figO * 0.4 + (0.3 + 1.7 * figO) * figF, 0.0, 1.0);            // 中央透、邊緣實
      #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'fig-glass-skin';
  return m;
}

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;

/** 一圈一圈橢圓斷面疊成的封閉曲面。rings：[{ y, rx, rz, z }]（由下到上） */
function loft(rings, seg = 44) {
  const pos = [], idx = [], n = rings.length;
  rings.forEach(r => { for (let j = 0; j < seg; j++) { const a = j / seg * Math.PI * 2; pos.push(Math.cos(a) * r.rx, r.y, (r.z || 0) + Math.sin(a) * r.rz); } });
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * seg + j, b = i * seg + (j + 1) % seg, c = a + seg, d = b + seg;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** 頭＋頸＋軀幹（左右對稱）。o 的欄位和舊的 holoBodyShape 相同，所以各頁的比例不用重調：
    hipY, hipW, waistY, waistW, chestY, chestW, shY, shW, neckY, neckW, headY, headR */
export function figTorsoGeo(o) {
  const V = (x, y) => new THREE.Vector2(x, y);
  // 正面輪廓的右半邊（由胯下往上到頭頂）
  const pts = [V(0, o.hipY), V(o.hipW * 0.72, o.hipY + 0.035 * o.hipW / 0.62), V(o.hipW, o.hipY + 0.5 * (o.waistY - o.hipY) * 0.8), V(o.waistW, o.waistY), V(o.chestW, o.chestY),
    // 肩膀：先到最寬處，再平緩地往頸部收（肩線接近水平，才不會變成瓶子形狀的溜肩）
    V(o.shW, o.shY - 0.3 * (o.shY - o.chestY)), V(o.shW * 0.97, o.shY - 0.04 * (o.shY - o.chestY)), V(o.shW * 0.62, o.shY + 0.2 * (o.neckY - o.shY)),
    V(o.neckW * 1.25, o.neckY - 0.45 * (o.neckY - o.shY)), V(o.neckW, o.neckY)];
  const t0 = -Math.acos(Math.min(0.98, o.neckW / o.headR));
  for (let i = 1; i <= 12; i++) { const t = t0 + (Math.PI / 2 - t0) * i / 12; pts.push(V(Math.cos(t) * o.headR, o.headY + Math.sin(t) * o.headR * 1.1)); }
  const prof = new THREE.SplineCurve(pts).getPoints(110);
  const D = o.chestW * 0.6;                                   // 胸腔的前後半徑
  const rings = prof.map(p => {
    const x = Math.max(0.0005, p.x), y = p.y;
    let rz;
    if (y <= o.chestY) rz = Math.min(x * 0.98, D * lerp(0.9, 1, smooth(o.hipY, o.chestY, y)));          // 臀到胸
    else if (y <= o.neckY) rz = Math.min(x, lerp(D, o.neckW, smooth(lerp(o.chestY, o.shY, 0.35), o.neckY, y)));   // 肩膀往頸部收
    else rz = x * 1.1;                                                                                // 頭：前後比左右略長
    // 胸口微微往前、後腦勺微微往後，側面看才不是一塊平板
    const z = y <= o.neckY ? D * 0.06 * Math.sin(Math.PI * smooth(o.waistY, o.neckY, y)) : -o.headR * 0.06 * smooth(o.neckY, o.headY, y);
    return { y, rx: x, rz: Math.max(0.0005, rz), z };
  });
  return loft(rings);
}

/** 圓潤的肢段：頂端在 y＝0（關節），往下長 len；w0、w1 是上、下端的寬度 */
export function figLimbGeo(len, w0, w1) {
  const r0 = w0 / 2, r1 = w1 / 2, P = [], N = 40;
  for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 * (1 - i / 10); P.push(new THREE.Vector2(Math.max(0.0005, Math.cos(a) * r0), Math.sin(a) * r0)); }      // 上端圓頭
  for (let i = 1; i < N; i++) { const t = i / N; P.push(new THREE.Vector2(lerp(r0, r1, t) * (1 + 0.1 * Math.sin(Math.PI * Math.pow(t, 0.7))), -len * t)); }   // 中段帶一點肌肉弧度
  for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 * i / 10; P.push(new THREE.Vector2(Math.max(0.0005, Math.cos(a) * r1), -len - Math.sin(a) * r1)); }   // 下端圓頭
  const g = new THREE.LatheGeometry(P.reverse(), 28);
  g.scale(1, 1, 0.9); g.computeVertexNormals();
  return g;
}

const mesh = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.renderOrder = 8; return m; };
export const figTorso = (o, mat) => mesh(figTorsoGeo(o), mat);
export const figLimb = (len, w0, w1, mat) => mesh(figLimbGeo(len, w0, w1), mat);
/** 手掌：壓扁的橢球（rx 寬、ry 長） */
export function figHand(rx, ry, mat) { const m = mesh(new THREE.SphereGeometry(1, 24, 16), mat); m.scale.set(rx, ry, rx * 0.5); return m; }
/** 腳掌：往前伸的橢球（寬 w、高 h、長 d） */
export function figFoot(w, h, d, mat) { const m = mesh(new THREE.SphereGeometry(1, 24, 16), mat); m.scale.set(w, h, d); return m; }
