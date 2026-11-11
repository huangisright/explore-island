/* ===== 探索島：Google 登入＋雲端存檔（Firebase） =====
   單元頁與紀錄本共用。名單制：名單上的帳號才會存到雲端；第一次登入時輸入老師給的加入碼，就能自己加入名單。
   空殼頁（window.ISLAND_GATE）：頁面本身沒有教材，登入且在名單上（或是老師帳號）之後，才從 Firestore 的 content/{slug} 把內容載進來。 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

/* 主管理者：寫死、不能被移除（Firebase 專案也在這個帳號底下） */
export const TEACHER = "kb5936@cnc.km.edu.tw";
export const ROLES = { admin: "管理者", teacher: "老師", viewer: "檢視" };
export const app = initializeApp(window.ISLAND_FIREBASE);
export const auth = getAuth(app);
export const db = getFirestore(app);

export function login() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, p);
}
export const logout = () => signOut(auth);
export const emailOf = u => (u && u.email || "").toLowerCase();

/* 這個帳號在老師帳號清單上的層級：admin／teacher／viewer，不是老師回傳 "" */
export async function staffRole(user) {
  if (!user) return "";
  if (emailOf(user) === TEACHER) return "admin";
  try {
    const r = await getDoc(doc(db, "staff", emailOf(user)));
    return r.exists() && ROLES[r.data().role] ? r.data().role : "";
  } catch (e) { return ""; }
}

/* 任何 Google 帳號第一次登入，輸入老師給的加入碼就能自己加入名單 */
export const canSelfJoin = u => !!u && u.emailVerified !== false && emailOf(u) !== TEACHER;  // 老師帳號另外在 staffRole 先擋掉

/* 這個帳號在不在名單上；在的話回傳名單資料 */
export async function rosterOf(user) {
  try {
    const r = await getDoc(doc(db, "roster", emailOf(user)));
    return r.exists() ? r.data() : null;
  } catch (e) { return null; }
}

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const newer = (a, b) => (a && a.updated || "") >= (b && b.updated || "") ? a : b;
const hasWork = s => s && s.st && Object.values(s.st).some(x => x.locked || x.done || (x.pred || "").trim() || (x.obs || "").trim());

/* 登入列（單元頁與紀錄本共用的外觀） */
export function authBar(where) {
  const bar = document.createElement("div");
  bar.className = "isl-auth";
  where.before(bar);
  const css = document.createElement("style");
  css.textContent = `.isl-auth{margin:0 0 8px;padding:10px 16px;border:1px solid var(--edge);border-radius:5px;background:var(--card);
    display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;font-size:14px;color:var(--ink-2)}
  .isl-auth b{color:var(--ink)} .isl-auth .ok{color:var(--green);font-weight:700} .isl-auth .warn{color:var(--orange);font-weight:700}
  .isl-auth button{font:inherit;font-size:14px;font-weight:600;padding:5px 14px;border-radius:5px;cursor:pointer;margin-left:auto}
  @media print{.isl-auth{display:none!important}}`;
  document.head.appendChild(css);
  return bar;
}

/* 第一次登入：學生自己填班級、座號、姓名，加入名單。成功回傳名單資料 */
export function joinForm(bar, u, onDone, onCancel) {
  const nm = (u.displayName || "").replace(/\s+/g, "").slice(0, 20);
  bar.innerHTML = '<span>第一次登入 <b>' + esc(u.email) + '</b>，請填一次：</span>' +
    '<input id="jc" placeholder="班級 例 801" size="7" inputmode="numeric"> <input id="js" placeholder="座號" size="4" inputmode="numeric"> ' +
    '<input id="jn" placeholder="姓名" size="8" value="' + esc(nm) + '"> <input id="jk" placeholder="加入碼（老師給）" size="12" autocomplete="off"> <button class="primary" id="jok">加入</button><button id="jx" style="margin-left:0">換帳號</button><span class="warn" id="jm"></span>';
  const css = document.createElement("style");
  css.textContent = ".isl-auth input{font:inherit;font-size:14px;padding:4px 8px;border:1px solid var(--edge);border-radius:5px;background:var(--bg,#fff);color:var(--ink)}";
  bar.appendChild(css);
  const $ = id => bar.querySelector("#" + id), m = $("jm");
  $("jx").onclick = onCancel;
  $("jok").onclick = async () => {
    const cls = $("jc").value.trim(), seatRaw = $("js").value.trim(), name = $("jn").value.trim();
    if (!/^\d{3}$/.test(cls)) { m.textContent = "班級請填三位數，例如 801"; return; }
    if (!/^\d{1,2}$/.test(seatRaw)) { m.textContent = "座號請填數字"; return; }
    if (!name || name.length > 20) { m.textContent = "請填姓名"; return; }
    const code = $("jk").value.trim();
    if (!code) { m.textContent = "請輸入老師給的加入碼"; return; }
    const r = { cls, seat: +seatRaw, name, self: true, code };
    $("jok").disabled = true; m.textContent = "加入中…";
    try { await setDoc(doc(db, "roster", emailOf(u)), r); onDone(r); }
    catch (e) {
      $("jok").disabled = false;
      m.textContent = (e.code === "permission-denied") ? "加入碼不對，請再確認一次" : "加入失敗，請再按一次或找老師（" + (e.code || e.message) + "）";
    }
  };
}

/* ---------- 單元頁 ---------- */
function unitPage(gated) {
  const API = window.ISLAND_API;
  const C = API.config, store = API.store;
  const anonKey = "isl:" + C.slug;
  const bar = authBar(API.progressBox);
  let user = null, timer = null, status = "", unitRef = null, profRef = null, rosterName = "", staff = "";

  const paint = () => {
    if (!user) {
      bar.innerHTML = '<span>登入學校帳號，紀錄會存到雲端，換電腦也接得下去。</span><button class="primary">用 Google 登入</button>';
      bar.querySelector("button").onclick = () => login().catch(e => { status = "登入沒有完成：" + (e.code || e.message); paintMsg(); });
      return;
    }
    if (!unitRef) {
      bar.innerHTML = staff
        ? '<span>' + ROLES[staff] + '帳號 <b>' + esc(user.email) + '</b>：全班紀錄請到 <a href="teacher.html">老師頁面</a>。</span><button>登出</button>'
        : '<span class="warn">這個帳號不在名單上</span><span>' + esc(user.email) + '，紀錄只會存在這台電腦。按「換帳號」重新登入，就能輸入加入碼。</span><button>換帳號</button>';
      bar.querySelector("button").onclick = doLogout;
      return;
    }
    bar.innerHTML = '<span><b>' + esc(rosterName || user.displayName || "") + '</b>（' + esc(user.email) + '）</span><span class="st">' + esc(status) + '</span><button>登出</button>';
    bar.querySelector("button").onclick = doLogout;
  };
  const paintMsg = () => { const e = bar.querySelector(".st"); if (e) e.textContent = status; else paint(); };

  const push = async () => {
    if (!unitRef) return;
    const S = API.state();
    status = "存到雲端中…"; paintMsg();
    try {
      await setDoc(profRef, { email: emailOf(user), name: rosterName || user.displayName || "", updated: new Date().toISOString() });
      await setDoc(unitRef, { data: JSON.stringify(S), updated: S.updated || "", n: S.n || 0, nd: S.nd || 0, q: S.q || 0, qd: S.qd || 0, stampAt: S.stampAt || "" });
      status = "✓ 已存到雲端";
    } catch (e) {
      status = "雲端存檔失敗，會再試一次（紀錄還在這台電腦）";
      clearTimeout(timer); timer = setTimeout(push, 8000);
    }
    paintMsg();
  };
  API.onSave = () => { if (!unitRef) return; clearTimeout(timer); timer = setTimeout(push, 1200); };
  API.onClear = async () => {
    const empty = { st: {}, quiz: {} };
    API.adopt(unitRef ? "isl:" + user.uid + ":" + C.slug : anonKey, empty, { nameKey: unitRef ? "isl:" + user.uid + ":name" : "isl:name", name: rosterName, nameLocked: !!unitRef });
    if (unitRef) { clearTimeout(timer); await push(); }
  };

  async function doLogout() {
    clearTimeout(timer);
    if (unitRef) await push();
    // 共用電腦：把這個人留在本機的紀錄清掉
    if (user) Object.keys(localStorage).filter(k => k.startsWith("isl:" + user.uid + ":")).forEach(k => localStorage.removeItem(k));
    unitRef = null; profRef = null; rosterName = "";
    await logout();
    if (gated) return;                          // 空殼頁：gatePage 那邊一發現登出就重新整理，回到登入畫面，內容不留在畫面上
    let S0 = {}; try { S0 = JSON.parse(store.get(anonKey)) || {}; } catch (e) {}
    API.adopt(anonKey, S0, { nameKey: "isl:name", nameLocked: false });
  }

  onAuthStateChanged(auth, async u => {
    user = u;
    if (!u) { unitRef = null; paint(); return; }
    bar.innerHTML = "<span>確認名單中…</span>";
    let r = await rosterOf(u);
    staff = r ? "" : await staffRole(u);
    if (user !== u) return;
    if (staff) { unitRef = null; paint(); return; }
    if (!r && canSelfJoin(u)) {
      unitRef = null;
      r = await new Promise(res => joinForm(bar, u, res, () => { res(null); doLogout(); }));
      if (!r || user !== u) return;
    }
    if (!r) { unitRef = null; paint(); return; }
    rosterName = r.name || "";
    profRef = doc(db, "records", u.uid);
    unitRef = doc(db, "records", u.uid, "units", C.slug);
    const myKey = "isl:" + u.uid + ":" + C.slug;
    let remote = null, local = null, anon = null;
    try { const d = await getDoc(unitRef); if (d.exists()) remote = JSON.parse(d.data().data); } catch (e) { status = "讀不到雲端紀錄，先用這台電腦的"; }
    try { local = JSON.parse(store.get(myKey)); } catch (e) {}
    try { anon = JSON.parse(store.get(anonKey)); } catch (e) {}
    let pick = newer(remote, local) || null;
    let carried = false;
    if (!hasWork(pick) && hasWork(anon)) { pick = anon; carried = true; }
    API.adopt(myKey, pick || {}, { nameKey: "isl:" + u.uid + ":name", name: rosterName, nameLocked: true });
    if (carried) store.del(anonKey);           // 登入前寫的，搬進這個帳號，不留給下一個人
    status = remote ? "✓ 已讀取雲端紀錄" : "✓ 已連上雲端";
    paint();
    if (carried || !remote || (local && local.updated > (remote.updated || ""))) push();
  });
  paint();
}

/* ---------- 紀錄本 ---------- */
function passportPage() {
  const P = window.ISLAND_PASSPORT;
  const bar = authBar(document.getElementById("main"));
  const paint = (html, btn, fn) => { bar.innerHTML = html + (btn ? "<button>" + btn + "</button>" : ""); if (btn) bar.querySelector("button").onclick = fn; };
  onAuthStateChanged(auth, async u => {
    if (!u) {
      paint("<span>登入學校帳號，就能看到存在雲端的紀錄。</span>", "用 Google 登入", () => login().catch(() => {}));
      P.show(null, null); return;
    }
    let r = await rosterOf(u);
    const st = r ? "" : await staffRole(u);
    if (st) {
      paint('<span>' + ROLES[st] + '帳號 <b>' + esc(u.email) + '</b>：全班紀錄請到 <a href="teacher.html">老師頁面</a>。</span>', "登出", async () => { await logout(); });
      P.show(null, null); return;
    }
    if (!r && canSelfJoin(u)) {
      P.show(null, null);
      r = await new Promise(res => joinForm(bar, u, res, async () => { res(null); await logout(); }));
      if (!r || auth.currentUser !== u) return;
    }
    if (!r) {
      paint('<span class="warn">這個帳號不在名單上</span><span>' + esc(u.email) + "</span>", "換帳號", async () => { await logout(); });
      P.show(null, null); return;
    }
    paint("<span><b>" + esc(r.name || "") + "</b>（" + esc(u.email) + "）</span>", "登出", async () => {
      Object.keys(localStorage).filter(k => k.startsWith("isl:" + u.uid + ":")).forEach(k => localStorage.removeItem(k));
      await logout();
    });
    const got = {};
    try {
      const qs = await getDocs(collection(db, "records", u.uid, "units"));
      qs.forEach(d => { try { got[d.id] = JSON.parse(d.data().data); } catch (e) {} });
    } catch (e) {}
    P.show(got, r.name || "", r);
  });
}

/* ---------- 空殼頁：登入後才載入內容 ---------- */
/* 把存在 Firestore 的 head／body 放進頁面，script 依原本的順序執行 */
async function mount(data) {
  const th = document.createElement("template"); th.innerHTML = data.head || "";
  const tb = document.createElement("template"); tb.innerHTML = data.body || "";
  // template 裡的 script 不會執行：先換成記號，內容放進頁面後再照順序重建
  const slots = [...tb.content.querySelectorAll("script")].map(s => { const c = document.createComment("script"); s.replaceWith(c); return [c, s]; });
  const gate = document.getElementById("isl-gate"), gcss = document.getElementById("isl-gate-css");
  if (gate) gate.remove();
  if (gcss) gcss.remove();
  document.head.append(th.content);
  document.body.append(tb.content);
  // 有幾章的程式在等 DOMContentLoaded／load，這時早就發生過了：先收起來，全部 script 跑完再補叫
  const late = [], dAdd = document.addEventListener, wAdd = window.addEventListener;
  document.addEventListener = function (t, f, o) { if (t === "DOMContentLoaded") late.push([document, f]); else dAdd.call(this, t, f, o); };
  window.addEventListener = function (t, f, o) { if (t === "DOMContentLoaded" || t === "load") late.push([window, f]); else wAdd.call(this, t, f, o); };
  try {
    for (const [c, s] of slots) {
      const n = document.createElement("script");
      for (const a of s.attributes) n.setAttribute(a.name, a.value);
      n.textContent = s.textContent;
      const ext = n.src ? new Promise(res => { n.onload = n.onerror = res; }) : null;
      c.replaceWith(n);
      if (ext) await ext;
    }
  } finally { document.addEventListener = dAdd; window.addEventListener = wAdd; }
  late.forEach(([who, f]) => { try { (typeof f === "function" ? f : f.handleEvent).call(who, new Event("DOMContentLoaded")); } catch (e) { console.error(e); } });
  if (data.title) document.title = data.title;
  if (location.hash.length > 1) {                // 學習單 QR 會帶 #labN，內容放好之後才捲得到
    let t = null; try { t = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) {}
    if (t) t.scrollIntoView();
  }
}

/* 畫面上淡淡鋪一層登入者的姓名與帳號（列印、截圖都會帶著） */
function watermark(text) {
  const t = esc(text).replace(/'/g, "&#39;");
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="380" height="230"><text x="190" y="115" text-anchor="middle" transform="rotate(-22 190 115)" ' +
    'font-family="sans-serif" font-size="13" fill="#808080" fill-opacity="0.2">' + t + "</text></svg>";
  const d = document.createElement("div");
  d.className = "isl-wm"; d.setAttribute("aria-hidden", "true");
  d.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483000;-webkit-print-color-adjust:exact;print-color-adjust:exact;" +
    "background-image:url(\"data:image/svg+xml," + encodeURIComponent(svg) + "\")";
  document.body.appendChild(d);
}

function gatePage() {
  const G = window.ISLAND_GATE;
  const box = document.getElementById("isl-gate-msg");
  let loaded = false, busy = null;
  const say = (html, btn, fn) => {
    box.innerHTML = '<p>' + html + '</p>' + (btn ? '<button class="primary">' + btn + "</button>" : "");
    if (btn) box.querySelector("button").onclick = fn;
  };
  const askLogin = note => say((note ? '<span class="warn">' + esc(note) + "</span><br>" : "") + "這一頁要先登入才看得到內容。請用老師登記的 Google 帳號登入。",
    "用 Google 登入", () => login().catch(e => askLogin("登入沒有完成：" + (e.code || e.message))));

  async function open(u) {
    say("確認名單中…");
    let r = await rosterOf(u);
    const staff = r ? "" : await staffRole(u);
    if (auth.currentUser !== u) return;
    if (!r && !staff) {
      if (!canSelfJoin(u)) { say('<span class="warn">這個帳號不在名單上</span><br>' + esc(u.email), "換帳號", () => logout()); return; }
      box.innerHTML = "<p></p>";
      const bar = authBar(box.firstChild);
      r = await new Promise(res => joinForm(bar, u, res, async () => { res(null); await logout(); }));
      if (!r || auth.currentUser !== u) return;
    }
    say("內容載入中…");
    let d;
    try { d = await getDoc(doc(db, "content", G.slug)); }
    catch (e) {
      say('<span class="warn">內容讀不到</span><br>' + (e.code === "permission-denied" ? "這個帳號沒有權限，請找老師確認名單。" : "可能是網路不穩，請再試一次。（" + esc(e.code || e.message) + "）"),
        "再試一次", () => { busy = open(u); });
      return;
    }
    if (auth.currentUser !== u) return;
    if (!d.exists()) { say("這一章的內容還沒放上來，請告訴老師。", "登出", () => logout()); return; }
    loaded = true;
    await mount(d.data());
    watermark(((r && r.name) || u.displayName || "") + "　" + u.email);
    if (window.ISLAND_API && window.ISLAND_API.config) unitPage(true);
  }

  onAuthStateChanged(auth, u => {
    if (loaded) { if (!u) location.reload(); return; }   // 內容已經在畫面上：登出（含在別的分頁登出）就重新整理回到登入畫面
    if (!u) { askLogin(); return; }
    busy = open(u);
  });
}

if (window.ISLAND_GATE) gatePage();
else if (window.ISLAND_API && window.ISLAND_API.config) unitPage();
else if (window.ISLAND_PASSPORT) passportPage();
