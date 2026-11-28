(() => {
  "use strict";
  // Each constellation is drawn from the construction behind its unit.
  const line = (d, style = "") => '<path class="' + style + '" d="' + d + '"/>';
  const circle = (x, y, r, style = "") =>
    '<circle class="' + style + '" cx="' + x + '" cy="' + y + '" r="' + r + '"/>';
  const points = (...coordinates) => coordinates.map(([x, y]) => circle(x, y, 1.85, "vertex")).join("");

  const figures = [
    [
      line("M51 8 9 68H94Z", "facet"),
      line("M51 8 49 46 9 68Z", "wash"),
      line("M51 8 49 46 94 68M49 46 9 68"),
      points([51, 8], [9, 68], [94, 68], [49, 46]),
    ],
    [
      line("M4 50H100", "guide"),
      line("M12 13 90 72 90 28", "construction"),
      line("M12 13 61 50 90 28"),
      line("M49 41Q53 36 59 37m5 4q5 1 8 4", "guide"),
      points([12, 13], [61, 50], [90, 28]),
      circle(90, 72, 1.8, "hollow"),
    ],
    [
      line("M9 46H94", "guide"),
      circle(61, 46, 18, "facet"),
      line("M25 46 61 28 52 46Z", "wash"),
      line("M61 28V46", "construction"),
      points([25, 46], [52, 46], [61, 28], [79, 46]),
      circle(61, 46, 1.2, "hollow"),
    ],
    [
      line("M53 8 10 68 94 62Z", "facet"),
      line("M53 8 52 65M10 68 73.5 35M94 62 31.5 38"),
      points([53, 8], [10, 68], [94, 62], [52, 65], [73.5, 35], [31.5, 38], [52.33, 46]),
    ],
    [
      line("M63 8 11 69 95 48M11 69 61 62", "construction"),
      line("M63 8 95 48 61 62Z", "facet"),
      line("M37 38.5 53 58.5 36 65.5Z", "wash"),
      points([11, 69], [63, 8], [95, 48], [61, 62], [37, 38.5], [53, 58.5], [36, 65.5]),
    ],
    [
      circle(52, 39, 30, "facet"),
      line("M22 39H82M34 15 76 57"),
      line("M34 15 22 39M76 57 82 39", "construction"),
      points([22, 39], [82, 39], [34, 15], [76, 57], [58, 39]),
    ],
    [
      circle(52, 42, 29, "construction"),
      ...[0, 120, 240].map(
        (angle) =>
          '<g transform="rotate(' +
          angle +
          ' 52 42)">' +
          line("M52 42 56 11 74 22Z", "facet") +
          points([56, 11], [74, 22]) +
          "</g>",
      ),
      points([52, 42]),
    ],
    [
      line("M4 9H100", "guide"),
      line("M52 9 8 67H96Z", "facet"),
      line("M30 67 52 9 74 67M52 9V67M25.4 44H78.6M36.1 30H67.9M43.7 20H60.3"),
      points([52, 9], [8, 67], [96, 67], [25.4, 44], [78.6, 44]),
    ],
  ];

  window.geometryFigure = (unit) =>
    '<svg class="figure" viewBox="0 0 104 80" aria-hidden="true" focusable="false">' +
    figures[unit - 1].join("") +
    "</svg>";
})();
