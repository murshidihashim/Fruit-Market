// One contested sale, revealed price by price.
import { lookOf } from '../../../engine/data';
import type { GameState, LineResult } from '../../../engine/game';
import type { LineStory, Reaction } from '../../../engine/story';
import { Face, Fruit } from '../../art';

export interface ShowState { line: LineResult; n: number; of: number; stage: 'intro' | 'reveal' | 'result'; shown: number; story: LineStory; react: Reaction | null; cust: string }

export function Showdown({ s, a, viewer }: { s: GameState; a: ShowState; viewer: number }) {
  const l = a.line;
  // Reveal from the highest price down, so the winning price lands last.
  const order = [...l.offers].map((o, i) => ({ o, i })).sort((x, y) => y.o.price - x.o.price || y.i - x.i);
  const done = a.stage === 'result';
  return (
    <div class={`auction ${done ? `tone-${a.story.tone}` : ''}`} role="status">
      <div class="au-top"><span>SHOWDOWN {a.n}/{a.of}</span><span>cheapest sells first</span></div>
      <div class="au-cust">
        <span class="au-face"><Face who={l.name} size={44} /></span>
        <div class="au-ask">
          <b>{lookOf(l.name).title}</b>
          <span class="au-want"><Fruit id={l.fruit} size={20} /><b>×{l.want}</b><span class="au-cap">pays up to <b>${l.max}</b> each</span></span>
          {done && a.cust && <span class="au-say">“{a.cust}”</span>}
        </div>
      </div>
      <div class="au-offers">
        {order.map(({ o, i }, k) => {
          const pl = s.players[o.player];
          const open = k < a.shown;
          const res = done ? (o.sold ? 'won' : 'lost') : '';
          return (
            <div class={`au-offer ${open ? 'open' : 'sealed'} ${res} ${o.player === viewer ? 'me' : ''}`}>
              <span class="au-who"><Face who={pl.avatar} size={26} /></span>
              <span class="au-name">{o.player === viewer ? 'You' : pl.name}<small>{o.player === viewer ? 'offer' : 'offers'} {o.qty}</small></span>
              <span class="au-price">{open ? `$${o.price}` : '?'}</span>
              {done && <span class="au-res">{a.story.tags[i]}</span>}
            </div>
          );
        })}
      </div>
      {done && (
        <div class={`au-why ${a.story.tone}`}>
          {a.story.tone === 'bad' && a.story.headline.includes('undercut you') && <span class="au-kick">Outfoxed!</span>}
          <b>{a.story.headline}</b>
          {a.story.detail && <small>{a.story.detail}</small>}
        </div>
      )}
    </div>
  );
}
