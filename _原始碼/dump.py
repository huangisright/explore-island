#!/usr/bin/env python3
"""把單元頁的段落與探索站文字印出來，寫設定檔時對照用。用法：python3 dump.py units/xxx.html"""
import html, re, sys

s = open(sys.argv[1], encoding="utf8").read()
s = re.sub(r"<script.*?</script>|<style.*?</style>", "", s, flags=re.S)
body = s[s.find('<div class="wrap">'):]
T = lambda x: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", x))).strip()
title = re.search(r"<h1>(.*?)</h1>", s, re.S)
print("H1:", T(title.group(1)) if title else "")
for m in re.finditer(r'<section id="([^"]+)"(.*?)</section>|<div class="lab" id="(lab\d+)">(.*?)<div class="lab-foot">(.*?)</div>\s*</div>', body, re.S):
    if m.group(1):
        print("\n## SECTION", m.group(1), ":", T(m.group(2))[:700])
    else:
        lab, inner, foot = m.group(3), m.group(4), m.group(5)
        ttl = re.search(r'class="lab-title">(.*?)</p>', inner, re.S)
        why = re.search(r'class="lab-why">(.*?)</p>', inner, re.S)
        bodytxt = inner[inner.find('class="lab-body"'):]
        ctrls = re.findall(r"<button[^>]*>(.*?)</button>|<label[^>]*>(.*?)</label>", bodytxt, re.S)
        ctrl = [T(a or b) for a, b in ctrls]
        print("\n### " + lab, "|", T(ttl.group(1)) if ttl else "")
        print("  why :", T(why.group(1)) if why else "")
        print("  ctrl:", " / ".join(c for c in ctrl if c)[:400])
        print("  foot:", T(foot))
