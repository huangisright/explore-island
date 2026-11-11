/* ===== 探索島：預測／紀錄／判斷題／單元章 =====
   沒登入：紀錄只存在這台裝置的瀏覽器（localStorage）。
   登入且在名單上：island-cloud.js 透過 window.ISLAND_API 接手，另存一份到雲端。 */
(function () {
  const C = window.ISLAND;
  let KEY = "isl:" + C.slug;
  let NAMEKEY = "isl:name";
  let nameLocked = false;
  const mem = {};
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] ?? null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } },
  };
  let S;
  try { S = JSON.parse(store.get(KEY)) || {}; } catch (e) { S = {}; }
  S.st = S.st || {}; S.quiz = S.quiz || {};
  const save = () => {
    S.updated = new Date().toISOString();
    S.n = ids.length; S.nd = ids.filter(id => S.st[id] && S.st[id].done).length;
    S.q = C.quiz.length; S.qd = C.quiz.filter((_, i) => S.quiz[i] && S.quiz[i].ok).length;
    store.set(KEY, JSON.stringify(S));
    if (API.onSave) API.onSave(S);
  };
  const API = window.ISLAND_API = window.ISLAND_API || {};

  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const ids = Object.keys(C.stations);
  const MIN_OBS = 1;   // 寫一個字（例如一個數字）就算

  const st = id => (S.st[id] = S.st[id] || { opts: [], pred: "", locked: false, obs: "", done: false });
  const predText = (cfg, s) => {
    const parts = [];
    if (cfg.opts && s.opts.length) parts.push(s.opts.map(i => cfg.opts[i]).join("、"));
    else if (cfg.opts && cfg.multi) parts.push("一個都沒選");
    if (s.pred.trim()) parts.push(s.pred.trim());
    return parts.join("；");
  };
  const stationDone = id => !!st(id).done;
  const quizDone = i => !!(S.quiz[i] && S.quiz[i].ok);
  const allStations = () => ids.every(stationDone);
  const allQuiz = () => C.quiz.every((_, i) => quizDone(i));

  /* ---------- 每一站 ---------- */
  ids.forEach(id => {
    const cfg = C.stations[id];
    const lab = document.getElementById(id);
    if (!lab) return;
    let s = st(id);
    const head = lab.querySelector(".lab-head");
    const body = lab.querySelector(".lab-body");
    const foot = lab.querySelector(".lab-foot");
    const no = lab.querySelector(".lab-no").textContent.trim();
    if (cfg.why) lab.querySelector(".lab-why").innerHTML = esc(cfg.why);
    const tag = el("span", "isl-done-tag", "");
    head.appendChild(tag);

    /* 預測 */
    let pbox = null, wait = null;
    if (cfg.mode === "predict") {
      pbox = el("div", "isl-box");
      head.after(pbox);
      wait = el("div", "isl-wait", "先寫下你的預測，這一站才會打開。");
      body.before(wait);
    }
    const renderPred = () => {
      if (!pbox) return;
      if (s.locked) {
        pbox.innerHTML = '<div class="isl-k">我的預測</div><p class="isl-mine">' + esc(cfg.q) + "<br><b>" + esc(predText(cfg, s)) + "</b></p>";
        return;
      }
      const type = cfg.multi ? "checkbox" : "radio";
      let h = '<div class="isl-k">先預測，再動手</div><p class="isl-q">' + esc(cfg.q) + "</p>";
      if (cfg.opts) {
        h += '<div class="isl-opts">' + cfg.opts.map((o, i) =>
          '<label><input type="' + type + '" name="o-' + id + '" value="' + i + '"' + (s.opts.includes(i) ? " checked" : "") + "> " + esc(o) + "</label>").join("") + "</div>";
      }
      h += '<textarea class="isl-ta" placeholder="' + (cfg.opts ? "為什麼這樣猜？（寫一句就好）" : "寫下你的答案和理由") + '">' + esc(s.pred) + "</textarea>";
      const rule = !cfg.opts ? "寫下你的答案就能送出，一個數字也可以。"
        : cfg.multi ? "勾選你覺得對的（可以都不勾），再寫一句為什麼，就能送出。"
        : "選一個答案，再寫一句為什麼，就能送出。";
      h += '<p class="isl-rule">' + rule + '</p>';
      h += '<div class="isl-row"><button class="isl-btn primary">預測寫好了，開始操作</button><span class="isl-hint"></span></div>';
      pbox.innerHTML = h;
      const ta = pbox.querySelector("textarea"), btn = pbox.querySelector("button"), hint = pbox.querySelector(".isl-hint");
      const ok = () => {
        s.opts = [...pbox.querySelectorAll("input:checked")].map(x => +x.value);
        s.pred = ta.value;
        const needOpt = cfg.opts && !cfg.multi && s.opts.length === 0;
        const needText = s.pred.trim().length === 0;
        btn.disabled = needOpt || needText;
        hint.classList.toggle("warn", btn.disabled);
        hint.textContent = needOpt && needText ? "還差：選一個答案、寫一句為什麼。"
          : needOpt ? "還差：選一個答案。"
          : needText ? (cfg.opts ? "還差：寫一句為什麼。" : "還差：寫下你的答案。")
          : "送出後就不能改。猜錯沒關係，等一下對照才有東西看。";
      };
      pbox.addEventListener("input", () => { ok(); save(); });
      pbox.addEventListener("change", () => { ok(); save(); });
      ok();
      btn.addEventListener("click", () => {
        ok();
        if (btn.disabled) return;
        s.locked = true; s.lockedAt = new Date().toISOString(); save();
        renderAll(); body.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    };

    /* 觀察紀錄 */
    const obox = el("div", "isl-box isl-obs");
    body.after(obox);
    const renderObs = () => {
      let h = '<div class="isl-k">我看到的</div><p class="isl-q">' + esc(cfg.obs) + "</p>";
      h += '<textarea class="isl-ta" placeholder="把你看到的寫下來">' + esc(s.obs) + "</textarea>";
      h += '<div class="isl-row"><button class="isl-btn' + (s.done ? "" : " primary") + '">' + (s.done ? "更新紀錄" : "記下來，看對照") + '</button><span class="isl-hint">' + (s.done ? "" : "寫下你看到的（一句話就好），就能記錄。") + '</span></div>';
      obox.innerHTML = h;
      const ta = obox.querySelector("textarea"), btn = obox.querySelector("button"), hint = obox.querySelector(".isl-hint");
      const chk = () => { btn.disabled = ta.value.trim().length < MIN_OBS; };
      ta.addEventListener("input", () => {
        s.obs = ta.value; save(); chk();
        hint.textContent = s.done ? "已自動儲存" : btn.disabled ? "寫下你看到的（一句話就好），就能記錄。" : "";
      });
      chk();
      btn.addEventListener("click", () => {
        s.obs = ta.value; if (s.obs.trim().length < MIN_OBS) return;
        const first = !s.done;
        s.done = true; s.doneAt = s.doneAt || new Date().toISOString(); save();
        renderAll();
        if (first && foot) foot.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    };

    lab._islRender = () => {
      s = st(id);
      const open = cfg.mode !== "predict" || s.locked;
      renderPred();
      if (wait) wait.hidden = open;
      body.hidden = !open;
      obox.hidden = !open;
      if (open) renderObs();
      if (foot) { foot.hidden = !s.done; foot.classList.add("isl-reveal"); }
      tag.textContent = s.done ? "✓ 已記錄" : "";
    };
  });

  /* ---------- 會先講出答案的段落 ---------- */
  const gates = (C.gates || []).map(g => {
    const label = g.after === "ALL" ? "全部 " + ids.length + " 站都記錄完，這一段才會打開。" :
      "第 " + document.querySelector("#" + g.after + " .lab-no").textContent.trim() + " 站記錄完，這一段才會打開。";
    const note = el("div", "isl-gate", label);
    if (g.hide) {                       // 直接藏起指定的元素（段落裡同時有探索站時用）
      const kids = [...document.querySelectorAll(g.hide)];
      if (!kids.length) return null;
      kids[0].before(note);
      return { g, kids, note };
    }
    const sec = document.querySelector(g.sel);
    if (!sec) return null;
    const kids = [...sec.children].filter(k => !k.classList.contains("pillar-tag"));
    sec.appendChild(note);
    return { g, kids, note };
  }).filter(Boolean);

  /* ---------- 進度列 ---------- */
  const prog = el("div", "isl-prog");
  document.querySelector("header").after(prog);

  /* ---------- 判斷題 ---------- */
  const quiz = el("section", "", "");
  quiz.id = "isl-quiz";
  const endSec = document.getElementById("end");
  (endSec || document.querySelector(".wrap").lastElementChild).before(quiz);
  const renderQuiz = () => {
    let h = '<div class="pillar-tag" style="color:var(--orange)"><span class="dot" style="background:var(--orange)"></span>過關前的 ' + C.quiz.length + ' 題</div>' +
      "<h2>選一個，答錯可以再選</h2>";
    quiz.innerHTML = h;
    C.quiz.forEach((q, i) => {
      const r = S.quiz[i] = S.quiz[i] || { tried: [], ok: false };
      const card = el("div", "isl-qcard");
      card.innerHTML = '<div class="isl-qn">第 ' + (i + 1) + " 題</div><p class=\"isl-qt\">" + esc(q.q) + "</p>";
      q.opts.forEach((o, j) => {
        const b = el("button", "isl-choice", esc(o));
        if (r.tried.includes(j)) b.classList.add(j === q.ans ? "yes" : "no");
        if (r.ok || r.tried.includes(j)) b.disabled = true;
        b.addEventListener("click", () => {
          r.tried.push(j);
          if (j === q.ans) { r.ok = true; r.okAt = new Date().toISOString(); }
          save(); renderAll();
        });
        card.appendChild(b);
      });
      const last = r.tried[r.tried.length - 1];
      if (r.ok) card.appendChild(el("div", "isl-fb good", "<b>對。</b>" + esc(q.exp)));
      else if (last != null) card.appendChild(el("div", "isl-fb bad", "<b>再想想。</b>" + esc(q.why[last])));
      quiz.appendChild(card);
    });
  };

  /* ---------- 紀錄與章 ---------- */
  const rec = el("section", "", "");
  rec.id = "isl-record";
  document.querySelector(".wrap").appendChild(rec);
  const stamp = (on, date) => {
    const d = date ? date.slice(0, 10).replace(/-/g, ".") : "";
    return '<svg class="isl-stamp' + (on ? "" : " off") + '" viewBox="0 0 150 150" role="img" aria-label="單元章">' +
      '<g transform="rotate(-8 75 75)" style="fill:none;stroke:var(--crimson)">' +
      '<circle cx="75" cy="75" r="66" stroke-width="4"/><circle cx="75" cy="75" r="57" stroke-width="1.5"/>' +
      '<text x="75" y="52" text-anchor="middle" style="fill:var(--crimson);stroke:none;font:700 13px var(--sans);letter-spacing:2px">' + esc(C.chap) + "　探索完成</text>" +
      '<text x="75" y="84" text-anchor="middle" style="fill:var(--crimson);stroke:none;font:700 21px var(--serif)">' + esc(C.title) + "</text>" +
      '<line x1="34" y1="96" x2="116" y2="96" stroke-width="1.2"/>' +
      '<text x="75" y="114" text-anchor="middle" style="fill:var(--crimson);stroke:none;font:600 12px var(--sans)">' + (d || "　") + "</text></g></svg>";
  };
  let clearArmed = false;
  const renderRecord = () => {
    const done = allStations() && allQuiz();
    const firstOK = C.quiz.filter((q, i) => S.quiz[i] && S.quiz[i].tried[0] === q.ans).length;
    let h = '<div class="pillar-tag" style="color:var(--green)"><span class="dot" style="background:var(--green)"></span>我的探索紀錄</div>';
    h += '<div class="isl-sheet"><div class="isl-sheet-head"><div><h3>' + esc(C.chap) + "　" + esc(C.title) + '</h3><div class="isl-sub">' + esc(C.topic) + '</div></div>' +
      '<label class="isl-name">姓名 <input type="text" maxlength="20" value="' + esc(store.get(NAMEKEY) || "") + '"' + (nameLocked ? " readonly" : "") + '></label></div>';
    h += '<table class="isl-tbl"><thead><tr><th>站</th><th>我的預測</th><th>我看到的</th></tr></thead><tbody>';
    ids.forEach(id => {
      const cfg = C.stations[id], s = st(id);
      const lab = document.getElementById(id);
      const name = lab ? lab.querySelector(".lab-no").textContent.trim() + "　" + lab.querySelector(".lab-title").textContent.trim() : id;
      const p = cfg.mode === "predict" ? (s.locked ? esc(predText(cfg, s)) : '<span class="empty">還沒寫</span>') : '<span class="empty">（這站直接操作）</span>';
      const o = s.done ? esc(s.obs.trim()) : '<span class="empty">還沒寫</span>';
      h += '<tr><td class="n">' + esc(name) + '</td><td data-h="預測">' + p + '</td><td data-h="看到">' + o + "</td></tr>";
    });
    h += "</tbody></table>";
    h += '<div class="isl-stamp-wrap">' + stamp(done, S.stampAt) + "<div>" +
      (done ? "<b>這一章探索完成。</b><br>判斷題第一次就答對 " + firstOK + " ／ " + C.quiz.length + " 題。"
            : "全部 " + ids.length + " 站都記錄完、" + C.quiz.length + " 題判斷題都答對，就會蓋上這個章。<br>目前：" +
              ids.filter(stationDone).length + " ／ " + ids.length + " 站，" +
              C.quiz.filter((_, i) => quizDone(i)).length + " ／ " + C.quiz.length + " 題。") +
      "</div></div></div>";
    h += '<div class="isl-tools"><button class="isl-btn primary" data-a="print">列印這份紀錄</button>' +
      '<a class="isl-btn ghost" style="text-decoration:none" href="passport.html">看我的探索紀錄本</a>' +
      '<button class="isl-clear" data-a="clear">' + (clearArmed ? "確定要清掉？再按一次" : "清除這一章的紀錄") + "</button></div>";
    h += '<p class="isl-hint" style="margin-top:10px">' + (window.ISLAND_GATE ? "" : "沒登入時，紀錄只存在這台電腦的瀏覽器裡；") + '登入名單上的帳號，紀錄會存到雲端。在共用電腦上用完記得登出。</p>';
    rec.innerHTML = h;
    rec.querySelector(".isl-name input").addEventListener("input", e => store.set(NAMEKEY, e.target.value));
    rec.querySelector('[data-a="print"]').addEventListener("click", () => {
      document.body.classList.add("isl-print"); window.print();
      setTimeout(() => document.body.classList.remove("isl-print"), 500);
    });
    rec.querySelector('[data-a="clear"]').addEventListener("click", () => {
      if (!clearArmed) { clearArmed = true; renderRecord(); setTimeout(() => { clearArmed = false; renderRecord(); }, 4000); return; }
      if (API.onClear) { API.onClear(); return; }
      store.del(KEY); location.reload();
    });
  };

  function renderAll() {
    if (allStations() && allQuiz() && !S.stampAt) { S.stampAt = new Date().toISOString(); save(); }
    ids.forEach(id => { const lab = document.getElementById(id); lab && lab._islRender && lab._islRender(); });
    gates.forEach(({ g, kids, note }) => {
      const open = g.after === "ALL" ? allStations() : stationDone(g.after);
      kids.forEach(k => { if (k !== note) k.hidden = !open; });
      note.hidden = open;
    });
    const nq = C.quiz.filter((_, i) => quizDone(i)).length;
    prog.innerHTML = '<span class="t">探索紀錄</span><span class="isl-dots">' + ids.map(id => {
      const s = st(id), cfg = C.stations[id];
      const n = document.querySelector("#" + id + " .lab-no").textContent.trim();
      const cls = s.done ? "ok" : (cfg.mode === "predict" && s.locked) ? "half" : "";
      return '<a class="' + cls + '" href="#' + id + '" title="第 ' + n + ' 站">' + n + "</a>";
    }).join("") + '</span><a class="q' + (nq === C.quiz.length ? " ok" : "") + '" href="#isl-quiz" style="text-decoration:none">判斷題 ' + nq + " ／ " + C.quiz.length + "</a>" +
      '<a class="q' + (S.stampAt ? " ok" : "") + '" href="#isl-record" style="text-decoration:none">' + (S.stampAt ? "✓ 已蓋章" : "我的紀錄 →") + "</a>";
    renderQuiz();
    renderRecord();
  }
  /* 給雲端模組用：換一個人的紀錄、換姓名、整頁重畫 */
  API.config = C;
  API.store = store;
  API.state = () => S;
  API.adopt = (newKey, newS, opts) => {
    KEY = newKey;
    S = newS || {};
    S.st = S.st || {}; S.quiz = S.quiz || {};
    if (opts && opts.nameKey) NAMEKEY = opts.nameKey;
    if (opts && "name" in opts) { store.set(NAMEKEY, opts.name || ""); }
    nameLocked = !!(opts && opts.nameLocked);
    clearArmed = false;
    store.set(KEY, JSON.stringify(S));
    renderAll();
  };
  API.progressBox = prog;
  API.recordBox = rec;
  renderAll();
  if (API.onReady) API.onReady();
})();
