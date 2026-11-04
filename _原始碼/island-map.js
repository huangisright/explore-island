/* 探索島地圖（入口與紀錄本共用）。資料：window.ISLAND_MAP = {units, grades, plain} */
(function () {
const { units: UNITS, grades: GRADES, plain: PLAIN } = window.ISLAND_MAP;
const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/* 手繪感：固定種子的亂數，讓每次畫出來都一樣 */
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const j = a => (rnd() - .5) * 2 * a;
function blob(cx, cy, r, n = 11, k = .22) {
  const pts = [];
  for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2, rr = r * (1 + j(k)); pts.push([cx + Math.cos(t) * rr * 1.25, cy + Math.sin(t) * rr * .82]); }
  let d = "M" + pts[0].map(v => v.toFixed(1)).join(",");
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    d += " Q" + p[0].toFixed(1) + "," + p[1].toFixed(1) + " " + m[0].toFixed(1) + "," + m[1].toFixed(1);
  }
  return d + "Z";
}
function line(x1, y1, x2, y2, w = 1.4) {
  const mx = (x1 + x2) / 2 + j(4), my = (y1 + y2) / 2 + j(4);
  return '<path d="M' + x1 + "," + y1 + " Q" + mx.toFixed(1) + "," + my.toFixed(1) + " " + x2 + "," + y2 + '" fill="none" stroke="#1d1d1d" stroke-width="' + w + '" stroke-linecap="round"/>';
}
function waves(n) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = 30 + rnd() * 1140, y = 30 + rnd() * 800;
    s += '<path d="M' + x.toFixed(0) + "," + y.toFixed(0) + " q6,-5 12,0 t12,0" + '" fill="none" stroke="#9fbbd1" stroke-width="1.6" stroke-linecap="round"/>';
  }
  return s;
}
/* 換行：每 n 個字一行 */
function wrapText(x, y, str, n, cls, anchor = "middle", lh = 17) {
  const lines = []; for (let i = 0; i < str.length; i += n) lines.push(str.slice(i, i + n));
  return '<text class="' + cls + '" text-anchor="' + anchor + '" x="' + x + '" y="' + y + '">' +
    lines.map((l, i) => '<tspan x="' + x + '" dy="' + (i ? lh : 0) + '">' + esc(l) + "</tspan>").join("") + "</text>";
}
function stampSvg(x, y, k) {
  return '<g transform="translate(' + x + "," + y + ') rotate(-14) scale(' + (k || 1) + ')" opacity=".9"><circle r="17" fill="none" stroke="#c8321e" stroke-width="2.5"/>' +
    '<text text-anchor="middle" y="5" style="font-size:13px;font-weight:700;fill:#c8321e">完成</text></g>';
}

/* 六群島的位置 */
const SPOT = {
  "七年級上": [190, 205], "八年級上": [600, 175], "九年級上": [1030, 215],
  "七年級下": [205, 560], "八年級下": [600, 590], "九年級下": [1050, 575],
};
const SHORT = { "七年級上": "七上", "七年級下": "七下", "八年級上": "八上", "八年級下": "八下", "九年級上": "九上", "九年級下": "九下" };

function draw(cloud, opts) {
  opts = opts || {};
  seed = 7;
  let s = waves(70);
  const POS = {};
  // 指北針
  s += '<g transform="translate(1110,95)">' + line(0, -38, 0, 38, 2) + line(-26, 0, 26, 0, 1.4) +
    '<path d="M0,-38 L-7,-20 L7,-20 Z" fill="#1d1d1d"/><text class="lab" text-anchor="middle" y="-46">上面</text></g>';
  // 群島
  GRADES.forEach(g => {
    const us = UNITS.filter(u => u.grade === g);
    if (!us.length) return;
    const [gx, gy] = SPOT[g];
    const cols = us.length > 4 ? 3 : 2;
    const rows = Math.ceil(us.length / cols);
    const dx = 118, dy = 112;
    s += '<text class="big" text-anchor="middle" x="' + gx + '" y="' + (gy - rows * dy / 2 - 22) + '">' + SHORT[g] + "群島</text>";
    us.forEach((u, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = gx + (c - (Math.min(cols, us.length - r * cols) - 1) / 2) * dx + j(8);
      const y = gy - (rows - 1) * dy / 2 + r * dy + j(6);
      const S = cloud ? cloud[u.slug] : (() => { try { return JSON.parse(get("isl:" + u.slug)); } catch (e) { return null; } })();
      const rad = u.open ? 30 : 24;
      POS[u.slug] = [x, y, rad];
      let g2 = '<path class="isle" d="' + blob(x, y, rad) + '" fill="' + (u.open ? "#cfe3bf" : "#efe8d6") + '" stroke="#1d1d1d" stroke-width="' + (u.open ? 2.4 : 1.6) + '"' + (u.open ? "" : ' stroke-dasharray="5 4"') + "/>";
      if (u.open) {
        // 小樹與旗子
        g2 += line(x - 8, y + 4, x - 8, y - 14, 1.6) + '<path d="M' + (x - 8) + "," + (y - 14) + " l14,5 l-14,5 Z" + '" fill="#c8321e" stroke="#1d1d1d" stroke-width="1.2"/>';
        g2 += '<circle cx="' + (x + 12) + '" cy="' + (y - 4) + '" r="7" fill="#9cc58a" stroke="#1d1d1d" stroke-width="1.3"/>' + line(x + 12, y + 3, x + 12, y + 9, 1.4);
      }
      if (S && S.stampAt) g2 += stampSvg(x + 28, y - 24, opts.book ? 1.5 : 1);
      g2 += '<text class="lab" text-anchor="middle" x="' + x + '" y="' + (y + rad * .82 + 20) + '">' + esc(u.ch.replace(" ", "")) + "</text>";
      g2 += wrapText(x, y + rad * .82 + 37, u.title, 7, "tiny", "middle", 15);
      if (u.open) {
        const prog = S && S.n && !S.stampAt ? "走到 " + S.nd + "／" + S.n + " 站" : "";
        if (prog) g2 += '<text class="tiny" text-anchor="middle" x="' + x + '" y="' + (y - rad * .82 - 8) + '" style="fill:#24489a">' + prog + "</text>";
        s += '<a href="' + u.slug + '.html" aria-label="' + esc(u.ch + " " + u.title) + '"><title>' + esc(u.ch + "　" + u.title + (PLAIN[u.slug] ? "：" + PLAIN[u.slug] : "")) + "</title>" + g2 + "</a>";
      } else s += '<g class="grey">' + g2 + "</g>";
    });
  });
  // 標註（Thing Explainer 式）
  const callout = (x1, y1, x2, y2, txt, n, anchor = "start") => line(x1, y1, x2, y2, 1.2) + wrapText(x2 + (anchor === "start" ? 6 : anchor === "end" ? -6 : 0), y2 + 5, txt, n, "note", anchor, 18);
  // 灰色的島
  if (UNITS.some(u => !u.open)) s += callout(205 + 90, 560 + 120, 330, 760, "線是虛的、顏色是灰的島：橋還沒蓋好，之後才能上去。", 14);
  // 紀錄本（箱子）
  const bx = 70, by = 830;
  if (!opts.book) s += '<a href="passport.html" aria-label="探索紀錄本"><path d="' + blob(bx + 20, by - 8, 16, 8, .08) + '" fill="#e6d3a3" stroke="#1d1d1d" stroke-width="2"/>' +
    line(bx + 2, by - 10, bx + 38, by - 10, 1.4) + "</a>";
  if (!opts.book) s += callout(bx + 40, by - 18, bx + 80, by - 60, "記你走過哪些島的本子。點這個箱子打開。", 11);
  // 燈塔（老師）
  const lx = 1110, ly = 850;
  s += '<a href="teacher.html" aria-label="老師頁面"><path d="M' + (lx - 12) + "," + ly + " L" + (lx - 7) + "," + (ly - 58) + " L" + (lx + 7) + "," + (ly - 58) + " L" + (lx + 12) + "," + ly + ' Z" fill="#fffefa" stroke="#1d1d1d" stroke-width="2"/>' +
    '<path d="M' + (lx - 9) + "," + (ly - 58) + " h18 v-12 h-18 Z" + '" fill="#f6d36b" stroke="#1d1d1d" stroke-width="2"/>' + line(lx - 10, ly - 22, lx + 10, ly - 22, 1.2) + line(lx - 11, ly - 40, lx + 11, ly - 40, 1.2) + "</a>";
  s += callout(lx - 16, ly - 40, lx - 70, ly - 18, "燈塔：老師在這裡看大家猜了什麼、看到了什麼。", 11, "end");
  // 船（你）
  const sx = 600, sy = 395;
  s += '<path d="M' + (sx - 30) + "," + sy + " Q" + sx + "," + (sy + 22) + " " + (sx + 30) + "," + sy + ' Z" fill="#fffefa" stroke="#1d1d1d" stroke-width="2"/>' + line(sx, sy, sx, sy - 40, 1.8) +
    '<path d="M' + sx + "," + (sy - 38) + " L" + (sx + 24) + "," + (sy - 8) + " L" + sx + "," + (sy - 8) + ' Z" fill="#fffefa" stroke="#1d1d1d" stroke-width="1.6"/>';
  s += callout(sx - 32, sy + 4, sx - 120, sy + 30, (window.__who ? "這是你（" + window.__who + "）的船。" : "這是你的船。") + "島和島之間，沒有一定要照順序走。", 12, "end");
  s += callout(sx + 30, sy - 6, sx + 110, sy - 30, opts.book ? "島上有紅色的章，就是你走完的島；旁邊的藍字是你走到哪一站。" : "用學校的帳號登入，你走過的地方換一台電腦也還在。", 13);
  (opts.svg || document.getElementById("map")).innerHTML = s;

}
window.IslandMap = { draw };
})();
