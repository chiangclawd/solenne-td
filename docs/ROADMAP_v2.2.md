# Solenne TD · v2.2 Roadmap

> Status: PLAN
> Target: Campaign-extension + replayability
> Prior release: v2.1.0 shipped hero system, armor counters, scroll fixes,
> destructible terrain, W5 story polish.

---

## 🎯 North-star theme: **World 6 + New Ways to Play**

v2.1 closed the core combat loop (armor × counter × hero) and finished the
23-level campaign. v2.2 should extend the content budget (new world +
mechanics) and give players reasons to replay.

---

## 🧭 Milestones in priority order

### Milestone A — Multi-path levels (tent-pole feature)

**Design goal:** Single-path levels have been drained of novelty. Two parallel
paths force the player to split defenses OR choose a side to reinforce.

**Scope:**
- `LevelData.path` → `LevelData.paths: TileCoord[][]` (breaking change; keep
  single-path rendering as `paths.length === 1` case for v2.1 levels)
- `WaveEntryData.path?: number` — which path this enemy spawns on (default 0)
- Renderer: draw each path with subtle hue variation (warm + cool)
- Path tiles Set expands to union of all paths
- Enemy constructor takes a `Path` instance rather than the level's single
  path; already mostly the case
- Content: add 3–5 new levels using multi-path (or retrofit a few existing
  late-game levels)

**Risks:** Level editor / JSON schema migration. All 23 existing levels need
`paths: [path]` conversion.

**Effort:** 3–4 days.

---

### Milestone B — World 6: "海底裂縫" (Seabed Fissure) — 5 new levels (L24–L28)

**Theme:** Post-L23, the void fortress collapses into the southern sea. An
underwater aftermath level-set where the remaining iron-tide fragments reform
as abyssal monsters.

**New enemies (3):**
- 🦑 **Tentacle** — slow armored path-swarmer with a 360° melee aura
  (damages nearby towers, not just hero)
- 🐠 **Swimmer shoal** — tiny fast units that spawn in groups of 5,
  staggered; test AOE towers
- 🐙 **Abyssal boss** — splits into 3 Tentacles on death (splitter-variant)

**New tower:** 🌊 **深海魚雷塔 (Torpedo Tower)** — slow fire, heavy AOE,
chains through water tiles for bonus dmg. Unlocked after L24.

**New obstacle kind:** `water` — acts like path for enemies (traversable) but
blocks tower placement (like obstacles). Enables "islands" of placement
sandwiched between water lanes.

**Effort:** 1–2 days design + 2 days level authoring.

---

### Milestone C — Daily Challenge mode

**Design:** One new randomly-generated level per day with a fixed seed. Same
level worldwide that day. Leaderboard by stars + speed.

**Scope:**
- `generateDailyLevel(date)` → deterministic PRNG from YYYY-MM-DD
- Scene: `DailyChallengeScene` between menu and game
- Score submission: local only for v2.2 (no backend); show "personal best"
- New achievement: `daily_streak_7` (7 daily victories in a row)

**Effort:** 2 days.

---

### Milestone D — Boss rework: multi-phase

**Problem:** Current boss fights are HP sponges. No phase transitions, no
unique mechanics mid-fight.

**Redesign for the 5 story bosses (L3, L8, L13, L18, L23):**

| Boss | Phase 1 | Phase 2 (at 50% HP) |
|---|---|---|
| L3 鐵潮先鋒 | Walk path | Speeds up ×1.5, summons 4 scouts |
| L8 裝甲指揮官 | Walk path | Enables a shield that absorbs 1 hit / 2s |
| L13 鐵潮首腦 | Walk path | Teleports 2 tiles forward every 5s |
| L18 冰原領主 | Walk path | Freezes 2 towers for 4s every 8s |
| L23 第一個人 | Walk path | Splits reality — spawns ethereal copies that do 50% dmg if they leak |

**Effort:** 2–3 days.

---

### Milestone E — Replay incentives

- **Star reward escalator**: completing a level on hard/heroic awards extra
  stars (2 / 3 bonus) to fuel meta upgrades
- **Weekly rotating "modifier"**: one random passive modifier for all levels
  that week (e.g., "double enemy speed, double gold", "no hero allowed",
  "tower cost -30%"). Completion of 5 levels under modifier gives a cosmetic
  badge
- **Codex completion tracking**: explicit "all 9 towers placed", "all 17
  enemies killed", etc. achievements

**Effort:** 1–2 days combined.

---

### Milestone F — Accessibility pass

- Colorblind palette toggle (settings)
- Larger font mode
- Reduce-flash toggle (currently particle-heavy)
- Audio captions (visual indicator when boss stinger fires, etc.)

**Effort:** 1 day.

---

## 🧱 Quality / debt items (fold into any milestone)

- Extract HeroSelectScene + UpgradeScene + CodexScene common "scrollable
  scene" pattern into a BaseScrollableScene base class (drag / inertia /
  viewport culling is copy-pasted across three scenes right now)
- Consolidate `ObstaclePainter` + `SpritePainter` shared helpers
- Level JSON schema validation at load time (catch typos early)
- A11y: keyboard navigation through menu items (currently pointer-only)

---

## 📐 v2.2 version bump plan

- Keep save-schema backward-compatible (version: 2 still)
- Add optional `dailyHistory?: Record<date, { stars, kills, waves }>` to save
- Hero lineup unchanged — focus on content, not new systems

---

## 🎯 Out of scope for v2.2

- **Multiplayer** — too big; save for v3.0
- **Custom level editor** — player-facing UI is substantial design work
- **New hero** — three is enough for now; adding a fourth requires revisiting
  the unlock pacing
- **3D / WebGL rewrite** — current 2D canvas scales fine

---

## 🗂 Commit strategy for v2.2 development

1. Branch `feat/multi-path` for Milestone A (breaking schema change)
2. Once merged, trunk-based for B–F
3. Each milestone gets its own deploy + retro note
