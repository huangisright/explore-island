(() => {
  "use strict";
  const { units, recordedLessons } = window.GeometryCourse;
  const recorded = new Set(window.GP_DONE || recordedLessons || []);
  const school = new URL("./", location.href);
  const otherOrigin = location.origin !== school.origin;
  const narrow = matchMedia("(max-width: 860px)");
  const tint = [
    "255,166,148",
    "255,189,132",
    "238,211,130",
    "146,219,159",
    "127,218,211",
    "152,196,255",
    "187,174,255",
    "228,167,234",
  ];
  const icon = (name) => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const $ = (id) => document.getElementById(id);
  const escape = (text) =>
    String(text).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const slug = (unit, i) => "gp-u" + unit.n + "-" + (i + 1);
  const label = (unit) => "第" + unit.zh + "道光";
  const children = (root, selector) => Array.from(root.querySelectorAll(selector));
  const sheet = $("sheet");
  const stars = $("stars");
  let selected = units[0];
  let view = "map";
  let stamps = new Set();

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  function remember(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }
  let teacherAvailable = read("gp-teacher-ok", false) === true;
  let teacher = teacherAvailable && read("gp-mode", "student") === "teacher";
  function activateTeacherChoice() {
    if (location.hash !== "#teacher") return;
    teacherAvailable = true;
    remember("gp-teacher-ok", true);
  }
  activateTeacherChoice();

  function sky() {
    // Fixed sky positions keep the chart still as a reader moves between lights.
    let seed = 43;
    const sample = () => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    };
    const dots = document.createDocumentFragment();
    for (let i = 0; i < 88; i++) {
      const dot = document.createElement("i");
      dot.style.left = (sample() * 100).toFixed(2) + "%";
      dot.style.top = (sample() * 100).toFixed(2) + "%";
      dot.style.opacity = (0.15 + sample() * 0.53).toFixed(2);
      if (i % 12 === 0) dot.className = "bright";
      dots.append(dot);
    }
    document.querySelector(".sky").append(dots);
  }
  function lessonList(unit) {
    return (
      '<ol class="lessons">' +
      unit.s
        .map(([title, term], i) => {
          const id = slug(unit, i);
          const isRecorded = recorded.has(id);
          const href = isRecorded
            ? new URL(id + ".html", school).href
            : "https://huangisright.github.io/GiftedMath/units/" + id + ".html";
          const external = !isRecorded || otherOrigin;
          const stamped = stamps.has(id);
          const details = teacher ? "<small>" + escape(term) + "</small>" : "";
          const mark = stamped ? '<small class="stamp-state">已蓋章</small>' : "";
          const accessible =
            "第 " +
            (i + 1) +
            " 節，" +
            title +
            (teacher ? "，" + term : "") +
            (stamped ? "，已蓋章" : "") +
            (external ? "，在原站另開分頁" : "");
          return (
            '<li><a class="lesson" href="' +
            href +
            '"' +
            (external ? ' target="_blank" rel="noopener"' : "") +
            ' aria-label="' +
            escape(accessible) +
            '"><span class="ordinal" aria-hidden="true">' +
            String(i + 1).padStart(2, "0") +
            "</span><span>" +
            escape(title) +
            details +
            mark +
            "</span>" +
            icon("go") +
            "</a></li>"
          );
        })
        .join("") +
      "</ol>"
    );
  }
  function unitContent(unit, headingId, compact) {
    const alternate =
      teacher && unit.t !== unit.name
        ? '<p class="teacher-name">單元名　' + escape(unit.t) + "</p>"
        : "";
    return (
      '<div class="unit-head"><span class="head-figure">' +
      window.geometryFigure(unit.n) +
      "</span>" +
      '<span class="unit-index">' +
      label(unit) +
      '</span><h3 id="' +
      headingId +
      '">' +
      escape(unit.name) +
      "</h3>" +
      alternate +
      '<p class="hook">' +
      escape(unit.hook) +
      "</p></div>" +
      (compact
        ? ""
        : '<p class="lesson-meta">' +
          unit.s.length +
          " 個發現" +
          (otherOrigin ? " · 於原站開啟" : "") +
          "</p>") +
      lessonList(unit)
    );
  }
  function renderDetails() {
    for (const [element, name] of [
      [$("detail"), "detail-title"],
      [$("sheet-content"), "sheet-title"],
    ]) {
      element.style.setProperty("--tint", tint[selected.n - 1]);
      element.innerHTML = unitContent(selected, name, false);
    }
  }
  function renderStars() {
    for (const unit of units) {
      let button = stars.querySelector('[data-unit="' + unit.n + '"]');
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "star";
        button.dataset.unit = unit.n;
        button.style.gridArea = "s" + unit.n;
        button.style.setProperty("--tint", tint[unit.n - 1]);
        stars.append(button);
      }
      const name = teacher ? unit.t : unit.name;
      const count = unit.s.filter((_, i) => stamps.has(slug(unit, i))).length;
      button.setAttribute(
        "aria-label",
        label(unit) +
          "，" +
          name +
          "，" +
          unit.s.length +
          " 個發現" +
          (count ? "，已蓋 " + count + " 枚章" : ""),
      );
      button.setAttribute("aria-pressed", String(selected === unit));
      button.setAttribute("aria-controls", narrow.matches ? "sheet" : "detail");
      if (narrow.matches) button.setAttribute("aria-haspopup", "dialog");
      else button.removeAttribute("aria-haspopup");
      button.innerHTML =
        '<span class="motif">' +
        window.geometryFigure(unit.n) +
        "</span>" +
        '<span class="star-index">' +
        label(unit) +
        '</span><span class="star-title">' +
        escape(name) +
        (count ? '<span class="stamp-mark" aria-hidden="true">✦</span>' : "") +
        "</span>";
    }
  }
  function renderCatalogue() {
    $("catalogue").innerHTML = units
      .map(
        (unit) =>
          '<article class="catalog-unit" style="--tint:' +
          tint[unit.n - 1] +
          '" aria-labelledby="catalog-' +
          unit.n +
          '">' +
          unitContent(unit, "catalog-" + unit.n, true) +
          "</article>",
      )
      .join("");
  }
  function render() {
    renderStars();
    renderDetails();
    if (view === "list") renderCatalogue();
    $("mode-switch").hidden = !teacherAvailable;
    for (const b of children($("mode-switch"), "[data-mode]"))
      b.setAttribute("aria-pressed", String((b.dataset.mode === "teacher") === teacher));
    $("stamp-count").hidden = stamps.size === 0;
    $("stamp-count").textContent = stamps.size
      ? "這台裝置已拾起 " + stamps.size + "／" + units.reduce((n, u) => n + u.s.length, 0) + " 道光"
      : "";
  }
  function refreshStamps() {
    const next = new Set();
    for (const unit of units)
      unit.s.forEach((_, i) => {
        const id = slug(unit, i);
        if (read("isl:" + id, null)?.stampAt) next.add(id);
      });
    if (next.size === stamps.size && [...next].every((id) => stamps.has(id))) return;
    stamps = next;
    render();
  }
  function switchView(next) {
    view = next;
    $("map-view").hidden = next !== "map";
    $("catalogue").hidden = next !== "list";
    if (next === "list") renderCatalogue();
    for (const b of document.querySelectorAll("[data-view]"))
      b.setAttribute("aria-pressed", String(b.dataset.view === next));
  }
  function select(unit) {
    selected = unit;
    for (const b of stars.children)
      b.setAttribute("aria-pressed", String(Number(b.dataset.unit) === unit.n));
    renderDetails();
  }
  function unitFromHash() {
    const match = /^#light-([1-8])$/.exec(location.hash);
    return match && units[Number(match[1]) - 1];
  }
  function setAddress(method, state, hash) {
    const url = new URL(location.href);
    url.hash = hash;
    try {
      history[method](state, "", url);
    } catch {}
  }
  function showSheet() {
    if (!sheet.open) sheet.showModal();
  }
  function openUnit(unit) {
    select(unit);
    if (narrow.matches) {
      if (unitFromHash() && !sheet.open) setAddress("replaceState", null, "");
      setAddress("pushState", { geometrySheet: true }, "light-" + unit.n);
      showSheet();
    } else {
      setAddress("replaceState", null, "light-" + unit.n);
      $("selection-status").textContent = "已展開" + label(unit) + "，" + unit.name + "。";
    }
  }
  function closeSheet() {
    sheet.close();
    const fromButton = history.state?.geometrySheet;
    if (fromButton) history.back();
    else if (unitFromHash()) setAddress("replaceState", null, "");
    stars.querySelector('[data-unit="' + selected.n + '"]')?.focus({ preventScroll: true });
  }
  function followAddress() {
    activateTeacherChoice();
    $("mode-switch").hidden = !teacherAvailable;
    const unit = unitFromHash();
    if (unit) {
      switchView("map");
      select(unit);
      if (narrow.matches) showSheet();
    } else if (sheet.open) sheet.close();
  }

  stars.addEventListener("click", (event) => {
    const button = event.target.closest("[data-unit]");
    if (button) openUnit(units[Number(button.dataset.unit) - 1]);
  });
  for (const b of document.querySelectorAll("[data-view]"))
    b.addEventListener("click", () => switchView(b.dataset.view));
  for (const b of children($("mode-switch"), "[data-mode]"))
    b.addEventListener("click", () => {
      teacher = teacherAvailable && b.dataset.mode === "teacher";
      remember("gp-mode", teacher ? "teacher" : "student");
      render();
    });
  $("close-sheet").addEventListener("click", closeSheet);
  sheet.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeSheet();
  });
  sheet.addEventListener("click", (event) => {
    if (event.target !== sheet) return;
    const r = sheet.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      closeSheet();
  });
  narrow.addEventListener("change", () => {
    renderStars();
    if (!narrow.matches && sheet.open) {
      sheet.close();
      setAddress("replaceState", null, "light-" + selected.n);
    }
  });
  window.addEventListener("hashchange", followAddress);
  window.addEventListener("popstate", followAddress);
  window.addEventListener("pageshow", refreshStamps);
  window.addEventListener("storage", (e) => {
    if (e.key === null || e.key.startsWith("isl:")) refreshStamps();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshStamps();
  });
  sky();
  refreshStamps();
  render();
  followAddress();
})();
