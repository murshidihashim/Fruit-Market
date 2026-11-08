// End-of-day takings card.
import type { GameState } from '../../../engine/game';
import { dayHighlights, dayLedger, standing, tonightLine, withJamPaid } from '../../../engine/story';
import { Face } from '../../art';
import { spoilsTonight } from '../../boardModel';

export function SalesSummary({ s, viewer }: { s: GameState; viewer: number }) {
  const r = s.results!;
  // Day ledger: sales in, stock bought, the jam maker (on Closing Day this card comes before he pays, so his money
  // shows as "tonight" and is in the net), anything else, and what tonight does to the shelf (fruit that spoils, and
  // fruit a Juice Bar turns into juice; nothing on the final day, when no night follows).
  const { sales, bought, jam, jamTonight, other, net } = dayLedger(s, viewer);
  const tonight = s.phase === 'reveal' ? tonightLine(s, viewer) : null;
  const spoil = tonight ? spoilsTonight(s, viewer) : 0;
  const highlights = dayHighlights(s, viewer);
  const st = standing(withJamPaid(s), viewer);
  const best = Math.max(...r.income);
  const rem = s.config.days - s.day;
  return (
    <div class="sales-card">
      <div class="sc-title">{rem === 0 ? 'MARKET CLOSED' : `END OF DAY ${s.day}`}</div>
      <div class="sc-money ledger" aria-label="Day ledger">
        <span>Sales <b class="good">+${sales}</b></span>
        {bought > 0 && <span>Bought <b class="bad">−${bought}</b></span>}
        {jam > 0 && <span>{jamTonight ? 'Jam maker tonight' : 'Jam maker'} <b class="good">+${jam}</b></span>}
        {other !== 0 && <span>Other <b class={other > 0 ? 'good' : 'bad'}>{other > 0 ? '+' : '−'}${Math.abs(other)}</b></span>}
        {net !== null && <span class="net">Net <b class={net >= 0 ? 'good' : 'bad'}>{net >= 0 ? '+' : '−'}${Math.abs(net)}</b></span>}
      </div>
      {tonight && <div class={spoil > 0 ? 'sc-waste' : 'sc-juice'}>{tonight}</div>}
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
