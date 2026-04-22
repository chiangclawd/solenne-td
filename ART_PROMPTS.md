# 索倫 TD — AI 美術 Drop-in 手冊

把 AI 生成的圖片放進指定資料夾，推送到 GitHub 就會自動上線取代目前的程序繪製美術。不需要改任何程式碼。

---

## 📁 資料夾結構（Drop-in 位置）

```
public/assets/
├── hero.png              ← 主選單背景大圖（可選）
├── portraits/
│   ├── kieran.png        ← 基蘭指揮官（有 PNG 則覆蓋 SVG）
│   ├── vasya.png         ← 瓦西亞中士
│   ├── pip.png           ← 皮普工程師
│   └── first_one.png     ← 第一個人（最終 Boss）
└── covers/
    ├── world1.png        ← 邊境戰役封面橫幅
    ├── world2.png        ← 工業心臟
    ├── world3.png        ← 首都保衛
    ├── world4.png        ← 凍原前哨
    └── world5.png        ← 虛空要塞
```

**格式**：PNG（推薦）或 WebP。SVG 僅作為目前的 placeholder。
**尺寸**：portraits 建議 `512×512`、covers 建議 `1024×256`（寬橫幅）、hero 建議 `1024×1536`（portrait 比例）。

---

## 🎯 優先順序（由高到低的視覺 ROI）

### 優先級 1 — 角色立繪（4 張，必做）
對話框中會顯示，整個戰役出現上百次，**最值得做**。

### 優先級 2 — 世界封面（5 張）
關卡選擇頁每個世界區塊上方的橫幅，首次進入有電影感。

### 優先級 3 — 主選單 Hero 圖（1 張）
首頁大背景，取代目前的程序剪影。

---

## 🎨 Prompts（可直接貼進 ChatGPT / Midjourney / Stable Diffusion）

### 共通風格 Suffix（建議每次附加）
```
painterly digital art, cinematic lighting, deep navy background with subtle gold rim light, game concept art style, consistent palette: dark navy #050810, gold #ffd166, orange #ff9f43, teal #6ee17a
```

---

### 🧑 立繪 Prompts

#### `kieran.png` — 基蘭指揮官
```
Half-body portrait, Asian male commander in his early 40s, short dark hair with gray streaks at the temples, strong jawline with stubble, thin scar across his left eyebrow. Wearing a navy-blue military trench coat with gold-trimmed epaulettes, antique brass compass hanging around his neck. Weary determined expression, facing camera slightly off-center. Moody warm backlighting, smoke ambient at the edges. Square 1:1 composition, dark background. Painterly detailed illustration.
```

#### `vasya.png` — 瓦西亞中士
```
Half-body portrait, Asian female sergeant in her early 30s, cropped auburn hair tied back in a short ponytail, tactical vest over dark olive uniform with ammo pouches on the chest. Scar along her right jawline. Confident smirk with tired eyes. Carrying a short-barreled rifle across her shoulder casually. Orange sunset glow on one cheek from a distant fire. Rugged but agile build. Square 1:1 composition, painterly illustration.
```

#### `pip.png` — 皮普工程師
```
Half-body portrait, androgynous young engineer in their early 20s, round wire-rim glasses catching a teal-green glow, messy platinum-blond hair. Wearing a leather apron over a grease-stained shirt, brass and copper engineering tools in chest straps. A dark soot smudge on one cheek. Holding a glowing teal crystalline shard in cupped hands that lights up the face from below. Curious but guarded expression, hint of otherworldly aura. Square 1:1 composition, painterly illustration.
```

#### `first_one.png` — 第一個人（Final Boss）
```
Half-body portrait of an ancient hooded figure who resembles Pip but aged 100 years older. Pale translucent skin with cracks running across the face. Hollow violet glowing eyes with no irises. Long silver-white hair flowing unnaturally. Wearing a tattered black ceremonial robe with dim violet-teal glowing runes stitched into the hem. A cracked porcelain mask half-sliding off his face revealing the ruined flesh beneath. Void tendrils rising behind him. Cold blue-purple rim lighting, ominous and melancholic. Painterly illustration, square 1:1.
```

---

### 🗺 世界封面 Prompts（`1024×256` 橫幅）

#### `world1.png` — 邊境戰役
```
Wide panoramic landscape banner, fortified medieval watchtower silhouetted against a dusk sky over vast golden grasslands. Distant torches mark defensive positions. A broken cart on a dirt road foreground left. Warm sunset with a single flock of birds, green rolling hills behind the tower. 4:1 wide aspect ratio, matte painting style, no text.
```

#### `world2.png` — 工業心臟
```
Wide panoramic landscape banner, 1920s steelworks complex at night with towering smokestacks belching orange flame into a smoke-choked red sky. Cooling canals reflecting furnace glow. Rusted train tracks leading toward the factory. Oppressive industrial atmosphere with harsh red-black contrast. 4:1 aspect ratio, matte painting.
```

#### `world3.png` — 首都保衛
```
Wide panoramic banner, art-deco royal capital city under siege at night. Grand marble palace with a central dome on a hill, spotlights cutting through smoke. The city below in chaos with street-level fires. Torn banners of a gold emblem hanging from balconies. Melancholic defiance, moody navy-purple sky. 4:1 aspect ratio, matte painting.
```

#### `world4.png` — 凍原前哨
```
Wide panoramic banner, vast frozen tundra at twilight. The sky has aurora-like cracks in deep purple. Three ancient black obelisks jutting up from blue-white ice. Glowing teal energy lines tracing through the ground. Distant northern lights with unnatural shifting colors. Crisp desolate beauty. 4:1 aspect ratio, matte painting.
```

#### `world5.png` — 虛空要塞
```
Wide panoramic banner, colossal black onyx fortress rising out of dark stormy ocean. Alien non-Euclidean architecture with floating platforms. Purple-violet void energy pulsing between the spires. No stars in the twisted dark sky. Distant white lightning. Dreamlike cosmic horror atmosphere. 4:1 aspect ratio, matte painting.
```

---

### 🖼 主選單 Hero 圖

#### `hero.png` — 主選單背景（portrait 1024×1536）
```
Vertical 2:3 portrait poster, three heroes standing in silhouette on a ridge looking toward a distant battlefield at dusk. A dark-coated commander in the center, a sergeant with rifle to his right, a young engineer with glowing teal shard to his left. Golden-orange sky with smoke plumes on the horizon behind them. Fortified watchtower silhouetted far away. Cinematic painterly game poster style, no text or logos. Dark navy foreground. Composition has dramatic negative space in the sky for title overlay.
```

---

## 🛠 推薦工作流程

### 最快路徑 — ChatGPT Plus（$20/月）+ DALL·E 3
1. 開 ChatGPT，選 GPT-4o
2. 貼 prompt（可加「`1024x1024`」或「`1792x1024`」尺寸指示）
3. 右鍵點圖 → 另存新檔 → 用**上表的檔名**命名（例：`kieran.png`）
4. 複製到對應資料夾

### 開放路徑 — Midjourney（$10/月）
1. 進 Discord MJ 伺服器
2. `/imagine prompt:` 貼上 prompt，加 `--ar 1:1 --v 7` 或 `--ar 4:1`
3. U1/U2/U3/U4 選喜歡的放大
4. 下載後改名

### 免費路徑 — Stable Diffusion（本機 / Replicate / Leonardo）
1. SDXL 或 FLUX 模型
2. cfg_scale=7, steps=30
3. 尺寸：1024×1024（portrait）/ 1536×384（cover）
4. 若偏戲劇感，加 negative prompt: `flat, amateur, watermark, text, blurry`

---

## 📦 安裝到遊戲的 3 步

1. **生成圖** → 命名為上表檔名
2. **放入資料夾**（本機）：
   ```bash
   # 例：放 4 張角色立繪
   cp ~/Downloads/kieran.png public/assets/portraits/
   cp ~/Downloads/vasya.png  public/assets/portraits/
   cp ~/Downloads/pip.png    public/assets/portraits/
   cp ~/Downloads/first_one.png public/assets/portraits/
   ```
3. **推送**：
   ```bash
   git add public/assets/
   git commit -m "Art: add AI-generated character portraits"
   git push
   ```

GitHub Actions 會自動 build 並部署到 `https://chiangclawd.github.io/solenne-td/`。約 1 分鐘內生效。

---

## ✅ 檢查表

只要有 PNG 就會自動覆蓋目前的程序繪製 / SVG，不需改任何程式：

- [ ] `kieran.png` — 對話中會自動替換 SVG placeholder
- [ ] `vasya.png`
- [ ] `pip.png`
- [ ] `first_one.png`
- [ ] `covers/world1.png` → 關卡選擇頁世界 1 上方出現橫幅
- [ ] `covers/world2.png`
- [ ] `covers/world3.png`
- [ ] `covers/world4.png`
- [ ] `covers/world5.png`
- [ ] `hero.png` → 主選單背景取代程序剪影

**檔案不存在時**：自動 fallback 到原本的程序繪製 / SVG，無 404、無錯誤。

---

## 💡 小提醒

- **尺寸超過 10MB** 的圖片會被 workbox 拒絕快取 — 請壓縮。
- **WebP** 體積比 PNG 小 30-50%，建議用 `squoosh.app` 轉檔。
- 若 AI 圖風格不統一，建議**同一個 tool 一次生完**（MJ 用相同 seed / DALL-E 用相同 session）。
- PNG 透明背景最佳；若 AI 工具不支援透明，可用 `remove.bg` 事後去背（僅 portraits 需要，covers/hero 不需要去背）。
