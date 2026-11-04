# 探索島

互動探索站的「預測 → 操作 → 紀錄」版本，名單上的學生用 Google 帳號登入後，紀錄存到雲端。

- `index.html`：入口地圖
- `passport.html`：探索紀錄本（同一張地圖，標出走完的島）
- `g8b-ch2-functions.html`：八下2《它不會改口》
- `teacher.html`：老師頁面（學生名單、全班紀錄）

## 更新

`python3 _原始碼/build.py <互動版網站資料夾> .`

每一章的預測問句與判斷題寫在 `_原始碼/units_*.py`，新增一章要在 `build.py` 的 `BUILT` 補上。
資料庫權限規則在 `_原始碼/firestore.rules`，改了要貼到 Firebase 主控台發布。
