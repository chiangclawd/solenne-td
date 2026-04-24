#!/usr/bin/env node
/**
 * v2.6.0 B2 — generate the 6 trial JSON files for `public/trials/`.
 * Each trial is a hand-designed level with a single hard constraint,
 * sized for a quick (~3-5 min) post-campaign challenge.
 */
import fs from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'public', 'trials');
fs.mkdirSync(DIR, { recursive: true });

const p = (x, y) => ({ x, y });
const wave = (...entries) => entries.map(([delay, enemy, ...rest]) => {
  const out = { delay, enemy };
  if (rest.length && rest[0] !== undefined) out.path = rest[0];
  return out;
});

// Compact wave entry helper
const E = (delay, enemy, pathIdx) => ({ delay, enemy, ...(pathIdx !== undefined ? { path: pathIdx } : {}) });

const TRIALS = {
  // ---------- Trial 1: 塔工坊 ----------
  // Only cannon + quickShot. Teaches "do more with less". Single short path.
  'trial-01': {
    id: 'trial-01',
    name: '試煉一 · 塔工坊',
    world: 0,
    flavorText: '只有兩座塔。看你能逼出多少潛力。',
    intro: [
      { speaker: '皮普工程師', text: '指揮官想看你赤手單獨用最基礎的武器。', color: '#6ee17a', portrait: 'pip' },
      { speaker: '基蘭指揮官', text: '加農砲與速射槍。沒有花樣。守住。', color: '#5eb8ff', portrait: 'kieran' },
    ],
    outroWin: [
      { speaker: '皮普工程師', text: '基本款也能贏。漂亮。', color: '#6ee17a', portrait: 'pip' },
    ],
    outroLose: [
      { speaker: '基蘭指揮官', text: '基礎還沒精通。再來。', color: '#5eb8ff', portrait: 'kieran' },
    ],
    paths: [[ p(2, -0.5), p(2, 4), p(8, 4), p(8, 11), p(2, 11), p(2, 15.5) ]],
    startingGold: 200,
    startingLives: 12,
    availableTowers: ['cannon', 'quickShot'],
    waves: [
      [E(0.5, 'soldier'), E(0.5, 'soldier'), E(0.5, 'soldier'), E(0.5, 'soldier'), E(0.5, 'soldier'), E(0.5, 'soldier'),
       E(0.7, 'tank'), E(0.7, 'tank')],
      [E(0.4, 'scout'), E(0.4, 'runner'), E(0.4, 'scout'), E(0.4, 'runner'), E(0.4, 'scout'),
       E(0.7, 'tank'), E(0.7, 'tank'), E(0.7, 'tank'), E(0.9, 'armored')],
      [E(0.35, 'runner'), E(0.35, 'runner'), E(0.35, 'runner'), E(0.35, 'soldier'),
       E(0.6, 'tank'), E(0.6, 'tank'), E(0.6, 'armored'), E(0.6, 'armored'), E(0.8, 'heavyTank'),
       E(1.4, 'boss')],
      [E(0.3, 'scout'), E(0.3, 'runner'), E(0.3, 'soldier'), E(0.3, 'scout'), E(0.3, 'runner'),
       E(0.5, 'tank'), E(0.5, 'tank'), E(0.5, 'armored'), E(0.5, 'armored'), E(0.5, 'heavyTank'),
       E(1.5, 'boss'), E(1.5, 'armoredBoss')],
    ],
    obstacles: [
      { x: 5, y: 7, kind: 'rock' },
      { x: 5, y: 13, kind: 'tree' },
    ],
    trial: { metaStarReward: 5 },
  },

  // ---------- Trial 2: 狙擊巔峰 ----------
  // Only sniper. Single long straight path showing sniper's reach.
  'trial-02': {
    id: 'trial-02',
    name: '試煉二 · 狙擊巔峰',
    world: 0,
    flavorText: '一座塔，一個目標，一發命中。',
    intro: [
      { speaker: '瓦西亞中士', text: '想看看你能不能像我一樣信任一發子彈。', color: '#ff9f43', portrait: 'vasya' },
    ],
    outroWin: [
      { speaker: '瓦西亞中士', text: '你的彈道我認可了。', color: '#ff9f43', portrait: 'vasya' },
    ],
    outroLose: [
      { speaker: '瓦西亞中士', text: '一發子彈的代價。記住。', color: '#ff9f43', portrait: 'vasya' },
    ],
    paths: [[ p(5, -0.5), p(5, 15.5) ]],
    startingGold: 250,
    startingLives: 10,
    availableTowers: ['sniper'],
    waves: [
      [E(0.6, 'tank'), E(0.6, 'tank'), E(0.6, 'tank'), E(0.6, 'armored'), E(0.6, 'armored')],
      [E(0.5, 'armored'), E(0.5, 'armored'), E(0.5, 'heavyTank'), E(0.5, 'heavyTank'),
       E(1.0, 'boss')],
      [E(0.45, 'heavyTank'), E(0.45, 'heavyTank'), E(0.45, 'heavyTank'),
       E(0.45, 'armored'), E(0.45, 'armored'),
       E(1.4, 'boss'), E(1.4, 'armoredBoss')],
      [E(0.4, 'wraith'), E(0.4, 'wraith'), E(0.4, 'wraith'), E(0.4, 'wraith'),
       E(0.8, 'heavyTank'), E(0.8, 'heavyTank'),
       E(1.6, 'finalBoss')],
    ],
    obstacles: [
      { x: 1, y: 4, kind: 'rock' }, { x: 9, y: 4, kind: 'rock' },
      { x: 1, y: 10, kind: 'tree' }, { x: 9, y: 10, kind: 'tree' },
    ],
    trial: { forceHero: 'none', metaStarReward: 5 },
  },

  // ---------- Trial 3: 凍原獨行 ----------
  // Only frostTower, no hero. 2-path. Speed enemies to stress the slow.
  'trial-03': {
    id: 'trial-03',
    name: '試煉三 · 凍原獨行',
    world: 0,
    flavorText: '凍住他們，要不就被淹沒。',
    intro: [
      { speaker: '旁白', text: '只剩冰霜塔。減速是你唯一的武器。', color: '#9aa5b8' },
    ],
    outroWin: [
      { speaker: '旁白', text: '冰封一切。', color: '#9aa5b8' },
    ],
    outroLose: [
      { speaker: '旁白', text: '潮水終究太急。', color: '#9aa5b8' },
    ],
    paths: [
      [ p(2, -0.5), p(2, 8), p(5, 8), p(5, 15.5) ],
      [ p(8, -0.5), p(8, 8), p(5, 8), p(5, 15.5) ],
    ],
    startingGold: 240,
    startingLives: 10,
    availableTowers: ['frostTower'],
    waves: [
      [E(0.3, 'scout', 0), E(0.3, 'scout', 0), E(0.3, 'runner', 0), E(0.3, 'runner', 0),
       E(0.3, 'scout', 1), E(0.3, 'scout', 1), E(0.3, 'runner', 1), E(0.3, 'runner', 1)],
      [E(0.28, 'frostRaider', 0), E(0.28, 'frostRaider', 0), E(0.28, 'frostRaider', 0),
       E(0.28, 'frostRaider', 1), E(0.28, 'frostRaider', 1), E(0.28, 'frostRaider', 1),
       E(0.6, 'tank', 0), E(0.6, 'tank', 1)],
      [E(0.25, 'runner', 0), E(0.25, 'frostRaider', 0), E(0.25, 'scout', 0),
       E(0.25, 'runner', 1), E(0.25, 'frostRaider', 1), E(0.25, 'scout', 1),
       E(0.5, 'armored', 0), E(0.5, 'armored', 1),
       E(1.5, 'boss', 0)],
      [E(0.22, 'frostRaider', 0), E(0.22, 'frostRaider', 0), E(0.22, 'runner', 0),
       E(0.22, 'frostRaider', 1), E(0.22, 'frostRaider', 1), E(0.22, 'runner', 1),
       E(0.4, 'iceBeast', 0), E(0.4, 'iceBeast', 1),
       E(1.4, 'boss', 0), E(1.4, 'boss', 1)],
    ],
    obstacles: [
      { x: 4, y: 4, kind: 'iceRock' }, { x: 6, y: 4, kind: 'iceRock' },
      { x: 4, y: 11, kind: 'iceRock' }, { x: 6, y: 11, kind: 'iceRock' },
    ],
    trial: { forceHero: 'none', metaStarReward: 5 },
  },

  // ---------- Trial 4: 赤手空拳 ----------
  // No towers — pure hero. Hero-only build forces talent investment to matter.
  'trial-04': {
    id: 'trial-04',
    name: '試煉四 · 赤手空拳',
    world: 0,
    flavorText: '沒有塔。沒有掩護。只剩你和你的指揮官。',
    intro: [
      { speaker: '基蘭指揮官', text: '今天你不是指揮官 — 是士兵。', color: '#5eb8ff', portrait: 'kieran' },
    ],
    outroWin: [
      { speaker: '基蘭指揮官', text: '沒有人能小看一個會戰鬥的人。', color: '#5eb8ff', portrait: 'kieran' },
    ],
    outroLose: [
      { speaker: '基蘭指揮官', text: '單打獨鬥還是有極限。', color: '#5eb8ff', portrait: 'kieran' },
    ],
    paths: [[ p(3, -0.5), p(3, 5), p(7, 5), p(7, 10), p(3, 10), p(3, 15.5) ]],
    startingGold: 50,
    startingLives: 8,
    availableTowers: ['cannon'],  // technically required by validator, but 50g can't afford
    waves: [
      [E(0.6, 'soldier'), E(0.6, 'soldier'), E(0.6, 'soldier'), E(0.6, 'runner'), E(0.6, 'runner')],
      [E(0.55, 'soldier'), E(0.55, 'runner'), E(0.55, 'soldier'), E(0.55, 'runner'),
       E(0.9, 'tank')],
      [E(0.5, 'runner'), E(0.5, 'runner'), E(0.5, 'soldier'), E(0.5, 'soldier'),
       E(0.9, 'tank'), E(0.9, 'tank')],
      [E(0.4, 'scout'), E(0.4, 'runner'), E(0.4, 'scout'), E(0.4, 'runner'),
       E(0.7, 'tank'), E(0.7, 'tank'),
       E(1.6, 'boss')],
    ],
    obstacles: [
      { x: 5, y: 7, kind: 'rock' },
    ],
    trial: { metaStarReward: 8 },
  },

  // ---------- Trial 5: 資源大師 ----------
  // 100 gold start, 5 lives. All towers available — economy puzzle.
  'trial-05': {
    id: 'trial-05',
    name: '試煉五 · 資源大師',
    world: 0,
    flavorText: '能用的金子比你想像的少。每分都得算。',
    intro: [
      { speaker: '皮普工程師', text: '預算砍到剩骨頭。看你選哪種武器。', color: '#6ee17a', portrait: 'pip' },
    ],
    outroWin: [
      { speaker: '皮普工程師', text: '帳算對了。漂亮。', color: '#6ee17a', portrait: 'pip' },
    ],
    outroLose: [
      { speaker: '皮普工程師', text: '預算用光。下次選擇要更精明。', color: '#6ee17a', portrait: 'pip' },
    ],
    paths: [[ p(5, -0.5), p(5, 3), p(2, 3), p(2, 12), p(8, 12), p(8, 15.5) ]],
    startingGold: 100,
    startingLives: 5,
    availableTowers: ['cannon', 'quickShot', 'machineGun', 'frostTower', 'sniper', 'missileLauncher'],
    waves: [
      [E(0.7, 'soldier'), E(0.7, 'soldier'), E(0.7, 'soldier'), E(0.7, 'soldier'),
       E(0.9, 'tank')],
      [E(0.5, 'scout'), E(0.5, 'runner'), E(0.5, 'scout'),
       E(0.7, 'tank'), E(0.7, 'tank'),
       E(0.9, 'armored')],
      [E(0.4, 'runner'), E(0.4, 'runner'), E(0.4, 'soldier'),
       E(0.6, 'tank'), E(0.6, 'armored'), E(0.6, 'armored'),
       E(1.4, 'boss')],
      [E(0.35, 'scout'), E(0.35, 'runner'), E(0.35, 'soldier'),
       E(0.55, 'armored'), E(0.55, 'armored'), E(0.55, 'heavyTank'),
       E(1.4, 'boss'), E(1.6, 'armoredBoss')],
    ],
    obstacles: [
      { x: 5, y: 7, kind: 'rock', destructible: true, hp: 30, reward: 12 },
      { x: 5, y: 9, kind: 'ruin', destructible: true, hp: 28, reward: 10 },
    ],
    trial: { forbidUpgrade: true, forbidSell: true, metaStarReward: 8 },
  },

  // ---------- Trial 6: 最終試煉 ----------
  // All constraints stacked. Reward 10 stars. Earned legitimacy.
  'trial-06': {
    id: 'trial-06',
    name: '試煉六 · 最終試煉',
    world: 0,
    flavorText: '一切限制疊加。能贏這一關的人，沒什麼搞不定。',
    intro: [
      { speaker: '旁白', text: '六天的試煉終於到底。沒有英雄，沒有重武器，沒有閒錢。', color: '#9aa5b8' },
      { speaker: '基蘭指揮官', text: '這就是真正的考驗。', color: '#5eb8ff', portrait: 'kieran' },
    ],
    outroWin: [
      { speaker: '基蘭指揮官', text: '索倫從沒有過這樣的指揮官。', color: '#5eb8ff', portrait: 'kieran' },
      { speaker: '旁白', text: '你已是傳奇。', color: '#9aa5b8' },
    ],
    outroLose: [
      { speaker: '旁白', text: '試煉之巔仍在等你回來。', color: '#9aa5b8' },
    ],
    paths: [
      [ p(1, -0.5), p(1, 6), p(5, 6), p(5, 12), p(1, 12), p(1, 15.5) ],
      [ p(9, -0.5), p(9, 12), p(5, 12), p(5, 15.5) ],
    ],
    startingGold: 80,
    startingLives: 5,
    availableTowers: ['cannon', 'quickShot'],
    waves: [
      [E(0.45, 'soldier', 0), E(0.45, 'soldier', 0), E(0.45, 'soldier', 0),
       E(0.4, 'scout', 1), E(0.4, 'scout', 1), E(0.4, 'scout', 1)],
      [E(0.4, 'runner', 0), E(0.4, 'runner', 0), E(0.4, 'soldier', 0),
       E(0.35, 'runner', 1), E(0.35, 'scout', 1), E(0.35, 'runner', 1),
       E(0.7, 'tank', 0)],
      [E(0.35, 'scout', 0), E(0.35, 'soldier', 0), E(0.35, 'runner', 0),
       E(0.3, 'runner', 1), E(0.3, 'scout', 1), E(0.3, 'runner', 1), E(0.3, 'scout', 1),
       E(0.55, 'tank', 0), E(0.55, 'armored', 0),
       E(1.5, 'boss', 0)],
      [E(0.3, 'runner', 0), E(0.3, 'soldier', 0), E(0.3, 'scout', 0),
       E(0.28, 'scout', 1), E(0.28, 'runner', 1), E(0.28, 'scout', 1), E(0.28, 'runner', 1),
       E(0.45, 'tank', 0), E(0.45, 'armored', 0), E(0.45, 'heavyTank', 0),
       E(1.4, 'boss', 0), E(1.6, 'armoredBoss', 1)],
      [E(0.3, 'scout', 0), E(0.3, 'runner', 0), E(0.3, 'soldier', 0), E(0.3, 'runner', 0),
       E(0.25, 'scout', 1), E(0.25, 'runner', 1), E(0.25, 'scout', 1), E(0.25, 'runner', 1), E(0.25, 'scout', 1),
       E(0.4, 'armored', 0), E(0.4, 'armored', 0), E(0.4, 'heavyTank', 0), E(0.4, 'heavyTank', 0),
       E(1.5, 'finalBoss', 0), E(1.8, 'armoredBoss', 1)],
    ],
    obstacles: [
      { x: 4, y: 4, kind: 'rock' }, { x: 6, y: 4, kind: 'rock' },
      { x: 4, y: 9, kind: 'ruin' }, { x: 6, y: 9, kind: 'ruin' },
    ],
    trial: { forceHero: 'none', forbidUpgrade: true, forbidSell: true, metaStarReward: 10 },
  },
};

let written = 0;
for (const [id, data] of Object.entries(TRIALS)) {
  fs.writeFileSync(path.join(DIR, id + '.json'), JSON.stringify(data, null, 2) + '\n');
  written++;
}
void wave; // kept for symmetry, helper unused after refactor
console.log(`${written} trial(s) written to ${DIR}`);
