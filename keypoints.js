/* =========================================================
   會考出題重點（各實驗室共用）
   ---------------------------------------------------------
   依檔名（可再用 #hash 覆寫）顯示 3～5 條短句。
   卡片放進既有 .panel，手機上跟控制面板同一個底部抽屜。
   沒有對應條目的頁面什麼都不顯示。
   ========================================================= */
(function () {
  const HEART = [
    '「動脈」是把血送離心臟，「靜脈」是把血送回心臟，不能用含氧量來判斷。肺動脈流的是缺氧血，肺靜脈流的是充氧血。',
    '人體是閉鎖式雙循環：肺循環＋體循環。左心室壁最厚，負責把血打到全身。',
    '瓣膜只能單向開啟，可防止血液逆流；心音和瓣膜關閉有關。',
    '血液由血漿、紅血球、白血球和血小板組成（紅血球運氧、白血球防禦、血小板凝血）。',
    '淋巴循環可回收組織液，並和人體的防禦作用（抗原、抗體）有關。'
  ];
  const FOSSIL = [
    '未被翻動的沉積岩地層，越下層越古老。指標化石可用來判斷地層的地質年代。',
    '馬的演化：環境由森林轉為草原後，體型變大、腳趾減少、臼齒咀嚼面變大。',
    '始祖鳥同時具有爬蟲類（牙齒、指爪、長尾骨）和鳥類（羽毛）的特徵，是過渡物種。'
  ];

  const COPY = {
    'life-lab.html': [
      '生命現象通常指代謝、生長、感應、生殖；不是所有生物都會「運動」，會動也不等於是生物。',
      '科學方法：先觀察、提出問題與假說，實驗組和對照組只能有一個操縱變因。',
      '顯微鏡總放大倍率＝目鏡倍率 × 物鏡倍率。',
      '複式顯微鏡的成像上下顛倒、左右相反；要先用低倍，換高倍後只能轉細調節輪。',
      '複式顯微鏡適合觀察透光、很薄的標本；不透光或有厚度的標本改用解剖顯微鏡。'
    ],
    'cell-lab.html': [
      '細胞是生物體的基本單位（細胞學說；施萊登、施旺提出）。虎克看到的是軟木塞死細胞的細胞壁。',
      '植物細胞有細胞壁、葉綠體和大型液胞；動物細胞沒有細胞壁，在低張溶液中可能破裂。',
      '擴散：物質由高濃度往低濃度移動。滲透：水分子經細胞膜上的蛋白質通道進出。',
      '高張溶液中植物細胞會發生質壁分離（細胞膜萎縮，細胞壁形狀不變）；主動運輸則要消耗能量，由低濃度運向高濃度。',
      '多細胞生物的組成層次：細胞 → 組織 → 器官 → 器官系統 → 個體。'
    ],
    'nutrition-lab.html': [
      '碘液測澱粉：黃褐色變藍黑色。本氏液測葡萄糖：必須隔水加熱，藍色可變成綠、黃、橙、紅。',
      '1 公克醣類或蛋白質約 4 大卡，1 公克脂質約 9 大卡。',
      '光合作用：二氧化碳＋水，在光和葉綠體的作用下，產生葡萄糖＋氧氣。',
      '氣孔由保衛細胞圍成，是氣體進出和蒸散的門戶；陸生植物氣孔多在下表皮。',
      '小分子養分主要在小腸絨毛吸收；膽汁由肝臟製造，不含酵素，但能乳化脂質。'
    ],
    'enzyme-lock-key.html': [
      '酵素具有專一性，常用鎖和鑰匙來比喻。',
      '酵素是生物催化劑，只改變反應速率，本身在反應前後不被消耗。',
      '酵素有最適溫度和最適 pH；溫度太高會使酵素失去活性，太低則只是暫時抑制。',
      '唾液澱粉酶約在近中性時活性較佳；胃蛋白酶在酸性；胰液、腸液中的酵素偏鹼性。'
    ],
    'heart-anatomy-lab.html': HEART,
    'circulation-lab.html': HEART,
    'heart.html': HEART,
    'coordination-lab.html': [
      '神經傳導途徑：刺激 → 受器 → 感覺神經元 → 中樞 → 運動神經元 → 動器。',
      '大腦管意識，小腦管平衡，延腦（腦幹）是生命中樞；反射的中樞在腦幹或脊髓，不需要意識控制。',
      '向性是長時間的生長反應，來自兩側生長素分布不均；根部和莖部對生長素的反應相反。',
      '含羞草的觸發運動、睡眠運動是膨壓運動，和生長素無關，而是細胞水分（膨壓）快速改變。',
      '感覺受到長時間刺激後敏感度會下降，稱為感覺疲勞；視覺暫留也常一起出題。'
    ],
    'endocrine-lab.html': [
      '內分泌腺沒有特殊導管，激素直接進入微血管，隨著血液運送到全身的靶器官。',
      '極少量的激素就能明顯影響生理功能；分泌量或時間不對都會出問題。',
      '腦垂腺是內分泌系統的主腺，還會影響其他腺體；生長激素和生長發育關係密切。',
      '胰島素使血糖下降，升糖素使血糖上升；腎上腺素在緊急狀況使血糖上升，並抑制腸胃運動。',
      '碘不足時無法合成足量甲狀腺素，會造成缺碘性甲狀腺腫，俗稱大脖子。'
    ],
    'homeostasis-lab.html': [
      '呼吸運動是吸氣和呼氣；呼吸作用是細胞分解養分、產生能量。兩者不是同一件事。',
      '吸氣：肋間肌和肋骨上舉、橫膈下降，胸腔變大、肺內壓力變小。肺本身沒有把空氣泵出的肌肉。',
      '鳥類和哺乳類是恆溫動物；蛇、蜥蜴等是變溫動物，體溫隨環境改變。',
      '血糖由胰島的胰島素、升糖素共同調節；胰島素不足時，過多的葡萄糖會隨尿液排出（糖尿病）。',
      '腎臟過濾含氮廢物（尿素）和多餘水分，形成尿液，是水分恆定的重要器官。'
    ],
    'reproduction-lab.html': [
      '無性生殖不需要配子結合，子代和親代的特徵幾乎相同。',
      '減數分裂後染色體數目減半（2N → N），受精後又恢復雙套，世代的染色體數才保持穩定。',
      '動物生殖要分清體外受精／體內受精，以及卵生、胎生、卵胎生。',
      '開花植物受精後：胚珠發育成種子，子房發成果實。',
      '被子植物有雙重受精，會形成胚乳，供應胚發育所需的養分。'
    ],
    'cell-division.html': [
      '細胞分裂（有絲分裂）產生的子細胞染色體數目和原本相同，用來生長、修補。',
      '減數分裂用來形成精子和卵，染色體數目減半，過程可見同源染色體、四分體。',
      '人體體細胞有 46 條（23 對）染色體；配子只有 23 條。',
      '染色體平時在細胞核裡呈細絲狀；分裂時才縮短變粗，容易觀察。'
    ],
    'genetics-lab.html': [
      '包含關係由大到小：細胞核 ＞ 染色體 ＞ DNA ＞ 基因。',
      '分離律：成對的等位基因在形成配子時分開，每個配子只得到其中一個。',
      '顯性只要有一個顯性等位基因就會表現；隱性要成對才表現。棋盤方格可推算基因型與表現型的比例。',
      'ABO 血型是複對偶基因，A 與 B 為等顯性。子女的血型不可能和父母的基因組合矛盾。',
      '色盲、血友病是性聯遺傳，基因在 X 染色體上，男性只要一條 X 有缺陷就會表現。'
    ],
    'fossil-lab.html': FOSSIL,
    'evo-proof-lab.html': FOSSIL,
    'evolution-lab.html': [
      '天擇是達爾文提出的：族群裡本來就有變異，較能適應當時環境的個體容易存活、繁殖。',
      '不要和拉馬克的「用進廢退」搞混：後天使用造成的改變，不會就這樣遺傳下去。',
      '化石是古代生物的遺體或活動痕跡，是演化的重要證據。',
      '天擇是自然環境的選拔；人擇是人類依自己的需求來選育。'
    ],
    'classification-lab.html': [
      '學名用二名法：屬名＋種小名，由林奈建立。分類階層是界、門、綱、目、科、屬、種。',
      '五界：原核生物界、原生生物界、菌物界、植物界、動物界。病毒沒有細胞構造，不屬於任何一界。',
      '蘚苔植物沒有維管束；蕨類有維管束、用孢子繁殖；裸子植物和被子植物用種子繁殖。',
      '動物界常見考點包括刺絲胞、扁形、環節、軟體、節肢、棘皮，以及魚類、兩生類、爬蟲類、鳥類、哺乳類。'
    ],
    'ecosystem-lab.html': [
      '組成層次：個體 → 族群（同一時間、同一地點的同種生物）→ 群集（所有族群）→ 生態系（還包括非生物環境）。',
      '能量沿食物鏈單向流動，每上一層大約只剩 10%，大部分在呼吸作用以熱散失。',
      '碳、氧、水、氮等物質可以在生物與環境之間循環；能量不能循環利用。',
      '捉放法可估算活動力強的動物族群大小。',
      '生物間的交互作用包含掠食、競爭、互利共生、寄生、片利共生。'
    ],
    'human-env-lab.html': [
      '生物多樣性包含遺傳多樣性、物種多樣性和生態系多樣性，多樣性越高生態系通常越穩定。',
      '難以分解的毒物（如 DDT、汞）會沿食物鏈生物放大，越上層濃度越高。',
      '人類對環境的衝擊包括棲地破壞、汙染、外來種入侵等。',
      '減少垃圾可記 5R：拒絕、減量、重複使用、維修、回收。'
    ],
    'plant-transport-lab.html': [
      '木質部在內側，運送水和礦物質；韌皮部在外側，運送養分。',
      '雙子葉植物有形成層，向外長出韌皮部、向內長出木質部；單子葉植物維管束散生，沒有形成層。',
      '水分上升的主要動力是蒸散作用，另外還有毛細現象和根壓。',
      '環剝樹皮會切斷韌皮部，根部得不到養分；年輪是木質部形成的。'
    ],
    'blood-defense-lab.html': [
      '血液由血漿（約 55%）和血球（約 45%）組成：紅血球運氧、白血球防禦、血小板凝血。',
      '哺乳類成熟的紅血球沒有細胞核。',
      '閉鎖式循環的血液一直在血管裡；開放式循環（如昆蟲）的血液會流入體腔。和單循環、雙循環是兩件事。',
      '組織液進入淋巴管後叫淋巴，流經淋巴結時病原體被過濾，最後注入靜脈。',
      '抗體是血漿中的蛋白質，能抵抗病原體。'
    ],
    'blood-type-lab.html': [
      'ABO 血型是複對偶基因（IA、IB、i）；IA 與 IB 是等顯性，兩者對 i 都是顯性。',
      'O 型（ii）和 AB 型（IAIB）的子女只會是 A 型或 B 型。',
      '人類女性是 44＋XX，男性是 44＋XY；兒子的 X 一定來自媽媽。',
      '色盲、血友病的基因在 X 染色體上：男性只要一條缺陷 X 就會表現，女性要兩條都有缺陷才會表現。'
    ],
    'evolve-theory-lab.html': [
      '天擇：族群裡變異先存在，再被環境選擇；適合環境的個體存活、繁殖較多。',
      '拉馬克的用進廢退與證據不符：後天拉長的脖子不會就這樣遺傳下去。',
      '天擇是環境在選（仙人掌的針狀葉）；人擇是人在選（產蛋多的來亨雞）。',
      '同源器官來源相同，是共同祖先的證據；同功器官功能相似但來源不同；痕跡器官（如盲腸）也是演化的線索。'
    ],
    'mole-lab.html': [
      '原子量是比較值，沒有單位，基準是 C-12＝12；分子量＝組成原子的原子量總和。',
      '1 莫耳含有 6×10²³ 個粒子；莫耳數＝質量 ÷ 分子量（例：36 克水＝2 莫耳）。',
      '化學式係數取最小整數比；係數比＝莫耳數比＝分子個數比。',
      '計算質量關係要先換成莫耳數，不能直接把質量比當成係數比。'
    ],
    'acid-base-lab.html': [
      '酚酞在酸性、中性都是無色，只有鹼性變紅；石蕊試紙酸紅、鹼藍。',
      '鹽酸、硫酸、硝酸是強酸，醋酸、碳酸是弱酸；氫氧化鈉、氫氧化鉀是強鹼，氨水是弱鹼。',
      '體積莫耳濃度＝莫耳數 ÷ 溶液體積（公升）；稀釋前後「濃度 × 體積」不變。',
      '中和的本質是 H⁺ ＋ OH⁻ → H₂O，會放熱；完全中和看莫耳數，不是看體積。',
      'pH 小於 7 是酸性、等於 7 是中性、大於 7 是鹼性；酸稀釋後 pH 往 7 靠近，但不會變成鹼性。'
    ],
    'mass-lab.html': [
      '質量守恆是拉瓦節；「原子種類與數目不變」是原子說。',
      '開放系統若吸收氣體（如鐵生鏽）質量會變重。'
    ],
    'rate-lab.html': [
      '催化劑只改速率與路徑，不改產量，反應後本身質量、成分不變，可重複使用。',
      '常見例子是二氧化錳（MnO₂）催化雙氧水。'
    ],
    'force-pressure-lab.html': [
      '合力介於兩力之差與和之間。',
      '摩擦力與接觸面積無關。',
      '液體壓力只跟深度、密度有關（連通管）。'
    ],
    'water-lab.html': [
      '地球上的水：海洋約 98%、冰川約 1.6%，其餘是地下水、湖泊、河川等。',
      '最多的淡水是冰川；人類可直接利用的淡水以地下水為主。'
    ],
    'atmo-lab.html': [
      '大氣依溫度垂直變化分為對流層、平流層、中氣層、增溫層。',
      '臭氧層約在 20–30 km。'
    ],
    'circular-motion-lab.html': [
      '向心力指向圓心、與速度垂直。',
      '繩斷或雨滴離開後沿切線飛出，不是沿半徑向外。'
    ],
    'moon-phases.html': [
      '日食發生在朔，月食發生在望；但朔、望不一定會發生日食或月食。'
    ]
  };

  function fileName() {
    let file = (location.pathname || '').split('/').pop() || '';
    try { file = decodeURIComponent(file); } catch (e) { /* 維持原檔名 */ }
    return file;
  }
  function bullets() {
    const file = fileName();
    const hash = (location.hash || '').replace(/^#/, '');
    if (hash && COPY[file + '#' + hash]) return COPY[file + '#' + hash];
    if (hash && COPY[hash]) return COPY[hash];
    return COPY[file] || null;
  }

  const css = `
  .kp-card {
    margin-top: 12px;
    background: rgba(255,255,255,0.5);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 12px;
    color: #5d4037;
    border: 1px solid rgba(255,255,255,.85);
    font: 700 13px/1.55 "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;
  }
  .kp-card summary {
    cursor: pointer; padding: 8px 12px; font-weight: 800; list-style: none; min-height: 42px;
    display: flex; align-items: center; gap: 6px;
  }
  .kp-card summary::-webkit-details-marker { display: none; }
  .kp-card summary::before { content: "▸"; }
  .kp-card[open] summary::before { content: "▾"; }
  .kp-card ul { margin: 0; padding: 0 12px 10px 1.4em; }
  .kp-card li { margin: 4px 0; font-weight: 700; }
  .kp-card.kp-float {
    position: fixed; z-index: 28; top: 56px; left: 16px;
    width: min(300px, calc(100vw - 32px)); margin-top: 0;
  }`;

  function mount() {
    const list = bullets();
    const old = document.querySelector('.kp-card');
    if (!list || !list.length) { if (old) old.remove(); return; }
    let card = old;
    if (!card) {
      card = document.createElement('details');
      card.className = 'kp-card';
      const summary = document.createElement('summary');
      summary.textContent = '會考出題重點';
      const ul = document.createElement('ul');
      card.append(summary, ul);
      ['pointerdown', 'touchstart', 'wheel', 'mousedown'].forEach(ev =>
        card.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
      card.addEventListener('toggle', () => {
        try { sessionStorage.setItem('kp-open:' + fileName(), card.open ? '1' : '0'); } catch (e) { /* 無痕模式 */ }
      });
      const panel = document.querySelector('.panel');
      if (panel) {
        const body = panel.querySelector('.body') || panel;
        body.insertBefore(card, body.firstChild);
      } else {
        card.classList.add('kp-float');
        document.body.appendChild(card);
      }
      try { if (sessionStorage.getItem('kp-open:' + fileName()) === '1') card.open = true; } catch (e) { /* 無痕模式 */ }
    }
    const ul = card.querySelector('ul');
    ul.replaceChildren();
    list.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      ul.appendChild(li);
    });
  }

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  window.addEventListener('hashchange', mount);
})();
