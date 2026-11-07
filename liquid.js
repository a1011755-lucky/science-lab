/* =========================================================
   液體辨識度強化（所有 3D 頁面共用）
   ---------------------------------------------------------
   米色背景很亮，透明的水很容易跟背景融在一起。這裡做三件事：
   1. 邊緣加深（Fresnel）：越接近輪廓的地方，顏色越深、越不透明，
      就像真實的水在玻璃杯裡，邊緣看起來比較濃
   2. 水面線＋輪廓線：在液面、液體邊緣描一圈深色細線，一眼看出水位
   3. 接近無色的水：邊緣自動用柔和的藍色呈現
   邊緣顏色會跟著液體顏色自動變化（例如溶液變色、油變成乳白色）。
   使用方式：
     import { enhanceLiquid, patchLiquid } from './liquid.js';
     enhanceLiquid(mesh)            // 材質＋水面線（一般液體）
     patchLiquid(material)          // 只改材質（材質由工廠函式產生、會被替換時）
   ========================================================= */
import * as THREE from 'three';

const DEFAULTS = { rim: 0.62, alpha: 0.42, minOpacity: 0.28 };
const DONE = new WeakSet();                               // 已處理過的材質（用 WeakSet，clone 出來的新材質不會被誤判）

/** 修改液體材質：邊緣加深、加濃 */
export function patchLiquid(mat, o = {}) {
  if (!mat || DONE.has(mat)) return mat;
  const opt = { ...DEFAULTS, ...o };
  DONE.add(mat);
  if (mat.transparent && mat.opacity < opt.minOpacity) mat.opacity = opt.minOpacity;
  const uni = { uLqRim: { value: opt.rim }, uLqAlpha: { value: mat.transparent ? opt.alpha : 0 } };
  mat.userData.liquidUniforms = uni;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, r) => {
    if (prev) prev(shader, r);
    Object.assign(shader.uniforms, uni);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform float uLqRim;\nuniform float uLqAlpha;\nvoid main() {')
      .replace('#include <opaque_fragment>', `
        {
          // 邊緣係數：視線越斜（輪廓、液面）越大
          float lqF = 1.0 - abs( dot( normalize( normal ), normalize( vViewPosition ) ) );
          lqF = smoothstep( 0.12, 0.95, lqF );
          // 由液體本身的顏色推出「更深、更飽和」的邊緣色；接近無色時用柔和藍
          vec3 lqB = diffuse;
          float lqMax = max( max( lqB.r, lqB.g ), lqB.b ), lqMin = min( min( lqB.r, lqB.g ), lqB.b );
          float lqSat = ( lqMax - lqMin ) / max( lqMax, 1e-3 );
          vec3 lqHue = mix( vec3( 0.25, 0.62, 1.0 ), lqB / max( lqMax, 1e-3 ), smoothstep( 0.08, 0.2, lqSat ) );
          vec3 lqRim = pow( lqHue, vec3( 2.2 ) ) * 0.42;
          outgoingLight = mix( outgoingLight, lqRim, lqF * uLqRim );
          diffuseColor.a = min( 1.0, diffuseColor.a + lqF * uLqAlpha );
        }
        #include <opaque_fragment>`);
  };
  const prevKey = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (prevKey ? prevKey() : '') + '|liquid';
  mat.needsUpdate = true;
  return mat;
}

const tmpC = new THREE.Color(), tmpH = {};
/** 依液體顏色算出輪廓線顏色（sRGB） */
function lineColor(base, out) {
  base.getHSL(tmpH, THREE.SRGBColorSpace);
  if (tmpH.s < 0.12) { tmpH.h = 0.57; tmpH.s = 0.55; }
  return out.setHSL(tmpH.h, Math.min(1, tmpH.s * 1.15 + 0.15), 0.36, THREE.SRGBColorSpace);
}

/** 液體網格：改材質＋加上水面線／輪廓線 */
export function enhanceLiquid(mesh, o = {}) {
  if (!mesh) return mesh;
  const list = [];
  mesh.traverse ? mesh.traverse(m => { if (m.isMesh) list.push(m); }) : list.push(mesh);
  for (const m of list) {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach(mt => patchLiquid(mt, o));
    if (o.edges === false || m.userData.__liquidEdges) continue;
    m.userData.__liquidEdges = true;
    const edges = new THREE.EdgesGeometry(m.geometry, o.edgeAngle ?? 25);
    if (!edges.attributes.position.count) continue;
    const lm = new THREE.LineBasicMaterial({ transparent: true, opacity: o.edgeOpacity ?? 0.8, depthWrite: false });
    const line = new THREE.LineSegments(edges, lm);
    line.renderOrder = (m.renderOrder || 0) + 1;
    line.raycast = () => {};
    line.onBeforeRender = () => {                       // 材質可能被換掉（例如換溶液），每次都讀目前的材質
      const mt = Array.isArray(m.material) ? m.material[0] : m.material;
      lineColor(mt.color, lm.color);
      lm.opacity = (o.edgeOpacity ?? 0.8) * (mt.transparent ? Math.min(1, 0.4 + mt.opacity) : 1);
    };
    line.visible = true;
    m.add(line);
  }
  return mesh;
}
