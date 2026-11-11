/* ===== 探索島：Google 登入＋雲端存檔（Firebase） =====
   單元頁與紀錄本共用。名單制：名單上的帳號才會存到雲端；第一次登入時輸入老師給的加入碼，就能自己加入名單。 */
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
function unitPage() {
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
    P.show(got, r.name || "");
  });
}

if (window.ISLAND_API && window.ISLAND_API.config) unitPage();
else if (window.ISLAND_PASSPORT) passportPage();
