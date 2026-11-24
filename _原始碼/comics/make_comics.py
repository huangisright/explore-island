#!/usr/bin/env python3
"""產生幾何拾光各節的開場翻格漫畫片段 comics/<slug>.html。
共用樣式、圖件、程式在 _common.html，build.py 會把它接在片段後面。
原則：不洩漏該節第 1 站的預測答案；史實只寫查得到的。
用法：python3 make_comics.py
"""
import math, os
HERE = os.path.dirname(os.path.abspath(__file__))

# ───────── 小工具 ─────────
def slap(inner, d=0.1):
    return f'<g class="slap" style="--d:{d:.2f}s">{inner}</g>'

def bg(kind="map"):
    return {"map": '<use href="#cm-map"/>', "sky": '<use href="#cm-sky"/>', "desk": '<use href="#cm-desk"/>'}[kind] + '<use href="#cm-note"/>'

def poly(pts, fill, extra=""):
    p = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    return f'<polygon points="{p}" fill="{fill}" {extra}/>'

def scrap(pts, fill):
    return f'<g filter="url(#cm-cut)">{poly(pts, fill)}</g>'

def line(a, b, col="#2B2621", w=2.4, dash=None, cap="round"):
    da = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="{col}" stroke-width="{w}" stroke-linecap="{cap}"{da}/>'

def dot(p, r=4.5, col="#2B2621"):
    return f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="{r}" fill="{col}"/>'

def ltr(p, t, dx=0, dy=0, size=22, col="#2B2621"):
    return (f'<text x="{p[0]+dx:.1f}" y="{p[1]+dy:.1f}" font-family="Crimson Text,Georgia,serif" font-style="italic" '
            f'font-weight="600" font-size="{size}" fill="{col}" text-anchor="middle">{t}</text>')

def zh(x, y, t, size=18, col="#5A4630", weight=700, anchor="middle", serif=True):
    fam = "Noto Serif TC,Songti TC,serif" if serif else "PingFang TC,Noto Sans TC,sans-serif"
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-size="{size}" font-weight="{weight}" fill="{col}" font-family="{fam}">{t}</text>'

def label(x, y, t, rot=0, fill="#FBF6E6", col="#5A4630", size=18):
    w = len(t) * size + 22
    return (f'<g transform="rotate({rot} {x} {y})"><g filter="url(#cm-cut)"><rect x="{x-w/2:.0f}" y="{y-size*0.95:.0f}" width="{w:.0f}" height="{size*1.65:.0f}" rx="3" fill="{fill}"/></g>'
            + zh(x, y + size * 0.35, t, size, col) + '</g>')

def doc(x, y, w, h, title, rot=0, nlines=4, fill="#F7F1E1", inner=""):
    cx = x + w / 2
    ls = "".join(f'<path d="M{x+18} {y+52+i*16}h{w-36-(i%2)*24}"/>' for i in range(nlines))
    return (f'<g transform="rotate({rot} {cx} {y+h/2})"><g filter="url(#cm-cut)"><rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}"/></g>'
            + zh(cx, y + 30, title, 17) + f'<g stroke="#B9A988" stroke-width="2">{ls}</g>{inner}</g>')

def stamp(x, y, t, rot=-10):
    w = len(t) * 20 + 20
    return (f'<g transform="rotate({rot} {x} {y})" opacity=".88"><rect x="{x-w/2}" y="{y-22}" width="{w}" height="40" rx="5" fill="none" stroke="#C23B33" stroke-width="3.4"/>'
            + zh(x, y + 6, t, 20, "#C23B33", 800, serif=False) + '</g>')

def qcard():
    return slap('<g transform="rotate(-4 350 210)"><g filter="url(#cm-cut)"><rect x="250" y="70" width="200" height="250" rx="6" fill="#FFFDF6"/></g>'
                '<text x="350" y="262" text-anchor="middle" font-size="190" font-weight="800" fill="#5939A4" font-family="Georgia,serif" filter="url(#cm-ink)">?</text></g>', .1)

MOUTH = {"smile": "M53 80 q7 5 14 0", "flat": "M53 81 h14", "o": "M60 80 m-3.5 0 a3.5 3.5 0 1 0 7 0 a3.5 3.5 0 1 0 -7 0",
         "frown": "M53 83 q7 -5 14 0", "open": "M53 79 q7 9 14 0 Z"}

def pup(x, y, s=1.0, hat="bicorne", coat="#23345C", shirt="#F4EFE2", hair=None, wig=False, arm=-30, tilt=0, bob=True,
        mouth="smile", sweat=False, hold="", skin="#F2CBA7"):
    sty = f"--coat:{coat};--shirt:{shirt};--skin:{skin}" + (f";--hair:{hair}" if hair else "")
    parts = []
    if wig: parts.append('<use href="#cm-wig-back"/>')
    parts.append('<use href="#cm-body"/>')
    if wig: parts.append('<use href="#cm-wig-top"/>')
    elif hair: parts.append('<use href="#cm-hair-short"/>')
    if hat: parts.append(f'<use href="#cm-hat-{hat}"/>')
    parts.append('<use href="#cm-eyes"/>')
    m = MOUTH[mouth]
    parts.append(f'<path d="{m}" fill="{"#7A3B2E" if mouth in ("o","open") else "none"}" stroke="#7A3B2E" stroke-width="2" stroke-linecap="round"/>')
    if sweat: parts.append('<use href="#cm-sweat"/>')
    parts.append(f'<g transform="translate(92 106) rotate({arm})"><use href="#cm-arm"/>{hold}</g>')
    inner = "".join(parts)
    if bob: inner = f'<g class="bob">{inner}</g>'
    return f'<g transform="translate({x} {y}) scale({s}) rotate({tilt} 60 150)" style="{sty}">{inner}</g>'

# 解說員（筆記紙上的火柴人）
POSE = {
    "point": "M716 270L686 254M716 270L742 300", "pointer": True,
    "fold": "M716 272L692 290L716 296M716 272L740 290L716 296",
    "stop": "M716 270L740 246L742 214M716 272L694 300L710 312",
    "shrug": "M716 270L690 262L682 244M716 270L742 262L750 244",
    "down": "M716 272L692 296M716 272L742 300L752 340",
    "think": "M716 272L692 296M716 272L740 286L722 248",
    "wow": "M716 270L690 300M716 270L746 258L752 240",
}
FACE = {"smile": "M709 229v1M723 229v1M710 241q6 3 12 0", "flat": "M709 229v1M723 229v1M709 240h14",
        "frown": "M709 229v1M723 229v1M711 243q5 -3 10 0", "angry": "M707 228l4 2M725 228l-4 2M709 242h14",
        "grin": "M709 229v1M723 229v1M709 240q7 5 14 0", "o": "M709 229v1M723 229v1M713 242a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"}

def expl(pose="point", face="smile", extra=""):
    arms = POSE[pose]
    out = ('<g filter="url(#cm-ink)" stroke="#2B2621" stroke-width="3" stroke-linecap="round" fill="none">'
           f'<circle cx="716" cy="232" r="18" fill="#FBF8F0"/><path d="{FACE[face]}"/>'
           f'<path d="M716 250V330M716 330L696 396M716 330L736 396{arms}"/>')
    if pose == "point": out += '<path d="M686 254L640 236" stroke-width="2"/>'
    if pose == "stop": out += '<path d="M736 208v-10M742 206v-12M748 210v-9" stroke-width="2.4"/>'
    if pose == "down": out += '<path d="M752 340l-6 -9M752 340l7 -8" stroke-width="2.6"/>'
    out += '</g>'
    if pose == "stop": out += zh(664, 180, "停！", 28, "#C23B33", 800, serif=False)
    if pose == "wow": out += '<text x="752" y="226" font-size="20" fill="#2B2621" font-family="Georgia,serif">!</text>'
    return out + extra

ICON_P = '<svg viewBox="0 0 20 20"><circle cx="10" cy="12" r="6"/><path d="M2 9Q10 0 18 9Z"/></svg>'
ICON_E = '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="none" stroke="#2B2621" stroke-width="2"/></svg>'

def say(lines):
    out = []
    for who, txt in lines:
        if who == "nar":
            out.append(f'  <p class="nar">{txt}</p>')
        elif who == "exp":
            out.append(f'  <p><span class="cm-who exp">{ICON_E}解說員</span><span>{txt}</span></p>')
        else:
            out.append(f'  <p><span class="cm-who nap">{ICON_P}{who}</span><span>{txt}</span></p>')
    return '<div class="cm-say">\n' + "\n".join(out) + '\n</div>'

def panel(n, art, aria, lines, last=False):
    hid = "" if n == 1 else " hidden"
    title = "到第 1 站" if last else "點一下看下一格"
    return (f'<div class="cm-panel" data-n="{n}"{hid}>\n <div class="cm-stage" tabindex="0" title="{title}">'
            f'<svg viewBox="0 0 800 460" role="img" aria-label="{aria}">{art}</svg></div>\n {say(lines)}\n</div>\n')

NAV = ('<div class="cm-nav">\n <button type="button" class="cm-btn" data-go="-1" aria-label="上一格">‹ 上一格</button>\n'
       ' <button type="button" class="cm-btn go" data-go="1">下一格 ›</button>\n <div class="cm-dots" aria-hidden="true"></div>\n'
       ' <span class="cm-count" aria-live="polite" style="position:absolute;left:-9999px"></span>\n</div>\n')

def section(slug, sub, panels, note):
    head = (f'<!-- 開場翻格漫畫：{note}。由 make_comics.py 產生，不要手改。 -->\n'
            '<section class="cm" id="comic" aria-roledescription="漫畫" aria-label="開場漫畫">\n'
            f'<div class="cm-top"><span><b>開場</b>　{sub}</span><a class="cm-skip" href="#lab1">跳過，直接到第 1 站 ↓</a></div>\n')
    body = "".join(panel(i + 1, *p, last=(i == len(panels) - 1)) for i, p in enumerate(panels))
    with open(os.path.join(HERE, slug + ".html"), "w", encoding="utf8") as f:
        f.write(head + body + NAV + '</section>\n')
    print(slug, len(panels), "格")

# 幾何小工具
def inter(p1, p2, p3, p4):
    x1, y1 = p1; x2, y2 = p2; x3, y3 = p3; x4, y4 = p4
    d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d
    return (x1 + t * (x2 - x1), y1 + t * (y2 - y1))

def mid(a, b): return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)

def circ3(a, b, c):
    ax, ay = a; bx, by = b; cx, cy = c
    d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    ux = ((ax*ax+ay*ay)*(by-cy)+(bx*bx+by*by)*(cy-ay)+(cx*cx+cy*cy)*(ay-by)) / d
    uy = ((ax*ax+ay*ay)*(cx-bx)+(bx*bx+by*by)*(ax-cx)+(cx*cx+cy*cy)*(bx-ax)) / d
    return (ux, uy), math.dist((ux, uy), a)

def tangents(P, O, r):
    d = math.dist(P, O); a = math.atan2(P[1] - O[1], P[0] - O[0]); b = math.acos(r / d)
    return [(O[0] + r * math.cos(a + s * b), O[1] + r * math.sin(a + s * b)) for s in (1, -1)]

# ───────── 1-3 三條線，交在一點（穆塔曼／塞瓦） ─────────
def gp13():
    A, B, C, O = (330, 92), (196, 348), (500, 348), (352, 262)
    D = inter(A, O, B, C); E = inter(B, O, C, A); F = inter(C, O, A, B)
    tri = scrap([A, B, C], "#FBF8EE")
    cev = "".join(line(V, W, "#3E6E9E", 2.6) for V, W in ((A, D), (B, E), (C, F)))
    pts = "".join(dot(p, 4.2, "#C8553D") for p in (D, E, F)) + dot(O, 5, "#2B2621")
    labs = ltr(A, "A", dy=-10) + ltr(B, "B", -14, 18) + ltr(C, "C", 14, 18) + ltr(O, "O", 16, -6, 19)
    king = dict(hat="turban", coat="#2F7A6B", shirt="#EFE3C2", skin="#D9A57E")
    ceva = dict(hat=None, wig=True, coat="#6E3B2E", hair="#8A6A4A")
    P = []
    P.append((bg() + slap(scrap([(250, 90), (380, 70), (420, 170), (330, 220), (240, 180)], "#2F7A6B"), .1)
              + slap(label(330, 145, "薩拉戈薩", -4), .35)
              + slap(doc(430, 210, 130, 160, "完美之書", 6, 5, "#F3E7CF"), .6)
              + pup(40, 214, **king, arm=-40) + expl("point"),
              "紙地圖上貼著一塊綠色的薩拉戈薩，國王紙偶旁邊是一本《完美之書》",
              [("nar", "1080 年前後，西班牙北邊的薩拉戈薩。"),
               ("國王", "白天管國家，晚上寫數學。"),
               ("exp", "他叫穆塔曼，是薩拉戈薩的國王，真的寫了一本很厚的數學書，叫《完美之書》。")]))
    P.append((bg() + slap(tri, .05) + slap(cev, .3) + slap(pts + labs, .55) + pup(30, 236, s=.9, **king, arm=-62, mouth="o") + expl("stop", "angry"),
              "白色三角形紙片上，三個頂點各拉一條線到對邊，交在一點 O",
              [("國王", "三個頂點各拉一條線到對邊，交在同一點的時候，三個邊都被切成兩段……"),
               ("exp", "先停。切出來的長度藏著什麼規律，先別說。")]))
    P.append((bg() + scrap([(250, 90), (380, 70), (420, 170), (330, 220), (240, 180)], "#2F7A6B")
              + slap(scrap([(236, 80), (396, 62), (432, 178), (326, 232), (226, 188)], "#8C5A9E"), .2)
              + slap(scrap([(300, 130), (440, 120), (450, 230), (310, 250)], "#C8553D"), .5)
              + slap(doc(440, 250, 120, 150, "完美之書", 12, 4, "#E7DCC4") + '<rect x="420" y="230" width="170" height="190" fill="#EDE4CF" opacity=".55"/>', .8)
              + pup(40, 230, **king, arm=-110, tilt=-8, bob=False, mouth="frown", sweat=True) + expl("shrug", "flat"),
              "國王的綠色紙片被其他顏色的紙片蓋過去，書也褪色了",
              [("nar", "後來，王國換了主人。"),
               ("exp", "那本書也被人忘了，一忘就是九百年。")]))
    small = scrap([(300, 120), (220, 300), (420, 300)], "#FBF8EE")
    P.append((bg() + small + slap(doc(440, 60, 140, 170, "1678", 4, 5), .1) + slap(label(320, 236, "塞瓦", -6, "#F6E7B0"), .5)
              + pup(460, 236, s=.9, **ceva, arm=-150, mouth="smile") + expl("think", "flat"),
              "義大利的塞瓦紙偶把「塞瓦」的名字標籤貼在三角形上",
              [("nar", "1678 年，義大利。"),
               ("塞瓦", "我把這件事印成書了。"),
               ("exp", "他不知道六百年前有個國王早就寫過。所以名字，就貼了他的。")]))
    P.append((bg() + small + label(320, 236, "塞瓦", -6, "#F6E7B0")
              + slap(doc(440, 70, 140, 170, "1985", -5, 5, "#F3E7CF") + stamp(510, 190, "找到了", 8), .1)
              + slap(pup(40, 214, **king, arm=-25, mouth="open", bob=False), .45) + expl("fold", "flat"),
              "1985 年，國王的書被找到，國王紙偶指著「塞瓦」的標籤",
              [("nar", "1985 年，國王的書被找到了。"),
               ("國王", "是我先的！"),
               ("exp", "名字已經貼了三百年，撕不下來了。")]))
    P.append((bg() + qcard() + pup(60, 236, s=.9, **king, arm=-30) + expl("down", "grin"),
              "一張寫著大問號的紙卡；解說員指向下方",
              [("exp", "三條線交在一點時，三個比乘起來會怎樣？下面第 1 站自己拖拖看。")]))
    section("gp-u1-3", "一本被忘掉的書", P, "幾何拾光 1-3〈三條線，交在一點〉穆塔曼與塞瓦")

# ───────── 4-2 一條線穿過去（梅涅勞斯） ─────────
def gp42():
    men = dict(hat="laurel", coat="#EDE6D6", shirt="#C8553D", skin="#E3B48E")
    moon = '<circle cx="430" cy="130" r="46" fill="#F1E6C4"/><circle cx="415" cy="120" r="8" fill="#DDD0A8"/><circle cx="445" cy="148" r="6" fill="#DDD0A8"/>'
    star = '<path d="M478 112 l4 10 l10 1 l-8 6 l3 10 l-9 -6 l-9 6 l3 -10 l-8 -6 l10 -1 Z" fill="#FFF3B0"/>'
    P = []
    P.append((bg("sky") + star + slap(f'<g filter="url(#cm-cut)">{moon}</g>', .3) + pup(80, 220, **men, arm=-75, mouth="o") + expl("point", "o"),
              "夜空下，梅涅勞斯紙偶指著月亮，月亮正要蓋住一顆星",
              [("nar", "西元 98 年 1 月，羅馬的夜裡。"),
               ("梅涅勞斯", "月亮把那顆星蓋住了，快記下來。"),
               ("exp", "他叫梅涅勞斯，從亞歷山卓來。看星星的人，也得算星星之間的三角形。")]))
    G, R = (390, 230), 130
    arcs = ('<path d="M330 150 Q392 196 452 150" fill="none" stroke="#C8553D" stroke-width="3"/>'
            '<path d="M330 150 Q338 224 380 300" fill="none" stroke="#C8553D" stroke-width="3"/>'
            '<path d="M452 150 Q440 230 380 300" fill="none" stroke="#C8553D" stroke-width="3"/>')
    globe = (f'<g filter="url(#cm-cut)"><circle cx="{G[0]}" cy="{G[1]}" r="{R}" fill="#E9DFC4"/></g>'
             f'<ellipse cx="{G[0]}" cy="{G[1]}" rx="{R}" ry="38" fill="none" stroke="#A88B63" stroke-width="1.2" stroke-dasharray="4 5"/>'
             f'<ellipse cx="{G[0]}" cy="{G[1]}" rx="52" ry="{R}" fill="none" stroke="#A88B63" stroke-width="1.2" stroke-dasharray="4 5"/>')
    P.append((bg("sky") + slap(globe, .05) + slap(arcs, .4) + pup(60, 220, **men, arm=-40) + expl("wow", "o"),
              "紙做的天球上畫了一個邊是彎的三角形",
              [("梅涅勞斯", "天上的三角形，邊是彎的。"),
               ("exp", "他是第一個把「球面上的三角形」好好寫出定義的人。")]))
    A, B, C = (300, 96), (170, 330), (430, 330)
    L1, L2 = (150, 109.5), (560, 377.9)
    F = inter(L1, L2, A, B); E = inter(L1, L2, A, C); D = inter(L1, L2, B, C)
    fig = (scrap([A, B, C], "#FBF8EE") + line(C, (D[0] + 20, D[1] + 0.0 * 0), "#8A6A45", 1.8, "5 5"))
    tl = line(L1, L2, "#3E6E9E", 3)
    pts = "".join(dot(p, 4.4, "#C8553D") for p in (D, E, F))
    labs = ltr(A, "A", dy=-10) + ltr(B, "B", -14, 18) + ltr(C, "C", -4, 24) + ltr(D, "D", 6, 26, 19) + ltr(E, "E", 16, -6, 19) + ltr(F, "F", -16, -4, 19)
    P.append((bg("desk") + slap(fig, .05) + slap(tl, .35) + slap(pts + labs, .6) + pup(40, 240, s=.85, **men, arm=-20, mouth="o") + expl("stop", "angry"),
              "方格紙上一個三角形，一條藍色直線穿過兩個邊和第三邊的延長線",
              [("梅涅勞斯", "先在平的紙上想：一條直線穿過三角形，碰到三個邊或延長線……"),
               ("exp", "先停。碰到以後會怎樣，先別說。")]))
    P.append((bg("sky") + globe + arcs + slap(doc(80, 60, 150, 170, "平的那一版", -6, 5), .1)
              + slap(label(430, 400, "梅涅勞斯", 4, "#F6E7B0"), .45) + pup(470, 236, s=.85, **men, arm=-140, mouth="smile", sweat=True) + expl("shrug", "flat"),
              "一張寫著「平的那一版」的舊紙，和貼上「梅涅勞斯」名字的標籤",
              [("exp", "其實平的這一版，當時大家早就知道了；他拿它來證明天球上的那一版。"),
               ("梅涅勞斯", "……可是後來都叫我的名字。"),
               ("exp", "又是這樣。後來托勒密在他的天文書裡一直用它，名字就這樣傳下來。")]))
    P.append((bg("sky") + qcard() + pup(60, 236, s=.9, **men, arm=-30) + expl("down", "grin"),
              "一張寫著大問號的紙卡；解說員指向下方",
              [("exp", "直線穿過去切出的三個比，乘起來會怎樣？下面第 1 站自己轉轉看。")]))
    section("gp-u4-2", "看星星的人", P, "幾何拾光 4-2〈一條線穿過去〉梅涅勞斯")

# ───────── 5-2 九個點，一個圓（名字之爭） ─────────
def gp52():
    A, B, C = (300, 70), (150, 380), (520, 380)
    Ma, Mb, Mc = mid(B, C), mid(C, A), mid(A, B)
    N, r = circ3(Ma, Mb, Mc)
    tri = scrap([A, B, C], "#FBF8EE")
    circ = f'<circle cx="{N[0]:.1f}" cy="{N[1]:.1f}" r="{r:.1f}" fill="none" stroke="#8A8F98" stroke-width="3.4"/>'
    mids = "".join(dot(p, 5, "#C8553D") for p in (Ma, Mb, Mc))
    labs = ltr(A, "A", dy=-10) + ltr(B, "B", -14, 18) + ltr(C, "C", 14, 18)
    base = tri + circ + mids + labs
    eu = dict(hat="cap", coat="#5A4A7A", shirt="#F1EADB")
    P = []
    P.append((bg() + slap(tri + labs, .05) + slap(circ, .35) + slap(mids, .6) + expl("point"),
              "白色三角形上有一個灰色的圓，穿過三邊的中點",
              [("nar", "一個三角形，一個圓。"),
               ("exp", "這個圓穿過九個特別的點。是哪九個，今天先不說；先說它的名字。")]))
    P.append((bg() + base + slap(label(150, 110, "歐拉圓", -8, "#E8D9F5"), .1) + slap(label(480, 120, "費爾巴哈圓", 6, "#DDEBD5"), .4)
              + slap(label(330, 430, "九點圓", -3, "#F6E7B0"), .7) + expl("shrug", "flat"),
              "圓的旁邊貼上三張不同的名字標籤：歐拉圓、費爾巴哈圓、九點圓",
              [("exp", "結果它有好幾個名字：歐拉圓、費爾巴哈圓、九點圓……"),
               ("exp", "同一個圓，看是誰在說。")]))
    P.append((bg() + slap(doc(300, 70, 170, 220, "歐拉寫過的東西", 4, 8) + stamp(385, 240, "查無此圓", -8), .1)
              + pup(50, 214, **eu, arm=-100, tilt=-6, bob=False, mouth="o", sweat=True) + expl("think", "flat"),
              "歐拉紙偶冒汗，旁邊的文件蓋上「查無此圓」",
              [("exp", "翻遍歐拉寫的東西，找不到他寫過這個圓。"),
               ("歐拉", "那為什麼貼我的名字？"),
               ("exp", "大概是因為太有名了。這個三角形，他確實研究過別的事。")]))
    bri = dict(hat="bicorne", coat="#23345C", hair="#4A3324")
    feu = dict(hat="top", coat="#4A6A3A", shirt="#F4EFE2")
    P.append((bg() + slap(doc(110, 60, 140, 160, "1821", -5, 5), .1) + slap(doc(380, 60, 140, 160, "1822", 5, 5), .35)
              + pup(60, 250, s=.8, **bri, arm=-60) + pup(150, 250, s=.8, hat=None, coat="#6E3B2E", hair="#2F2620", arm=-80)
              + pup(420, 250, s=.8, **feu, arm=-120, mouth="o") + expl("point"),
              "1821 年的文件旁站著兩個法國紙偶，1822 年的文件旁站著一個德國紙偶",
              [("nar", "1821 年，法國的布里昂雄和龐斯列寫出了這九個點。"),
               ("nar", "隔年，22 歲的德國人費爾巴哈也找到這個圓，還多找到別的事。"),
               ("exp", "最後是法國的泰爾康取了「九點圓」：最老實的名字，只說有幾個點。")]))
    qs = label(330, 438, "還有 ？？？？？？", -2, "#E8D9F5", "#5939A4", 20)
    P.append((bg() + base + slap(qs, .2) + expl("down", "grin"),
              "三角形和穿過三邊中點的圓，下面一張紙條寫著還有六個問號",
              [("exp", "除了三邊的中點，還有哪六個點也在圓上？先猜，再去第 1 站。")]))
    section("gp-u5-2", "一個圓，三個名字", P, "幾何拾光 5-2〈九個點，一個圓〉名字之爭")

# ───────── 6-2 站在兩個圓中間（兩個圓形的國家） ─────────
def gp62():
    O1, r1, O2, r2 = (215, 255), 125, (470, 250), 62
    big = f'<g filter="url(#cm-cut)"><circle cx="{O1[0]}" cy="{O1[1]}" r="{r1}" fill="#C8553D"/></g>'
    small = f'<g filter="url(#cm-cut)"><circle cx="{O2[0]}" cy="{O2[1]}" r="{r2}" fill="#3E6E9E"/></g>'
    kb = dict(hat="crown", coat="#8E2F25", shirt="#F4EFE2")
    ks = dict(hat="crown", coat="#2B4F7A", shirt="#F4EFE2")
    P = []
    P.append((bg() + slap(big, .05) + slap(small, .35) + pup(150, 150, s=.75, **kb, arm=-50, bob=False) + pup(430, 160, s=.55, **ks, arm=-40, bob=False) + expl("point"),
              "紙地圖上貼了一大一小兩個圓形的國家，各站著一個國王紙偶",
              [("nar", "地圖上有兩個圓形的國家，一大一小。"),
               ("大國王", "兩國之間，要畫一條邊界。"),
               ("exp", "怎樣才算公平？他們先約好一個規則。")]))
    Pp = (372, 92)
    t1 = tangents(Pp, O1, r1)[0]; t2 = tangents(Pp, O2, r2)[1]
    path = line(Pp, t1, "#2B2621", 3, "7 6") + line(Pp, t2, "#2B2621", 3, "7 6") + dot(t1, 4.5, "#F6E7B0") + dot(t2, 4.5, "#F6E7B0")
    P.append((bg() + big + small + slap('<use href="#cm-flag" x="372" y="92"/>', .1) + slap(path, .4) + ltr(Pp, "P", -14, 4, 20)
              + pup(560 - 60, 300, s=.55, **ks, arm=-70, bob=False) + expl("think", "flat"),
              "一面旗插在兩國之間的 P 點，從 P 對兩個圓各畫一條擦邊而過的虛線",
              [("小國王", "站在某一點的人，往兩國各走一條剛好擦過城牆的直路。兩段路一樣長的點，才算在邊界上。"),
               ("exp", "這兩條路，就是從那一點對兩個圓畫的切線。")]))
    strip = '<g transform="translate(52 -6) rotate(80)"><g filter="url(#cm-cut)"><rect x="-6" y="-80" width="14" height="160" fill="#F6E7B0"/></g></g>'
    P.append((bg() + big + small + pup(300, 214, s=.9, **kb, arm=-60, hold=strip, mouth="open") + expl("stop", "angry"),
              "大國王紙偶拿著一長條紙，想貼在兩國正中間；解說員舉手喊停",
              [("大國王", "簡單，畫在兩國正中間！"),
               ("exp", "先停。畫在正中間對不對，先別說。")]))
    P.append((bg() + big + small + slap(label(150, 70, "高提耶 1813", -5), .1) + slap(label(330, 420, "龐斯列", 3, "#E8D9F5"), .4)
              + slap(label(520, 90, "施泰納", 6, "#DDEBD5"), .7) + expl("shrug", "flat"),
              "三張名字標籤：高提耶 1813、龐斯列、施泰納",
              [("exp", "1813 年，法國的高提耶替「兩段切線一樣長」的這群點取了名字。"),
               ("exp", "後來龐斯列、施泰納又各取了一個。同一群點，三個名字。")]))
    P.append((bg() + big + small + qcard() + expl("down", "grin"),
              "兩個圓形國家中間放著一張大問號紙卡；解說員指向下方",
              [("exp", "兩段切線一樣長的點，會排成什麼樣子？下面第 1 站自己找。")]))
    section("gp-u6-2", "兩個圓形的國家", P, "幾何拾光 6-2〈站在兩個圓中間〉兩國邊界")

# ───────── 8-2 一個數都不用算（笛沙格） ─────────
def gp82():
    des = dict(hat=None, wig=True, coat="#3E5A4A", hair="#5A4030")
    bos = dict(hat="beret", coat="#7A4A2E", hair="#3A2A20")
    V = (520, 150)
    house = ('<g stroke="#2B2621" stroke-width="2.2" fill="none" stroke-linejoin="round">'
             '<path d="M250 380 L250 230 L360 230 L360 380 Z" fill="#FBF6E6"/><path d="M250 230 L305 170 L360 230" fill="#E9C9A3"/>'
             '<path d="M360 230 L440 205 L440 330 L360 380" fill="#EDE3CC"/><path d="M305 170 L400 158 L440 205" fill="#E0B88E"/></g>')
    persp = "".join(line(p, V, "#C8553D", 1.4, "4 5") for p in ((360, 230), (360, 380), (305, 170)))
    P = []
    P.append((bg("desk") + slap(house, .1) + slap(persp + dot(V, 5, "#C8553D"), .45) + pup(40, 230, **des, arm=-50) + expl("point"),
              "方格紙上畫著一棟透視的房子，幾條虛線往同一點收",
              [("nar", "1640 年前後，法國。"),
               ("笛沙格", "畫房子不用量，用眼睛和直線就好。"),
               ("exp", "他叫笛沙格，里昂人，當過工程師、建築師，研究怎麼把立體的東西畫到平的紙上。")]))
    books = "".join(slap(f'<g filter="url(#cm-cut)"><rect x="{300+ (i%5)*34}" y="{300-(i//5)*26}" width="30" height="22" fill="#{["7A3E2E","3E5A4A","5A4A7A","8A6A45","2F5A88"][i%5]}"/></g>', .05 + i * .07)
                    for i in range(10))
    P.append((bg("desk") + books + zh(480, 316, "× 5", 40, "#5A4630", 800, anchor="start", serif=False) + pup(40, 230, **des, arm=-30, mouth="smile") + expl("wow", "o"),
              "桌上疊著一小疊書",
              [("exp", "1639 年，他把想法印成一本書，只印了五十本。"),
               ("笛沙格", "夠了，懂的人自然會懂。")]))
    P.append((bg("desk") + '<g opacity=".25">' + "".join(f'<rect x="{300+(i%5)*34}" y="{300-(i//5)*26}" width="30" height="22" fill="#8A6A45"/>' for i in range(10)) + '</g>'
              + slap(doc(320, 60, 150, 190, "手抄本", 5, 7, "#EFE4CB"), .3) + pup(40, 230, **des, arm=-110, tilt=-8, bob=False, mouth="o", sweat=True) + expl("think", "flat"),
              "書都變淡不見了，只剩一份手抄本",
              [("nar", "後來，五十本一本都找不到了。"),
               ("exp", "兩百年後，才有人在巴黎找到一份別人抄下來的手抄本。")]))
    O = (40, 80); A, B, C = (90, 60), (100, 100), (78, 112); k = 1.9
    def sc(p): return (O[0] + k * (p[0] - O[0]), O[1] + k * (p[1] - O[1]))
    A2, B2, C2 = sc(A), sc(B), sc(C)
    fig = ('<g transform="translate(330 80)">' + "".join(line(O, (O[0]+2.3*(p[0]-O[0]), O[1]+2.3*(p[1]-O[1])), "#8A6A45", 1.2, "3 4") for p in (A, B, C))
           + poly([A, B, C], "none", 'stroke="#3E6E9E" stroke-width="2.2"') + poly([A2, B2, C2], "none", 'stroke="#C8553D" stroke-width="2.2"') + dot(O, 3.4) + '</g>')
    P.append((bg("desk") + slap(doc(310, 50, 200, 250, "1648", 3, 0, "#F7F1E1", fig), .1)
              + pup(170, 230, s=.85, **bos, arm=-60, mouth="open") + pup(30, 250, s=.8, **des, arm=-20, mouth="o") + expl("wow", "o"),
              "版畫師博斯的 1648 年的書，最後一頁畫著從同一點看過去的兩個三角形",
              [("博斯", "我把老師的一件事印在我書的最後面：兩個三角形，從同一點看過去……"),
               ("笛沙格", "後面那句先別說！"),
               ("exp", "……那是我的台詞。")]))
    P.append((bg("desk") + qcard() + pup(60, 236, s=.9, **des, arm=-30) + expl("down", "grin"),
              "一張寫著大問號的紙卡；解說員指向下方",
              [("exp", "三組對邊延長後的交點，會怎樣？下面第 1 站自己拖拖看。")]))
    section("gp-u8-2", "只印了五十本", P, "幾何拾光 8-2〈一個數都不用算〉笛沙格")

# ───────── 8-4 翻譯過來的句子（帕斯卡→布里昂雄） ─────────
def gp84():
    pas = dict(hat=None, wig=True, coat="#2B2B33", hair="#4A3324", shirt="#F4EFE2")
    bri = dict(hat="bicorne", coat="#23345C", hair="#4A3324")
    Cn, R = (380, 230), 92
    ang = [20, 75, 130, 190, 245, 300]
    pts = [(Cn[0] + R * math.cos(math.radians(a)), Cn[1] + R * math.sin(math.radians(a))) for a in ang]
    circle = f'<circle cx="{Cn[0]}" cy="{Cn[1]}" r="{R}" fill="none" stroke="#2B2621" stroke-width="2.4"/>'
    hexi = poly(pts, "none", 'stroke="#3E6E9E" stroke-width="2.4"') + "".join(dot(p, 4.6, "#C8553D") for p in pts)
    poster = f'<g filter="url(#cm-cut)"><rect x="250" y="80" width="260" height="300" fill="#FBF6E6"/></g>'
    P = []
    P.append((bg("desk") + slap(poster, .05) + slap(circle, .3) + slap(hexi, .55) + zh(380, 360, "圓上六個點", 18) + pup(40, 236, s=.9, **pas, arm=-40) + expl("point"),
              "一張大紙上畫著一個圓和圓上六個點連成的六邊形",
              [("nar", "1639 年，法國。"),
               ("帕斯卡", "圓上六個點，連成六邊形……"),
               ("exp", "他叫帕斯卡，那年 16 歲。這句話隔年印成一張大紙發出去。")]))
    cal = "".join(slap(f'<g transform="rotate({(-1)**i*5} {195+i*92} {220})"><g filter="url(#cm-cut)"><rect x="{155+i*92}" y="{170+(i%2)*24}" width="80" height="84" fill="#FBF6E6"/></g>'
                       + zh(195 + i * 92, 222 + (i % 2) * 24, y, 20) + '</g>', .05 + i * .18) for i, y in enumerate(["1640", "1700", "1750", "1800", "1806"]))
    P.append((bg("desk") + cal + expl("shrug", "flat"),
              "日曆紙一張一張翻過：1640、1700、1750、1800、1806",
              [("exp", "然後，過了一百六十七年。")]))
    dic = (f'<g filter="url(#cm-cut)"><rect x="420" y="110" width="150" height="110" fill="#F6E7B0"/></g>'
           + zh(495, 155, "點 ⇄ 線", 26, "#5A4630", 800) + zh(495, 195, "翻譯對照表", 15, "#7A6A55", 600))
    P.append((bg("desk") + '<g opacity=".45">' + poster + circle + hexi + '</g>' + slap(dic, .2) + pup(60, 236, s=.9, **bri, arm=-60, mouth="o") + expl("think", "flat"),
              "布里昂雄紙偶拿著一張「點 ⇄ 線」的翻譯對照表",
              [("nar", "1806 年，巴黎的一所工程學校。"),
               ("布里昂雄", "把句子裡的點換成線、線換成點，翻譯看看。"),
               ("exp", "他還是學生。對，就是九點圓那一位布里昂雄。")]))
    r2 = 80
    tang = []
    for a in ang:
        t = math.radians(a); P0 = (Cn[0] + r2 * math.cos(t), Cn[1] + r2 * math.sin(t)); d = (-math.sin(t), math.cos(t))
        tang.append((P0, d))
    verts = [inter(tang[i][0], (tang[i][0][0] + tang[i][1][0], tang[i][0][1] + tang[i][1][1]),
                   tang[(i + 1) % 6][0], (tang[(i + 1) % 6][0][0] + tang[(i + 1) % 6][1][0], tang[(i + 1) % 6][0][1] + tang[(i + 1) % 6][1][1])) for i in range(6)]
    c2 = f'<circle cx="{Cn[0]}" cy="{Cn[1]}" r="{r2}" fill="none" stroke="#2B2621" stroke-width="2.4"/>'
    hexo = poly(verts, "none", 'stroke="#3E6E9E" stroke-width="2.4"') + "".join(dot(v, 4.6, "#C8553D") for v in verts)
    poster2 = f'<g filter="url(#cm-cut)"><rect x="240" y="60" width="280" height="340" fill="#FBF6E6"/></g>'
    P.append((bg("desk") + slap(poster2, .05) + slap(c2, .3) + slap(hexo, .55) + zh(380, 385, "六條切線", 18) + pup(40, 236, s=.9, **bri, arm=-30) + expl("stop", "angry"),
              "新的一張大紙：圓外六條切線圍成六邊形；解說員舉手喊停",
              [("布里昂雄", "「六條直線和圓相切，圍成六邊形，三組對頂點的連線……」"),
               ("exp", "先停。翻出來的句子是對是錯，先別說。")]))
    P.append((bg("desk") + qcard() + pup(60, 236, s=.9, **bri, arm=-30) + expl("down", "grin"),
              "一張寫著大問號的紙卡；解說員指向下方",
              [("exp", "翻譯過來的句子，還對嗎？下面第 1 站先猜，再動手。")]))
    section("gp-u8-4", "一句話的翻譯", P, "幾何拾光 8-4〈翻譯過來的句子〉帕斯卡與布里昂雄")

if __name__ == "__main__":
    gp13(); gp42(); gp52(); gp62(); gp82(); gp84()
