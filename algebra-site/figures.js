(() => {
  "use strict";
  // 每一道光的小圖，畫的是那個單元動手的東西（樣式沿用 geometry/geo.css 的 .figure）
  const line = (d, style = "") => '<path class="' + style + '" d="' + d + '"/>';
  const circle = (x, y, r, style = "") => '<circle class="' + style + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>';
  const points = (...xy) => xy.map(([x, y]) => circle(x, y, 1.85, "vertex")).join("");
  const figures = [
    // 一 遮住頂點以後：五邊形，頂點是空心（被遮住）
    [line("M52 8 92 36 77 72H27L12 36Z", "facet"), line("M52 8 92 36 77 72H27L12 36Z"),
     circle(52, 8, 3.4, "hollow"), circle(92, 36, 3.4, "hollow"), circle(77, 72, 3.4, "hollow"), circle(27, 72, 3.4, "hollow"), circle(12, 36, 3.4, "hollow")],
    // 二 同一塊面積，兩種算法：長方形切四塊，搬一條上去
    [line("M10 26H70V72H10Z", "facet"), line("M38 26V72M10 54H70", "construction"), line("M38 26H70V54H38Z", "wash"),
     line("M10 26H70V72H10Z"), line("M76 26H96V72H76Z", "guide"), points([10, 26], [70, 26], [10, 72], [70, 72], [38, 54])],
    // 三 換元：一團圈起來，變成一個字母
    [line("M8 28H56V54H8Z", "facet"), points([18, 41], [32, 41], [46, 41]), line("M60 41H74", "construction"), line("M70 36 76 41 70 46", "construction"), circle(88, 41, 10, "facet"), circle(88, 41, 10)],
    // 四 聯立：兩條線交在一點
    [line("M6 70 98 14", ""), line("M8 18 96 66", "construction"), line("M4 74H100", "guide"), points([52, 42])],
    // 五 二次方程的根：兩個根靠近、合在一起
    [line("M4 58H100", "guide"), line("M12 14Q34 102 56 14", "construction"), line("M48 14Q70 86 92 14", "facet"), line("M48 14Q70 86 92 14"), points([25, 58], [43, 58], [70, 58])],
    // 六 係數計數：巴斯卡三角
    [line("M52 10 16 70H88Z", "facet"), points([52, 12], [43, 27], [61, 27], [34, 42], [52, 42], [70, 42], [25, 57], [43, 57], [61, 57], [79, 57])],
  ];
  window.algebraFigure = (n) => '<svg class="figure" viewBox="0 0 104 80" aria-hidden="true" focusable="false">' + figures[n - 1].join("") + "</svg>";
})();
