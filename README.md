# 數學探索島

互動探索站的「預測 → 操作 → 紀錄」版本，名單上的學生用 Google 帳號登入後，紀錄存到雲端。

- `index.html`：入口地圖
- `passport.html`：探索紀錄本（同一張地圖，標出走完的島）
- `g*.html`：30 章單元頁（七上到九下）
- `teacher.html`：老師頁面（跨章總表、單章紀錄、學生名單；可篩班級、匯出 CSV）

## 更新

`python3 _原始碼/build.py <互動版網站資料夾> .`

每一章的預測問句與判斷題寫在 `_原始碼/units_*.py`，新增一章要在 `build.py` 的 `BUILT` 補上。
資料庫權限規則在 `_原始碼/firestore.rules`，改了要貼到 Firebase 主控台發布。
