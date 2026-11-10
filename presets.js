/* 經典情境：把滑桿平滑拉到會考用的一組數字，不改原本的計算。 */
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function clampStep(el, value) {
  const min = el.min === '' ? -Infinity : Number(el.min);
  const max = el.max === '' ? Infinity : Number(el.max);
  let v = Math.min(max, Math.max(min, Number(value)));
  const step = Number(el.step);
  if (step) v = Math.round(v / step) * step;
  return v;
}

function setControl(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.tagName === 'SELECT') el.value = String(value);
  else el.value = String(clampStep(el, value));
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function tween(values, ms, done) {
  const from = {};
  Object.keys(values).forEach(id => {
    const el = document.getElementById(id);
    if (el && el.tagName !== 'SELECT') from[id] = Number(el.value);
  });
  const t0 = performance.now();
  function step(now) {
    const k = Math.min(1, (now - t0) / ms);
    const e = k * k * (3 - 2 * k);
    Object.keys(values).forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.tagName === 'SELECT' || from[id] === undefined) setControl(id, values[id]);
      else setControl(id, from[id] + (Number(values[id]) - from[id]) * e);
    });
    if (k < 1) requestAnimationFrame(step);
    else if (done) done();
  }
  requestAnimationFrame(step);
}

function goTab(tab) {
  if (!tab) return;
  const btn = document.querySelector(`.tab[data-tab="${tab}"]`);
  if (btn && !btn.classList.contains('on')) btn.click();
}

/**
 * @param {HTMLElement} host
 * @param {{label:string,title?:string,tab?:string,values?:object,clicks?:string[],instant?:boolean,after?:Function}[]} presets
 */
export function mountPresets(host, presets) {
  const style = document.createElement('style');
  style.textContent = `
  .lab-presets{margin:8px 0 10px}
  .lab-presets .cap{font-size:.78rem;font-weight:800;color:#5d4037;margin-bottom:6px}
  .lab-presets .row{display:flex;flex-wrap:wrap;gap:6px}
  .lab-presets button{flex:1 1 46%;min-height:36px;border:1px solid rgba(255,255,255,.9);border-radius:12px;cursor:pointer;
    background:rgba(255,255,255,.5);color:#5d4037;font:inherit;font-size:.74rem;font-weight:800;line-height:1.3;padding:6px 8px;
    backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
  .lab-presets button.on{background:#5d4037;color:#fff}
  .lab-tools{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}
  .lab-tools .btn{flex:1 1 40%}`;
  document.head.appendChild(style);
  const box = document.createElement('div');
  box.className = 'lab-presets';
  box.innerHTML = '<div class="cap">🎯 經典情境／快速展示</div><div class="row"></div>';
  const row = box.querySelector('.row');
  presets.forEach(p => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.label;
    if (p.title) b.title = p.title;
    b.addEventListener('click', () => {
      row.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      goTab(p.tab);
      const finish = () => {
        (p.clicks || []).forEach(sel => document.querySelector(sel)?.click());
        if (p.after) p.after();
      };
      if (!p.values) { finish(); return; }
      if (p.instant || reduce) {
        Object.entries(p.values).forEach(([id, v]) => setControl(id, v));
        finish();
      } else tween(p.values, 720, finish);
    });
    row.appendChild(b);
  });
  host.prepend(box);
  ['pointerdown', 'touchstart', 'wheel', 'mousedown'].forEach(ev =>
    box.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
  return box;
}
