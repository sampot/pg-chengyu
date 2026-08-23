# 成語接龍（`pg-chengyu`）— 遊戲規劃文檔

> **用途：** 本 repo 的遊戲權威規格——coding agent 改動前必讀：這個遊戲是什麼、規則、設計限制、優化方向。
> **整理方式：** 從本 repo 實作反向整理（2026-08-23）。**改玩法先改此檔再改碼**；本檔與程式碼衝突時，以「規則（§3）」描述的設計意圖為準回報差異。
> **上游契約：** [PG-GAME-AGENT-GUIDE.md](https://github.com/sampot/playgrounds/blob/main/docs/PG-GAME-AGENT-GUIDE.md)（唯一必讀；本檔不重複其全文）· 型錄條目 `playgrounds/catalog/entries/pg-chengyu.yaml`

## 1. 一句話

以上一句末字起頭、從 622 句四字成語詞庫點選或輸入接龍的限時益智——挑戰計分與人機對戰兩模式，致敬傳統接龍玩法。

## 2. 定案速覽

| 項 | 值 |
| --- | --- |
| catalog id / kind / series | `pg-chengyu` / `game` / `桌遊` |
| status | `listed` |
| 模式 | 挑戰（限時計分扣命）／對戰（人機輪流、淘汰制） |
| 難度 | 簡單 20 秒／普通 14 秒／困難 9 秒（`TIME`）；生命 困難 2、其餘 3 |
| 詞庫 | 622 句常見成語（`idioms.js` CLEAN），依首字索引 |
| 對手 AI | 單一強度：可接詞中隨機抽，出手延遲 650–1150ms |
| 素材 | 全部程式繪製＋WebAudio 合成音效（無圖檔資產） |
| 交付形 | 純 HTML＋CSS＋ESM JS；無 build；`npx vitest run` 測試 |

多人連線協定 `chengyu.v1`：**未實作（預留）**——僅在 `game.js` 檔頭註記未來 Invite 契約方向（房間狀態／回合移動／超時出局訊息）。

## 3. 完整規則（現行實作）

### 3.1 接龍基本法

- 下一語必須以上一語**最後一字**開頭（`firstChar === needChar`，字面比對無同音容錯）、為詞庫內四字成語、且本局未用過（`used` Set）。
- 開局種子由 `pickSeed(2)` 抽出：保證其尾字至少有 2 句可接，避免開場死路。
- 接不上任何詞（`canContinue()` 為假）即結束：玩家接完後無路＝勝（挑戰「詞庫接盡」／對戰「對手無語可接」）；AI 接完後玩家無路＝敗。
- 接龍紀錄逐句列於歷史面板並自動捲到最新。

### 3.2 挑戰模式

- 限時作答：倒數歸零呼叫 `fail("時間到")`。每句得分 `10 + min(8,streak)×2 + ⌊⌈剩餘秒⌉/3⌋`（連擊加成上限 16 分、時間加成最多 6 分）；streak +1 並更新 bestStreak 與 best。
- 失誤扣命：**任何**無效作答——長度不對、詞庫沒有、用過、首字不合——都以對應提示訊息呼叫 `fail()` 扣 1 命並清零 streak；跳過按鈕同樣扣命。命盡（≤0）即「挑戰結束」判敗。
- 未出局時補滿時間、刷新候選、續接同一個字（needChar 不變）。
- 勝或敗都把 best 上報持久化。

### 3.3 對戰模式（人機）

- 玩家先手；玩家合法出牌後輪 AI（`turn="ai"`、`aiBusy=true`），app 以 650+亂數×500ms 延遲後呼叫 `aiPlay()`。
- AI 從 `startersWith(needChar, used)` **均勻隨機**抽一句；無可接則玩家勝。AI 出牌後玩家無路可接即敗。
- 玩家**逾時即淘汰**（直接判敗，無扣命概念）；「跳過」鈕在此模式變「認輸」，按下立即敗。
- 無效作答（打錯字、重複等）在對戰模式**不罰**——只顯示提示，時鐘繼續走。
- AI 回合期間倒數凍結（`update()` 只在 player 回合且非 aiBusy 時扣時）。

### 3.4 候選與輸入

- 每回合給 4 顆候選按鈕（`buildChoices`）：至多取 2 句合法可接詞，其餘補干擾項（詞庫內未用且首字不符者優先），洗牌排序——正解不一定存在於候選中。
- 自行輸入表單：maxlength 8，送出後以 spread 展開驗長度恰 4、`isIdiom`、未使用、首字吻合，失敗原因回 `len/unknown/used/mismatch`。
- 倒數條 scaleX 顯示剩餘比例；最後 3 秒每秒 tick 音。

### 3.5 邊界處理

- 幀迴圈 dt 上限鉗制 0.05s（背景切換回來不會一次扣光時間）。
- 非玩家回合的 play() 一律拒絕（`noturn`）；開新局會清掉排程中的 AI timer 防幽靈出手。
- localStorage 讀寫包 try/catch（Safari 隱私模式降級）；KV fetch 失敗靜默。

## 4. 操作與畫面

| 輸入 | 動作 |
| --- | --- |
| 模式／難度 chips | 挑戰↔對戰、簡單↔普通↔困難（開局前切換） |
| 開局／重開 | 依當前模式與難度開始（非破壞性，不需確認） |
| 點候選成語 | 嘗試接龍；成功閃綠、失敗閃紅 |
| 自行輸入＋送出 | 鍵入詞庫內成語 |
| 跳過／認輸 | 挑戰扣 1 命；對戰直接落敗 |
| 音效鈕 | 開/關（僅記憶體，未持久化） |

- HUD 五格：分數、最佳、連擊、生命（對戰顯示「淘汰制」）、倒數秒。
- 盤面：「要接的字」大字＋上一句尾字括注＋倒數條＋候選區＋輸入框；下方接龍紀錄。Mobile-first 單欄；禁 `alert`／`confirm`／`prompt`。

## 5. 持久化（KV 權威）

| key | 內容 | 讀寫時機 |
| --- | --- | --- |
| `pg-chengyu-best`（KV） | 歷史最高分（字串數字） | 勝/敗結算時 PUT；啟動時 GET 取 max 蓋過本地快取 |
| 同名 key 於 localStorage | 本地快取（LS 先讀、KV 為準） | 啟動與每次 saveBest |

- 規則：KV 為唯一權威、裸 LS 只能當快取——現行實作正是此模式。key 已含 `pg-chengyu-` 前綴（宿主 KV 無 per-SAM 命名空間，前綴自保正確）。
- 其餘進度（各難度最佳、最長鏈等）皆未持久化。音效開關僅記憶體。

## 6. 美術／音效／署名

- 無外部圖像資產：介面全 CSS（含 ambiance 背景）；音效全部 WebAudio 振盪器合成（`audio.js`，master 0.22）：click/ok/fail/win/lose/ai/tick 七種音色，AudioContext 需手勢 unlock。無需 ATTRIBUTION.md（repo 亦無此檔）。
- 若未來加入素材：拷進 `assets/`、新增 ATTRIBUTION.md（CC0 也須署名）、同步 `sam-manifest.json` files。

## 7. 測試（`npx vitest run`）

現有覆蓋（`game.test.js`，**僅 3 例**）：挑戰模式逾時只扣命不死（lives 3→2）、對戰模式逾時立即淘汰（status lost、turn null）、對戰中玩家打出合法且可延續的詞後輪到 AI。

零測試缺口明說：計分公式、fail/pass 扣命與敗北、buildChoices 干擾項組成、pickSeed 保底、idioms 索引函式（lastChar/startersWith）皆未覆蓋。最小必測建議：(1) 得分公式三成分邊界（streak=0/8、timeLeft=0）；(2) 挑戰三連失誤判敗；(3) used 重複與 mismatch 拒絕不改 state；(4) canContinue 為假時的勝敗分支。

## 8. 硬約束（不可違反）

1. 僅 HTML＋CSS＋JS（ESM）；**無 build**、不入庫 `node_modules`、不安套件；工具一律 `npx <pkg>` 臨時執行。
2. 禁瀏覽器原生 `alert`／`confirm`／`prompt`；提示一律頁內 status 列。
3. Mobile-first；主操作不可 hover-only。
4. 最高分的唯一權威是 `/api/kv/pg-chengyu-best`；禁止裸 localStorage 當權威；新增進度 key 必帶 `pg-chengyu-` 前綴。
5. 不自行載入 `sdk.js`；宿主注入 `window.PG`（boot 等 ready，靜態伺服無 SDK 也要能玩）。
6. 改動可執行邏輯前先寫失敗測試（TDD）。
7. 檔案清單變動須同步 `sam-manifest.json`。
8. 詞庫增刪只動 `idioms.js`（保持 first-char 索引與 CLEAN 過濾不變式）；遊戲規則只在 `game.js`，`app.js` 不摻規則判定。

## 9. 優化建議（可玩性與樂趣）

依優先級；實作前先在此登記並補測試。原則：深化字詞策略與重玩誘因，不改變「末字起頭接龍」的核心認同。

**高優先**

1. **chengyu.v1 包廂連線落地**：契約已預留，型錄也標了對戰超時出局。比照 mahjong.v1：functions.js store 存局面（history/used/turn/deadline），roles host/p2、act=play/pass/resign/sync、超時由 host 判定出局——把單機 AI 戰升級成真人對戰，是本作最大的樂趣天花板。
2. **AI 三檔手感**：目前 AI 純隨機，三個難度只有時鐘差。簡單偏好「下一手可接詞少」的短視詞、困難偏好可接詞最多的延鏈詞（比較 `startersWith(next).length`），讓困難真的有壓迫感。
3. **可接字提示**：字面首字比對無同音容錯，卡關挫敗感高。在「要接的字」旁列出剩餘可接句數（0 前先示警），或提供花 20 分換一個合法詞的道具。

**中優先**

4. **詞庫分級與擴充**：622 句偏日常；加入進階池並讓困難模式混入，配合詞條釋義 tooltip，玩接龍也能學成語。
5. **戰績細節持久化**：best 之外存各難度最佳、最長接龍鏈、累積接句數（遷移為單一 JSON key `pg-chengyu-stats`，舊 key 讀取相容）。
6. **每日挑戰**：以日期為種子固定開局詞與候選序列，好友間可比分數——低成本的重玩鉤子。

**低優先**

7. 接龍鏈視覺化：歷史面板改成首尾字相連的鏈條圖，強化「接上了」的手感。
8. 音效開關持久化（localStorage 快取即可，屬偏好非權威資料）。
