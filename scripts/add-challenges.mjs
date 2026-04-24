#!/usr/bin/env node
/**
 * v2.3 A1 — populate `challenges` field on all 28 level JSONs per the
 * design spec in docs/V2_3_DESIGN.md. Re-runnable; overwrites existing
 * challenges block with the latest design.
 */
import fs from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'public', 'levels');

const CHALLENGES = {
  'level-01': [{ kind: 'towerForbidden', id: 'cannon' },        { kind: 'noLivesLost' }],
  'level-02': [{ kind: 'noHero' },                              { kind: 'destroyAllDestr' }],
  'level-03': [{ kind: 'maxTowers', n: 8 },                     { kind: 'heroSurvives' }],
  'level-04': [{ kind: 'towerForbidden', id: 'sniper' },        { kind: 'destroyAllDestr' }],
  'level-05': [{ kind: 'noUpgrade' },                           { kind: 'noLivesLost' }],
  'level-06': [{ kind: 'towerForbidden', id: 'missileLauncher'},{ kind: 'noLivesLost' }],
  'level-07': [{ kind: 'maxTowers', n: 10 },                    { kind: 'destroyAllDestr' }],
  'level-08': [{ kind: 'noSell' },                              { kind: 'destroyAllDestr' }],
  'level-09': [{ kind: 'noHero' },                              { kind: 'destroyAllDestr' }],
  'level-10': [{ kind: 'noUpgrade' },                           { kind: 'noLivesLost' }],
  'level-11': [{ kind: 'towerForbidden', id: 'heavyCannon' },   { kind: 'noLivesLost' }],
  'level-12': [{ kind: 'maxTowers', n: 12 },                    { kind: 'heroSurvives' }],
  'level-13': [{ kind: 'towerForbidden', id: 'sniper' },        { kind: 'noLivesLost' }],
  'level-14': [{ kind: 'towerForbidden', id: 'frostTower' },    { kind: 'noLivesLost' }],
  'level-15': [{ kind: 'noHero' },                              { kind: 'destroyAllDestr' }],
  'level-16': [{ kind: 'maxTowers', n: 10 },                    { kind: 'noLivesLost' }],
  'level-17': [{ kind: 'noUpgrade' },                           { kind: 'heroSurvives' }],
  'level-18': [{ kind: 'heroRequired', id: 'kieran' },          { kind: 'noLivesLost' }],
  'level-19': [{ kind: 'towerForbidden', id: 'sniper' },        { kind: 'noLivesLost' }],
  'level-20': [{ kind: 'towerForbidden', id: 'missileLauncher'},{ kind: 'destroyAllDestr' }],
  'level-21': [{ kind: 'towerForbidden', id: 'cannon' },        { kind: 'noLivesLost' }],
  'level-22': [{ kind: 'maxTowers', n: 12 },                    { kind: 'noLivesLost' }],
  'level-23': [{ kind: 'noHero' },                              { kind: 'noLivesLost' }],
  'level-24': [{ kind: 'towerForbidden', id: 'torpedoTower' },  { kind: 'noLivesLost' }],
  'level-25': [{ kind: 'noUpgrade' },                           { kind: 'destroyAllDestr' }],
  'level-26': [{ kind: 'maxTowers', n: 14 },                    { kind: 'noLivesLost' }],
  'level-27': [{ kind: 'noHero' },                              { kind: 'destroyAllDestr' }],
  'level-28': [{ kind: 'towerForbidden', id: 'sniper' },        { kind: 'noLivesLost' }],
};

let count = 0;
const warnings = [];
for (const [id, [star2, star3]] of Object.entries(CHALLENGES)) {
  const file = path.join(DIR, id + '.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  // Sanity: if star is towerForbidden, it must reference a tower that's
  // actually available on that level — otherwise challenge is always-met.
  if (star2.kind === 'towerForbidden' && !data.availableTowers.includes(star2.id)) {
    warnings.push(`${id} star2 forbids ${star2.id} but it's not in availableTowers`);
  }

  data.challenges = { star2, star3 };
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  count++;
}
if (warnings.length > 0) {
  console.log('Warnings:\n  ' + warnings.join('\n  '));
}
console.log(`\n${count} level(s) got challenges field.`);
