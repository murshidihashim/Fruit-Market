// Card text in data.ts (what the cards and the printed guidebook show) against RULES.md.
import { readFileSync } from 'node:fs';
import { EVENT_CARDS, FAVOURS, TRAITS, UPGRADES, ORDER_CARDS } from '/home/user/Fruit-Market/src/engine/data';

const rules = readFileSync('/home/user/Fruit-Market/RULES.md', 'utf8');
const norm = (s: string) => s.replace(/’/g, "'").replace(/\s+/g, ' ');
const R = norm(rules);
const check = (kind: string, title: string, text: string) => {
  if (!R.includes(norm(text))) {
    const line = rules.split('\n').find((l) => l.includes(title) && l.startsWith('|'));
    console.log(`- ${kind} ${title}\n    card:  ${text}\n    RULES: ${line ? line.split('|').slice(-2, -1)[0].trim() : '(no table row found)'}`);
  }
};
for (const e of EVENT_CARDS) check('event', e.title, e.text);
for (const f of Object.values(FAVOURS)) check('favour', f.title, f.text);
for (const u of Object.values(UPGRADES)) check('upgrade', u.title, u.text);
for (const t of Object.values(TRAITS)) check('perk', t.title, t.text);
for (const o of ORDER_CARDS) if (!R.includes(o.title.replace('The ', ''))) console.log('order missing', o.title);
