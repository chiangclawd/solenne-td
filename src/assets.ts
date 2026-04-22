const BASE = import.meta.env.BASE_URL;
const KENNEY = `${BASE}assets/kenney/PNG/default-size/towerDefense_`;

export const ASSET_MANIFEST = {
  grass:            `${KENNEY}tile024.png`,
  path:             `${KENNEY}tile050.png`,
  towerBase:        `${KENNEY}tile181.png`,
  turretCannon:     `${KENNEY}tile250.png`,
  turretMG:         `${KENNEY}tile249.png`,
  turretMissile:    `${KENNEY}tile205.png`,
  turretTesla:      `${KENNEY}tile206.png`,
  turretLight:      `${KENNEY}tile204.png`,
  enemySoldier:     `${KENNEY}tile248.png`,
  enemyTank:        `${KENNEY}tile245.png`,
  enemyPlane:       `${KENNEY}tile270.png`,
  enemyBoss:        `${KENNEY}tile268.png`,
  enemyIce:         `${KENNEY}tile246.png`,
  enemyWraith:      `${KENNEY}tile271.png`,
  enemySplitter:    `${KENNEY}tile269.png`,
  enemyHealer:      `${KENNEY}tile247.png`,
  projectileBullet: `${KENNEY}tile272.png`,
  projectileMissile:`${KENNEY}tile252.png`,
} as const;

export type AssetName = keyof typeof ASSET_MANIFEST;
