#!/usr/bin/env python3
"""不跑整個 build.py，直接把漫畫放進（或換掉）已輸出的單元頁。用法：python3 inject.py <網站根目錄> <slug>..."""
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
root = sys.argv[1]
common = open(os.path.join(HERE, "_common.html"), encoding="utf8").read()
for slug in sys.argv[2:]:
    p = os.path.join(root, slug + ".html")
    s = open(p, encoding="utf8").read()
    k = '<div class="lab" id="lab1"'
    assert s.count(k) == 1, slug
    i = s.find('<!-- 開場翻格漫畫')
    if i >= 0:                       # 換掉舊的（片段＋共用，一路到第 1 站前）
        s = s[:i] + s[s.find(k):]
    frag = open(os.path.join(HERE, slug + ".html"), encoding="utf8").read()
    s = s.replace(k, frag + common + k)
    open(p, "w", encoding="utf8").write(s)
    print("ok", slug)
