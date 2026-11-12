/* =========================================================
   畫質切換（課堂／錄影）＋控制面板毛玻璃＋低階裝置
   ---------------------------------------------------------
   ・課堂：像素比上限 1.25
   ・錄影：像素比上限 2（不會自動降成低階）
   ・低階（手機、直式平板、記憶體 ≤ 4GB 等）：像素比上限 1
     （deviceMemory ≤ 2 時為 0.75）、關閉陰影、縮小陰影貼圖
   選擇記在這個瀏覽器裡。頁面用 window.Look.pixelRatio()
   取代原本寫死的上限；切換時會觸發 resize，沿用各頁原本的縮放。
   分頁被藏起來時暫停 requestAnimationFrame，回到前景再接著畫。
   ========================================================= */
(function () {
  const KEY = 'lab-look';
  const STEP_KEY = 'lab-look-fps';
  let mode = 'class';
  try { if (localStorage.getItem(KEY) === 'record') mode = 'record'; } catch (e) { /* 無痕模式 */ }

  const nativeRAF = window.requestAnimationFrame.bind(window);
  const nativeCAF = window.cancelAnimationFrame.bind(window);

  const mq = window.matchMedia('(max-width: 768px), (max-width: 1100px) and (orientation: portrait)');
  let gpuHint = false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '') : '';
      gpuHint = /Mali|Adreno|PowerVR|VideoCore/i.test(renderer);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    }
  } catch (e) { /* 沒有 WebGL */ }

  function detectLow() {
    const mobile = mq.matches;
    const mem = navigator.deviceMemory;
    const cores = navigator.hardwareConcurrency;
    const lowMem = typeof mem === 'number' && mem <= 4;
    const lowCores = typeof cores === 'number' && cores <= 4;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const touchOnly = coarse && window.matchMedia('(hover: none)').matches;
    if (mobile || lowMem) return true;
    if (touchOnly && (lowCores || gpuHint)) return true;
    if (gpuHint && lowCores && coarse) return true;
    return false;
  }

  let autoLow = detectLow();
  let forcedLow = false;
  try { if (sessionStorage.getItem(STEP_KEY) === '1') forcedLow = true; } catch (e) { /* 無痕模式 */ }

  function isLow() { return mode !== 'record' && (autoLow || forcedLow); }

  function cap() {
    if (mode === 'record') return 2;
    if (isLow()) {
      const mem = navigator.deviceMemory;
      if (typeof mem === 'number' && mem <= 2) return 0.75;
      return 1;
    }
    return 1.25;
  }
  function pixelRatio() { return Math.min(window.devicePixelRatio || 1, cap()); }
  function segments(high, low) { return isLow() ? low : high; }
  function particles(high, low) { return isLow() ? low : high; }
  function shadowSize(high) {
    const h = high || 2048;
    return isLow() ? Math.min(512, h) : h;
  }

  const renderers = new Set();
  const lights = new Set();
  function applyRenderer(renderer) {
    if (renderer && renderer.shadowMap) renderer.shadowMap.enabled = !isLow();
  }
  function applyLight(light) {
    if (!light || !light.shadow || !light.shadow.mapSize) return;
    const hi = light.userData.__hiShadow || light.shadow.mapSize.x || 2048;
    const n = isLow() ? Math.min(512, hi) : hi;
    if (light.shadow.mapSize.x !== n) {
      light.shadow.mapSize.set(n, n);
      if (light.shadow.map) { light.shadow.map.dispose(); light.shadow.map = null; }
    }
  }
  function applyAll() {
    document.documentElement.classList.toggle('look-low', isLow());
    renderers.forEach(applyRenderer);
    lights.forEach(applyLight);
  }
  function bindRenderer(renderer) {
    if (!renderer) return;
    renderers.add(renderer);
    applyRenderer(renderer);
  }
  function bindLight(light) {
    if (!light || !light.shadow || !light.shadow.mapSize) return;
    if (!light.userData.__hiShadow) light.userData.__hiShadow = light.shadow.mapSize.x || 2048;
    lights.add(light);
    applyLight(light);
  }
  function refresh() {
    applyAll();
    window.dispatchEvent(new Event('resize'));
  }

  const css = `
  .panel.glass {
    background: rgba(255,255,255,0.5);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 12px;
    color: #5d4037;
  }
  .look-toggle {
    position: fixed; z-index: 35; top: 8px; left: 50%; transform: translateX(-50%);
    display: flex; gap: 2px; padding: 3px; border-radius: 999px;
    background: rgba(255,255,255,0.5); color: #5d4037;
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,.85);
    box-shadow: 0 6px 16px rgba(93,64,55,.12);
    font: 700 12px/1 "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;
  }
  .look-toggle button {
    border: none; cursor: pointer; font: inherit; color: #5d4037;
    background: transparent; border-radius: 999px; padding: 6px 10px; min-height: 28px;
  }
  .look-toggle button.on { background: #5d4037; color: #fff; }
  html.look-low .panel,
  html.look-low .glass,
  html.look-low .look-toggle,
  html.look-low .kp-card,
  html.look-low .dock,
  html.look-low .mv-toggle {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  @media (max-width: 768px), (max-width: 1100px) and (orientation: portrait) {
    .look-toggle { top: auto; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }
    body.mv-on:not(.mv-closed) .look-toggle { display: none; }
  }`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  let bar = null;
  function paint() {
    if (!bar) return;
    bar.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.look === mode));
  }
  function setMode(next) {
    mode = next === 'record' ? 'record' : 'class';
    try { localStorage.setItem(KEY, mode); } catch (e) { /* 無痕模式 */ }
    paint();
    refresh();
  }
  function mount() {
    if (document.querySelector('.look-toggle')) return;
    bar = document.createElement('div');
    bar.className = 'look-toggle';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', '畫質');
    bar.innerHTML = '<button type="button" data-look="class">課堂</button><button type="button" data-look="record">錄影</button>';
    bar.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) setMode(b.dataset.look);
    });
    ['pointerdown', 'touchstart', 'wheel', 'mousedown'].forEach(ev =>
      bar.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
    paint();
    document.body.appendChild(bar);
    if (window.MobileView) document.body.classList.add('mv-on');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  /* 背景分頁：取消進行中的畫面更新，回到前景再接著呼叫同一次回呼。
     已使用 perf.js runAdaptive 的頁面會自行取消並重開，這裡不會再多開一條迴圈。 */
  if (!window.__labRafPause) {
    window.__labRafPause = true;
    let seq = 1;
    const callbacks = new Map();
    const nativeIds = new Map();
    const paused = [];
    function arm(id) {
      const cb = callbacks.get(id);
      if (!cb || document.hidden) return;
      const nid = nativeRAF(function (t) {
        nativeIds.delete(id);
        callbacks.delete(id);
        cb(t);
      });
      nativeIds.set(id, nid);
    }
    window.requestAnimationFrame = function (cb) {
      const id = seq++;
      callbacks.set(id, cb);
      if (document.hidden) paused.push(id);
      else arm(id);
      return id;
    };
    window.cancelAnimationFrame = function (id) {
      const i = paused.indexOf(id);
      if (i >= 0) paused.splice(i, 1);
      callbacks.delete(id);
      const nid = nativeIds.get(id);
      if (nid != null) { nativeCAF(nid); nativeIds.delete(id); }
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        nativeIds.forEach((nid, id) => {
          nativeCAF(nid);
          if (callbacks.has(id)) paused.push(id);
        });
        nativeIds.clear();
      } else {
        const ids = paused.splice(0, paused.length);
        ids.forEach(arm);
      }
    });
  }

  /* 課堂模式若連續幾秒低於約 26fps，這個分頁降到低階一次。錄影模式不降。 */
  if (!isLow()) {
    const born = performance.now();
    let frames = 0;
    let windowStart = 0;
    let streak = 0;
    const watch = (now) => {
      if (isLow() || mode === 'record') return;
      if (document.hidden) { window.requestAnimationFrame(watch); return; }
      if (!windowStart || now - born < 2500) { windowStart = now; frames = 0; window.requestAnimationFrame(watch); return; }
      frames++;
      if (now - windowStart >= 1000) {
        const fps = frames * 1000 / (now - windowStart);
        frames = 0;
        windowStart = now;
        if (fps < 26) {
          streak += 1;
          if (streak >= 3) {
            forcedLow = true;
            try { sessionStorage.setItem(STEP_KEY, '1'); } catch (e) { /* 無痕模式 */ }
            refresh();
            return;
          }
        } else streak = 0;
      }
      window.requestAnimationFrame(watch);
    };
    window.requestAnimationFrame(watch);
  }

  if (mq.addEventListener) {
    mq.addEventListener('change', () => {
      const next = detectLow();
      if (next === autoLow) return;
      autoLow = next;
      refresh();
    });
  }

  applyAll();

  window.Look = {
    pixelRatio,
    cap,
    setMode,
    segments,
    particles,
    shadowSize,
    bindRenderer,
    bindLight,
    get mode() { return mode; },
    get low() { return isLow(); },
    get shadows() { return !isLow(); }
  };
})();
