/* =========================================================
   手機／平板適配（所有 3D 頁面共用）
   ---------------------------------------------------------
   1. 手機與直式平板：控制面板改成「底部抽屜」，最多佔 40% 高度
      右下角有懸浮的「收起／展開」按鈕，收起後 3D 畫面全螢幕
   1b. 在面板上滑動、拉滑桿時，事件不會穿透去轉動背景的 3D 視角
   2. 3D 畫面自動避開抽屜（setViewOffset），內容永遠在看得到的區域置中
   3. 直式螢幕自動把鏡頭拉遠，左右不會被切掉
   4. 次要面板（狀態監測儀、觀念提示）在手機上預設收合
   5. 按鈕加大到好點的尺寸
   使用方式：
     resetView() 最後呼叫  window.MobileView?.frame(camera, controls)
     每一幀 render 前呼叫   window.MobileView?.offset(camera)
   ========================================================= */
(function () {
  // 手機（≤ 768px）或直式平板（≤ 1100px 且直式）都視為「行動版面」
  const MQ = '(max-width: 768px), (max-width: 1100px) and (orientation: portrait)';
  const PHONE = '(max-width: 760px)';
  const isMobile = () => window.matchMedia(MQ).matches;

  let css = `
  @media ${MQ} {
    .panel {
      top: auto !important; bottom: 0 !important; left: 0 !important; right: 0 !important;
      width: auto !important; min-width: 0 !important;
      max-height: 40vh !important; max-height: 40dvh !important;
      border-radius: 22px 22px 0 0 !important;
      padding: 18px 16px calc(14px + env(safe-area-inset-bottom, 0px)) !important;
      -webkit-overflow-scrolling: touch;
      overflow-y: auto !important;
      touch-action: pan-y;                 /* 面板內只允許上下捲動，不會帶動 3D 視角 */
      overscroll-behavior: contain;        /* 捲到底也不會把整頁拖動 */
      transition: transform .4s cubic-bezier(.2,.8,.2,1), opacity .3s ease;
    }
    .panel input[type=range] { touch-action: none; }   /* 拉滑桿時只動滑桿 */
    body.mv-closed .panel { transform: translateY(calc(100% + 30px)); opacity: 0; pointer-events: none; }
    .panel > .collapse { display: none !important; }    /* 手機改用右下角的懸浮按鈕 */
    .panel.collapsed .body { display: block !important; }
    .mv-toggle { display: flex !important; }
    .panel.collapsed { padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)) !important; }
    .panel::after {
      content: ""; position: absolute; top: 7px; left: 50%; width: 38px; height: 4px; margin-left: -19px;
      border-radius: 2px; background: rgba(128,128,128,.4);
    }
    .tag { font-size: .62rem !important; padding: 2px 7px !important; }
    .tag small { font-size: .56rem !important; }
    .hint { display: none !important; }
    .btn, .tab, .mode-btn, .seg button, .preset, .layer-btn, select { min-height: 42px; }
    .collapse, .toggle { min-height: 32px; padding: 5px 14px !important; font-size: .8rem !important; }
    .tabs { display: flex !important; gap: 6px !important; }
    .tabs .tab { flex: 1 1 0; text-align: center; font-size: .74rem !important; padding: 6px 4px !important; line-height: 1.3; }
    .banner { top: 8px !important; left: 8px !important; right: 8px !important; transform: none !important; max-width: none !important; }
    .banner .big { font-size: 1rem !important; }
  }
  @media ${PHONE} {
    .monitor, .concept {
      top: 8px !important; left: 8px !important; right: auto !important;
      width: auto !important; max-width: calc(100vw - 16px) !important; padding: 10px 12px !important;
    }
    .monitor.collapsed, .concept.collapsed { padding-right: 84px !important; }
    .monitor .collapse, .concept .collapse { top: 8px !important; right: 8px !important; }
    .topbar .cell { padding: 6px 8px !important; }
    .topbar .v { font-size: .9rem !important; }
  }`;
  // 懸浮收折按鈕（只在行動版面顯示）
  css += `
  .mv-toggle {
    display: none; position: fixed; z-index: 40; right: calc(12px + env(safe-area-inset-right, 0px));
    bottom: calc(var(--mv-sheet, 0px) + 10px);
    align-items: center; gap: 6px; border: 1px solid rgba(255,255,255,.95); border-radius: 999px; padding: 9px 15px 9px 12px; min-height: 42px;
    font: inherit; font-size: .84rem; font-weight: 800; color: #3b3127; cursor: pointer; -webkit-tap-highlight-color: transparent;
    background: linear-gradient(180deg, rgba(255,253,248,.92), rgba(246,238,224,.86));
    backdrop-filter: blur(16px) saturate(160%); -webkit-backdrop-filter: blur(16px) saturate(160%);
    box-shadow: 0 10px 24px rgba(90,60,30,.2), 0 2px 5px rgba(90,60,30,.12), inset 0 2px 0 rgba(255,255,255,.95), inset 0 -3px 0 rgba(120,90,60,.1);
    transition: bottom .4s cubic-bezier(.2,.8,.2,1), transform .15s ease, box-shadow .2s ease;
  }
  .mv-toggle:active { transform: scale(.95); box-shadow: 0 4px 10px rgba(90,60,30,.18), inset 0 2px 4px rgba(120,90,60,.15); }
  .mv-toggle .ic { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; color: #fff; font-size: .8rem;
    background: radial-gradient(circle at 35% 30%, #e9a06e, #c0703f 70%); box-shadow: inset 0 -2px 3px rgba(0,0,0,.18), 0 2px 5px rgba(192,112,63,.4);
    transition: transform .4s cubic-bezier(.2,.8,.2,1); }
  body.mv-closed .mv-toggle { bottom: calc(16px + env(safe-area-inset-bottom, 0px)); }
  body.mv-closed .mv-toggle .ic { transform: rotate(180deg); }
  @media (prefers-reduced-motion: reduce) { .panel, .mv-toggle, .mv-toggle .ic { transition: none !important; } }`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // 手機上預設收合次要面板，讓出畫面
  function collapseSecondary() {
    if (!window.matchMedia(PHONE).matches) return;
    document.querySelectorAll('.monitor .collapse, .concept .collapse').forEach(b => {
      const p = b.closest('.monitor, .concept');
      if (p && !p.classList.contains('collapsed')) b.click();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(collapseSecondary, 0));
  else setTimeout(collapseSecondary, 0);

  // 懸浮收折按鈕＋觸控防誤觸
  function setupSheet() {
    const panel = document.querySelector('.panel');
    if (!panel || document.querySelector('.mv-toggle')) return;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'mv-toggle';
    btn.setAttribute('aria-controls', panel.id || '');
    const paint = () => {
      const closed = document.body.classList.contains('mv-closed');
      btn.innerHTML = closed ? '<span class="ic">▾</span>展開控制面板' : '<span class="ic">▾</span>收起面板';
      btn.setAttribute('aria-expanded', String(!closed));
      btn.setAttribute('aria-label', closed ? '展開控制面板' : '收起控制面板');
    };
    btn.addEventListener('click', () => { document.body.classList.toggle('mv-closed'); paint(); });
    paint();
    document.body.appendChild(btn);
    // 按鈕永遠貼在抽屜上緣：用 CSS 變數記錄抽屜高度
    const sync = () => document.documentElement.style.setProperty('--mv-sheet', panel.offsetHeight + 'px');
    sync();
    if (window.ResizeObserver) new ResizeObserver(sync).observe(panel);
    window.addEventListener('resize', sync);
    // 在面板上的手勢不往外傳，避免觸發背景 3D 的旋轉／縮放
    ['pointerdown', 'touchstart', 'touchmove', 'wheel', 'mousedown'].forEach(t =>
      panel.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupSheet);
  else setupSheet();

  window.MobileView = {
    isMobile,

    /** 直式螢幕：把鏡頭沿視線往後拉，讓整個場景塞得進窄螢幕 */
    frame(camera, controls, extra = 1) {      // extra：特別寬的場景可多退一點
      if (!camera || !controls) return;
      const aspect = window.innerWidth / window.innerHeight;
      if (aspect >= 1.25) return;
      const k = Math.max(1, Math.min(2.0, 1.0 / aspect) * extra);
      const off = camera.position.clone().sub(controls.target).multiplyScalar(k);
      controls.maxDistance = Math.max(controls.maxDistance || 0, off.length() * 1.4);
      camera.position.copy(controls.target).add(off);
      controls.update();
    },

    /** 每一幀：讓畫面中心落在「抽屜上方」的可見區域，並限制直式 FOV 以免變形 */
    offset(camera) {
      if (!camera) return;
      // 用版面尺寸（與 getBoundingClientRect 同單位），避免縮放模擬時 innerHeight 與版面不一致
      const de = document.documentElement;
      const w = de.clientWidth || window.innerWidth, h = de.clientHeight || window.innerHeight;
      let oy = 0;
      if (isMobile()) {
        // 下方：底部抽屜；上方：資料面板／狀態監測儀／提示板（若有且展開）
        const p = document.querySelector('.panel');
        const bottom = p ? Math.max(0, h - p.getBoundingClientRect().top) : 0;
        let top = 0;
        document.querySelectorAll('.data, .monitor, .concept, .tip, .dock').forEach(el => {
          const r = el.getBoundingClientRect();
          const visible = r.height && getComputedStyle(el).opacity !== '0';
          if (visible && r.top < h * 0.3) top = Math.max(top, r.bottom);
        });
        oy = Math.round((bottom - top) * 0.5);
      }
      let fovChanged = false;
      if (w / h < 1 && camera.fov > 50) { camera.fov = 50; fovChanged = true; }
      const key = `${w}x${h}:${oy}:${camera.fov}`;
      if (camera.userData.__mobileKey === key && !fovChanged) return;
      camera.userData.__mobileKey = key;
      if (Math.abs(oy) > 1) camera.setViewOffset(w, h, 0, oy, w, h);
      else camera.clearViewOffset();
      camera.updateProjectionMatrix();
    }
  };
})();
