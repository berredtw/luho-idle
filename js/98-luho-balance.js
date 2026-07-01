/* ============================================================
 *  陸吼放置版 — 全服平衡覆蓋層（由「平衡編輯器.html」產生，勿手改）
 *  載入順序：放在所有引擎檔＋99-luho-content.js 之後（index.html 最後一支）。
 *  作用：把管理者調整的「全域倍率＋逐怪覆蓋」套到遊戲的怪物 / 掉落上。
 *        DB 每次進遊戲都由引擎重新建立，本層每次只套一次 → 不會累積放大。
 *  倍率＝乘在現有值上（作者更新遊戲也相容）；逐怪絕對值＝鎖死該怪數值。
 *  預設全倍率=1、無逐怪覆蓋 → 完全不改變遊戲，直到管理者實際調整並部署。
 * ============================================================ */
window.LUHO_BALANCE_CFG = {
  // 全域大旋鈕（1＝原樣，2＝兩倍，0.5＝一半）
  global: { expRate: 1, dropRate: 1, goldRate: 1, hpRate: 1 },
  // 逐怪絕對覆蓋：{ 怪key: { hp, exp, goldMin, goldMax } }（只填要改的欄位）
  mobs: {},
  // 逐怪掉落率倍率：{ 怪中文名: { rate: 倍數 } }（該怪所有掉落機率再乘此倍數）
  drops: {}
};

(function () {
  // 安全防呆：引擎全域沒載好就不動作
  if (typeof DB === 'undefined' || !DB.mobs || typeof MOB_DROPS === 'undefined') {
    console.warn('[luho-balance] 引擎全域未就緒，跳過平衡覆蓋'); return;
  }
  var C = window.LUHO_BALANCE_CFG, g = C.global || {};
  var expR = +g.expRate || 1, dropR = +g.dropRate || 1, goldR = +g.goldRate || 1, hpR = +g.hpRate || 1;

  // ── 1) 全域倍率：套到「所有」怪物（含作者的與我們的自訂怪）──
  if (hpR !== 1 || expR !== 1 || goldR !== 1) {
    Object.keys(DB.mobs).forEach(function (k) {
      var m = DB.mobs[k];
      if (hpR !== 1 && m.hp) m.hp = Math.max(1, Math.round(m.hp * hpR));
      if (expR !== 1 && m.exp) m.exp = Math.max(0, Math.round(m.exp * expR));
      if (goldR !== 1) {
        if (m.goldMin) m.goldMin = Math.max(0, Math.round(m.goldMin * goldR));
        if (m.goldMax) m.goldMax = Math.max(0, Math.round(m.goldMax * goldR));
      }
    });
  }

  // ── 2) 逐怪絕對覆蓋：指定該怪的固定數值（套在全域倍率之後 → 絕對值優先）──
  if (C.mobs) {
    Object.keys(C.mobs).forEach(function (k) {
      if (!DB.mobs[k]) return;                         // 怪不存在就跳過（例如作者改過 key）
      var o = C.mobs[k], m = DB.mobs[k];
      ['hp', 'exp', 'goldMin', 'goldMax'].forEach(function (f) {
        if (o[f] != null && o[f] !== '') m[f] = Math.max(0, Math.round(+o[f]));
      });
    });
  }

  // ── 3) 全域掉落率倍率：套到所有掉落（機率上限 100%）──
  if (dropR !== 1) {
    Object.keys(MOB_DROPS).forEach(function (n) {
      MOB_DROPS[n] = MOB_DROPS[n].map(function (d) { return [d[0], Math.min(100, +(d[1] * dropR).toFixed(4))]; });
    });
  }

  // ── 4) 逐怪掉落率倍率：指定某怪的掉落再乘倍（套在全域之後）──
  if (C.drops) {
    Object.keys(C.drops).forEach(function (n) {
      if (!MOB_DROPS[n]) return;
      var r = +(C.drops[n] && C.drops[n].rate); if (!r || r === 1) return;
      MOB_DROPS[n] = MOB_DROPS[n].map(function (d) { return [d[0], Math.min(100, +(d[1] * r).toFixed(4))]; });
    });
  }

  console.log('[luho-balance] 平衡覆蓋已套用：經驗×' + expR + ' 掉落×' + dropR + ' 金錢×' + goldR + ' 血量×' + hpR +
    '｜逐怪覆蓋 ' + Object.keys(C.mobs || {}).length + ' 隻｜逐怪掉落 ' + Object.keys(C.drops || {}).length + ' 隻');
})();
