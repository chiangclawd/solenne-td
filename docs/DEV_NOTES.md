# 開發經驗與坑位筆記 · Solenne TD

這份文件記錄本專案 v2.0 → v2.2.1 演進過程中累積的技術經驗、踩過的坑、
以及驗證有效的解法模式。目的是：

1. 讓本專案後續修訂可以查表避坑
2. 給未來其他「TypeScript + Canvas 2D + PWA 手遊」專案當起點參考

> **維護規則**：每次遇到新坑或新架構決策，在對應章節追加一條記錄，
> 格式保持「情境 / 根因 / 解法 / 教訓」。寧願瑣碎，不要省略。

---

## 1. 專案脈絡 & 技術選型

| 面向 | 決策 | 理由 |
|---|---|---|
| 渲染 | Canvas 2D 全程序化（零 sprite sheet，只用 Kenney 參考圖當美術語言） | 打包體積小、mobile 相容最廣、好除錯 |
| 語言 | TypeScript 嚴格模式 | 資料結構複雜（存檔 schema、敵人 phase、英雄技能），型別是救命繩 |
| 打包 | Vite 8 + vite-plugin-pwa | 零設定起步，HMR 快，PWA 內建 |
| 部署 | GitHub Pages + GitHub Actions | 免費、push 即部署、URL 穩定 |
| 存檔 | `localStorage` + `migrate()` | 單裝置、離線友善，PWA 更新不會丟 |
| 關卡 | 28 個 JSON 檔案 in `public/levels/` | Data-driven，腳本可重寫、美術/劇情可獨立編輯 |
| 音訊 | WebAudio 程序生成 BGM/SFX | 不需音檔，bundle 輕 |
| 規模 | 「indie polish tier」—剛好商業質感 | 避免無底洞，優先 mobile 可讀性 > HUD > 美術 > 新內容 |

---

## 2. 踩過的坑（按領域分類）

### 2.1 iOS PWA / 全螢幕 / Safe Area

#### 坑 A：主畫面下方塔欄被 home indicator 截斷

- **情境**：iPhone 15 Pro Max「分享→加到主畫面」全螢幕 PWA 模式下，
  `<body>` 已經套用 `padding-bottom: env(safe-area-inset-bottom)`，
  理論上 canvas 應該不會畫到 home bar 區，但實際上塔欄 icons 被切掉下半截。
- **根因**：某些 iOS/iPadOS standalone 組合下，`env(safe-area-inset-bottom)`
  在 CSS 回傳非 0，但 canvas 的 `clientHeight` **仍等同** `window.innerHeight`——
  也就是 CSS padding 被忽略、canvas 實際畫出去。無法 feature-detect。
- **解法**：`Renderer.safeBottom()` **adaptive**——
  ```ts
  const sab = parseFloat(getComputedStyle(documentElement).getPropertyValue('--sab'));
  const diff = window.innerHeight - canvas.clientHeight;
  if (diff >= sab - 2) return 0;  // CSS 已處理，不要雙重修正
  return sab;
  ```
  任何底部錨定 HUD（塔欄、Start Wave 鈕、升級面板、版號）都減去它。
- **教訓**：iOS 的 env() + CSS padding 組合不穩，一律在 JS 加「adaptive fallback」，
  用「canvas 是否比 window 短」來判斷 CSS padding 是否生效。

#### 坑 B：`100vh` 被 URL bar 吃掉
- **情境**：手機 Safari 一般 tab（非 PWA）下方網址列佔掉遊戲區。
- **解法**：CSS 改用 `height: 100dvh`（dynamic viewport height），
  並主選單提示玩家「分享→加到主畫面」解鎖全螢幕。

#### 坑 C：HeroSelect 上下卡片中間大空洞

- **情境**：全螢幕模式 vh 變大，確認鈕錨定 `vh - 44` 造成卡片跟按鈕中間一大塊黑。
- **根因**：「視覺錨定」不該用 `vh - X`，應該相對於實際內容。
- **解法**：`confirmY = noneY + noneH + 20`，讓鈕緊貼卡片下緣。
- **教訓**：bottom-anchored UI 只用在「真的想貼下緣」（dock、status bar）。
  內容相關的按鈕要相對內容定位。

---

### 2.2 PWA 更新策略

#### 坑 D：`registerType: 'autoUpdate'` + precache 模式會「延後一次」更新

- **情境**：玩家第 N 次打開 PWA 仍看到舊版，第 N+1 次才是新版。
- **根因**：Workbox precache + skipWaiting 的執行順序：
  1. SW 用**舊** precache 立即吐畫面
  2. 同時背景下載新 sw.js
  3. 新 SW 接管——但**這次已經載入的 JS bundle 不會換**
  4. 下次開啟才看到新版
- **解法**：把 `index.html` 和 `levels/*.json` 從 precache 移除，
  改用 `runtimeCaching: NetworkFirst` + `networkTimeoutSeconds: 2`：
  - 有網路時 2 秒內拿到新 HTML → 立刻新版
  - 離線時 2 秒 timeout → fallback 到快取
- **教訓**：對更新頻率高的 asset（HTML entry、關卡資料）要走 NetworkFirst；
  對不變的 asset（JS bundle hash、圖片）繼續 precache 以確保離線可用。

#### 坑 E：版號寫死，部署了但玩家看不到差別

- **情境**：`src/main.ts` 的 `const VERSION = '2.1.0'` 寫死，多次部署後仍顯示舊版號。
- **根因**：手動同步 `package.json` 和 code 常常忘記。
- **解法**：Vite `define` 在 build 時注入：
  ```ts
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  }
  ```
  Code 用 `declare const __APP_VERSION__: string;` 聲明類型。
  build date 每次 build 都會變，所以即使版號沒升也能識別新部署。
- **教訓**：**任何要顯示給使用者的版本/build 資訊一律從 `package.json` 經 build-time define 注入**，絕對不要兩邊維護字串常數。

---

### 2.3 Canvas 渲染 / 美術

#### 坑 F：地形 tile 看起來平貼、沒立體感

- **情境**：早期所有 world 的 tile 只有單層 fill + 少量 feature，看起來像貼紙。
- **解法**：`drawTileAO()` 統一加 1px 暖色高光 + 1.5px 冷色陰影，每個 tile 繪製後套用。
- **教訓**：tile 系統最便宜的「立體化」是 rim lighting，不是重畫 fill。
  路徑 tile 陰影加重（0.35），地板 tile 輕一點（0.22），讓路徑「刻進」地面。

#### 坑 G：W6 undersea 整個世界用錯主題

- **情境**：新增 World 6 關卡後發現 tile 看起來像 W1 草地。
- **根因**：`themeForWorld()` 對未知 world ID `return 'grass'`（fallback），
  6 沒被加進去，靜默繼承 W1 外觀。
- **解法**：新增 `undersea` theme（grass tile / path tile / background）+ 明確 `if (worldId === 6) return 'undersea';`。
- **教訓**：主題 dispatch 的 default fallback 要用錯誤警示（或至少 `console.warn`），
  不要讓「少一個 case」靜默變成視覺災難。

#### 坑 H：Achievement toast 被 88% 遮罩蓋住

- **情境**：過關畫面蓋上後，top 的成就 toast 只撐 3.5 秒就淡掉，玩家來不及看。
- **根因**：toast 是全域 timer（`main.ts: achievements.update(dt)`），
  跟場景狀態無關，end overlay 顯示時它繼續衰減。
- **解法**：`triggerWin` / `triggerLose` 時 capture `unlockedThisLevel` 成員，
  在 `renderEndOverlay` 裡畫**常駐**金框卡片。toast 保留（給 level 中段解鎖用）。
- **教訓**：兩種時效性不同的 UI 要分開元件——
  - 短期（toast / floater）：自動衰減，跟遊戲時間同步
  - 長期（end overlay card）：跟場景狀態同步，直到玩家 dismiss

---

### 2.4 遊戲邏輯

#### 坑 I：前線英雄不吃接觸傷

- **情境**：玩家把英雄放在貼路徑的 tile，敵人走過卻不會傷害它。
- **根因**：`contactR = 24px` 但 tile = 40px。相鄰 tile 的敵人中心離英雄 40px，
  邊緣離 ~27px，永遠觸不到 24px 閾值。
- **解法**：放寬到 44px + 按敵人 hpMax 縮放傷害 + 單 tick 上限 40% maxHP。
- **教訓**：接觸判定的半徑要至少 > 1 tile，否則 grid-based 遊戲的「相鄰」感覺會消失。

#### 坑 J：多路徑關卡 path-1 從未出現敵人

- **情境**：L7 加了第二條路徑，但該路徑整場沒敵人。
- **根因**：用 `Math.random() < 0.4` 隨機分配 path，L7 Wave 1 只有 8 隻敵人——
  真的可能全部 roll 到 path-0。
- **解法**：改成**決定性輪替**（奇數 index 走 path-1），外加 fallback：
  wave 結束時檢查 path-1 是否 < 2 隻，不足就強制把後段幾隻改成 path-1。
- **教訓**：隨機分配必須搭配 deterministic 下限保證，尤其在樣本數小的情況。

#### 坑 J2：多路徑 path-1 看起來「延遲才有」敵人

- **情境**：把 L7 等多路徑關資料改成「前半列 path 0、後半列 path 1」，
  玩家還是反映第二條路看起來空空。
- **根因**：`WaveManager` 把整個 wave 當成**一條時間線**——entry N+1 的
  delay 從 entry N 的 spawn time 開始算，與 path 無關。所以
  `[SO(0.7, 0) × 5, S(0.4, 1) × 4]` 的實際時間線是：
  - t=0.7, 1.4, 2.1, 2.8, 3.5 → 5 個 soldier on path 0
  - t=3.9, 4.3, 4.7, 5.1 → 4 個 scout on path 1
  path 1 要到 3.9s 後才出現，玩家早已把注意力轉開。
- **解法**：WaveManager 改用 **per-path streams** — 每條路獨立計時器 + 獨立
  cursor。wave 資料在 `startWave` 時分派到各 stream，從 t=0 並行消耗。
  同一 JSON 格式、同一 delay 語意，只是 delay 現在相對「同路徑上一個 spawn」
  而非「全場上一個 spawn」。
- **副作用**：多路徑關卡的峰值密度↑（因為兩/三條路並行）。所以既有多路徑
  關不需要重設計，但關卡難度感覺會略增。若嫌太硬，調個別 entry 的 delay。
- **教訓**：「多路徑」不只是 JSON 支援多條 path 陣列，**spawn 引擎也必須
  平行化**，否則後面的路 == 後面時段的敵人。

#### 坑 K：Boss phase 2 會連續觸發

- **情境**：Boss 低於 50% HP 後多次 triggerPhase，瘋狂 heal/spawn。
- **根因**：只檢查 `hp <= maxHp * 0.5`，沒有「已觸發」flag。
- **解法**：`phaseTriggered: boolean` 一次性旗標 + `pendingPhaseSpawns: []` 
  queue 由 GameScene 抽乾。
- **教訓**：任何 threshold-crossing 事件都要 latch flag，跨 frame 會重複觸發。

#### 坑 L：`pierceResist` 語意誤導

- **情境**：升級 tower 的 `pierceResist` 被以為「破甲」，實際是對**所有敵人** +30% 傷害。
- **解法**：引入明確的 `armorPierce: boolean` flag，真的 bypass `damageResist`。
  舊的 `pierceResist` 換成 `damageBonus` 以正名。
- **教訓**：遊戲屬性名稱要跟實際效果一致。玩家（和未來的你）會用字面意思解讀。

#### 坑 M3：塔設定 per-config 效果 vs per-level 效果

- **情境**：v2.3.1 要做塔升級分叉，需要同一塔的 Lv3A (AOE) 和 Lv3B (破甲) 有完全不同的 projectile 效果。但原 schema 把 `splashRadius / slowDuration / armorPierce` 放在 `TowerConfig` 上——全 tier 共用。
- **根因**：早期以為「AOE 塔就永遠 AOE」，沒預料會 per-level 變。
- **解法**：把所有「影響 projectile 行為」的欄位從 `TowerConfig` 搬到 `TowerLevel`。`Tower.update()` 改讀 `lv.splashRadius` 而非 `config.splashRadius`。
- **影響範圍**：
  - 10 座塔的資料完全重寫（`baseLevels[2] + branches{A,B}.levels[3]`）
  - `Tower.update()` firing 邏輯從 config 讀 → level 讀
  - CodexScene 從顯示 `cfg.levels[0]/[max]` → 顯示 `cfg.baseLevels[0]` + `cfg.branches.{A,B}` 對照表
  - GameScene 的 `cfg.levels[0].cost` 引用改成 `cfg.baseLevels[0].cost`（蓋塔成本、hover 預覽、dock label）
- **教訓**：**設定檔的「上下層分割線」是策略性的** — per-config vs per-level vs per-branch。做分叉前先確認每個屬性應該住在哪層，否則要動大手術。

#### 坑 M2：關卡「只有 path 不同」玩起來感覺差不多

- **情境**：W1 五關 path 都是單一 S/Z 形，走到第 3 關玩家已經知道最佳塔位在哪，策略完全定型。
- **根因**：path 形狀只改變「敵人走哪」，但 **塔位選擇空間** 沒變——地形不切割戰場、障礙物全是裝飾、沒有 destructible 的經濟槓桿。
- **解法（v2.2.2）**：引入三種「結構性」設計軸：
  1. **多路徑** (L2, L5) — 不同路徑配不同敵種，逼迫玩家分散火力 vs 合流點集火的取捨
  2. **堡壘破壞** (L3) — 中央 destructible 群占掉最佳視角，破 or 不破是一個選擇
  3. **戰場切割** (L4) — 橫向 destructible 牆把地圖切成三區，中央區塔位受限，必須破牆開道
- **教訓**：**地圖的策略深度來自「塔位選擇空間的結構」而不是「敵人更難」**。單純加 HP 只是拉時間，改 path 形狀只是換走向；真正變策略是「哪些格子你能蓋、代價是什麼」。

#### 坑 M：Lives 遞減被 `Math.max(floor, x - 1)` 推到上方

- **情境**：`uplift-difficulty.mjs` 想每關減 1 lives，floor=12 以上不減。
  L3 原本 lives=10（低於 floor），結果被推到 12（變多了）。
- **根因**：`Math.max(12, 10 - 1)` = `Math.max(12, 9)` = 12，是數學正確但語意錯。
- **解法**：改成明確的「只單向降低」：
  ```js
  const candidate = before - 1;
  if (candidate >= floor && candidate < before) apply(candidate);
  ```
- **教訓**：balance 調整腳本一定要 idempotent + monotonic（只增或只減，不雙向）。

---

### 2.5 存檔 / 資料 schema

#### 坑 N：schema 新增欄位不能刪舊欄位

- **情境**：v2.x 新增 `heroLevelWins`、`metaUpgrades` 等欄位。
- **架構**：`loadSave()` 呼叫 `migrate()`：
  ```ts
  const out: SaveData = { version: 2, levelProgress, settings, achievements, stats };
  if (parsed.heroLevelWins) out.heroLevelWins = parsed.heroLevelWins;
  // ...additive only
  ```
- **教訓**：**永遠只加欄位、不改/不刪**。如果真的要刪，宣告 deprecated 並在新版存檔中忽略該欄位，
  但舊存檔讀進來不能 throw。

#### 坑 O：版本更新會不會洗掉存檔？

- **結論**：不會。存檔是 `localStorage`，SW precache/runtimeCache 是獨立 storage。
  任何 JS/SW 更新都碰不到 localStorage。
- **會歸零的情境**：
  - iOS「長按 PWA → 移除 App」
  - Safari「清除歷史與網站資料」
  - 裝置儲存空間耗盡被系統清理（罕見）
  - 換裝置（沒做雲端同步）

---

### 2.6 工具鏈 / 建置

#### 坑 P：`JSON.stringify` 在 Vite `define` 的必要性

- **情境**：`define: { __APP_VERSION__: pkg.version }` → 編譯後變成 `2.2.1`（裸值，SyntaxError）。
- **解法**：`define: { __APP_VERSION__: JSON.stringify(pkg.version) }` → 編譯後是 `"2.2.1"`。
- **教訓**：`define` 做的是**字面量替換**，不是字串賦值。任何 string/object 都要 `JSON.stringify`。

#### 坑 Q：`tsc --noEmit` 比 `vite build` 更早抓到型別錯

- **工作流程**：commit 前一律跑 `npx tsc --noEmit`，快（～3 秒），抓漏直接。
  Vite 的快速 build 只做 transform，不做嚴格型別檢查。

---

## 3. 有效的 Pattern

### 3.1 Adaptive 環境偵測

Safe-area、device-pixel-ratio、PWA standalone mode 這類「平台相依」的東西，
不要靠 user agent sniff。用「行為測試」：
```ts
const isCssPaddingWorking = (window.innerHeight - canvas.clientHeight) >= expectedInset - 2;
const isStandalone = matchMedia('(display-mode: standalone)').matches
  || (navigator as { standalone?: boolean }).standalone === true;
```

### 3.2 Data-driven levels + re-runnable scripts

28 關的 balance 調整不要手改 JSON。寫 Node mjs script：
- 接受 level 區間參數（例如 L5-L18）
- 操作要 idempotent + 單向
- 打印 diff 方便 audit
- 放進 `scripts/` 目錄，文件註解說明用途

### 3.3 Phase / Effect latch flags

任何「跨 frame 可能重複」的 threshold 事件：
```ts
if (!this.xxxTriggered && condition) {
  this.xxxTriggered = true;
  fireOnce();
}
```
死亡、階段轉換、成就解鎖都用這個模式。

### 3.4 Animation timers 跨狀態衰減

```ts
// Always decay animations (even dead) so swings finish cleanly
if (this.fireAnim > 0) this.fireAnim = Math.max(0, this.fireAnim - dt * 6);
if (!this.alive) return;
```
別只在 alive 分支衰減，否則死亡瞬間動畫會凍結。

### 3.5 Version injection via Vite `define`

See 坑 E + 坑 P. 字串 build-time 注入比執行時 fetch package.json 可靠得多。

---

## 4. 工作流程規範（Claude 協作）

1. **每次 user-visible 變更都 bump `package.json` patch 版號** 然後重 build。
2. **commit 訊息用 HEREDOC**，結尾包 `Co-Authored-By: Claude`。
3. **TS 變更 commit 前一律 `npx tsc --noEmit`**。
4. **不用 `--no-verify` 跳 git hook**，除非使用者明確同意。
5. **不 force-push、不 reset-hard**，除非被要求。
6. **改 28 關的腳本放 `scripts/`**，不要 inline 亂跑。
7. **每次回報結尾列出版號**：`v{version} · build {YYYY-MM-DD}`。

---

## 5. 後續修訂時的 Checklist

加新功能時逐條過：

- [ ] 有沒有破壞 `SaveData` schema？（只加欄位 / migrate 有處理）
- [ ] 有沒有加底部錨定 UI？（記得用 `safeBottom()`）
- [ ] 有沒有加長時間計時？（考慮 pause、won/lost 狀態、英雄死亡）
- [ ] 有沒有 threshold 事件？（有沒有 latch flag）
- [ ] 有沒有跟 world 相關的 dispatch？（6 個 world 都覆蓋了嗎）
- [ ] 關卡 JSON 新增欄位？（LevelLoader 的 type + 驗證更新）
- [ ] 成就/統計新增？（`stats` 初始值 + `defaultSave` 同步）
- [ ] `npx tsc --noEmit` 通過？
- [ ] `npx vite build` 通過？
- [ ] `package.json` 版號 bump 了？
- [ ] 回報版號 + build date？

---

## 6. 歷史里程碑

| 版本 | 亮點 | 學到的事 |
|---|---|---|
| v2.0.0 | 23 關戰役、難度系統、成就、劇情對話 | 早期就建 migrate() 免得後期痛苦 |
| v2.1.0 | 新英雄 skin、音效美化、天氣系統 | 程序化 procedural 比 asset pipeline 省很多 |
| v2.2-A | 多路徑關卡（`paths: [][]`） | 舊單路徑 JSON 要 auto-migrate at load |
| v2.2-B | World 6 深海（L24-L28） | fallback case 必設警示，不然靜默錯 |
| v2.2-C | 可破壞地形 | destructible 是 obstacle 的 subtype |
| v2.2-D | Boss phase 2 | latch flag + pending queue 兩件事 |
| v2.2.1 | 英雄近戰、campaign 強化、PWA NetworkFirst、undersea theme、AO、成就卡 | 主選單版號一定要明顯 |
| v2.2.2 | W1 地圖大翻修（多路徑 L2/L5、戰利品堡壘 L3、切割戰場 L4）| 策略深度來自「地圖限制塔位」勝過「調數值」 |
| v2.2.3 | W2-W5 共 18 關結構重設計（多路徑、戰利品經濟、戰場切割 + 每世界主題機制）| 用 generator script 跑大規模改動比手改 JSON 可靠 × 10 |
| v2.2.4 | WaveManager 改用 per-path 並行 streams —— 多路徑關卡真的同時活躍 | 資料多路徑 ≠ spawn 引擎並行，兩者都要做 |
| v2.3.0 | A1 Challenge Stars：3 星從「失血比例」改成 3 個獨立挑戰 | SaveData 新欄位只加不刪 + `challengeFlags` 累積不歸零，migration 信任舊分數 |
| v2.3.1 | A2 塔升級分叉：Lv3 起 A/B 分支 × 10 塔 × 5 tiers | 塔 config 重構：`levels[]` → `baseLevels[2] + branches{A,B}`；per-level 取代 per-config 的 splash/slow/pierce |
| v2.5.0 | C1 英雄天賦樹：3 英雄 × 5 天賦 × 3 tier | 天賦 mod 在 Hero 建構時快照為 flat multipliers，`def` 保持 immutable |
| v2.5.1 | D2 無障礙：色盲模式 / 字級 / 低動畫 | 在 Renderer 層攔截 text size + color，不改 caller；particles/weather 加 `enabled` flag 方便外部開關 |
| v2.6.0 | B2 試煉之巔：6 trials × 限制 + meta-star reward | trial 是 LevelData + 一個 `trial?: {...}` 區塊，sequential unlock，總共 41 ★ 獎勵 |
| v2.6.1 | D3 開場 / 結局 Cinematic | 純 Canvas 2D 程序動畫，lazy import 不影響首次載入；seenIntro/seenOutro 旗標控制自動播放 |
| v2.6.2 | 節奏調慢一倍 + 波次 6/8/10/12/15 + 多路徑強制 ≥3 敵/路 | playtest 反饋：當下節奏太快、有些路看起來空。SPEEDS 改 [0.5,1,2,3] 預設 0.5x；script 強化 wave balance 規則 |
| v2.7.0 | D1 互動世界地圖 (WorldMapScene) + LevelSelect worldFilter | 把 `drawWorldSilhouette` 包成 `drawWorldThumbnailScreen` (clip + scale)，重用既有美術；MainMenu → 世界地圖 → 單一世界 LevelSelect 兩段式流程 |

---

## 7. 跨專案可重用的起點

如果要做新的「TS + Canvas 2D + PWA 手遊」：

1. **複製這幾個檔作為 starter**：
   - `vite.config.ts`（含 `define` + PWA NetworkFirst 策略）
   - `src/style.css`（safe-area CSS var + `100dvh` + `touch-action: none`）
   - `src/engine/Renderer.ts`（`safeBottom()` adaptive）
   - `src/storage/SaveData.ts`（migrate pattern）
   - `CLAUDE.md`（工作規則）

2. **從 day 1 就做**：
   - `__APP_VERSION__` / `__BUILD_DATE__` 注入
   - 主畫面明顯顯示版號
   - `migrate()` 不管 schema 多簡單都先寫
   - safe-area 支援
   - GitHub Actions → Pages 自動部署

3. **day 1 先不做**（確認有需要再加）：
   - 雲端存檔同步
   - 多語系
   - 複雜 AI
   - 網路連線
