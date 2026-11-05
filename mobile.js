/* =========================================================
   手機／平板適配（所有 3D 頁面共用）
   ---------------------------------------------------------
   1. 手機與直式平板：控制面板改成「底部抽屜」，最多佔 44% 高度
   2. 3D 畫面自動避開抽屜（setViewOffset），內容永遠在看得到的區域置中
   3. 直式螢幕自動把鏡頭拉遠，左右不會被切掉
   4. 次要面板（狀態監測儀、觀念提示）在手機上預設收合
   5. 按鈕加大到好點的尺寸
   使用方式：
     resetView() 最後呼叫  window.MobileView?.frame(camera, controls)
     每一幀 render 前呼叫   window.MobileView?.offset(camera)
   ========================================================= */
(function () {
  // 手機（≤ 760px）或直式平板（≤ 1100px 且直式）都視為「行動版面」
  const MQ = '(max-width: 760px), (max-width: 1100px) and (orientation: portrait)';
  const PHONE = '(max-width: 760px)';
  const isMobile = () => window.matchMedia(MQ).matches;

  const css = `
  @media ${MQ} {
    .panel {
      top: auto !important; bottom: 0 !important; left: 0 !important; right: 0 !important;
      width: auto !important; min-width: 0 !important;
      max-height: 44vh !important; max-height: 44dvh !important;
      border-radius: 22px 22px 0 0 !important;
      padding: 18px 16px calc(14px + env(safe-area-inset-bottom, 0px)) !important;
      -webkit-overflow-scrolling: touch;
    }
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
        document.querySelectorAll('.data, .monitor, .concept').forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.height && r.top < h * 0.3) top = Math.max(top, r.bottom);
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
