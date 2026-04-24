# v2.3 Design Spec · Challenge Stars + Tower Branching

> Two milestones, one version. Both extend **existing** systems (stars, tower
> upgrade) into something much deeper. Schema changes are additive, save
> data is migrate-safe, no engine rewrites.

---

## A1 · Challenge Stars (重構 3 星系統)

### 動機

目前三星純看 `livesRatio`:
```ts
const stars = ratio >= 1 ? 3 : ratio >= 0.5 ? 2 : 1;
```
問題：**28 關一通關就 3 星定江山**，沒有重玩動機。

### 新設計：3 顆星 = 3 個獨立挑戰

- ⭐ **Star 1**：通關（任意條件） — 所有關卡通用
- ⭐ **Star 2**：**限制型**挑戰（level-specific）
- ⭐ **Star 3**：**完美型**挑戰（level-specific）

玩家想滿星必須打**三次不同 build**。28 關 → 84 次有意義的 run。

### Schema

新增在 `LevelData`（`src/game/Level.ts`）：

```ts
export type ChallengeSpec =
  | { kind: 'noLivesLost' }                    // 零失血
  | { kind: 'heroSurvives' }                   // 英雄整場不死
  | { kind: 'noHero' }                         // 不派遣英雄
  | { kind: 'heroRequired'; id: HeroId }       // 指定英雄通關
  | { kind: 'towerForbidden'; id: string }     // 禁用某塔
  | { kind: 'maxTowers'; n: number }           // 全場最多 N 座塔
  | { kind: 'noSell' }                         // 不賣塔
  | { kind: 'noUpgrade' }                      // 不升級塔
  | { kind: 'destroyAllDestr' }                // 破壞所有可破壞物
  | { kind: 'timeLimit'; seconds: number };    // 時限通關

export interface LevelChallenges {
  star2: ChallengeSpec;
  star3: ChallengeSpec;
}

// Add to LevelData
challenges?: LevelChallenges;
```

**Optional** so舊關卡 JSON 無需改動就能 build；若 undefined 則 fallback 到舊的
livesRatio 判定（過渡期）。

### SaveData 變更

舊：`bestStars: number`（1..3）
新：並存，新增 per-level star flags：

```ts
interface LevelProgress {
  bestStars: number;                                     // 保留：max stars in any run
  completed: boolean;
  bestStarsByDifficulty?: Partial<Record<Difficulty, number>>;
  challengeFlags?: [boolean, boolean, boolean];          // NEW: which of the 3 stars earned (all-time)
  challengeFlagsByDifficulty?: Partial<Record<Difficulty, [boolean, boolean, boolean]>>; // per-diff tracking
}
```

Migration 規則（在 `SaveData.ts` 的 `migrate()`）：
- 若 entry 已有 `completed: true` 但無 `challengeFlags`：補 `[true, false, false]`
  （至少拿到 star 1），使用者可重玩爭取 star 2/3。
- 若 `bestStars >= 3`：保留，但不回寫 `challengeFlags`（我們不知道是「完美通關」還是「舊制滿血」，讓玩家重玩確認）。實際做法：若 bestStars=3 且 old livesRatio 邏輯給的，直接 `[true, true, true]` 先 migrate，UI 再用 bestStars 當 fallback 顯示。

**底線**：舊存檔玩家進遊戲，看到的 star count 不會變少；但 challenge 描述出現後，他們會看到「尚未達成 Star 2」之類的重玩動機。

### Runtime 追蹤

GameScene 新增 `ChallengeTracker`（或直接 member fields）：

```ts
interface ChallengeState {
  livesLostThisRun: boolean;
  heroDiedThisRun: boolean;
  anyTowerSold: boolean;
  anyTowerUpgraded: boolean;
  towerBuildsById: Record<string, number>;    // 'cannon': 3
  startMs: number;                             // Date.now() at wave 1 start
  destructiblesBroken: number;
  destructiblesTotal: number;                  // set from level obstacles
}
```

觸發點：
- `state.lives` 下降 → `livesLostThisRun = true`
- Hero 第一次死亡 → `heroDiedThisRun = true`
- 賣塔 → `anyTowerSold = true`
- 升級塔 → `anyTowerUpgraded = true`
- 蓋塔 → `towerBuildsById[id]++`
- Destructible 被破壞 → `destructiblesBroken++`

### 挑戰評估

在 `triggerWin()` 計算 3 顆星：

```ts
function evaluate(spec: ChallengeSpec, state: ChallengeState, scene: GameScene): boolean {
  switch (spec.kind) {
    case 'noLivesLost':     return !state.livesLostThisRun;
    case 'heroSurvives':    return scene.heroDef !== null && !state.heroDiedThisRun;
    case 'noHero':          return scene.heroDef === null;
    case 'heroRequired':    return scene.heroDef?.id === spec.id;
    case 'towerForbidden':  return (state.towerBuildsById[spec.id] ?? 0) === 0;
    case 'maxTowers':       return Object.values(state.towerBuildsById).reduce((a,b)=>a+b,0) <= spec.n;
    case 'noSell':          return !state.anyTowerSold;
    case 'noUpgrade':       return !state.anyTowerUpgraded;
    case 'destroyAllDestr': return state.destructiblesTotal > 0 && state.destructiblesBroken === state.destructiblesTotal;
    case 'timeLimit':       return (Date.now() - state.startMs) / 1000 <= spec.seconds;
  }
}

const star1 = true; // 通關即得
const star2 = level.challenges ? evaluate(level.challenges.star2, state, this) : (state.lives === startingLives);
const star3 = level.challenges ? evaluate(level.challenges.star3, state, this) : false;
const starCount = [star1, star2, star3].filter(Boolean).length;
```

### 描述字串

`src/game/Challenges.ts`（新檔）輸出 localized description：

```ts
export function describeChallenge(spec: ChallengeSpec): string {
  switch (spec.kind) {
    case 'noLivesLost':     return '零失血通關';
    case 'heroSurvives':    return '英雄整場不死亡';
    case 'noHero':          return '不派遣英雄';
    case 'heroRequired':    return `只用 ${HERO_NAMES[spec.id]} 通關`;
    case 'towerForbidden':  return `不建造「${TOWER_NAMES[spec.id]}」`;
    case 'maxTowers':       return `全場最多 ${spec.n} 座塔`;
    case 'noSell':          return '不賣掉任何塔';
    case 'noUpgrade':       return '不升級任何塔';
    case 'destroyAllDestr': return '破壞所有可破壞物';
    case 'timeLimit':       return `${spec.seconds} 秒內通關`;
  }
}
```

### UI 變更

- **End Overlay**：3 顆星下方顯示各自的 challenge text + 達成勾勾
  ```
  ⭐ 通關                      ✓
  ⭐ 不派遣英雄                 ✗
  ⭐ 零失血通關                 ✓
  ```
- **LevelSelect 卡片**：顯示 `2/3 ★` 時卡片底部出現「★ 還差：零失血通關」
  提示玩家哪星沒拿，增加重玩動機。
- **Challenge 圖示**：用 `drawSkillIconScreen` 的風格做 10 種小 icon
  （禁用、限塔數、時限等各自一個）。

---

### 28 關挑戰表

> 規則：star 2 = 限制型（「不能做 X」），star 3 = 完美型（「完全不失 X」）。
> 避免互斥（例如「不用英雄」+「英雄不死」）。

| ID | 名稱 | Star 2 | Star 3 |
|---|---|---|---|
| L1 | 草原哨站 | `towerForbidden: cannon` | `noLivesLost` |
| L2 | 沙漠穿越 | `noHero` | `destroyAllDestr` |
| L3 | 最後的閘門 | `maxTowers: 8` | `heroSurvives` |
| L4 | 邊境林地 | `towerForbidden: sniper` | `destroyAllDestr` |
| L5 | 灰岩山道 | `noUpgrade` | `noLivesLost` |
| L6 | 鍛鐵城郊 | `towerForbidden: missileLauncher` | `noLivesLost` |
| L7 | 鐵軌之夜 | `maxTowers: 10` | `destroyAllDestr` |
| L8 | 南境煉油廠 | `noSell` | `destroyAllDestr` |
| L9 | 港灣運河 | `noHero` | `destroyAllDestr` |
| L10 | 索陽石礦坑 | `noUpgrade` | `noLivesLost` |
| L11 | 石燈大街 | `towerForbidden: heavyCannon` | `noLivesLost` |
| L12 | 王宮階梯 | `maxTowers: 12` | `heroSurvives` |
| L13 | 王座之廳 | `towerForbidden: sniper` | `noLivesLost` |
| L14 | 凍原邊緣 | `towerForbidden: frostTower` | `noLivesLost` |
| L15 | 冰裂谷地 | `noHero` | `destroyAllDestr` |
| L16 | 冰封哨塔 | `maxTowers: 10` | `noLivesLost` |
| L17 | 極光裂口 | `noUpgrade` | `heroSurvives` |
| L18 | 冰原核心 | `heroRequired: kieran` | `noLivesLost` |
| L19 | 虛空門前 | `towerForbidden: sniper` | `noLivesLost` |
| L20 | 幽影迴廊 | `towerForbidden: missileLauncher` | `destroyAllDestr` |
| L21 | 治療者庭院 | `towerForbidden: cannon` | `noLivesLost` |
| L22 | 分裂祭壇 | `maxTowers: 12` | `noLivesLost` |
| L23 | 第一個人 | `noHero` | `noLivesLost` |
| L24 | 海岸裂縫 | `towerForbidden: torpedoTower` | `noLivesLost` |
| L25 | 珊瑚迷宮 | `noUpgrade` | `destroyAllDestr` |
| L26 | 深海漩渦 | `maxTowers: 14` | `noLivesLost` |
| L27 | 泰坦之脊 | `noHero` | `destroyAllDestr` |
| L28 | 第一片海 | `towerForbidden: sniper` | `noLivesLost` |

**設計意圖**：
- 每個世界 Star 2 分佈大致：1 個 towerForbidden、1 個 noHero/noUpgrade、1 個 maxTowers — 保證變化。
- 最終關（L13, L18, L23, L28）Star 3 都是 `noLivesLost`，因為這些是 campaign 高潮，零失血通關要付出大量策略。
- `heroRequired: kieran` 只出現在 L18 一關（紀念基蘭獨立主題）；不泛用。

### 成就系統擴充

新增幾個跨 challenge 成就：

```ts
{
  id: 'perfectionist', title: '完美主義',
  description: '10 關達成 Star 3（完美型挑戰）。',
  check: (s) => Object.values(s.levelProgress).filter(p => p.challengeFlags?.[2]).length >= 10,
},
{
  id: 'tower_master', title: '多面手',
  description: '所有 towerForbidden 挑戰全達成。',
  check: (s) => /* iterate levels with towerForbidden spec, check all done */,
},
{
  id: 'solo_commander', title: '獨行指揮官',
  description: '5 關用 noHero 挑戰通關。',
  check: (s) => /* count levels where noHero challenge (star 2 or 3) was earned */,
},
```

### 實作 Checklist（A1）

- [ ] `src/game/Challenges.ts`：ChallengeSpec type + describeChallenge + evaluate
- [ ] `src/game/Level.ts`：加 `challenges?: LevelChallenges`
- [ ] `src/game/LevelLoader.ts`：validate challenges schema
- [ ] `src/storage/SaveData.ts`：LevelProgress 加 challengeFlags，migrate 補舊存檔
- [ ] `src/scenes/GameScene.ts`：
  - [ ] member `challengeState: ChallengeState`
  - [ ] hook 蓋塔 / 升級 / 賣塔 / 失血 / 英雄死 / 破壞物
  - [ ] `triggerWin` 用 challenges 評估星星
- [ ] `src/scenes/GameScene.ts` renderEndOverlay：顯示 3 個 challenge 條
- [ ] `src/scenes/LevelSelectScene.ts`：卡片顯示尚未達成的 challenge 描述
- [ ] `src/game/Achievements.ts`：加 3 個新成就
- [ ] `scripts/add-challenges.mjs`（新）：一次把 28 關的 challenges 寫入 JSON
- [ ] DEV_NOTES 記錄踩過的坑

---

## A2 · Tower Branching (塔升級分叉)

### 動機

目前每塔 3 levels 線性升級，同一塔只有一種 build。`sniper` Lv3 無論誰都長一樣。

BTD6、Kingdom Rush 等標竿都有升級分支，**同一塔兩條 build 是完全不同的玩法**。

### 新設計：Lv1 → Lv2 → **選邊** → Lv3A/B → Lv4A/B → Lv5A/B

- Lv1 Lv2 共用
- Lv3 分叉 A/B（不可回頭，要換邊只能賣重蓋）
- Lv4 Lv5 在選定的分支上繼續升

**總狀態數**：每塔 5 tiers，但因分叉總共 1+1+2+2+2 = 8 種 build 狀態。

### 分支識別（per tower）

每塔兩條分支有鮮明 strategic identity：

| 塔 | Branch A | Branch B |
|---|---|---|
| **cannon** | 破片榴彈（AOE splash） | 穿甲彈（armorPierce single） |
| **quickShot** | 連射（fireRate 爆發） | 雙管（multi-projectile per shot） |
| **machineGun** | 雷射（持續光束，鎖定） | 散彈（錐形擴散多目標） |
| **frostTower** | 冰霜領域（AOE slow aura） | 冰錐（強單體 + 凍結） |
| **sniper** | 雙狙（2 shots per trigger） | 火力集中（延遲儲能大傷害） |
| **missileLauncher** | 集束彈（4 彈發射） | 重磅彈（單發超大 AOE） |
| **heavyCannon** | 破壞王（超大 splash） | 攻城槌（穿甲單體） |
| **torpedoTower** | 水雷陣（多水雷 AOE） | 魚雷齊發（線性貫穿） |

### 數值設計原則

分支平衡的三條鐵律：

1. **A 偏廣（AOE / 多目標 / DoT）**：對抗雜兵潮、AOE 清場
2. **B 偏狹（單體 / 穿甲 / 精確）**：對抗 boss / 重甲單體
3. **成本對稱**：A 和 B 同 tier 成本一樣，避免「金幣效率有 meta build」

舉例 cannon 數值細節（給其他塔作模板）：

```ts
cannon: {
  id: 'cannon', name: '加農砲',
  baseLevels: [
    { cost: 50,  damage: 18, range: 2.5, fireRate: 2.0 },            // Lv1
    { cost: 70,  damage: 28, range: 2.7, fireRate: 2.1 },            // Lv2
  ],
  branches: {
    A: {
      name: '破片榴彈', color: '#ff9f43',
      description: 'AOE 範圍傷害 - 對付雜兵潮',
      levels: [
        { cost: 90,  damage: 35, range: 2.7, fireRate: 1.8, splashRadius: 0.7 },    // Lv3A
        { cost: 130, damage: 48, range: 2.9, fireRate: 1.7, splashRadius: 0.9 },    // Lv4A
        { cost: 180, damage: 68, range: 3.1, fireRate: 1.6, splashRadius: 1.2 },    // Lv5A
      ],
    },
    B: {
      name: '穿甲彈', color: '#5eb8ff',
      description: '無視護甲 - 對付重裝單體',
      levels: [
        { cost: 90,  damage: 42, range: 2.7, fireRate: 2.0, armorPierce: true },    // Lv3B
        { cost: 130, damage: 64, range: 2.8, fireRate: 2.2, armorPierce: true, counterBonus: 1.6 },  // Lv4B counter armored ×1.6
        { cost: 180, damage: 95, range: 3.0, fireRate: 2.4, armorPierce: true, counterBonus: 1.8 },  // Lv5B
      ],
    },
  },
  counters: ['armored'],
},
```

### Schema 變更

`src/data/towers.ts` 的 `TowerConfig`：

```ts
export interface TowerLevel {
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  splashRadius?: number;
  slowDuration?: number;
  slowFactor?: number;
  armorPierce?: boolean;
  counterBonus?: number;              // multiplier on base counters (default 1.4)
  chainCount?: number;
  chainRange?: number;
  multiShot?: number;                 // number of projectiles per trigger
  beamPierce?: number;                // number of enemies beam passes through
}

export interface TowerBranch {
  id: 'A' | 'B';
  name: string;
  description: string;
  color: string;                      // accent for UI tinting
  levels: TowerLevel[];               // Lv3, Lv4, Lv5 (3 entries)
}

export interface TowerConfig {
  id: string;
  name: string;
  description: string;
  baseLevels: [TowerLevel, TowerLevel];   // Lv1, Lv2 only
  branches: { A: TowerBranch; B: TowerBranch };
  counters?: readonly ArmorType[];
  sprite: string;
}
```

### 執行期塔 state

`src/game/Tower.ts` 的 Tower class 新增：

```ts
class Tower {
  // ... existing
  level: number;                // 0-based: 0=Lv1, 1=Lv2, 2=Lv3(branch), 3=Lv4(branch), 4=Lv5(branch)
  branch: 'A' | 'B' | null;     // null for Lv1/Lv2, set when upgrading to Lv3

  currentLevel(): TowerLevel {
    if (this.level <= 1) return this.config.baseLevels[this.level];
    if (this.branch === null) throw new Error('Lv3+ requires branch selection');
    return this.config.branches[this.branch].levels[this.level - 2];
  }

  canUpgrade(): boolean {
    if (this.level >= 4) return false;
    if (this.level === 1) return true;  // Lv2→Lv3 (needs branch choice)
    return true;  // Lv3→Lv4 or Lv4→Lv5 (stays in branch)
  }

  upgradeOptions(): { branch?: 'A' | 'B'; next: TowerLevel; cost: number }[] {
    if (this.level === 1) {
      return [
        { branch: 'A', next: this.config.branches.A.levels[0], cost: this.config.branches.A.levels[0].cost },
        { branch: 'B', next: this.config.branches.B.levels[0], cost: this.config.branches.B.levels[0].cost },
      ];
    }
    if (this.level >= 2 && this.level < 4 && this.branch) {
      const nxt = this.config.branches[this.branch].levels[this.level - 1];
      return [{ next: nxt, cost: nxt.cost }];
    }
    return [];
  }
}
```

### UI 變更

`renderUpgradePanel` 目前單按鈕，新行為：

- **Lv1 → Lv2**：1 個升級按鈕（舊行為）
- **Lv2 → Lv3**：**2 個並列按鈕**，各顯示分支名稱 + 價格 + 短描述
  - 左：「🟠 破片榴彈  90g  AOE 範圍」
  - 右：「🔵 穿甲彈  90g  無視護甲」
- **Lv3 → Lv4, Lv4 → Lv5**：1 個升級按鈕（繼續本分支）

按鈕設計：寬度一半 panel，左右平分。

### 視覺變更（程序美術）

`TowerPainter` 為每個分支加 tinting：
- Branch A：主 color shift warm（例：cannon A 頂端用 `#ff9f43` 滾輪 barrel）
- Branch B：主 color shift cool（例：cannon B 頂端用 `#5eb8ff` 水晶尖端）
- Lv3 就開始有視覺差異；Lv5 最劇烈（外加光環 / 粒子）

### 投射物變更

新 `multiShot` 欄位：

```ts
// In Tower.fire():
const n = level.multiShot ?? 1;
for (let i = 0; i < n; i++) {
  const spread = (i - (n-1)/2) * 0.15;  // radians offset
  projectiles.push(new Projectile(from, target, { ...props, angleOffset: spread }));
}
```

新 `beamPierce` 用於 Lv5 雷射等：
- Projectile 新模式：不追蹤單體，沿直線打穿過 N 隻敵人

### Codex 變更

目前 CodexScene 每塔一頁。新行為：每塔一頁 + 底部顯示 2 條升級分支比較：

```
[塔 icon]
名稱：加農砲
基本屬性：...

升級路線：
┌──────────────────┬──────────────────┐
│ 🟠 破片榴彈      │ 🔵 穿甲彈        │
│ AOE range 0.7-1.2│ Pierce +60% dmg  │
│ Lv3: 90  Lv4:130 │ Lv3: 90  Lv4:130 │
│ Lv5: 180         │ Lv5: 180         │
└──────────────────┴──────────────────┘
```

### 存檔影響

**無**。塔不跨場存活，每關都從頭蓋。成就/統計不涉及特定 tier。

### 實作 Checklist（A2）

- [ ] `src/data/towers.ts`：改 schema，8 塔 × 2 分支 × 3 tier 數值
- [ ] `src/game/Tower.ts`：level + branch 狀態，currentLevel, upgradeOptions
- [ ] `src/game/Projectile.ts`：multiShot, beamPierce 機制
- [ ] `src/scenes/GameScene.ts`：upgradePanel 畫 2 個按鈕（Lv2→Lv3 分叉）
- [ ] `src/graphics/TowerPainter.ts`：分支 tinting + Lv5 特效
- [ ] `src/scenes/CodexScene.ts`：每塔頁面顯示兩條分支對比
- [ ] 平衡測試：每塔的 3 tier × 2 branch = 6 數值點，需 playtest
- [ ] DEV_NOTES 記錄踩過的坑

---

## 實作順序 & 開發分支策略

### 階段劃分

1. **v2.2.5 前置**：寫 `src/game/Challenges.ts` + type，不改 UI/runtime（schema only）
2. **v2.3.0 Phase 1**：A1 完整 — SaveData migrate + runtime tracking + UI + 28 關挑戰
3. **v2.3.1 Phase 2**：A2 完整 — schema 改寫 + runtime + UI + Codex

兩個 milestone 都很大，拆分確保每次 commit 都能 deploy 穩定版本。

### 分支命名

```
feat/a1-challenge-stars
feat/a2-tower-branching
```

每個完成 → 合回 main → bump patch → tag。

### Playtest 節點

- A1 完成後：驗證 28 關挑戰難度合理（`maxTowers` 數字 feasibility）
- A2 完成後：各塔兩分支的金幣效率 roughly 相等

---

## 風險 / 已知坑（Preemptive）

### A1 風險

- **互斥挑戰**：`noHero` + `heroSurvives` 互斥。**避免在同一關配這組**。
- **L1-L3 不能太狠**：新玩家要能輕鬆通關 Star 1；Star 2/3 可難，但不能卡死 first-time player。
- **maxTowers 如何顯示**：蓋到第 N 座後就拒絕蓋？還是允許蓋但破星？我選後者（給玩家 feedback 而非攔截）。
- **Migrate 時 bestStars=3 的舊存檔**：這些人不知道新 Star 2/3 內容，打開遊戲會看到「還差 2 顆星」感覺像倒退。解法：第一次進遊戲後 migrate 過的玩家，前 3 次 bestStars=3 的關卡直接 `challengeFlags = [true, true, true]`，信任舊分數。

### A2 風險

- **Lv2→Lv3 誤選**：玩家點錯分支怎麼辦？解法：**UI 確認**（點第一次是 preview，點第二次是確定），或 UI 分明兩個大按鈕避免誤觸。
- **視覺混淆**：Lv3A 和 Lv3B 如果長得像就沒意義。每分支至少要**顏色 + 一個形狀元素**不同。
- **平衡災難**：某 branch 比另一個明顯強 → 大家都選那個。這是純數值迭代問題，留給 playtest。
- **Save schema**：完全無影響（塔狀態不跨場）。最乾淨的 milestone 之一。

---

## 非目標（本版本不碰）

明確排除，避免 scope creep：

- ❌ **塔技能施法按鈕**（除了英雄技能外，塔不加主動技能）
- ❌ **塔之間的合成 / Fusion**（GemCraft 那套，留給 v3.x）
- ❌ **新塔種類**（本版本只擴展現有 8 塔）
- ❌ **新敵人**（敵人池穩定）
- ❌ **地圖新機制**（已足夠複雜）

---

## 目標行為（End-state vision）

完成 v2.3 後，一個玩家的遊戲 loop 應該是：

1. 看到 `LevelSelect` 關卡卡片底部「★★☆ 還差：10 座塔內通關」 → **重玩動機觸發**
2. 進入關卡，本次只能蓋 10 座 → **策略被迫精簡**
3. 升級某塔到 Lv2，決定該用 AOE 破片還是穿甲 → **build 分歧**
4. 通關後看到新 star 達成 + 成就 toast → **正回饋**
5. 想著「下次來拿零失血那顆」→ **回到 step 1**

這就是 Kingdom Rush 級別的 session-per-level 重玩深度。

---

*Last updated: 2026-04-24 · Next: implement A1 on feat/a1-challenge-stars*
