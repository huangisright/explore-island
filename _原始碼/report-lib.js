/* ===== 報告島（章後延伸報告）共用：題庫、評分項目、圖片壓縮、雲端硬碟備份 =====
   題庫資料由 build.py 寫進頁面：window.REPORT_DATA = [{id, code, name, title, sem, qs:[{k,t,c,s,show}]}] */
import { auth } from "./island-cloud.js";

export const CH = window.REPORT_DATA || [];
export const chapById = id => CH.find(c => c.id === id);
export const SEMS = ["七上", "七下", "八上", "八下", "九上", "九下"];
export const DIR_NOTE = {
  "推廣": "把這一章的結論推到更一般的情況", "反過來": "把問題倒過來問，找出所有可能",
  "證明": "把「看起來對」說成「一定對」", "應用": "拿真實的資料、量測或實驗來用",
  "連結": "接到其他科目、高中數學或科技", "創作": "設計作品、遊戲或教具，並說出為什麼成立",
};
/* 老師評分：批改看五件事，每項 1～3 */
export const RUBRIC = ["接得回這一章", "推得比這一章遠", "推理站得住", "結論有界線", "別人看得懂"];
export const LEVEL = { 1: "待加強", 2: "做到", 3: "很好" };
/* 每一項「做到」與「很好」長什麼樣子（學生在報告島看得到，老師評分時也看得到） */
export const RUBRIC_DESC = [
  ["說得出這題用到這一章的哪個觀念", "把這一章的觀念當工具，一路用到結論"],
  ["做了延伸任務，有自己的計算或例子", "有課本沒有的發現：新的規律、更一般的情況，或一個反例"],
  ["每一步都說得出理由，數字算對", "結論有證明或足夠的證據，自己檢查過、找過反例"],
  ["寫出結論在什麼情況下成立", "也寫出什麼情況下不成立，並說明為什麼"],
  ["同學只看海報就看得懂結論", "圖表有標示、順序清楚，上台三分鐘講得完，問答接得住"],
];
/* 一頁海報一定要有 */
export const POSTER_MUST = [
  "題目寫在最上面",
  "一句話的結論，放在最顯眼的地方",
  "支持結論的推理、計算、圖表或資料，至少一樣是自己算、量、查、做出來的",
  "結論的適用範圍：什麼情況下不成立",
  "資料來源（查的資料、參考的網站或書）",
  "一個還想追問的問題",
];
/* 同學互評：1～3 顆星 */
export const STARS = { 1: "聽得懂", 2: "有說服力", 3: "讓我學到新東西" };

export const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/* 題庫的迷你標記：**粗體**、*斜體數學*、^{上標}、_{下標} */
export function rich(s) {
  s = String(s ?? ""); let out = "", i = 0, bold = false;
  while (i < s.length) {
    if (s.startsWith("**", i)) { out += bold ? "</b>" : "<b>"; bold = !bold; i += 2; continue; }
    if (s[i] === "*") { const j = s.indexOf("*", i + 1); if (j > i) { out += '<i class="m">' + esc(s.slice(i + 1, j)) + "</i>"; i = j + 1; continue; } }
    if (s.startsWith("^{", i) || s.startsWith("_{", i)) {
      const j = s.indexOf("}", i);
      if (j > i) { const t = s[i] === "^" ? "sup" : "sub"; out += "<" + t + ">" + esc(s.slice(i + 2, j)) + "</" + t + ">"; i = j + 1; continue; }
    }
    out += esc(s[i]); i++;
  }
  return out + (bold ? "</b>" : "");
}
export const plain = s => String(s ?? "").replace(/[*^_{}]/g, "");
export const chapLabel = c => c.code + " " + c.name + "《" + c.title + "》";
export const fmtTime = iso => {
  if (!iso) return "";
  const d = new Date(iso); if (isNaN(d)) return "";
  const p = n => String(n).padStart(2, "0");
  return (d.getMonth() + 1) + "/" + d.getDate() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
};

/* ---------- 圖片：在瀏覽器裡縮小、轉成 JPEG ---------- */
function loadImage(file) {
  return new Promise((ok, bad) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); ok(im); };
    im.onerror = () => { URL.revokeObjectURL(url); bad(new Error("讀不到這張圖（請改用 JPG 或 PNG）")); };
    im.src = url;
  });
}
function encode(im, side, q) {
  const k = Math.min(1, side / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h);
  return cv.toDataURL("image/jpeg", q);
}
/* 回傳 { show: 展示用（存資料庫，< 900 KB）, thumb: 縮圖, full: 備份到雲端硬碟用（大一點） } */
export async function prepImage(file, withThumb) {
  const im = await loadImage(file);
  let show = "", side = 1800, q = .78;
  for (let t = 0; t < 8; t++) {
    show = encode(im, side, q);
    if (show.length < 900000) break;
    if (q > .55) q -= .08; else side = Math.round(side * .82);
  }
  const thumb = withThumb ? encode(im, 420, .62) : "";
  const full = encode(im, 2200, .8);   // 老師雲端硬碟空間有限（2026-11 已用 96%），備份版不用原尺寸
  return { show, thumb, full, w: im.naturalWidth, h: im.naturalHeight };
}

/* ---------- 原圖備份到老師的雲端硬碟（Apps Script，見 _原始碼/drive-upload.gs） ---------- */
export const driveReady = () => !!(window.ISLAND_DRIVE || "").trim();
export async function driveUpload(chap, idx, dataUrl, qk) {
  const url = (window.ISLAND_DRIVE || "").trim();
  if (!url) throw new Error("還沒設定雲端硬碟");
  const u = auth.currentUser; if (!u) throw new Error("沒有登入");
  const token = await u.getIdToken();
  const c = chapById(chap);
  const body = JSON.stringify({ token, chap, label: c ? c.code + " " + c.name : chap, i: idx, k: qk || "", data: dataUrl.split(",")[1] });
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body });
  const j = await r.json();
  if (!j.ok) throw new Error(j.err || "上傳失敗");
  return j.id;
}
