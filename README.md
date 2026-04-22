# 索倫的最後防線 · Solenne TD

> 當鐵潮湧來，只剩一道防線。

一場 **23 關** 的塔防戰役，由 Claude Code agent 規劃、實作、編劇、平衡。
瀏覽器中即可遊玩；可離線（PWA）；支援 1×/2×/3× 速度切換、3 難度、15 成就。

---

## 🎮 特色

- **23 關完整戰役** · 5 個世界（邊境 → 工業 → 首都 → 凍原 → 虛空）
- **9 座塔** · 加農 / 速射 / 機槍 / 冰霜 / 狙擊 / 飛彈 / 重砲 / 特斯拉鏈狀 / 聖光
- **17 種敵人** · 步兵 / 坦克 / 戰機 / 飛彈抗性 Boss / 分裂者 / 治療者 / 幽影 / 冰獸 …
- **3 難度**（Normal / Hard / Heroic）各自獨立星等記錄
- **18 項成就** · 首通、滿星、累積擊殺、跨難度等
- **3 速度切換**（1× / 2× / 3×）適應節奏
- **下一波預覽 HUD** · 波次前看見敵人陣容
- **程序化 BGM** — 6 條不同場景的無盡循環（選單 / 5 世界 / 勝利）
- **程序化音效** — 純 WebAudio 合成，無需音訊檔案
- **完整劇情** · 每關含 intro / outro 對話，貫穿基蘭、瓦西亞、皮普、第一個人的角色弧
- **離線 PWA** · 安裝到桌面/主畫面後離線遊玩
- **震屏、擊中閃白、數字飄浮、鏈狀閃電** 等戰鬥視覺回饋
- **設定選單** · 3 頻道音量、靜音、震屏、FPS、難度、進度重置
- **塔百科/敵人百科/成就列表** 三標籤頁

---

## 🚀 快速開始

```bash
npm install
npm run dev          # 開發伺服器 http://localhost:5173
npm run build        # 生產版本輸出到 dist/
npm run preview      # 預覽生產版本
```

Bundle 體積：`~81KB JS (gzip 25KB)` + 5MB 素材（Kenney CC0 + procedural audio）。

### 📱 手機原生打包（iOS / Android）

已內建 Capacitor 8 設定，可產出真正的 iOS/Android App：

```bash
# iOS（需 macOS + Xcode）
npm run ios:open      # 自動 build + sync + 開啟 Xcode
# 在 Xcode 內選擇模擬器或實機 → Run

# Android（需 Android Studio + JDK 17）
npm run android:open  # 自動 build + sync + 開啟 Android Studio
# 在 Android Studio 內選擇裝置 → Run

# 僅同步（不開 IDE）
npm run sync
```

App ID: `com.solenne.td`  ·  Capacitor 版本：8.3.1

### 🌐 部署到網路

已含 GitHub Actions workflow（`.github/workflows/deploy.yml`）：
push 到 `main` 會自動 build 並部署到 GitHub Pages。

---

## 📦 技術棧

| 層級 | 技術 |
|---|---|
| 渲染 | HTML5 Canvas 2D，自製 Renderer / Scene 系統 |
| 語言 | TypeScript 6 |
| 建置 | Vite 8 + vite-plugin-pwa |
| 音訊 | WebAudio API — 三頻道 BGM/SFX 程序化合成 |
| 存檔 | `localStorage`（version 2 schema + migration） |
| 美術 | [Kenney.nl](https://www.kenney.nl/assets/tower-defense-top-down) CC0 Tower Defense Kit |
| 遊戲迴圈 | 固定 1/60 步進 + 1×/2×/3× 倍率 + render 插值 |

架構：
```
src/
├── engine/         Renderer · GameLoop · InputHandler · AssetLoader · AudioManager
├── game/           Enemy · Tower · Projectile · WaveManager · GameState · Path · Achievements
├── data/           enemies.ts · towers.ts（資料驅動）
├── scenes/         MainMenu · LevelSelect · GameScene · Settings · Codex · Credits
├── ui/             Scene 基礎類別 · DialogueBox · SceneManager
├── storage/        SaveData（v2 schema + migration）
└── assets.ts       資產清單
public/
├── levels/         23 個關卡 JSON（資料驅動）
└── assets/kenney/  606 張塔防素材
```

---

## 🎨 美術擴充（選配）

本專案目前使用 Kenney CC0 素材。如需進一步美術質感，可用 AI 生成角色立繪、世界封面、Boss 專屬 sprites —
Prompt 包已整理於 [ART_PROMPTS.md](ART_PROMPTS.md)，支援 Midjourney / Stable Diffusion / DALL·E 3。

系統已預留整合點：
- `DialogueLineData.portrait` — 對話框可顯示角色立繪
- `public/assets/portraits/<name>.png` — 放置位置
- 不存在檔案時靜默略過，保持遊戲可玩

---

## 📜 戰役故事梗概

鐵潮從東方湧來。索倫王國只剩一道防線。
但鐵潮不只是來打仗——他們搶工廠、搶燃料、搶一種只有幾克就能驅動整架飛機的礦石。
當基蘭指揮官、瓦西亞中士、皮普工程師一路追查，
他們發現背叛來自索倫內部，而鐵潮的真正源頭，不在這個世界。

**戰役弧線**：
1. 世界 1 · 邊境 — 正面守禦，建立信心
2. 世界 2 · 工業心臟 — 礦石之謎浮現
3. 世界 3 · 首都保衛 — 揭露總理背叛
4. 世界 4 · 凍原 — 追擊到北境，發現古代遺跡
5. 世界 5 · 虛空要塞 — 皮普身世揭露、對決「第一個人」

---

## 🏆 成就系統（18 項）

- 🎖 初陣、🛡 邊境守衛、⚙ 工業殘響、👑 鐵潮終結、❄ 凍原征服者、✦ 虛空終結
- ⭐ 零失誤、🌟 完美邊境、🏆 索倫戰神（全 69 星）、📜 索倫史詩（全 23 關）
- ⚔ 百夫斬、🗡 千人斷橋、🏗 建設大師、💰 金幣滿盈、🎯 百戰老兵、🗺 半壁江山
- 🔥 鐵血入門（Hard）、👹 鐵血英雄（Heroic）

---

## 🧪 平衡調校記錄

- v1 → v2 調整：L08/09/10/12 起始金增加 15-30、L10 波 3 尾移除額外 armoredBoss。
- 3 難度修正器：`Normal 1×` / `Hard ×1.35 HP, ×1.15 速, 0.9× 金` / `Heroic ×1.7 HP, ×1.3 速, 0.75× 金`。
- 星等規則：剩餘生命 ≥100% → ★★★, ≥50% → ★★, >0 → ★。

---

## 🤖 關於本專案

索倫 TD 是探索 **Claude Code agent** 能力的作品：
- 設計、程式、劇本、平衡、美術整合策略，皆由 agent 規劃並執行
- TypeScript + Canvas 純手刻引擎，無遊戲框架依賴
- 程式碼量約 2,500 行，資料驅動關卡設計
- 從 0 到 v2.0.0 共 10+ 小時 agent 工作

版權：程式碼 MIT。美術 Kenney CC0。劇本／角色原創。

---

## 🗓 版本歷程

- **v2.0.0** · +10 關（凍原/虛空）· +4 敵 · +2 塔（特斯拉鏈/聖光）· +2 BGM · +3 成就 · 平衡調校 · AI 美術 prompt pack
- **v1.0.0** · 初版 13 關 · 7 塔 · 10 敵 · 3 世界 · 程序化 BGM · 15 成就 · 3 難度 · PWA
- 未完成：Endless 模式（v2.1 規劃）· AI 美術實際整合（v2.1/2.2）· 手機原生打包（v2.2+）

---

## 🙏 致謝

- Kenney.nl — CC0 Tower Defense Kit
- Anthropic — Claude Code 環境
- 你 — 讀完這份 README 並願意試玩

> 索倫銘記那些留下來守門的人。
