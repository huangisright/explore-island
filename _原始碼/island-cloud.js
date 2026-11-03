/* ===== 探索島：Google 登入＋雲端存檔（Firebase） =====
   單元頁與紀錄本共用。名單制：只有老師名單上的帳號會存到雲端。 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

export const TEACHER = "kb5936@cnc.km.edu.tw";
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

/* ---------- 單元頁 ---------- */
function unitPage() {
  const API = window.ISLAND_API;
  const C = API.config, store = API.store;
  const anonKey = "isl:" + C.slug;
  const bar = authBar(API.progressBox);
  let user = null, timer = null, status = "", unitRef = null, profRef = null, rosterName = "";

  const paint = () => {
    if (!user) {
      bar.innerHTML = '<span>登入學校帳號，紀錄會存到雲端，換電腦也接得下去。</span><button class="primary">用 Google 登入</button>';
      bar.querySelector("button").onclick = () => login().catch(e => { status = "登入沒有完成：" + (e.code || e.message); paintMsg(); });
      return;
    }
    if (!unitRef) {
      const t = emailOf(user) === TEACHER;
      bar.innerHTML = t
        ? '<span>老師帳號 <b>' + esc(user.email) + '</b>：全班紀錄請到 <a href="teacher.html">老師頁面</a>。</span><button>登出</button>'
        : '<span class="warn">這個帳號不在名單上</span><span>' + esc(user.email) + '，紀錄只會存在這台電腦。請找老師把你加進名單，或換一個帳號。</span><button>換帳號</button>';
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
    const r = await rosterOf(u);
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
    const r = await rosterOf(u);
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
