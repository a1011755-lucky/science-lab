/* =========================================================
   畫質切換（課堂／錄影）＋控制面板毛玻璃
   ---------------------------------------------------------
   ・課堂：像素比上限 1.25，平板才不會卡
   ・錄影：像素比上限 2，畫面較細
   選擇記在這個瀏覽器裡。頁面用 window.Look.pixelRatio()
   取代原本寫死的上限；切換時會觸發 resize，沿用各頁原本的縮放。
   ========================================================= */
(function () {
  const KEY = 'lab-look';
  let mode = 'class';
  try { if (localStorage.getItem(KEY) === 'record') mode = 'record'; } catch (e) { /* 無痕模式 */ }

  function cap() { return mode === 'record' ? 2 : 1.25; }
  function pixelRatio() { return Math.min(window.devicePixelRatio || 1, cap()); }

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
    window.dispatchEvent(new Event('resize'));
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

  window.Look = { pixelRatio, cap, setMode, get mode() { return mode; } };
})();
