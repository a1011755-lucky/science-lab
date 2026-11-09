/* =========================================================
   瀏覽統計（所有頁面共用）
   ---------------------------------------------------------
   ・每個頁面、每個瀏覽器分頁階段只算 1 次（重新整理不重複計算）
   ・同時累加「本頁」與「全站總計」兩個數字，存在 Firebase（jwen-57649）
     的 siteStats 集合；安全規則只允許「＋1」。
   ・老師本人不計入：在自己的電腦／手機打開任一頁並在網址後加 ?me=1
     （例如 …/science-lab/?me=1）一次即可；要取消請用 ?me=0。
   ========================================================= */
(function () {
  if (window.__siteStats) return; window.__siteStats = true;
  const PROJECT = 'jwen-57649', KEY = 'AIzaSyDcWJW37TJript_JlGTXY2x241b2Hjieys';
  const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
  const file = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  const page = file === 'index' ? 'home' : file.replace(/[^\w-]/g, '_').slice(0, 60);
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
  const sess = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } };

  // ?me=1／?me=0：設定這台裝置是不是老師本人
  const me = new URLSearchParams(location.search).get('me');
  if (me === '1') store('sl-owner', '1');
  if (me === '0') store('sl-owner', null);
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
  const owner = store('sl-owner') === '1' || local;   // 本機測試時也不計入

  const css = `
  .st-badge{position:fixed;right:16px;top:14px;z-index:2147482000;font:700 12px/1 "Noto Sans TC","Microsoft JhengHei",sans-serif;color:#5d4037;background:rgba(255,250,240,.88);border:1px solid #e8dfcf;padding:7px 11px;border-radius:999px;box-shadow:0 4px 12px rgba(93,64,55,.12);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);pointer-events:none;opacity:0;transition:opacity .4s}
  .st-badge.show{opacity:.92}
  .st-badge small{font-weight:700;opacity:.7;margin-left:4px}
  .st-toast{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2147483600;font:800 14px "Noto Sans TC","Microsoft JhengHei",sans-serif;color:#1f5f32;background:#e3f1e6;border:1.5px solid #3f9a57;padding:10px 16px;border-radius:14px;box-shadow:0 8px 20px rgba(0,0,0,.12)}
  @media (max-width:768px),(max-width:1100px) and (orientation:portrait){.st-badge{top:auto;bottom:118px;right:12px;font-size:11px;padding:6px 9px} body.mv-on:not(.mv-closed) .st-badge{display:none}}`;

  const num = d => Number(d && d.fields && d.fields.n && d.fields.n.integerValue) || 0;
  async function bump() {
    const w = p => ({ transform: { document: `projects/${PROJECT}/databases/(default)/documents/siteStats/${p}`, fieldTransforms: [{ fieldPath: 'n', increment: { integerValue: '1' } }] } });
    const r = await fetch(`${BASE}:commit?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes: [w(page), w('all')] }) });
    if (!r.ok) throw new Error('commit ' + r.status);
    const j = await r.json(); const v = i => Number(j.writeResults[i].transformResults[0].integerValue) || 0;
    return { page: v(0), all: v(1) };
  }
  async function read() {
    const g = async p => { const r = await fetch(`${BASE}/siteStats/${p}?key=${KEY}`); return r.ok ? num(await r.json()) : 0; };
    const [a, b] = await Promise.all([g(page), g('all')]); return { page: a, all: b };
  }
  function show(c) {
    if (!c || (!c.page && !c.all)) return;
    const hero = document.getElementById('heroStats');
    if (page === 'home' && hero) {                       // 首頁：在統計列加一格「累計瀏覽人次」
      let d = document.getElementById('stVisits');
      if (!d) { d = document.createElement('div'); d.className = 'stat'; d.id = 'stVisits'; hero.appendChild(d); }
      d.innerHTML = `<b>${c.all.toLocaleString()}</b><span>累計瀏覽人次</span>`;
      return;
    }
    const b = document.createElement('div'); b.className = 'st-badge';
    b.innerHTML = `👀 本頁瀏覽 ${c.page.toLocaleString()} 次${owner ? '<small>（你不計入）</small>' : ''}`;
    document.body.appendChild(b); requestAnimationFrame(() => b.classList.add('show'));
  }
  function toast(t) { const d = document.createElement('div'); d.className = 'st-toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 4000); }

  async function run() {
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    if (me === '1') toast('✅ 已設定：這台裝置的瀏覽不會被計入統計');
    if (me === '0') toast('已取消：這台裝置的瀏覽會重新被計入');
    const key = 'st-counted:' + page;
    let c = null;
    try {
      if (!owner && !sess(key)) { c = await bump(); sess(key, '1'); }
      else c = await read();
    } catch (e) { try { c = await read(); } catch (e2) { c = null; } }
    show(c);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
