/* ============================================================
 *  陸吼天堂雲端版 — 自訂內容注入（從伺服器 DB 來的地圖／怪物／掉落）
 *  載入順序：放在所有引擎檔之後。執行期把資料塞進引擎的全域物件，
 *  完全不改引擎巨型檔，最安全、好維護。
 *  目前內容：等級地區（推廣幣）＝伺服器 mapid 1021「打幣區」，19 隻平民系練功怪。
 *  資料來源：DB 表 npc / spawnlist / w_指定地圖掉落（2026-06-29 匯出）。
 *  規則：不掉元寶(44070)；金幣以 goldMin/Max 給；商店不動。
 * ============================================================ */
(function () {
  // 安全防呆：引擎全域沒載好就不動作，避免報錯
  if (typeof DB === 'undefined' || typeof MAP_REGIONS === 'undefined' || typeof MOB_DROPS === 'undefined') {
    console.warn('[luho] 引擎全域未就緒，跳過自訂內容注入'); return;
  }

  // ── 1) 19 隻平民系怪（等級地區）──
  //    （推廣幣／狩獵幣已依需求移除，不再掉落、也不建道具）
  //    欄位：[key, 名稱, 圖檔名(monsters/), 等級, 體型S/L, 魔防MR, 防禦AC, 攻速ms, 屬性]
  //    缺原圖者用相近現成圖替代（不糾結；先能玩、不破圖）。
  const _LZ = [
    ['lvz_elf',        '平民精靈',          '地精靈王',         29, 'S',  29, -15, 1240, 'none'],
    ['lvz_beetle',     '平民 聖甲蟲',       '底比斯 聖甲蟲',    29, 'S',  60, -25,  920, 'none'],
    ['lvz_akuyuka',    '平民 艾庫尤卡',     '蟹人',             29, 'S',  10, -33, 1120, 'none'],
    ['lvz_skel1',      '平民的骷髏鬥士',    '骷髏鬥士',         29, 'S', 150, -18,  840, 'none'],
    ['lvz_skel2',      '平民的骷髏鬥士',    '骷髏鬥士',         29, 'S',  25, -18,  840, 'none'],
    ['lvz_bandit',     '平民強盜',          '強盜',             30, 'S',  25, -16, 1000, 'none'],
    ['lvz_dvgeneral',  '平民黑暗妖精將軍',  '黑暗妖精將軍',     30, 'S',  10, -20, 1000, 'none'],
    ['lvz_monia',      '平民莫妮亞',        '莫妮亞',           30, 'S',  35, -12,  720, 'none'],
    ['lvz_bat',        '平民蝙蝠',          '魔蝙蝠',           30, 'S',  20, -12, 1160, 'none'],
    ['lvz_dvporter',   '平民黑暗妖精運送員','黑暗妖精士兵',     30, 'S',  20, -13, 1520, 'none'],
    ['lvz_yeti',       '平民雪怪',          '雪怪',             30, 'L',   0, -18, 1400, 'water'],
    ['lvz_jelly',      '平民果凍怪',        '象牙塔果凍怪',     30, 'L',   0, -33, 1280, 'none'],
    ['lvz_crabman',    '平民地底蟹人',      '蟹人',             30, 'S',  10, -30, 1280, 'none'],
    ['lvz_ogreking',   '平民食人妖精王',    '食人妖精王',       30, 'L',  20, -13,  720, 'none'],
    ['lvz_centipede',  '平民金屬蜈蚣',      '金屬蜈蚣',         30, 'L',  20, -13, 1480, 'none'],
    ['lvz_firespirit', '平民火之精靈',      '夢幻之島火精靈王', 30, 'S',  35, -11, 1000, 'fire'],
    ['lvz_waterspirit','平民水之精靈',      '夢幻之島水精靈王', 30, 'S',  35, -13, 1000, 'water'],
    ['lvz_windspirit', '平民風之精靈',      '風精靈王',         30, 'S',  35, -13, 1000, 'wind'],
    ['lvz_earthspirit','平民土之精靈',      '土精靈王',         30, 'S',  35, -15, 1000, 'earth']
  ];

  _LZ.forEach(function (a) {
    var key = a[0], nm = a[1], img = a[2], lv = a[3], sz = a[4], mr = a[5], ac = a[6], ms = a[7], ele = a[8];
    DB.mobs[key] = {
      n: nm,
      img: 'assets/icons/monsters/' + img + '.png',
      lv: lv,
      s: sz,
      beh: '被動',                              // DB agro=0 → 被動（不主動攻擊；掛機照打）
      race: '平民',
      e: ele,
      hp: 600,
      ac: ac,
      mr: mr,
      exp: lv * lv + lv * 5 + 1,               // 天堂經驗公式：lv²+5lv+1（29→987、30→1051，與 DB 一致）
      goldMin: 60, goldMax: 90,                 // 來自地圖金幣掉落 60~90
      atkSpd: ms / 1000,                        // DB 攻速 ms → 秒
      dmg: [1, Math.max(2, Math.round(lv / 3))],// 無傷害欄→依等級估（不糾結，先能玩）
      db: Math.round(lv / 6),
      hit: Math.round(lv / 6),
      regenHp: 15
    };
  });

  // ── 3) 地圖：等級地區 → 上面 19 隻怪（引擎會隨機出其中任一種）──
  DB.maps['level_zone'] = _LZ.map(function (a) { return a[0]; });

  // ── 4) 掉落：伺服器是「地圖整圖掉落」→ 每隻怪都掛同一份（每殺一隻 roll 一次）──
  //    機率＝DB chance ÷ 10000（百萬分母→百分比）；元寶已排除；金幣走 goldMin/Max；
  //    0.005% 的 5% 卷軸忽略（太低、且需另建道具）。
  var _LZ_DROPS = [
    ['scroll_armor', 0.8],  // 對盔甲施法的卷軸 0.8%
    ['scroll_weapon', 0.5]  // 對武器施法的卷軸 0.5%
  ];
  var _seen = {};
  _LZ.forEach(function (a) {
    var nm = a[1];                              // MOB_DROPS 以「怪物中文名」為 key
    if (_seen[nm]) return; _seen[nm] = 1;       // 同名怪（兩隻骷髏鬥士）只設一次
    MOB_DROPS[nm] = _LZ_DROPS.slice();
  });

  // ── 5) 把地圖加進「地區」下拉選單（放最上面，最好找）──
  //    順序純為顯示用，不影響角色出生地（出生地由創角的村莊決定）。
  MAP_REGIONS.unshift({
    key: 'levelzone',
    label: '⭐掛機打幣區',
    maps: [ { v: 'level_zone', t: '掛機打幣區', c: '#fbbf24' } ]
  });

  // ── 6) 掛機打幣區的背景底圖（條狀地面圖，套 area-fit 貼齊地面）──
  //    圖檔需放在 assets/area/掛機打幣區.jpg；沒放檔時版面正常、只是無底圖。
  if (typeof SPECIAL_AREA_BG !== 'undefined') {
    SPECIAL_AREA_BG['level_zone'] = 'assets/area/掛機打幣區.jpg';
    if (typeof AREA_BG_FIT !== 'undefined') AREA_BG_FIT.add('assets/area/掛機打幣區.jpg');
  }

  console.log('[luho] 等級地區已注入：19 隻怪 + 地圖 + 掉落');
})();
