# 索倫 TD — AI 美術 Prompt Pack

本文件提供 **Midjourney / Stable Diffusion / DALL·E 3** 可直接貼用的 prompt，
讓使用者可批次生成遊戲內美術資產。所有 prompt 已調整為符合：
- 繁中塔防世界觀（索倫王國對抗鐵潮 / 虛空要塞）
- 遊戲既有色調：深藍夜 `#050810` + 金 `#ffd166` + 橘 `#ff9f43` + 青綠 `#6ee17a`
- 輸出規格：建議 1024×1024（角色）、1920×1080（世界封面）

---

## 📂 放置位置

產出圖片後，請放到 `public/assets/portraits/`、`public/assets/covers/`、`public/assets/bosses/`。
檔名需與下列對應（已預留整合路徑）：
- 角色肖像：`kieran.png` / `vasya.png` / `pip.png` / `first_one.png`
- 世界封面：`world1.png` ~ `world5.png`
- Boss 專屬：`boss_frontier.png` / `boss_industrial.png` / `final_boss.png` / `glacial_boss.png` / `void_boss.png`
- UI 裝飾（選）：`frame_gold.png`

---

## 🧑 角色肖像（對話框立繪）

**共通風格 suffix**（每個 prompt 結尾都貼上）：
```
, painterly digital art, deep navy background, cinematic lighting, subtle gold rim light, half-body portrait, square 1:1, game character concept, front-facing, neutral expression with tension
```

### 基蘭指揮官 Kieran
```
Asian male commander in his early 40s, short dark hair with gray streaks, strong jawline with a stubble, wearing a navy blue military trench coat with gold-trimmed epaulettes, an antique brass compass hanging around his neck, weary determined eyes, scar across his left eyebrow, ambient smoke behind
```

### 瓦西亞中士 Vasya
```
Asian female sergeant in her 30s, cropped auburn hair tied back, tactical vest with leather strap and ammunition pouches, holding a short-range rifle casually over her shoulder, orange glow reflecting off her cheek, confident smirk with tired eyes, scar on her jawline, rugged but agile build
```

### 皮普工程師 Pip
```
Androgynous young engineer in their 20s, round wire-rim glasses catching green glow, messy platinum-blond hair, soot smudge on one cheek, wearing a leather apron over a grease-stained shirt, brass and copper tools stuffed into chest straps, holding a glowing teal-green crystal in cupped hands, curious but guarded expression, hint of otherworldly aura
```

### 第一個人 First One (Final Boss)
```
Ancient hooded figure that resembles Pip but aged a hundred years older, pale translucent skin, hollow violet eyes, long silver-white hair flowing unnaturally, wearing a tattered black ceremonial robe with glowing purple-teal runes, cracked porcelain mask slipping from his face, void tendrils rising behind him, cold blue-purple rim light, ominous and melancholic
```

---

## 🗺 世界封面（關卡選擇頁可選大圖）

**共通風格 suffix**：
```
, 16:9 landscape matte painting, atmospheric perspective, environmental storytelling, game art concept, no characters, no text
```

### World 1 — 邊境戰役 Frontier
```
A fortified medieval watchtower on the edge of vast golden grasslands at dusk, distant torch flames marking defensive positions, broken cart abandoned on a dirt road, warm sunset in the sky with a single flock of birds, green hills rolling into pastoral farmland behind
```

### World 2 — 工業心臟 Industrial Heart
```
A massive 1920s-style steelworks factory complex at night with towering smokestacks belching orange flame into a smoke-filled sky, cooling canals reflecting red furnace glow, rusted train tracks in the foreground, oppressive industrial atmosphere with harsh contrast
```

### World 3 — 首都保衛 Capital Stand
```
An art-deco royal capital city at night under siege, grand marble palace on a hill with spotlights cutting through smoke, the city below in chaos with street-level fires, burnt banners of a fallen golden emblem hanging from balconies, melancholic defiance
```

### World 4 — 凍原前哨 Frozen Outpost
```
A vast frozen tundra at twilight with aurora-like cracks in the purple sky, three ancient black obelisks jutting up from blue-white ice, glowing teal energy lines tracing through the ground, distant northern lights with unnatural color shifts, crisp desolate beauty
```

### World 5 — 虛空要塞 Void Fortress
```
A colossal black onyx fortress rising out of dark stormy ocean, alien non-Euclidean architecture with floating platforms, purple-violet void energy pulsing between the spires, no stars visible in the twisted dark sky, occasional distant white lightning, dreamlike cosmic horror
```

---

## 👹 Boss 肖像（勝利畫面/對話框頂欄可選）

### 世界一 Boss — 鐵潮突擊隊長
```
Armored enemy commander, dark iron helmet with a single horizontal red slit, heavy shoulder pauldrons, black tabard with a steel cog emblem, carrying a twin-bladed axe, menacing silhouette against red flame, square 1:1, game boss portrait concept
```

### 世界二 Boss — 鋼鐵公爵
```
Towering mechanical armored duke, full plate armor with exposed steam pipes and brass valves along the shoulders, glowing orange eye slit, oversized gauntleted fists, smoke venting from shoulder stacks, standing in a factory interior, square 1:1
```

### 最終 Boss — 鐵潮之聲
```
A robed figure with a polished steel mask that shows only a single speaker grille where a mouth should be, flowing black velvet robe with crimson inner lining, hands folded revealing bronze mechanical fingers, a throne room behind him with toppled national banners, square 1:1
```

### 冰原 Boss — 極光巨獸
```
A massive four-legged beast of cracked blue ice with an inner core glowing teal, translucent crystalline antlers branching high above its head, clawed feet crusted in snow, vapor trailing from its mouth, standing in an aurora-lit arctic landscape, square 1:1
```

### 虛空 Boss — 第一執政者
```
An eldritch god-king with five porcelain masks floating around his head, long six-armed silhouette, each hand holding a different broken weapon, wearing ceremonial void robes with impossible geometry patterns, violet-and-black energy storms behind him, dreamlike horror, square 1:1
```

---

## 🎞 UI 裝飾（選配）

### 金色捲軸框
```
An ornate gold filigree rectangular frame with scrollwork flourishes at the corners, transparent centre, engraved details in burnished old gold, game UI asset, transparent PNG, top-down flat symmetrical, 1024x1024
```

### 星等噴射特效
```
A burst of golden sparkles and small soft stars radiating outward from a central glow, soft cream highlights, game VFX spritesheet concept, transparent background, 1024x1024
```

---

## 使用建議

- **Midjourney** 使用者：複製 prompt 後加 `--ar 16:9 --v 6.1` 或 `--ar 1:1 --v 6.1`
- **Stable Diffusion / ComfyUI**：建議搭配 SDXL 模型、`cfg_scale=7`、`steps=30`
- **DALL·E 3**：直接貼 prompt，另附「風格一致」指示即可
- 產出後請統一壓縮為 `.webp` 或 `.png`（< 500KB / 張）以減少 bundle 體積

## 整合方式（已在程式碼中預留）

1. **角色立繪** — [DialogueBox.ts](src/ui/DialogueBox.ts) 已支援在說話者名稱旁顯示 portrait 欄位，只需在 [Level.ts](src/game/Level.ts) 的 `DialogueLineData` 加 `portrait?: string` 欄位，並在對話資料引用檔名。
2. **世界封面** — 可在 [LevelSelectScene.ts](src/scenes/LevelSelectScene.ts) 每個世界標題背景載入對應 `worldN.png`。
3. **Boss 專屬 sprite** — 可在 [assets.ts](src/assets.ts) 替換相應敵人 key 的 URL。

> 建議版本：**v2.1.0** 或 **v2.2.0** 釋出含完整 AI 美術的版本。v2.0.0 保留 Kenney 純美術作為基礎版。
