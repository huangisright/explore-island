# 交接說明：把幾何拾光 28 節做成數學探索島的紀錄版

> 給接手的 AI（ChatGPT／Codex）與黃士祐老師。這份說明放在 `huangisright/explore-island` 根目錄，照著做即可。
> 寫於 2026-11-23。做完一批就在最後的〈進度〉打勾。

---

## 0. 一句話目標

數學探索島目前有 30 章正課，每章有「先猜 → 動手 → 寫紀錄 → 判斷題 → 蓋章」的流程，登入後紀錄存到 Firebase。
**幾何拾光**是另一門課（八個單元、28 節），每節有一個「動態頁」，現在只是給老師投影用的操作頁，沒有紀錄功能。
要做的：**把 28 個動態頁也改成探索島的紀錄版**，學生能先猜、操作、寫紀錄、做判斷題、蓋章，老師頁看得到。

---

## 1. 範圍與分批

一個單元開一個 PR，依序做，**每批做完先停下來給老師用學生帳號試過，再做下一批**。

| 批 | 單元 | 節（slug） |
|---|---|---|
| 1 | 單元一 | gp-u1-1　gp-u1-2　gp-u1-3 |
| 2 | 單元二 | gp-u2-1　gp-u2-2　gp-u2-3 |
| 3 | 單元三 | gp-u3-1　gp-u3-2　gp-u3-3 |
| 4 | 單元四 | gp-u4-1　gp-u4-2　gp-u4-3 |
| 5 | 單元五 | gp-u5-1　gp-u5-2　gp-u5-3 |
| 6 | 單元六 | gp-u6-1 ～ gp-u6-4 |
| 7 | 單元七 | gp-u7-1 ～ gp-u7-4 |
| 8 | 單元八 | gp-u8-1 ～ gp-u8-5 |

第 1 批還要先做「共用改動」（第 4 節），之後各批只要加設定檔。

**不要做的事**：不要改 30 章正課的任何輸出內容；不要改 `firestore.rules`（現有規則已經涵蓋，見 3.4）；不要動 `geo-stars.html` 的星座資料。

---

## 2. 需要的兩個 repo

| repo | 用途 |
|---|---|
| `huangisright/explore-island` | 要改的地方（輸出就是根目錄，GitHub Pages 直接發布） |
| `huangisright/GiftedMath` | **只讀**：原始的互動頁，產生器從這裡讀 `units/gp-u*.html` 與 `index.html` |

產生方式（在 explore-island 根目錄）：

```
git clone --depth 1 https://github.com/huangisright/GiftedMath /tmp/gm
python3 _原始碼/build.py /tmp/gm .
```

`build.py` 會把 30 章正課重新輸出一次。**每次跑完先 `git diff --stat`，確認 30 章的 `g*.html` 沒有被改到**（只有你這次負責的檔案、`passport.html`、`teacher.html`、`index.html` 該有變動）。如果 30 章有差異，先查原因，不要直接推。

---

## 3. 現有架構（先讀懂這些再動手）

### 3.1 產生器 `_原始碼/build.py`

- `BUILT`：自動載入 `_原始碼/units_*.py` 的 `CFG`，依檔名排序。**一章一個設定檔**。
- `build_unit()`：讀 `<GiftedMath>/units/<slug>.html` → 可選的 `restructure` → 換掉「回目錄」連結 → 套 `patches`（每個 old 字串必須剛好出現一次，否則 assert 失敗）→ 把 `island.css`、`island.js`、`window.ISLAND=<CFG>`、雲端模組注入 `</body>` 前 → `<title>` 後面加「｜數學探索島」→ 寫成 `<slug>.html`。
- `units_from_index()`：從 GiftedMath 的 `index.html` 抓卡片（`<a class="unit" href="units/<slug>.html" data-grade="…" data-kind="…">`），**只收 `GRADES` 裡的年級**。幾何拾光的卡片 `data-grade="幾何拾光"`，目前被濾掉。
- `build_passport()`、`build_home()`、`build_teacher()`：用上面的清單畫紀錄本、首頁地圖、老師頁。

### 3.2 設定檔 `units_*.py` 的格式

參考 `_原始碼/units_g8b2.py`（八下2，寫得最完整）。欄位：

```python
CFG = {
  "slug": "g8b-ch2-functions",      # 和 GiftedMath 的檔名一樣
  "chap": "八下2",                  # 章代碼（顯示用）
  "title": "它不會改口",
  "topic": "函數與函數圖形",
  "plain": "這座島上的機器：……",    # 入口／紀錄本上的白話一句話
  "patches": [[old, new], ...],      # 只改探索島複本的字串替換
  "stations": {                      # key ＝ 頁面上 <div class="lab" id="lab1"> 的 id
    "lab1": {"mode": "observe", "why": "…", "obs": "…"},
    "lab2": {"mode": "predict", "why": "…", "q": "…", "opts": [...], "multi": True, "obs": "…"},
  },
  "gates": [{"sel": "#p3", "after": "lab4"}, {"sel": "#end", "after": "ALL"}],
  "quiz": [{"q": "…", "opts": [...], "ans": 0, "why": ["", "選錯時的提示", ...], "exp": "答對後的說明"}],
}
```

- `mode: "predict"`：先寫預測（可選 `opts` 選項＋文字），鎖住後才打開操作區；`observe`：直接操作，只寫觀察。
- `gates`：某段內容要等某站（或 `ALL`＝全部站）紀錄完才打開，用來藏會洩漏答案的段落。
- `quiz`：判斷題，`why[i]` 是選了第 i 個錯誤選項時的提示（答案那格留空字串），`exp` 是答對後的說明。

### 3.3 `_原始碼/island.js` 對頁面的要求（很重要）

island.js 是照正課頁面的結構寫的，它假設：

- 每一站是 `<div class="lab" id="labN">`，裡面有 `.lab-head`（含 `.lab-no` 站號、`.lab-title` 標題、`.lab-why` 說明）、`.lab-body`（操作區）、可選的 `.lab-foot`。
- 頁面有 `<header>`（進度條插在它後面）和 `.wrap`（紀錄區放在它最後）。

**幾何拾光的頁面沒有 `.lab`**，結構是：

```
.bk-top / .bk-fab                 回目錄（build.py 會自動換成回紀錄本）
<header>                          28 頁都有
.wrap
  .eyebrow                        「幾何拾光　單元二　第 1 節」
  h1                              節名
  p.lede                          開場一句
  .main
    .panel.stage                  圖（SVG，可拖曳）
    .panel                        控制區：模式切換、讀數、按鈕「隨機跑 1000 個…」「回到學習單的圖」
  p.q#ask (hidden)                跑完 1000 次後跳出的問題（多數頁有）
  details#more                    「更多」：下一段才用的東西（多數頁有；gp-u1-1、gp-u1-3 沒有）
  h2.part                         只有 gp-u8-5 有（第二部分「牆上那一題」）
```

所以**要先把這種結構轉成 island.js 看得懂的站**（第 4 節）。

### 3.4 雲端

- 紀錄存在 Firestore `records/{uid}/units/{slug}`，規則只檢查欄位，**不限定 slug**，所以 `gp-u1-1` 這種 slug 直接可用，不用改規則。
- 雲端模組 `island-cloud.js`、登入、加入碼、老師帳號都沿用，不用改。

---

## 4. 共用改動（第 1 批做一次）

### 4.1 `build.py` 加一種 restructure：`"gp"`

建議做法：設定檔裡寫一個 `wrap` 清單，告訴產生器「頁面上哪一段要包成第幾站」。例如：

```python
"restructure": "gp",
"wrap": [
  # (站 id, 站號, 站名, 開頭標記, 結尾標記)  標記是頁面原文裡剛好出現一次的字串
  ("lab1", "1", "先看一個點", '<div class="main">', '<p class="q" id="ask"'),
  ("lab2", "2", "看更多",     '<details id="more">', '</details>'),
],
```

產生器把「開頭標記」到「結尾標記」之間包成：

```html
<div class="lab" id="lab1"><div class="lab-head"><span class="lab-no">1</span><div><p class="lab-title">先看一個點</p><p class="lab-why"></p></div></div><div class="lab-body"> …原本那一段… </div></div>
```

要求：
- 標記必須剛好出現一次（像 `patches` 一樣 assert）。
- 包起來之後**原本的 JavaScript 還要能跑**：只是外面多一層 div，元素 id 不變，通常沒問題；但若原頁 JS 用 `.main > .panel` 這類直接子選擇器，要檢查。
- `<details id="more">` 包進站之後，若它只能在前一站記錄完才打開，用 `gates`（`{"sel": "#more", "after": "lab1"}`），不要只靠 details 收合。
- `island.css` 是照正課頁面寫的，套到幾何拾光頁後**檢查樣式有沒有打架**（字型、顏色變數、寬度）。有衝突就在 `island.css` 裡加限定 `.gp` 的規則，或在設定檔 `patches` 處理，不要改正課的外觀。

（也可以選擇別的實作，只要結果符合 3.3 的結構、而且 30 章輸出不變。）

### 4.2 幾何拾光進紀錄本與老師頁

- `GRADES` 是正課六個學期，首頁地圖（`island-map.js`）照它畫島。**不要把「幾何拾光」直接加進 `GRADES`**，地圖會亂掉。
- 改成：`units_from_index()` 另外收 `data-grade="幾何拾光"` 的卡片，只給 `build_passport()` 和 `build_teacher()` 用。
  - 紀錄本 `passport.tpl.html`：多一個頁籤「幾何拾光」（和七上、七下…並排，點了只換下面那一頁，不要全部攤開）。只顯示已經做好設定檔的節。
  - 老師頁 `teacher.tpl.html`：跨章總表、單章紀錄都要能選到幾何拾光的節（它是用 `BUILT` 產生的，通常加了設定檔就會出現，確認即可）。
- 首頁 `index.html` 不動（已經有「另一片海：幾何拾光」入口卡）。

### 4.3 `geo.html`／`geo-stars.html` 改連探索島頁

這兩頁現在把每節連到 `https://huangisright.github.io/GiftedMath/units/gp-uN-M.html`。
改成：**該節已經做好紀錄版 → 連 `gp-uN-M.html`（同一個資料夾，相對路徑）；還沒做 → 維持連 GiftedMath。**
原檔在 `_原始碼/geo.html`、`_原始碼/geo-stars.html`，build.py 原樣複製到根目錄，所以改 `_原始碼/` 那份。
- `geo.html`：函式 `pageURL(sec)`。
- `geo-stars.html`：`LESSON[...]` 的 `url`。
建議在 build.py 產生一份已完成清單（例如 `window.GP_DONE = ["gp-u1-1", ...]`）注入兩頁，讓連結自動切換。

---

## 5. 每一節要寫什麼（內容規則，最重要）

### 5.1 題目來源

每節要寫：2～3 站（`stations`）、2～4 題判斷題（`quiz`）、一句 `plain`。

內容依據（優先順序）：
1. **老師提供的學生版學習單**（檔名格式 `幾何拾光 單元二-1 光走的那一條_學生版.docx`，在老師電腦「學習單設計/進階講義/」裡，**不在 repo**）。請老師上傳該批的學生版給你；有教師版更好，但教師版內容**只能拿來判斷答案，不能抄進學生看得到的地方**。
2. 動態頁本身的文字：`.lede`、`.hint`、`#ask`、按鈕文字、`#more` 裡的說明。
3. 兩者都沒有的，不要自己編新的數學內容；在 PR 說明裡列出「需要老師補」。

### 5.2 這門課的設計規則（違反任何一條都要改）

1. **學生看得到的地方不寫定理名與學術名**：不寫維維安尼、塞瓦、梅涅勞斯、費馬點、九點圓、歐拉線、位似、圓冪、根軸、拿破崙、帕斯卡、笛沙格、布里昂雄、反演……。這門課是「學生先發現、自己取名，之後才告訴他名字」。用現象描述：「三個距離加起來」「三條線交在一點」。
2. **節奏是四段**：建立現象 → 追問 → 工具登場 → 回頭。對應到站：第 1 站讓學生看到現象（多半 predict：先猜會不會變）；第 2 站追問（為什麼、什麼時候會壞）；「更多」通常是工具登場那一段，**一定要 gate 在前一站記錄之後**。
3. **預測題不能洩漏答案**。預測選項要包含學生常見的錯誤猜法（例如「重心」「中點那一圈」「60°」），不要讓正確選項一眼看出來。
4. **「電腦跑了一千次」不等於理解**：頁面上 `#ask`（「電腦試了一千次。你還需要什麼？」）是貫串整門課的問題。紀錄欄要讓學生寫「為什麼」，不要只寫「是／不是」。至少一站的 `obs` 要問理由。
5. **判斷題考的是想法不是名詞**。錯誤選項的 `why` 要指回某一站讓學生回去看（格式參考 `units_g8b2.py`）。
6. **用詞**：台灣國中老師的說法；不用「收束」（用統整、總結）；少用「你」「我」，題目預設省略主詞；不出現「數理資優班」「資優」；不寫設計理念。
7. 數字題的答案要自己用程式驗算過（例如角度、長度、比值），在 PR 說明寫出怎麼驗的。

### 5.3 一節的設定檔範例（示意，內容要照該節實際的頁面寫）

`_原始碼/units_gp21.py`（單元二第 1 節〈光走的那一條〉）：

```python
CFG = {
  "slug": "gp-u2-1",
  "chap": "幾何拾光 二-1",
  "title": "光走的那一條",
  "topic": "最短路徑",
  "plain": "這座島上，要從一點走到河邊再走到另一點，找出最短的那一條。",
  "restructure": "gp",
  "wrap": [
    ("lab1", "1", "一條直線", '<div class="main">', '<p class="q" id="ask"'),
    ("lab2", "2", "另一邊的", '<details id="more">', '</details>'),
  ],
  "patches": [],
  "stations": {
    "lab1": {"mode": "predict",
             "why": "拖橘色的點，看兩段加起來的長度；再按「隨機跑 1000 個位置」。",
             "q": "橘點停在哪裡，兩段加起來最短？先猜一個位置。",
             "opts": ["正中間", "離比較近的那一點比較近的地方", "兩點連線和直線的交點", "其他（寫在下面）"],
             "multi": False,
             "obs": "最短的時候，兩段和直線夾的角有什麼關係？電腦跑了一千次，你還需要什麼才相信？"},
    "lab2": {"mode": "observe",
             "why": "打開「另一邊的」，看看把其中一點翻到直線另一邊會怎樣。",
             "obs": "翻過去之後，為什麼最短的那一條一下子就看得出來？"},
  },
  "gates": [{"sel": "#lab2", "after": "lab1"}],
  "quiz": [ … ],
}
```

（上面的題目只是格式示意，**要照該節學習單與頁面實際內容重寫**。）

### 5.4 特殊節

- `gp-u1-1`、`gp-u1-3`：沒有 `#more` 也沒有 `#ask`，只包一站或依頁面控制區拆兩站。
- `gp-u1-2`、`gp-u7-4`：沒有 `#ask`，第 1 站的結尾標記改用 `<details id="more">`。
- `gp-u8-5`：有兩部分（`h2.part`「牆上那一題」），`<div class="main">` 出現兩次，標記要帶更多前後文才會唯一；第二部分自成一站，gate 在第一部分之後。
- 其餘 22 節：`<div class="main">`、`<p class="q" id="ask"`、`<details id="more">` 都剛好出現一次（2026-11-23 檢查過）。
- 單元四第 3 節、單元五第 1 節、單元六第 3 節、單元八第 2～3 節屬「C 型」：學生通常連第一步都下不了手。預測題改問「你會先試什麼」，不要問結論。

---

## 6. 每批的驗收清單（PR 說明裡逐項回報）

1. `python3 _原始碼/build.py /tmp/gm .` 跑得過；`git diff --stat` 裡 30 章正課的 `g*.html` **沒有變動**。
2. 用無頭瀏覽器（playwright）開這批每一頁：
   - console 沒有 JS 錯誤；
   - 原本的拖曳、按鈕、「隨機跑 1000 個」都還能用；
   - predict 站：沒寫預測前操作區打不開，寫了才打開；
   - gate：前一站沒記錄完，被 gate 的段落看不到；
   - 判斷題選錯看得到提示、選對看得到說明；全部完成會蓋章；
   - 寬度 390、900、1280 都不會左右溢出（`scrollWidth - clientWidth == 0`）。
3. `passport.html` 的「幾何拾光」頁籤看得到這批的節；`teacher.html` 選得到。
4. `geo.html`、`geo-stars.html` 裡這批的節已改連 `gp-uN-M.html`，其他節仍連 GiftedMath。
5. 用下面的字串搜這批的輸出頁與設定檔，**學生看得到的文字裡不可以出現**：
   `維維安尼 塞瓦 梅涅勞斯 梅氏 費馬點 九點圓 歐拉線 位似 圓冪 根軸 蝴蝶定理 托勒密 拿破崙 愛可爾斯 帕斯卡 笛沙格 布里昂雄 反演 資優 收束`
   （頁面原本就有的人名介紹若是在「更多」裡、而且是 gate 之後才出現，可以保留，PR 裡列出來讓老師決定。）
6. 數字答案的驗算方法寫在 PR 說明。
7. 列出「需要老師補或決定」的地方。

---

## 7. 做完全部之後

- `README.md` 的檔案清單補上 `gp-u*.html` 的說明。
- 個人入口首頁（另一個 repo `huangisright/huangisright.github.io`）的 `data.json`，幾何拾光分類裡 28 節的連結改成 `https://huangisright.github.io/explore-island/gp-uN-M.html`，再跑 `python3 build.py` 重產頁面。沒有那個 repo 的權限就跳過，交給老師。

---

## 7.5 實作後的注意事項（第 1 批做完補）

- **gate 要用 `hide`，不要用 `sel`**：`{"hide": "#lab2", "after": "lab1"}`。用 `sel` 時 island.js 會把站內所有子元素設成可見，預測鎖會失效。
- 頁面自己有一個叫 `lab` 的 class（圖上的字母標籤），`restructure_gp` 已自動改名成 `gp-lab`。
- `restructure_gp` 在最後一站後面補 `<div id="end">`，判斷題才會排在所有站後面。
- **跑 build.py 一定要輸出到暫存資料夾**（`python3 _原始碼/build.py <GiftedMath> /tmp/out /tmp/content`），再只複製這批的 `gp-u*.html` 與 `passport.html`、`teacher.html`、`geo.html`、`geo-stars.html` 回來。直接輸出到根目錄會把 30 章正課全部改掉（GiftedMath 原檔之後有改版）。
- 設定檔格式看 `_原始碼/units_gp11.py`：兩站（`main` 現象＋預測、`more` 更多＋關鍵的一問），三題判斷題。

## 8. 進度

- [x] 共用改動（4.1～4.3）（2026-11-23 Claude 完成：`restructure_gp`、紀錄本頁籤、`build_geo` 的 GP_DONE）
- [x] 第 1 批　單元一（2026-11-23 Claude 完成，`units_gp11～13.py`）
- [x] 第 2 批　單元二
- [x] 第 3 批　單元三
- [x] 第 4 批　單元四
- [x] 第 5 批　單元五
- [x] 第 6 批　單元六
- [x] 第 7 批　單元七
- [x] 第 8 批　單元八
- [x] 收尾（第 7 節）（2026-11-23 Claude 一次做完 28 節）
