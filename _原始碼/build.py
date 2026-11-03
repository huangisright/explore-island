#!/usr/bin/env python3
"""探索島產生器：讀原本的互動版網站，另外輸出到別的資料夾，原檔一個字都不動。

用法：python3 build.py <互動版網站資料夾> <輸出資料夾>
加單元：寫一個 units_xxx.py（CFG），在下面 BUILT 補上。
"""
import html, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from units_g8b2 import CFG as G8B2

BUILT = [G8B2]
GRADES = ["七年級上", "七年級下", "八年級上", "八年級下", "九年級上", "九年級下"]


def read(p):
    with open(p, encoding="utf8") as f:
        return f.read()


def build_unit(src_site, out, cfg):
    s = read(os.path.join(src_site, "units", cfg["slug"] + ".html"))
    # 回目錄改成回紀錄本（原本的 ../index.html 在新資料夾裡指不到）
    s = re.sub(r'<div class="bk-top">.*?</div>',
               '<div class="bk-top"><a href="passport.html">← 探索紀錄本</a></div>', s, count=1, flags=re.S)
    s = re.sub(r'<a class="bk-fab" href="[^"]*"[^>]*>.*?</a>',
               '<a class="bk-fab" href="passport.html" aria-label="回到探索紀錄本">← 紀錄本</a>', s, count=1, flags=re.S)
    css = read(os.path.join(HERE, "island.css"))
    js = read(os.path.join(HERE, "island.js"))
    data = json.dumps(cfg, ensure_ascii=False)
    inject = ('<style id="island">\n' + css + "</style>\n<script>window.ISLAND=" + data + ";</script>\n<script>\n" + js + "</script>\n"
              '<script src="firebase-config.js"></script>\n<script type="module" src="island-cloud.js"></script>\n')
    assert s.count("</body>") == 1
    s = s.replace("</body>", inject + "</body>")
    s = re.sub(r"<title>(.*?)</title>", lambda m: "<title>" + m.group(1) + "｜探索島</title>", s, count=1)
    with open(os.path.join(out, cfg["slug"] + ".html"), "w", encoding="utf8") as f:
        f.write(s)


def units_from_index(src_site):
    s = read(os.path.join(src_site, "index.html"))
    rows = []
    for slug, grade, kind, rest in re.findall(
            r'<a class="unit" href="units/([^"]+)\.html" data-grade="([^"]+)" data-kind="([^"]+)"(.*?)</a>', s, re.S):
        if grade not in GRADES:
            continue
        ch = re.search(r'<span class="b ch">(.*?)</span>', rest).group(1)
        title = re.search(r"<h3>(.*?)</h3>", rest).group(1)
        rows.append(dict(slug=slug, grade=grade, kind=kind, ch=html.unescape(ch), title=html.unescape(title)))
    return rows


def build_passport(src_site, out):
    rows = units_from_index(src_site)
    built = {c["slug"] for c in BUILT}
    for r in rows:
        r["open"] = r["slug"] in built
    tpl = read(os.path.join(HERE, "passport.tpl.html"))
    page = tpl.replace("/*UNITS*/[]", json.dumps(rows, ensure_ascii=False)) \
              .replace("/*GRADES*/[]", json.dumps(GRADES, ensure_ascii=False))
    with open(os.path.join(out, "passport.html"), "w", encoding="utf8") as f:
        f.write(page)
    return len(rows), len(built)


def build_teacher(out):
    tpl = read(os.path.join(HERE, "teacher.tpl.html"))
    page = tpl.replace("/*CFGS*/[]", json.dumps(BUILT, ensure_ascii=False))
    with open(os.path.join(out, "teacher.html"), "w", encoding="utf8") as f:
        f.write(page)


if __name__ == "__main__":
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    for c in BUILT:
        build_unit(src, out, c)
    for f in ["island-cloud.js", "firebase-config.js"]:
        shutil.copy(os.path.join(HERE, f), os.path.join(out, f))
    build_teacher(out)
    with open(os.path.join(out, "index.html"), "w", encoding="utf8") as f:
        f.write('<!DOCTYPE html><meta charset="utf-8"><title>探索島</title>'
                '<meta http-equiv="refresh" content="0; url=passport.html"><a href="passport.html">探索紀錄本</a>')
    open(os.path.join(out, ".nojekyll"), "w").close()
    n, b = build_passport(src, out)
    print("units listed:", n, "built:", b)
