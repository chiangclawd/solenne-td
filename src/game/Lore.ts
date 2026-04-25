/**
 * Codex lore (v2.8.0 C2).
 *
 * All flavor text for the Codex screen lives here so worldbuilding stays
 * in one place and the renderer is purely presentational. Three buckets:
 *   - TOWER_LORE   : 10 entries, each `{ tagline, lore }`
 *   - ENEMY_LORE   : 20 entries, each `{ tagline, counter }`
 *   - HERO_LORE    : 3 entries,  each `{ backstory, personality, combat }`
 *
 * Style: short, in-universe, fits the established 索倫王國 vs 鐵潮 narrative.
 * `tagline` is one line; `lore` is 2 sentences max so it fits the card layout.
 */

export interface TowerLore {
  /** One-line summary, shown bold under the title. */
  tagline: string;
  /** 2-sentence backstory / strategic note. */
  lore: string;
}

export interface EnemyLoreEntry {
  /** Display label (Chinese name). */
  label: string;
  /** Tier descriptor (e.g. "輕步兵 · 偵察"). */
  tier: string;
  /** 2-sentence in-universe description. */
  desc: string;
  /** Tactical counter advice. */
  counter: string;
}

export interface HeroLoreEntry {
  /** 2-sentence character backstory. */
  backstory: string;
  /** 1-line personality flavor. */
  personality: string;
  /** 1-line combat role recap. */
  combat: string;
}

// ---------- Towers (10) ----------

export const TOWER_LORE: Record<string, TowerLore> = {
  cannon: {
    tagline: '基本火砲 · 對抗裝甲',
    lore: '索倫王軍最古老的火力支柱。每座哨站都備有幾門，在第一場與鐵潮的衝突中就證明了它的價值。',
  },
  quickShot: {
    tagline: '民兵速射槍 · 對抗輕甲',
    lore: '輕便、易維護，每個村莊的庫房都有幾把。把多餘的金屬與火藥，變成防線上實實在在的射速。',
  },
  machineGun: {
    tagline: '量產機槍塔 · 對抗輕甲與飛行',
    lore: '工業城最自豪的量產品。彈鏈不斷的咆哮，是抵擋輕步兵潮汐與低空襲擊最有效的手段。',
  },
  frostTower: {
    tagline: '冰霜減速塔',
    lore: '凍原冰術士有條件租借的技術。對單體傷害不足，但能讓最快的敵人慢成步伐。',
  },
  sniper: {
    tagline: '王家狙擊塔 · 對抗裝甲與幽影',
    lore: '索倫王家衛隊的傳承武器。一次只發射一發，但每一發都瞄準敵人裝甲最薄的縫隙。',
  },
  missileLauncher: {
    tagline: '飛彈塔 · AOE · 對抗飛行',
    lore: '工業城最後一批出廠的飛彈系統。範圍爆破彈設計用來對付鐵潮的飛行載具與密集陣型。',
  },
  heavyCannon: {
    tagline: '重砲 · 大範圍 AOE',
    lore: '皇宮防衛軍曾拒絕讓它們離開首都。現在它們站在前線，一發砲彈能撼動一整片陣地。',
  },
  tesla: {
    tagline: '特斯拉鏈電塔 · 對抗護盾',
    lore: '工業城淪陷後從廢墟搜出的禁忌設計。電弧能跳躍多個目標，對魔法護盾單位特別致命。',
  },
  lightTower: {
    tagline: '聖光塔 · 穿甲 · 對抗幽影',
    lore: '光之教會的祭司在絕望中啟動的古老設計。光束貫穿一切——包括鐵潮幽影部隊的虛無形體。',
  },
  torpedoTower: {
    tagline: '深海魚雷塔 · 對抗護盾',
    lore: '從深海漁民的水雷改造而來。索倫從未想過把武器朝海裡發射，直到深海開始回望我們。',
  },
};

// ---------- Enemies (20) ----------

export const ENEMY_LORE: Record<string, EnemyLoreEntry> = {
  scout: {
    label: '偵察兵', tier: '輕步兵 · 偵察',
    desc: '鐵潮先鋒。輕裝、快速、消耗品。一波又一波，沒有人會替他們收屍。',
    counter: '速射槍 / 機槍塔最有效。',
  },
  soldier: {
    label: '步兵', tier: '輕步兵 · 主力',
    desc: '鐵潮主力步兵。標準裝備，標準戰術。但他們的眼神裡沒有恐懼。',
    counter: '速射槍 / 加農砲穩定處理。',
  },
  runner: {
    label: '衝鋒兵', tier: '輕步兵 · 突擊',
    desc: '衝鋒型步兵。鐵潮把這些人放在最前線 — 能跑多快就跑多快。',
    counter: '機槍塔射速壓制；冰霜塔減速。',
  },
  tank: {
    label: '坦克', tier: '裝甲 · 標準',
    desc: '鐵潮的標準裝甲單位。鋼鐵焊接的緩慢推進機器。',
    counter: '加農砲 / 飛彈塔有效。',
  },
  armored: {
    label: '裝甲車', tier: '裝甲 · 重型',
    desc: '重型裝甲推進車。索倫沒有任何車輛能與它對撞。',
    counter: '狙擊塔貫穿護甲；穿甲彈分支特別有效。',
  },
  heavyTank: {
    label: '重坦', tier: '裝甲 · 攻城',
    desc: '鐵潮的攻城型裝甲單位。每一次推進都讓城牆顫抖。',
    counter: '重砲 / 飛彈塔的範圍爆破最有效。',
  },
  plane: {
    label: '攻擊機', tier: '飛行 · 空襲',
    desc: '鐵潮空中部隊。現代戰場上索倫沒見過的東西。',
    counter: '飛彈塔 / 機槍塔 / 特斯拉塔可擊落。',
  },
  frostRaider: {
    label: '凍原突擊兵', tier: '輕步兵 · 凍原',
    desc: '凍原來的鐵潮輕步兵。對冰寒免疫，速度甚至比衝鋒兵還快。',
    counter: '機槍塔 / 速射槍維持射速。',
  },
  iceBeast: {
    label: '冰原巨獸', tier: '裝甲 · 凍原',
    desc: '凍原原生大型生物。鐵潮不知用什麼方法把它們驅使到戰場上。',
    counter: '加農砲穿甲分支或重砲。',
  },
  wraith: {
    label: '幽影', tier: '幽影 · 半實體',
    desc: '半實體的虛影。一般攻擊穿透無效，需要光焰類武器。',
    counter: '狙擊塔 / 聖光塔克制幽影單位。',
  },
  splitter: {
    label: '分裂者', tier: '輕甲 · 分裂',
    desc: '鐵潮新研發的「分裂者」。死亡時分裂成兩個衝鋒兵，AOE 武器處理會適得其反。',
    counter: '單體強傷害優先（狙擊塔火力集中）。',
  },
  healer: {
    label: '修復者', tier: '護盾 · 治療',
    desc: '鐵潮野戰修復單位。1.2 秒治療一次周圍隊友 8 點生命。',
    counter: '優先擊殺！否則它能讓 tank 編隊永遠不死。',
  },
  boss: {
    label: '鐵潮指揮官', tier: 'BOSS · 階段二',
    desc: '鐵潮地區指揮官。50% 血量會發狂衝刺一段時間。',
    counter: '集中火力 + 範圍傷害。',
  },
  armoredBoss: {
    label: '重裝指揮官', tier: 'BOSS · 階段二',
    desc: '鐵潮重裝指揮官。低血時恢復 20% HP 並暫時提升護甲。',
    counter: '穿甲彈分支或聖光塔。',
  },
  finalBoss: {
    label: '鐵潮統帥', tier: 'BOSS · 終戰',
    desc: '鐵潮的最高指揮官。50% 血量會瞬移前進兩格。',
    counter: '保留高傷單體武器（狙擊塔火力集中）對付。',
  },
  glacialBoss: {
    label: '凍原巨獸王', tier: 'BOSS · 凍原',
    desc: '凍原巨獸之王。冰原咆哮會召喚凍原突擊兵增援。',
    counter: '飛彈塔 / 重砲 + 冰霜塔減速雙管齊下。',
  },
  voidBoss: {
    label: '虛空守門人', tier: 'BOSS · 虛空',
    desc: '虛空裂口的守門人。會召喚 4 隻幽影並暫時提升護甲。',
    counter: '聖光塔 / 狙擊塔處理 ethereal。',
  },
  tentacle: {
    label: '深海觸手', tier: '裝甲 · 深海',
    desc: '深海觸手。緩慢但極厚的血量，每次揮擊都帶起浪花。',
    counter: '重砲 / 魚雷塔擊穿。',
  },
  swimmerShoal: {
    label: '游魚群', tier: '輕甲 · 群體',
    desc: '深海游魚群。單隻血量極低但速度極快，數量也極多。',
    counter: '機槍塔 / 速射槍密集射速。',
  },
  abyssalBoss: {
    label: '深淵之主', tier: 'BOSS · 深海',
    desc: '深淵之主。死亡時召喚 3 個觸手；50% HP 召集深海群體。',
    counter: '集中強傷害武器。注意 onDeath 後的觸手潮。',
  },
};

// ---------- Heroes (3) ----------

export const HERO_LORE: Record<string, HeroLoreEntry> = {
  kieran: {
    backstory: '索倫王軍指揮官。家族世代守衛邊境哨站，在草原失守當天接過了王軍的指揮棒。',
    personality: '穩重、寡言，永遠把士兵性命放在勳章前面。',
    combat: '指揮光環強化全軍火力與射速；Royal Ward 提供 80% 減傷護盾。',
  },
  vasya: {
    backstory: '平民出身，從工業城邊郊的工人家庭一路升到中士。對失去的人記性很好。',
    personality: '直接、粗糙，戰場上總會挑最危險的位置站。',
    combat: '精準狙擊射手；可投擲手榴彈清場，也可啟動穿甲彈強化單體傷害。',
  },
  pip: {
    backstory: '皇家工程學院的天才畢業生。把一台廢棄的特斯拉裝置改造成電磁步槍，造就了她的戰場席位。',
    personality: '好奇、活潑、講話快，會在戰鬥中不停試新點子。',
    combat: '高科技裝備師；閃光彈大範圍減速，緊急建造提供一次性塔位。',
  },
};
