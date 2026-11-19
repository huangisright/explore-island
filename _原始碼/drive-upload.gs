/**
 * 數學探索島｜報告島：學生海報原圖備份到老師的雲端硬碟
 *
 * 部署一次就好（用你要放檔案的那個 Google 帳號）：
 *   1. 打開 https://script.google.com → 新專案，把這整個檔案貼進去取代 Code.gs，存檔。
 *   2. 右上「部署」→「新增部署作業」→ 類型選「網頁應用程式」
 *        執行身分：我（你的帳號）
 *        誰可以存取：任何人
 *      按「部署」，第一次會要你授權（要用雲端硬碟、連外部網址），都按允許。
 *   3. 複製「網頁應用程式網址」（https://script.google.com/macros/s/……/exec），
 *      貼到探索島 _原始碼/firebase-config.js 的 window.ISLAND_DRIVE。
 *   之後改了這支程式：「部署」→「管理部署作業」→ 編輯 → 版本選「新版本」，網址不會變。
 *
 * 安全：網址雖然是「任何人」都能呼叫，但每一次都會拿學生的登入憑證去問 Firebase，
 *       確認是本人登入、而且在探索島名單上，才會收檔。
 *
 * 檔案放在：我的雲端硬碟／數學探索島 章後延伸報告／<章>／<班級>-<座號>-<姓名>-<方向>-<第幾張>.jpg
 *          同一位學生同一章重交時，舊的檔案會移到垃圾桶。
 */
const PROJECT = "giftedmath-island";
const API_KEY = "AIzaSyADSoa44HY5q0mM42Ezuomw5FmnFRA5JRM";   // 和 firebase-config.js 的 apiKey 相同（本來就是公開的設定）
const ROOT = "數學探索島 章後延伸報告";
const MAX_BYTES = 15 * 1024 * 1024;

function doPost(e) {
  try {
    const p = JSON.parse(e.postData.contents);
    // 1. 登入憑證是不是真的（Firebase 幫我們驗）
    const r = UrlFetchApp.fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + API_KEY, {
      method: "post", contentType: "application/json", payload: JSON.stringify({ idToken: p.token }), muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) return out_({ ok: false, err: "登入驗證失敗，請重新登入" });
    const u = JSON.parse(r.getContentText()).users[0];
    const email = String(u.email || "").toLowerCase();
    if (!email || !u.emailVerified) return out_({ ok: false, err: "帳號沒有驗證" });
    // 2. 在不在名單上（用學生自己的憑證讀他自己的名單資料；Firestore 規則會擋掉不在名單上的人）
    const f = UrlFetchApp.fetch("https://firestore.googleapis.com/v1/projects/" + PROJECT + "/databases/(default)/documents/roster/" + encodeURIComponent(email), {
      headers: { Authorization: "Bearer " + p.token }, muteHttpExceptions: true });
    if (f.getResponseCode() !== 200) return out_({ ok: false, err: "不在名單上" });
    const R = JSON.parse(f.getContentText()).fields || {};
    const val = x => x ? (x.stringValue || x.integerValue || "") : "";
    const cls = clean_(val(R.cls)), seat = ("0" + val(R.seat)).slice(-2), name = clean_(val(R.name));
    // 3. 檢查參數
    if (!/^g[789][ab]-\d+$/.test(p.chap || "")) return out_({ ok: false, err: "章的代號不對" });
    const i = Number(p.i);
    if (!(i >= 0 && i <= 2)) return out_({ ok: false, err: "張數不對" });
    const bytes = Utilities.base64Decode(String(p.data || ""));
    if (!bytes.length || bytes.length > MAX_BYTES) return out_({ ok: false, err: "檔案太大或是空的" });
    // 4. 存檔
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const dir = folder_(folder_(DriveApp.getRootFolder(), ROOT), clean_(p.label || p.chap));
      const prefix = cls + "-" + seat + "-" + name + "-";
      if (i === 0) {   // 第一張進來：同一位學生這一章的舊檔丟垃圾桶
        const it = dir.getFiles();
        while (it.hasNext()) { const x = it.next(); if (x.getName().indexOf(prefix) === 0) x.setTrashed(true); }
      }
      const fname = prefix + clean_(p.k || "") + "-" + (i + 1) + ".jpg";
      const file = dir.createFile(Utilities.newBlob(bytes, "image/jpeg", fname));
      file.setDescription(email + "　" + new Date().toISOString());
      return out_({ ok: true, id: file.getId() });
    } finally { lock.releaseLock(); }
  } catch (err) {
    return out_({ ok: false, err: String(err && err.message || err) });
  }
}
function doGet() { return out_({ ok: true, hello: "探索島雲端硬碟備份：運作中" }); }
function folder_(parent, name) { const it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
function clean_(s) { return String(s || "").replace(/[\/\\:*?"<>|\n\r\t]/g, "").slice(0, 40); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
