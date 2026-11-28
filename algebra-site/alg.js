(() => {
  "use strict";
  // 代數拾光入口：照幾何拾光的星圖頁改的。做好的單元由 build.py 注入 window.ALG_DONE（slug、各站名稱）。
  const DONE = Object.fromEntries((window.ALG_DONE || []).map((u) => [u.slug, u]));
  const PLAN = [
    { n: 1, zh: "一", slug: "alg-u1", name: "遮住頂點以後", hook: "兩端加起來的數還在，被遮住的找得回來嗎？" },
    { n: 2, zh: "二", slug: "alg-u2", name: "同一塊面積，兩種算法", hook: "整塊算和切開算，中間放一個等號。" },
    { n: 3, zh: "三", slug: null, name: "把一團當成一個字母", hook: "重複出現的那一團，換成一個字母。" },
    { n: 4, zh: "四", slug: null, name: "兩個條件一起釘住", hook: "一條不夠，兩條交在一點。" },
    { n: 5, zh: "五", slug: null, name: "兩個根合在一起", hook: "兩個答案越靠越近，最後變成一個。" },
    { n: 6, zh: "六", slug: null, name: "係數在數東西", hook: "展開以後的係數，原來在數有幾種。" },
  ];
  const units = PLAN.map((u) => {
    const d = u.slug && DONE[u.slug];
    return Object.assign({}, u, d ? { name: d.title, open: true, s: d.labs } : { open: false, s: [] });
  });
  const tint = ["255,166,148", "238,211,130", "146,219,159", "127,218,211", "152,196,255", "228,167,234"];
  const narrow = matchMedia("(max-width: 860px)");
  const $ = (id) => document.getElementById(id);
  const icon = (name) => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const label = (u) => "第" + u.zh + "道光";
  const sheet = $("sheet"), stars = $("stars");
  let selected = units.find((u) => u.open) || units[0];
  let stamps = new Set();
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };

  function sky() {
    let seed = 71;
    const r = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    const f = document.createDocumentFragment();
    for (let i = 0; i < 80; i++) {
      const d = document.createElement("i");
      d.style.left = (r() * 100).toFixed(2) + "%"; d.style.top = (r() * 100).toFixed(2) + "%";
      d.style.opacity = (0.15 + r() * 0.5).toFixed(2);
      if (i % 12 === 0) d.className = "bright";
      f.append(d);
    }
    document.querySelector(".sky").append(f);
  }
  function lessonList(u) {
    if (!u.open) return '<p class="later-note">這一道光還在準備，做好了就會亮起來。</p>';
    const stamped = stamps.has(u.slug);
    return '<ol class="lessons">' + u.s.map(([lab, title], i) =>
      '<li><a class="lesson" href="' + u.slug + ".html#" + lab + '" aria-label="' + esc("第 " + (i + 1) + " 站，" + title + (stamped ? "，已蓋章" : "")) + '">' +
      '<span class="ordinal" aria-hidden="true">' + String(i + 1).padStart(2, "0") + "</span><span>" + esc(title) +
      (stamped && i === 0 ? '<small class="stamp-state">已蓋章</small>' : "") + "</span>" + icon("go") + "</a></li>").join("") + "</ol>";
  }
  function unitContent(u, id, compact) {
    return '<div class="unit-head"><span class="head-figure">' + window.algebraFigure(u.n) + '</span><span class="unit-index">' + label(u) +
      '</span><h3 id="' + id + '">' + esc(u.name) + '</h3><p class="hook">' + esc(u.hook) + "</p></div>" +
      (compact || !u.open ? "" : '<p class="lesson-meta">' + u.s.length + " 個探索站 · " + '<a href="' + u.slug + '.html">從頭開始</a></p>') + lessonList(u);
  }
  function renderDetails() {
    for (const [el, id] of [[$("detail"), "detail-title"], [$("sheet-content"), "sheet-title"]]) {
      el.style.setProperty("--tint", tint[selected.n - 1]);
      el.innerHTML = unitContent(selected, id, false);
    }
  }
  function renderStars() {
    for (const u of units) {
      let b = stars.querySelector('[data-unit="' + u.n + '"]');
      if (!b) {
        b = document.createElement("button"); b.type = "button"; b.className = "star" + (u.open ? "" : " later");
        b.dataset.unit = u.n; b.style.gridArea = "s" + u.n; b.style.setProperty("--tint", tint[u.n - 1]); stars.append(b);
      }
      b.setAttribute("aria-label", label(u) + "，" + u.name + (u.open ? "" : "，準備中") + (stamps.has(u.slug) ? "，已蓋章" : ""));
      b.setAttribute("aria-pressed", String(selected === u));
      b.setAttribute("aria-controls", narrow.matches ? "sheet" : "detail");
      b.innerHTML = '<span class="motif">' + window.algebraFigure(u.n) + '</span><span class="star-index">' + label(u) + '</span><span class="star-title">' + esc(u.name) +
        (stamps.has(u.slug) ? '<span class="stamp-mark" aria-hidden="true">✦</span>' : "") + "</span>";
    }
  }
  function renderCatalogue() {
    $("catalogue").innerHTML = units.map((u) => '<article class="catalog-unit" style="--tint:' + tint[u.n - 1] + '" aria-labelledby="catalog-' + u.n + '">' + unitContent(u, "catalog-" + u.n, true) + "</article>").join("");
  }
  function render() {
    renderStars(); renderDetails(); renderCatalogue();
    const open = units.filter((u) => u.open).length;
    $("stamp-count").hidden = stamps.size === 0;
    $("stamp-count").textContent = stamps.size ? "這台裝置已拾起 " + stamps.size + "／" + open + " 道光" : "";
  }
  function refreshStamps() {
    const next = new Set(units.filter((u) => u.open && read("isl:" + u.slug)?.stampAt).map((u) => u.slug));
    if (next.size === stamps.size && [...next].every((s) => stamps.has(s))) return;
    stamps = next; render();
  }
  function switchView(v) {
    $("map-view").hidden = v !== "map"; $("catalogue").hidden = v !== "list";
    for (const b of document.querySelectorAll("[data-view]")) b.setAttribute("aria-pressed", String(b.dataset.view === v));
  }
  function select(u) {
    selected = u;
    for (const b of stars.children) b.setAttribute("aria-pressed", String(Number(b.dataset.unit) === u.n));
    renderDetails();
  }
  function closeSheet() {
    sheet.close();
    stars.querySelector('[data-unit="' + selected.n + '"]')?.focus({ preventScroll: true });
  }
  stars.addEventListener("click", (e) => {
    const b = e.target.closest("[data-unit]"); if (!b) return;
    select(units[Number(b.dataset.unit) - 1]);
    if (narrow.matches && !sheet.open) sheet.showModal();
    else $("selection-status").textContent = "已展開" + label(selected) + "，" + selected.name + "。";
  });
  for (const b of document.querySelectorAll("[data-view]")) b.addEventListener("click", () => switchView(b.dataset.view));
  $("close-sheet").addEventListener("click", closeSheet);
  sheet.addEventListener("cancel", (e) => { e.preventDefault(); closeSheet(); });
  sheet.addEventListener("click", (e) => {
    if (e.target !== sheet) return;
    const r = sheet.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeSheet();
  });
  narrow.addEventListener("change", () => { renderStars(); if (!narrow.matches && sheet.open) sheet.close(); });
  window.addEventListener("pageshow", refreshStamps);
  window.addEventListener("storage", (e) => { if (e.key === null || e.key.startsWith("isl:")) refreshStamps(); });
  sky(); render(); refreshStamps();
})();
