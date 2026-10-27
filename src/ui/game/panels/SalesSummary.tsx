// End-of-day takings card.
import type { GameState } from '../../../engine/game';
import { dayHighlights, standing } from '../../../engine/story';
import { Face } from '../../art';
import { spoilsTonight } from '../../boardModel';

export function SalesSummary({ s, viewer }: { s: GameState; viewer: number }) {
  const r = s.results!;
  const start = s.dayStartCash?.[viewer];
  const net = start === undefined ? null : s.players[viewer].cash - start;
  // Day ledger: sales in, stock bought, anything else (fines, favours, jam), and fruit about to spoil.
  const bought = r.spent?.[viewer] ?? 0;
  const jam = s.jam?.[viewer] ?? 0;
  const other = net === null ? 0 : net - r.income[viewer] + bought;
  const spoil = s.phase === 'reveal' && s.day < s.config.days ? spoilsTonight(s, viewer) : 0;
  const highlights = dayHighlights(s, viewer);
  const st = standing(s, viewer);
  const best = Math.max(...r.income);
  const rem = s.config.days - s.day;
  return (
    <div class="sales-card">
      <div class="sc-title">{rem === 0 ? 'MARKET CLOSED' : `END OF DAY ${s.day}`}</div>
      <div class="sc-money ledger" aria-label="Day ledger">
        <span>Sales <b class="good">+${r.income[viewer]}</b></span>
        {bought > 0 && <span>Bought <b class="bad">−${bought}</b></span>}
        {jam > 0 && <span>Jam maker <b class="good">+${jam}</b></span>}
        {other - jam !== 0 && <span>Other <b class={other - jam > 0 ? 'good' : 'bad'}>{other - jam > 0 ? '+' : '−'}${Math.abs(other - jam)}</b></span>}
        {net !== null && <span class="net">Net <b class={net >= 0 ? 'good' : 'bad'}>{net >= 0 ? '+' : '−'}${Math.abs(net)}</b></span>}
      </div>
      {spoil > 0 && <div class="sc-waste">🗑️ {spoil} fruit on its last day spoils tonight</div>}
      {highlights.length > 0 && (
        <div class="sc-high">
          {highlights.map((h) => <div class={`hl ${h.tone}`}><span>{h.icon}</span>{h.text}</div>)}
        </div>
      )}
      <div class="takings">
        {s.players.map((pl, i) => (
          <span class={`tk ${i === viewer ? 'me' : ''} ${r.income[i] ? '' : 'zero'} ${r.income[i] === best && best > 0 ? 'top' : ''}`}>
            <Face who={pl.avatar} size={24} /><b>+${r.income[i]}</b>
          </span>
        ))}
      </div>
      {s.players.length > 1 && <div class={`sc-standing r${st.rank}`}>{st.text}{rem > 0 ? ` · ${rem} day${rem > 1 ? 's' : ''} to go` : ''}</div>}
    </div>
  );
}
