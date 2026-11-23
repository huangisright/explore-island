#!/usr/bin/env python3
"""探索島產生器：讀原本的互動版網站，另外輸出到別的資料夾，原檔一個字都不動。

用法：python3 build.py <互動版網站資料夾> <輸出資料夾> [內容檔資料夾]
加單元：寫一個 units_xxx.py（CFG），在下面 BUILT 補上。

登入後才載入內容（空殼頁）：
  GATED 裡的單元，輸出資料夾只放空殼頁 <slug>.html（沒有教材），教材另外寫成 <內容檔資料夾>/<slug>.json，
  由管理者在 upload.html 上傳到 Firestore 的 content/<slug>。內容檔資料夾不要放進公開的 repo。
  TRIAL 裡的單元照舊輸出完整頁，另外多做一份空殼頁 try-<slug>.html 給老師先測。
"""
import datetime, html, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import glob, importlib

# 每一章一個設定檔 units_*.py（CFG），依檔名排序
BUILT = [importlib.import_module(os.path.basename(f)[:-3]).CFG for f in sorted(glob.glob(os.path.join(HERE, "units_*.py")))]
GRADES = ["七年級上", "七年級下", "八年級上", "八年級下", "九年級上", "九年級下"]
# 空殼頁設定：GATED = "ALL" 代表全部單元；TRIAL 是只做試做頁的單元
GATED = set()
TRIAL = {"g8b-ch2-functions"}
CLOUD_TAIL = '<script src="firebase-config.js"></script>\n<script type="module" src="island-cloud.js"></script>\n'


def is_gated(slug):
    return GATED == "ALL" or slug in GATED


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


def _block_end(s, start):
    """從 s[start] 的 <div 開始，找到對應的 </div> 結尾位置。"""
    depth, i = 0, start
    tag = re.compile(r"<div\b|</div>")
    while True:
        t = tag.search(s, i)
        depth += 1 if t.group(0).startswith("<div") else -1
        i = t.end()
        if depth == 0:
            return i


def _lab(lid, no, title, inner):
    return ('<div class="lab" id="%s"><div class="lab-head"><span class="lab-no">%s</span><div><p class="lab-title">%s</p>'
            '<p class="lab-why"></p></div></div><div class="lab-body">%s</div></div>' % (lid, no, title, inner))


def restructure_gp(s, cfg):
    """幾何拾光的動態頁：沒有 .lab，結構是 header → .main（圖＋控制區）→ 控制區裡一個 <details>「更多」。
    設定檔 wrap：[(站 id, "main" 或 "more", 站名), ...]，依序包成站。
    "main" 依出現順序取第 1、2… 個 <div class="main">；"more" 是唯一的 <details>，搬出來接在前一站後面、改成一直展開。"""
    # 頁面自己把圖上的字母標籤叫做 class "lab"，會和探索站的 .lab 撞名：先改成 gp-lab
    s = re.sub(r'(?<=["\'])lab(?=["\'])', "gp-lab", s)
    s = s.replace(".lab{font-family", ".gp-lab{font-family")
    assert s.count("<details") == 1, "幾何拾光頁應該剛好有一個 <details>"
    m = re.search(r"<details\b[^>]*>.*?</details>", s, re.S)
    more = m.group(0)
    s = s[:m.start()] + s[m.end():]
    more = re.sub(r"\s*<summary>.*?</summary>", "", more, count=1, flags=re.S)
    more = re.sub(r"^<details\b([^>]*)>", r'<div class="gp-more"\1>', more)
    more = re.sub(r"</details>$", "</div>", more)
    labs, last_end, mains = [], None, []
    pos = 0
    while True:
        i = s.find('<div class="main">', pos)
        if i < 0:
            break
        j = _block_end(s, i)
        mains.append((i, j))
        pos = j
    used = 0
    out, cur = [], 0
    pending = []          # (插入位置, html)
    for n, (lid, kind, title) in enumerate(cfg["wrap"], 1):
        if kind == "main":
            i, j = mains[used]; used += 1
            pending.append((i, j, _lab(lid, str(n), title, s[i:j])))
            last_end = j
        else:
            assert kind == "more"
            pending.append((last_end, last_end, _lab(lid, str(n), title, more)))
    assert used == len(mains), ("還有沒包進站的 .main", cfg["slug"])
    pending[-1] = (pending[-1][0], pending[-1][1], pending[-1][2] + '<div id="end" class="gp-end"></div>')   # 判斷題放在最後一站之後
    for i, j, html_ in pending:
        out.append(s[cur:i]); out.append(html_); cur = j
    out.append(s[cur:])
    return "".join(out)


def build_unit(src_site, out, cfg, content_dir=None):
    s = read(os.path.join(src_site, "units", cfg["slug"] + ".html"))
    if cfg.get("restructure") == "h4":
        s = restructure_h4(s, cfg)
    elif cfg.get("restructure") == "gp":
        s = restructure_gp(s, cfg)
        s = s.replace("<body>", '<body class="gp">', 1)
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
    data = json.dumps({k: v for k, v in cfg.items() if k not in ("patches", "restructure", "wrap")}, ensure_ascii=False)
    inject = ('<style id="island">\n' + css + "</style>\n<script>window.ISLAND=" + data + ";</script>\n<script>\n" + js + "</script>\n" + CLOUD_TAIL)
    assert s.count("</body>") == 1
    s = s.replace("</body>", inject + "</body>")
    s = re.sub(r"<title>(.*?)</title>", lambda m: "<title>" + m.group(1) + "｜一線數光</title>", s, count=1)
    slug = cfg["slug"]
    if not is_gated(slug):
        with open(os.path.join(out, slug + ".html"), "w", encoding="utf8") as f:
            f.write(s)
    if is_gated(slug) or slug in TRIAL:
        assert content_dir, "有空殼頁的單元，要給第三個參數：內容檔資料夾"
        shell, payload = split_page(s, cfg)
        with open(os.path.join(out, (slug if is_gated(slug) else "try-" + slug) + ".html"), "w", encoding="utf8") as f:
            f.write(shell)
        os.makedirs(content_dir, exist_ok=True)
        with open(os.path.join(content_dir, slug + ".json"), "w", encoding="utf8") as f:
            json.dump(payload, f, ensure_ascii=False)


def split_page(s, cfg):
    """完整單元頁 → （空殼頁, 內容檔）。內容檔的 head／body 之後由 island-cloud.js 的 mount() 放回頁面。"""
    head = re.search(r"<head>(.*?)</head>", s, re.S).group(1)
    body = re.search(r"<body>(.*)</body>", s, re.S).group(1)
    title = html.unescape(re.search(r"<title>(.*?)</title>", head, re.S).group(1))
    head, n = re.subn(r'<meta charset="utf-8">\s*|<meta name="viewport"[^>]*>\s*|<title>.*?</title>\s*', "", head, flags=re.S)
    assert n == 3, "head 裡 charset／viewport／title 應該各一個"
    assert body.count(CLOUD_TAIL) == 1 and body.rstrip().endswith(CLOUD_TAIL.rstrip()), "雲端模組應該在 body 最後"
    body = body.replace(CLOUD_TAIL, "")       # 空殼頁自己已經載入這兩支
    assert "<script" not in head, "head 裡不預期有 script"
    payload = {"slug": cfg["slug"], "title": title, "head": head, "body": body,
               "updated": datetime.datetime.now().astimezone().isoformat(timespec="seconds")}
    size = len(json.dumps(payload, ensure_ascii=False).encode("utf8"))
    assert size < 950_000, ("內容檔太大，Firestore 一份文件上限 1 MiB", cfg["slug"], size)
    gate = {"slug": cfg["slug"], "chap": cfg["chap"], "title": cfg["title"]}
    shell = read(os.path.join(HERE, "gate.tpl.html")) \
        .replace("/*TITLE*/", html.escape(title)).replace("/*CHAP*/", html.escape(cfg["chap"])) \
        .replace("/*NAME*/", html.escape(cfg["title"])).replace("/*GATE*/{}", json.dumps(gate, ensure_ascii=False))
    return shell, payload


GP = "幾何拾光"


def units_from_index(src_site, grades=None):
    grades = grades or GRADES
    s = read(os.path.join(src_site, "index.html"))
    rows = []
    for slug, grade, kind, rest in re.findall(
            r'<a class="unit" href="units/([^"]+)\.html" data-grade="([^"]+)" data-kind="([^"]+)"(.*?)</a>', s, re.S):
        if grade not in grades:
            continue
        ch = re.search(r'<span class="b ch">(.*?)</span>', rest).group(1)
        title = re.search(r"<h3>(.*?)</h3>", rest).group(1)
        rows.append(dict(slug=slug, grade=grade, kind=kind, ch=html.unescape(ch), title=html.unescape(title)))
    return rows


def build_passport(src_site, out):
    rows = units_from_index(src_site, GRADES + [GP])
    built = {c["slug"]: c for c in BUILT}
    for r in rows:
        if r["grade"] == GP:      # 「單元一 第 1 節」太長，紀錄本的章欄放不下 → 「一-1」
            m = re.match(r"單元(\S+)\s*第\s*(\d+)\s*節", r["ch"])
            if m:
                r["ch"] = m.group(1) + "-" + m.group(2)
        r["open"] = r["slug"] in built
        if r["open"]:      # 紀錄本要畫每一站的格子：站的代號、哪幾站不用先預測、判斷題幾題（都不是教材內容）
            c = built[r["slug"]]
            r["st"] = list(c["stations"])
            r["ob"] = [k for k, v in c["stations"].items() if v.get("mode") != "predict"]
            r["q"] = len(c["quiz"])
    tpl = read(os.path.join(HERE, "passport.tpl.html"))
    plain = {c["slug"]: c.get("plain", "") for c in BUILT}
    page = tpl.replace("/*UNITS*/[]", json.dumps(rows, ensure_ascii=False)) \
              .replace("/*GRADES*/[]", json.dumps(GRADES + [GP], ensure_ascii=False)) \
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


SEM_ID = {"七上": "g7a", "七下": "g7b", "八上": "g8a", "八下": "g8b", "九上": "g9a", "九下": "g9b"}


def build_report(out):
    """報告島：章後延伸報告（report.html 學生選題繳交、report-show.html 展示與報告現場）。
    題庫 ext-questions.json 由學習單設計資料夾的 _原始碼/延伸題庫.json 複製過來（只含學生看得到的欄位，沒有教師備註）。"""
    data = json.loads(read(os.path.join(HERE, "ext-questions.json")))
    chaps = []
    for c in data:
        m = re.match(r"([七八九][上下])(\d+)$", c["code"])
        assert m, c["code"]
        chaps.append({"id": SEM_ID[m.group(1)] + "-" + m.group(2), "sem": m.group(1), "code": c["code"], "name": c["name"],
                      "title": c["title"], "qs": [{k: q[k] for k in ("k", "t", "c", "s", "show")} for q in c["qs"]]})
        assert len(c["qs"]) == 6, c["code"]
    js = json.dumps(chaps, ensure_ascii=False).replace("</", "<\\/")
    for tpl, name in [("report.tpl.html", "report.html"), ("report-show.tpl.html", "report-show.html")]:
        page = read(os.path.join(HERE, tpl))
        assert page.count("/*DATA*/[]") == 1
        with open(os.path.join(out, name), "w", encoding="utf8") as f:
            f.write(page.replace("/*DATA*/[]", js))
    for f in ["report-lib.js", "report.css"]:
        shutil.copy(os.path.join(HERE, f), os.path.join(out, f))
    return len(chaps)


def build_geo(out):
    """幾何拾光的群島／星座圖：已經做好探索島版的節，連到 gp-uN-M.html；其他節仍連 GiftedMath 的動態頁。"""
    done = [c["slug"] for c in BUILT if c["slug"].startswith("gp-")]
    for f in ["geo.html"]:          # geo-stars.html（星座圖）2026-11-23 先拿掉，原檔留在 _原始碼/
        page = read(os.path.join(HERE, f))
        assert page.count("/*GP_DONE*/[]") == 1, f
        with open(os.path.join(out, f), "w", encoding="utf8") as fh:
            fh.write(page.replace("/*GP_DONE*/[]", json.dumps(done)))


def build_teacher(out):
    tpl = read(os.path.join(HERE, "teacher.tpl.html"))
    page = tpl.replace("/*CFGS*/[]", json.dumps([{k: v for k, v in c.items() if k not in ("patches", "restructure", "wrap")} for c in BUILT], ensure_ascii=False))
    with open(os.path.join(out, "teacher.html"), "w", encoding="utf8") as f:
        f.write(page)


if __name__ == "__main__":
    src, out = sys.argv[1], sys.argv[2]
    content_dir = sys.argv[3] if len(sys.argv) > 3 else None
    if content_dir:
        assert not os.path.abspath(content_dir).startswith(os.path.abspath(out) + os.sep), "內容檔資料夾不能放在輸出（公開）資料夾裡面"
    os.makedirs(out, exist_ok=True)
    for c in BUILT:
        build_unit(src, out, c, content_dir)
    for f in ["island-cloud.js", "firebase-config.js", "island-map.js", "upload.html"]:
        shutil.copy(os.path.join(HERE, f), os.path.join(out, f))
    build_geo(out)
    build_teacher(out)
    build_report(out)
    build_home(src, out)
    open(os.path.join(out, ".nojekyll"), "w").close()
    n, b = build_passport(src, out)
    print("units listed:", n, "built:", b)
