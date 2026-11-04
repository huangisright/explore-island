#!/usr/bin/env python3
"""探索島產生器：讀原本的互動版網站，另外輸出到別的資料夾，原檔一個字都不動。

用法：python3 build.py <互動版網站資料夾> <輸出資料夾>
加單元：寫一個 units_xxx.py（CFG），在下面 BUILT 補上。
"""
import html, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import glob, importlib

# 每一章一個設定檔 units_*.py（CFG），依檔名排序
BUILT = [importlib.import_module(os.path.basename(f)[:-3]).CFG for f in sorted(glob.glob(os.path.join(HERE, "units_*.py")))]
GRADES = ["七年級上", "七年級下", "八年級上", "八年級下", "九年級上", "九年級下"]


def read(p):
    with open(p, encoding="utf8") as f:
        return f.read()


def restructure_h4(s, cfg):
    """舊版單元頁：<div class="lab" id=X><h4>第 N 站　標題</h4><p class="why">…</p>…</div>
    轉成 lab-head／lab-body／lab-foot，foot 文字由設定檔提供。"""
    out, pos = [], 0
    pat = re.compile(r'<div class="lab" id="([^"]+)">\s*<h4>(.*?)</h4>\s*<p class="why">(.*?)</p>', re.S)
    for m in pat.finditer(s):
        lid, h4, why = m.group(1), m.group(2), m.group(3)
        # 找這個 lab 的結尾 </div>
        depth, i = 1, m.end()
        tag = re.compile(r"<div\b|</div>")
        while depth:
            t = tag.search(s, i)
            depth += 1 if t.group(0).startswith("<div") else -1
            i = t.end()
        inner = s[m.end():i - len("</div>")]
        nm = re.match(r"\s*第\s*(\d+)\s*站\s*(.*)", re.sub(r"<[^>]+>", "", h4), re.S)
        no, title = (nm.group(1), nm.group(2).strip()) if nm else ("", h4)
        foot = cfg["stations"].get(lid, {}).get("foot", "")
        out.append(s[pos:m.start()])
        out.append('<div class="lab" id="%s"><div class="lab-head"><span class="lab-no">%s</span><div><p class="lab-title">%s</p><p class="lab-why">%s</p></div></div>'
                   '<div class="lab-body">%s</div>%s</div>' % (lid, no, title, why, inner,
                   ('<div class="lab-foot">%s</div>' % foot) if foot else ""))
        pos = i
    out.append(s[pos:])
    return "".join(out)


def build_unit(src_site, out, cfg):
    s = read(os.path.join(src_site, "units", cfg["slug"] + ".html"))
    if cfg.get("restructure") == "h4":
        s = restructure_h4(s, cfg)
    # 回目錄改成回紀錄本（原本的 ../index.html 在新資料夾裡指不到）
    s = re.sub(r'<div class="bk-top">.*?</div>',
               '<div class="bk-top"><a href="passport.html">← 探索紀錄本</a></div>', s, count=1, flags=re.S)
    s = re.sub(r'<a class="bk-fab" href="[^"]*"[^>]*>.*?</a>',
               '<a class="bk-fab" href="passport.html" aria-label="回到探索紀錄本">← 紀錄本</a>', s, count=1, flags=re.S)
    s = s.replace("數理資優班學習單", "學習單").replace("數理資優班", "")
    for old, new in cfg.get("patches", []):
        assert s.count(old) == 1, ("patch not found once", old[:60])
        s = s.replace(old, new)
    css = read(os.path.join(HERE, "island.css"))
    js = read(os.path.join(HERE, "island.js"))
    data = json.dumps({k: v for k, v in cfg.items() if k not in ("patches", "restructure")}, ensure_ascii=False)
    inject = ('<style id="island">\n' + css + "</style>\n<script>window.ISLAND=" + data + ";</script>\n<script>\n" + js + "</script>\n"
              '<script src="firebase-config.js"></script>\n<script type="module" src="island-cloud.js"></script>\n')
    assert s.count("</body>") == 1
    s = s.replace("</body>", inject + "</body>")
    s = re.sub(r"<title>(.*?)</title>", lambda m: "<title>" + m.group(1) + "｜數學探索島</title>", s, count=1)
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
    plain = {c["slug"]: c.get("plain", "") for c in BUILT}
    page = tpl.replace("/*UNITS*/[]", json.dumps(rows, ensure_ascii=False)) \
              .replace("/*GRADES*/[]", json.dumps(GRADES, ensure_ascii=False)) \
              .replace("/*PLAIN*/{}", json.dumps(plain, ensure_ascii=False))
    with open(os.path.join(out, "passport.html"), "w", encoding="utf8") as f:
        f.write(page)
    return len(rows), len(built)


def build_home(src_site, out):
    rows = units_from_index(src_site)
    built = {c["slug"] for c in BUILT}
    for r in rows:
        r["open"] = r["slug"] in built
    plain = {c["slug"]: c.get("plain", "") for c in BUILT}
    page = read(os.path.join(HERE, "home.tpl.html"))
    page = page.replace("/*UNITS*/[]", json.dumps(rows, ensure_ascii=False)) \
               .replace("/*GRADES*/[]", json.dumps(GRADES, ensure_ascii=False)) \
               .replace("/*PLAIN*/{}", json.dumps(plain, ensure_ascii=False))
    with open(os.path.join(out, "index.html"), "w", encoding="utf8") as f:
        f.write(page)


def build_teacher(out):
    tpl = read(os.path.join(HERE, "teacher.tpl.html"))
    page = tpl.replace("/*CFGS*/[]", json.dumps([{k: v for k, v in c.items() if k not in ("patches", "restructure")} for c in BUILT], ensure_ascii=False))
    with open(os.path.join(out, "teacher.html"), "w", encoding="utf8") as f:
        f.write(page)


if __name__ == "__main__":
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    for c in BUILT:
        build_unit(src, out, c)
    for f in ["island-cloud.js", "firebase-config.js", "island-map.js"]:
        shutil.copy(os.path.join(HERE, f), os.path.join(out, f))
    build_teacher(out)
    build_home(src, out)
    open(os.path.join(out, ".nojekyll"), "w").close()
    n, b = build_passport(src, out)
    print("units listed:", n, "built:", b)
