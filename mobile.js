/* =========================================================
   手機／平板適配（所有 3D 頁面共用）
   ---------------------------------------------------------
   1. 手機與直式平板：控制面板改成「底部抽屜」，最多佔 40% 高度
      右下角有懸浮的「收起／展開」按鈕，收起後 3D 畫面全螢幕
      <body data-mv-start="closed"> 的頁面在手機上一開始就是收起狀態
   1b. 在面板上滑動、拉滑桿時，事件不會穿透去轉動背景的 3D 視角
   2. 3D 畫面自動避開抽屜（setViewOffset），內容永遠在看得到的區域置中
   3. 直式螢幕自動把鏡頭拉遠，左右不會被切掉
   4. 次要面板（狀態監測儀、觀念提示）在手機上預設收合
   5. 按鈕加大到好點的尺寸
   6. 電腦／電子白板：控制面板是「側邊抽屜」，面板邊緣有 ◀／▶ 按鈕，
      收起後整個面板滑出畫面，只留按鈕；狀態在同一次上課中會記住
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
  .panel.glass {
    background: rgba(255,255,255,0.5);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 12px;
    color: #5d4037;
  }
  @media ${MQ} {
    .panel {
      position: fixed !important;
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
  .fab { display: none !important; }
  .mv-toggle .ic { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; color: #fff; font-size: .8rem;
    background: radial-gradient(circle at 35% 30%, #e9a06e, #c0703f 70%); box-shadow: inset 0 -2px 3px rgba(0,0,0,.18), 0 2px 5px rgba(192,112,63,.4);
    transition: transform .4s cubic-bezier(.2,.8,.2,1); }
  body.mv-closed .mv-toggle { bottom: calc(16px + env(safe-area-inset-bottom, 0px)); }
  body.mv-closed .mv-toggle .ic { transform: rotate(180deg); }
  @media (prefers-reduced-motion: reduce) { .panel, .mv-toggle, .mv-toggle .ic { transition: none !important; } }`;
  // 電腦／電子白板：側邊抽屜（行動版面以外才生效）
  const DESK = '(min-width: 1101px), (min-width: 769px) and (orientation: landscape)';
  css += `
  .pd-toggle { display: none; }
  @media ${DESK} {
    .panel.glass { background: rgba(255,255,255,0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
    .panel { transition: transform .3s ease-in-out; }
    body.pd-closed .panel { transform: translateX(calc(-100% - 60px)); pointer-events: none; }
    body.pd-closed.pd-right .panel { transform: translateX(calc(100% + 60px)); }
    .pd-toggle {
      display: grid; place-items: center; position: fixed; z-index: 41;
      min-width: 48px; min-height: 56px; padding: 0 6px; cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
      border: 1px solid rgba(255,255,255,.95); border-radius: 0 14px 14px 0;
      font: 900 1.15rem/1 "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif; color: #5d4037;
      background: rgba(255,255,255,.72); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      box-shadow: 0 8px 20px rgba(93,64,55,.18), 0 2px 5px rgba(93,64,55,.1);
      transition: left .3s ease-in-out, right .3s ease-in-out, background .2s ease, transform .12s ease;
    }
    body.pd-right .pd-toggle { border-radius: 14px 0 0 14px; }
    body.pd-off .pd-toggle { display: none; }
    body.pd-off.pd-closed .panel { transform: none; pointer-events: auto; }
    .pd-toggle:hover { background: rgba(255,255,255,.95); }
    .pd-toggle:active { transform: scale(.94); }
    .pd-toggle:focus-visible { outline: 2px solid #5d4037; outline-offset: 2px; }
  }
  @media (prefers-reduced-motion: reduce) { .pd-toggle { transition: none !important; } }`;
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

  // 面板、監測儀、說明卡上的滑動與點擊，不傳給 OrbitControls
  function blockCamera(el) {
    if (!el || el.dataset.mvGuard) return;
    el.dataset.mvGuard = '1';
    ['pointerdown', 'pointermove', 'touchstart', 'touchmove', 'wheel', 'mousedown'].forEach(t =>
      el.addEventListener(t, e => e.stopPropagation(), { passive: true }));
  }
  function guardUi() {
    document.querySelectorAll('.panel, .monitor, .concept, .hud, .dock, #side, .card').forEach(blockCamera);
  }

  let paintToggle = () => {};
  function setClosed(closed) {
    document.body.classList.toggle('mv-closed', !!closed);
    paintToggle();
  }

  // 懸浮收折按鈕＋觸控防誤觸
  function setupSheet() {
    guardUi();
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
    paintToggle = paint;
    btn.addEventListener('click', () => { document.body.classList.toggle('mv-closed'); paint(); });
    if (document.body.dataset.mvStart === 'closed' && isMobile()) document.body.classList.add('mv-closed');
    paint();
    document.body.classList.add('mv-on');
    document.body.appendChild(btn);
    // 按鈕永遠貼在抽屜上緣：用 CSS 變數記錄抽屜高度
    const sync = () => document.documentElement.style.setProperty('--mv-sheet', panel.offsetHeight + 'px');
    sync();
    if (window.ResizeObserver) new ResizeObserver(sync).observe(panel);
    window.addEventListener('resize', sync);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupSheet);
  else setupSheet();

  // 電腦／電子白板：側邊抽屜的收合按鈕
  function setupDrawer() {
    const panel = document.querySelector('.panel');
    if (!panel || document.querySelector('.pd-toggle')) return;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'pd-toggle';
    btn.setAttribute('aria-controls', panel.id || '');
    blockCamera(btn);
    document.body.appendChild(btn);
    const KEY = 'pd-closed';
    const isClosed = () => document.body.classList.contains('pd-closed');
    // 面板原本的位置（offset 不受滑出動畫影響），按鈕貼在面板外緣；收起時貼在螢幕邊
    function place() {
      const w = document.documentElement.clientWidth || window.innerWidth;
      const pl = panel.offsetLeft, pw = panel.offsetWidth, pt = panel.offsetTop;
      // 只有「浮在畫面側邊」的面板才做成抽屜；橫在頁面中的控制區（平面頁）不處理
      const pos = getComputedStyle(panel).position;
      document.body.classList.toggle('pd-off', !((pos === 'absolute' || pos === 'fixed') && pw < w * 0.6));
      const right = pl + pw / 2 > w / 2;
      document.body.classList.toggle('pd-right', right);
      btn.style.top = Math.max(8, pt + 10) + 'px';
      if (right) { btn.style.left = 'auto'; btn.style.right = (isClosed() ? 0 : Math.max(0, w - pl + 4)) + 'px'; }
      else { btn.style.right = 'auto'; btn.style.left = (isClosed() ? 0 : pl + pw + 4) + 'px'; }
      const openIcon = right ? '▶' : '◀', closedIcon = right ? '◀' : '▶';
      btn.textContent = isClosed() ? closedIcon : openIcon;
      btn.setAttribute('aria-expanded', String(!isClosed()));
      btn.setAttribute('aria-label', isClosed() ? '展開控制面板' : '收合控制面板');
      btn.title = isClosed() ? '展開控制面板' : '收合控制面板';
    }
    function setDrawer(closed) {
      document.body.classList.toggle('pd-closed', !!closed);
      try { sessionStorage.setItem(KEY, closed ? '1' : '0'); } catch (e) { /* 無痕模式 */ }
      place();
    }
    btn.addEventListener('click', () => setDrawer(!isClosed()));
    try { if (sessionStorage.getItem(KEY) === '1') document.body.classList.add('pd-closed'); } catch (e) { /* 無痕模式 */ }
    place();
    if (window.ResizeObserver) new ResizeObserver(place).observe(panel);
    window.addEventListener('resize', place);
    window.PanelDrawer = { toggle: () => setDrawer(!isClosed()), set: setDrawer, isClosed };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupDrawer);
  else setupDrawer();

  window.MobileView = {
    isMobile,
    setClosed,

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
