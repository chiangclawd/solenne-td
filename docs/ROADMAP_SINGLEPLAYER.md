# 單機塔防 · 後續規劃 · v2.3+

> **定位宣示**：純單機，不聯網、不 gacha、不 PvP、不雲端同步。
> 耐玩性全部靠內容深度 + meta progression + 重玩誘因。
> 這份是給後續半年開發的 roadmap；每個 milestone 都獨立可出貨。

---

## 1. 市面單機塔防的精髓分析

挑六個最值得學的標竿，只記「可移植到我們遊戲的設計決策」：

### A. Kingdom Rush（Ironhide，黃金標準）
- **每關是 puzzle 而不是 template**：地圖 layout、敵人組合、特殊機制每關不同。本專案 v2.2.2/2.2.3 剛好走這方向。
- **塔升級分叉**：每塔 2 條升級路線 × 5 等級，同塔兩 build 是完全不同玩法。
- **3 星 = 3 個獨立目標**：通關 / 不失血 / 特殊條件。**每關要玩 3 遍才滿星**，28 關變成 84 次獨特挑戰。
- **Heroic + Iron 模式**：同一關解鎖加難度版，永遠有上限可挑戰。
- **英雄 = 主角**：技能樹 + 裝備，玩家會產生角色感情。

### B. Bloons TD 6
- **塔升級超深**：3 條 paths × 5 tiers，玩家為了測試 builds 可以打同關 10 次。
- **Monkey Knowledge meta tree**：跨局 permanent upgrade，玩越久越強。
- **每張 map 有獨特物件**：能量線、縮路、水域 — 地形本身是策略變數。
- **難度階梯**：Easy → Medium → Hard → Impoppable → CHIMPS，勸退式設計也是吸引力。

### C. Plants vs Zombies
- **新塔每關解鎖儀式感**：每關完成「獲得新花」那一刻是最強成就感。
- **副模式壽命比主線長**：Survival、Puzzle、I Zombie、Vasebreaker 等模式佔遊戲 60% 時間。
- **經濟循環明確**：陽光生產 → 花朵部署 → 清波，每步閉環清楚。

### D. Defense Grid
- **塔即路障**：你用塔的位置塑造路徑，這是整個 mindset 的翻轉。
- **敵人搶 Core 回 spawn**：給敵人一個「目標」而不只是「到 goal」，失敗成本不再是「漏一隻 = -1 命」而是「被搶 core = 要追回」。
- **Orbital weapon 超級武器**：長冷卻、大效果，節奏有起伏。

### E. GemCraft / Infinitode 2
- **Gem crafting / tower fusion**：兩塔合成新塔，深度組合。
- **risk/reward multiplier**：玩家可自己調高難度換更多獎勵，自找受虐的人有歸宿。
- **endless 是主菜而非配菜**：meta-level progression 跟無盡深度綁死。

### F. Arknights（手遊但單機本質策略）
- **放置方向**：塔/角色有朝向，面對路徑才能攻擊，**位置就是戰術**。
- **近戰 / 遠程區分**：近戰擋敵（blocking），遠程輸出。我們的英雄近戰（v2.2.1）觸及類似概念。
- **「推薦精英關」**：主關過了還有個進階版，等同二週目。

---

## 2. 我們現況盤點（v2.2.4）

### 已做
| 面向 | 狀態 |
|---|---|
| 28 關主線（6 世界） | ✅ |
| 3 位英雄 + 技能 + 近戰 | ✅ |
| Frontline tier 部署加成 | ✅ |
| 多路徑並行 spawn | ✅ |
| 可破壞障礙物經濟 | ✅ |
| Boss phase-2 機制 | ✅ |
| 8 種塔 + 17 種敵人 + 6 boss | ✅ |
| 星級（1-3 星）+ 三檔難度 | ✅ |
| Meta upgrades（星星消費） | ✅ |
| 成就系統（含跨英雄通關） | ✅ |
| Endless 模式 | ✅ |
| PWA 全螢幕 + 離線 | ✅ |
| 劇情 intro/outro + 角色頭像 | ✅ |
| 6 biome 程序美術 + 天氣 | ✅ |
| 程序音效 + 6 world BGM | ✅ |

### 缺的 / 待優化
| 面向 | 現況 | Gap |
|---|---|---|
| 塔升級路徑 | 單線性 3 levels | 無分叉，build 變化窄 |
| 3 星條件 | 只看「失血比例」 | 沒有 challenge variant |
| Daily Challenge | 無 | 玩家無每日回流動機 |
| 英雄深度 | 固定 3 技能，幾個 passive | 無 talent tree / 裝備 |
| 世界地圖 | 列表式 LevelSelect | 無視覺進度感 |
| Codex | 塔/敵數值表 | 無 lore / flavor |
| 無障礙 | 無 | 無色盲模式、字級、低動畫 |
| 副模式 | 只有 Endless | 缺 Survival、Puzzle、Trial |
| Cinematic | 無 | 無開場/結局動畫 |

---

## 3. Roadmap（5 tiers，按 ROI 排）

### Tier A — 內容壽命 3× 放大器（**最高 ROI，先做**）

#### **A1. 每關挑戰目標（Challenge stars）** 🌟🌟🌟
把 3 星重構成 **3 個獨立挑戰目標**：

- ⭐ 通關（任何條件）
- ⭐ 達成限制條件（每關各自設計，例：不蓋 cannon / 不失血 / 限時）
- ⭐ 達成殲滅條件（全敵被塔擊殺、無漏敵、無破壞物被動破壞）

**影響**：28 關 → 84 次有意義的挑戰，內容壽命直接 3×。

**實作成本**：中 — 加 `challenges: ChallengeDef[]` 到 LevelData schema，
加 `challengeProgress` 到 SaveData。GameScene 追蹤即時條件。UI 顯示進度。

**參考**：Kingdom Rush、Arknights 推薦關。

---

#### **A2. 塔升級分叉（Tower branching）** 🌟🌟🌟
每塔在 Lv2 後分叉 A/B 兩條升級路線：

- cannon Lv3A「破片彈」→ AOE splash +50%
- cannon Lv3B「穿甲彈」→ 100% armorPierce +30% dmg
- machineGun Lv3A「雷射」→ 連續扇形損耗
- machineGun Lv3B「散彈」→ 每發多 2 彈、range -20%

**影響**：同塔兩種玩法，打法選擇翻倍。

**實作成本**：中 — `TowerLevel` schema 加 branches、UI 升級面板加分叉按鈕、
數值需要 playtest 平衡。

**參考**：Kingdom Rush、BTD6 核心機制。

---

### Tier B — 重玩誘因（中 ROI）

#### **B1. 每日挑戰（Daily Challenge）** 🌟🌟
每天（以裝置時區為準）固定 seed 生成特殊關：

- 隨機抽一個既有關卡
- 套上 random modifier：
  - 「加農砲禁用」
  - 「起始金錢 50%」
  - 「所有敵人 +30% 速度」
  - 「沒有英雄」
  - 「敵人血量 +40% 但每殺 +5 金」
- 分數 = 剩餘生命 × 難度加成
- **本地排行榜**（僅本機記錄，不聯網）

**影響**：玩家每天有理由回來。

**實作成本**：中 — seed-based deterministic generator、modifier 系統、本地
排行。

---

#### **B2. 試煉關卡（Trial Mode）** 🌟🌟
主線 L28 通關後解鎖一組「試煉」：

- 6-10 關獨立設計
- 每關一個硬限制（固定塔、固定英雄、固定順序）
- 通過給獨特獎勵（英雄皮膚、塔 skin、meta star）

**影響**：post-game 延長壽命。

**實作成本**：中高 — 10 張新 JSON + 一個 Trial mode entry UI。

---

### Tier C — Meta Progression 深度

#### **C1. 英雄 Talent Tree** 🌟🌟
每英雄一棵獨立 talent tree，花「英雄星」（英雄通關累積）投資：

```
基蘭主幹：
├─ 被動 +10% HP  (5 級)
├─ Rally 範圍 +20%（3 級）
├─ 近戰傷害 +25%（3 級）
└─ 最終節點「王者光環」：永久 aura 加成 2x
```

**影響**：英雄深度 + 新遊戲+ 的動機。

**實作成本**：中 — TalentDef schema、存檔加 heroTalents、Settings/Hero 頁 UI。

---

#### **C2. Codex 擴充** 🌟
塔百科和敵人百科加：

- 每塔 1-2 段 lore（程序員視角寫世界觀）
- 每敵人背景段 + 克制小貼士
- 每英雄背景劇情（擴充既有）
- 通關統計：本塔累積擊殺、最愛 build

**影響**：世界觀沉浸，低工程高體驗。

**實作成本**：低 — 純文案 + UI 排版。

---

### Tier D — 體驗潤色

#### **D1. 互動式世界地圖** 🌟🌟
LevelSelect 目前是方格列表 → 改成手繪風世界地圖：

- 索倫王國大地圖一張圖
- 6 個 world 標記為不同區域（草原 → 工業城 → 首都 → 凍原 → 虛空裂口 → 深海）
- 已通關關卡點亮 + 軍旗；未解鎖為霧
- 點擊彈 flavor popup（名稱、敘事摘要、已得星數）

**影響**：成就感重大提升，「我通關了整個王國」的感覺。

**實作成本**：中高 — 一張 canvas-rendered world map 設計 + 互動 hit-test。

---

#### **D2. 無障礙 / Accessibility** 🌟
- **色盲模式**：切換色板（目前大量依賴紅/綠區分）
- **字級 +20%**：所有 UI 文字可放大
- **低動畫模式**：關閉粒子、天氣、螢幕震動

**影響**：玩家族群擴大，符合 Indie polish tier。

**實作成本**：中 — 設定頁加 3 個開關、所有 r.drawText 走主題色板。

---

#### **D3. 開場/結局 Cinematic** 🌟
- 主選單第一次啟動：10 秒 silhouette 開場（敵人集結、玩家旗幟升起）
- L28 通關後：結局 scroll（30 秒慢鏡，3 位英雄走過田野）
- 可跳過 + 不強制重看

**影響**：儀式感，讓整個遊戲感覺「有頭有尾」。

**實作成本**：中 — 純 Canvas 2D 程序化動畫，不需 asset。

---

### Tier E — 單機 UGC（長遠野心）

#### **E1. 關卡編輯器（本地）** 🌟🌟
玩家可在 Settings 打開編輯器建自己的關卡：

- Grid 可視化編輯 path、obstacle、waves
- 存本地（localStorage key `td-user-levels`）
- Play 後會記錄自己的最佳紀錄
- **完全離線**，無分享、無上傳、無雲端

**影響**：Power user 可以自己造內容，遊戲壽命近乎無限。

**實作成本**：高 — UI 重工，但 schema 已支援（JSON 就是關卡資料）。

---

## 4. 推進順序建議

| 季度 | 里程碑 | Why now |
|---|---|---|
| ✅ **v2.3.0** | A1 Challenge stars | 立刻 28 → 84 挑戰，壽命最直接 |
| ✅ **v2.3.1** | A2 Tower branching | 同時擴展核心策略深度 |
| **v2.4** | B1 Daily Challenge | 有每日回流動機 |
| **v2.4** | C2 Codex 擴充 | 低工程高體驗，夾在 A2 後做 |
| **v2.5** | C1 Hero talents | 英雄系統深度 + new game+ 感 |
| **v2.5** | D2 無障礙 | 必須做，技術上不難 |
| **v2.6** | B2 Trial mode | post-game 延長壽命 |
| **v2.6** | D3 Cinematic | 結尾儀式感 |
| **v2.7** | D1 世界地圖 | 大美術工程壓軸 |
| **v3.0** | E1 關卡編輯器 | 野心大工程，需確定前面穩了 |

### 為什麼這個順序

1. **先擴大現有內容的深度**（A1 A2）再開新模式（B1 B2）。28 關的池子還沒榨乾前，先讓每關有 3 種玩法。
2. **Daily Challenge 放 v2.4** 是因為它依賴 modifier 系統，這個系統做好後 Trial mode（B2）可以共用。
3. **世界地圖（D1）** 美術工程量最大，留到後期技術全穩後做。
4. **編輯器（E1）** 是 stretch goal，v3.0 才考慮，前置是 JSON schema 完全穩定。

---

## 5. 什麼我們**不做**

明確刪除，避免未來誘惑：

- ❌ **線上功能**（排行、好友、雲端存檔、PvP、Co-op）
- ❌ **Gacha / Loot box / IAP**
- ❌ **廣告植入**
- ❌ **需要連線才能玩的任何內容**
- ❌ **動態載入內容**（everything shipped in bundle）
- ❌ **多語系**（之前明確排除）
- ❌ **教學關卡**（用內嵌 tooltip 提示即可）

這些不是「做不到」而是「刻意不做」，因為違背純單機 polished indie 的定位。

---

## 6. 成功指標（自評用）

每完成一個 milestone 問自己：
1. 完成後玩家能做**新的事**嗎？（A1/A2/B1 一定要能）
2. 玩家會**回來玩**嗎？（Daily、Trial 的核心）
3. 新玩家第一次玩會**被卡住**嗎？（教學缺 → tooltip 補）
4. 在老舊 iPhone（比如 SE 第二代）上順嗎？（永遠驗）
5. 離線能玩嗎？（每次 build 後都要驗）

---

## 7. 與 DEV_NOTES 的關係

- **DEV_NOTES**：記**已經踩過的坑 + 驗證過的解法**（past tense）
- **這份 ROADMAP**：記**還沒做的里程碑 + 設計意圖**（future tense）
- 完成一個 milestone → ROADMAP 裡的項目勾掉 → 過程中學到的坑去 DEV_NOTES 加 entry
- 兩份文件一起閱讀，給新 session 的 Claude 最完整的專案狀態

---

*Last updated: 2026-04-24 · v2.2.4*
