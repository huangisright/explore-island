import re,sys
BACK = '''<style id="backnav">
.bk-top{max-width:1040px;margin:0 auto;padding:14px 24px 0;font-family:"PingFang TC","Noto Sans TC",sans-serif;font-size:14px}
.bk-top a{color:#175954;text-decoration:none;font-weight:600}
.bk-fab{position:fixed;right:16px;bottom:16px;z-index:9999;display:inline-flex;align-items:center;gap:6px;padding:9px 15px;border-radius:24px;background:#fffdf5;border:1px solid #c4cfc2;color:#175954;font-family:"PingFang TC","Noto Sans TC",sans-serif;font-size:14px;font-weight:600;text-decoration:none;box-shadow:0 2px 4px rgba(72,60,40,.10),0 10px 26px rgba(72,60,40,.16)}
</style>
<div class="bk-top"><a href="index.html">← 回目錄</a></div>
'''
FAB = '<a class="bk-fab" href="index.html">← 目錄</a>\n'
def doc(head_and_style, body):
    return '<!DOCTYPE html>\n<html lang="zh-Hant">\n<head>\n' + head_and_style + '\n</head>\n<body>\n' + BACK + body + FAB + '</body>\n</html>\n'
def lab(lid,no,title,inner):
    return ('<div class="lab" id="%s"><div class="lab-head"><span class="lab-no">%s</span><div><p class="lab-title">%s</p><p class="lab-why"></p></div></div>'
            '<div class="lab-body">%s</div></div>') % (lid,no,title,inner)

# ---------- 單元二 ----------
s=open('同一塊面積兩種算法_互動版.html').read()
head=re.search(r'<meta charset.*?</style>',s,re.S).group(0)
body=s[s.index('<main>'):]
body=body.replace('</html>','').rstrip()
# 拿掉頁面自己的「先猜／寫下發現」框（一線數光的站有自己的預測與紀錄）
body,n=re.subn(r'<div class="predict">.*?</div>\n?','',body,flags=re.S); assert n==3,n
body=body.replace("['p1','p2','p2b'].forEach(k=>{$(k).value=store.get(k);$(k).oninput=()=>store.set(k,$(k).value)});\n","")
assert "'p1'" not in body
def conv(m):
    lid=m.group(1); inner=m.group(2)
    t=re.search(r'<h2><small>第 (\d) 站</small>(.*?)</h2>',inner)
    inner=inner.replace(t.group(0),'')
    return lab(lid,t.group(1),t.group(2),'<div class="station">'+inner+'</div>')
body,n=re.subn(r'<section class="station" id="(lab\d)">(.*?)</section>',conv,body,flags=re.S); assert n==3
body=body.replace('<main>','<main class="wrap">',1).replace('<footer>','<div id="end"></div>\n<footer>',1)
head=head.replace('.station{','.station{margin:0;').replace('margin:0 0 26px}','}')
open(sys.argv[1]+'/alg-u2.html','w').write(doc(head,body))

# ---------- 單元一（Codex 原檔，改名代數拾光） ----------
s=open(sys.argv[2]).read().replace('代數換景','代數拾光')
head=re.search(r'<meta charset.*?</style>',s,re.S).group(0)
body=s[s.index('<main>'):].replace('</html>','').rstrip()
m=re.search(r'<section>(.*?)</section>',body,re.S)
body=body.replace(m.group(0), lab('lab1','1','填頂點，逐邊驗算','<section>'+m.group(1)+'</section>')+'\n<div id="end"></div>')
body=body.replace('<main>','<main class="wrap">',1)
open(sys.argv[1]+'/alg-u1.html','w').write(doc(head,body))
print('ok')
