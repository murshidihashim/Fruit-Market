// The Daily market on the results: submits the score and shows the day's board, with your own shopkeeper's picture
// on your line (for show only: in the Daily market the perk is picked from three, PLAN-086).
import { useEffect, useState } from 'preact/hooks';
import type { GameState } from '../../../engine/game';
import { fetchDaily, shareText, submitDaily, type BoardResult } from '../../../net/daily';
import { track } from '../../../net/telemetry';
import { worn } from '../../looks';
import { unlockAchievement } from '../../progress';
import { FramedFace, shownAvatar } from '../../stampCard';

export function DailyResult({ s }: { s: GameState }) {
  const [res, setRes] = useState<BoardResult | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    void (s.moves ? submitDaily(s) : fetchDaily(s.config.daily!)).then((r) => {
      if (r.rank && r.rank <= 10) unlockAchievement('daily_top10');
      if (alive) setRes(r);
    });
    return () => { alive = false; };
  }, []);
  const share = async () => {
    const text = `${shareText(s, res?.rank)}\nPlay: https://fruit-market.murshidi-hashim.workers.dev`;
    track('daily_share');
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setCopied(true); }
    } catch { /* cancelled */ }
  };
  const me = s.players.findIndex((p) => p.kind === 'human');
  const mine = <FramedFace who={shownAvatar(s.players, me)} size={20} look={worn()} />;
  return (
    <div class="sbk-box daily-result">
      <div class="sbk-row"><span class="sbk-lab">Daily market {s.config.daily}</span>{res?.rank && <span class="dr-rank">You're <b>#{res.rank}</b> today</span>}</div>
      {!res ? <span class="sbk-sub">Checking the leaderboard…</span>
        : res.error ? <span class="sbk-sub">{res.error}</span>
        : (
          <ol class="sbk-board board">
            {res.top.slice(0, 5).map((e, i) => <li class={res.rank === i + 1 ? 'me' : ''}><b>{i + 1}.</b>{res.rank === i + 1 && mine}<span>{e.name}</span><b>${e.cash}</b></li>)}
            {res.rank && res.rank > 5 && me >= 0 && <li class="me"><b>{res.rank}.</b>{mine}<span>You</span><b>${s.players[me].cash}</b></li>}
          </ol>
        )}
      <button class="sbk-btn gh" style="min-height: 40px" onClick={share}>{copied ? 'Copied. Paste it in a chat.' : 'Share your result'}</button>
    </div>
  );
}
