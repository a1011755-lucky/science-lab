/* 沒有東西在動、分頁被藏起來時，停掉 requestAnimationFrame。一有操作再醒來。 */
export function runAdaptive(step, { always = false, autostart = true } = {}) {
  let raf = 0;
  let last = performance.now();
  let hold = 0;
  function loop(now) {
    raf = 0;
    if (document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const busy = !!step(dt);
    if (always || busy || now < hold) raf = requestAnimationFrame(loop);
  }
  function wake(ms = 900) {
    hold = Math.max(hold, performance.now() + ms);
    if (document.hidden || raf) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else wake(400);
  });
  ['pointerdown', 'pointermove', 'wheel', 'input', 'change', 'keydown', 'touchstart'].forEach(ev => {
    document.addEventListener(ev, () => wake(ev === 'pointermove' ? 240 : 1200), { passive: true });
  });
  if (autostart) wake(600);
  return { wake };
}

/** 換頁或清掉暫時物件時，把渲染器暫存的清單放掉。 */
export function releaseLists(renderer) {
  if (renderer?.renderLists?.dispose) renderer.renderLists.dispose();
}
