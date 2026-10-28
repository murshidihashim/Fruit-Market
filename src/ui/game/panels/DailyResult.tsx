// Daily challenge: submits the score and shows the leaderboard.
import { useEffect, useState } from 'preact/hooks';
import type { GameState } from '../../../engine/game';
import { fetchDaily, shareText, submitDaily, type BoardResult } from '../../../net/daily';
import { track } from '../../../net/telemetry';

export function DailyResult({ s }: { s: GameState }) {
  const [res, setRes] = useState<BoardResult | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let alive = true;
    void (s.moves ? submitDaily(s) : fetchDaily(s.config.daily!)).then((r) => { if (alive) setRes(r); });
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
  return (
    <div class="daily-result">
      <p class="chip">Daily market {s.config.daily}</p>
      {!res ? <p class="muted">Checking the leaderboard…</p>
        : res.error ? <p class="muted">{res.error}</p>
        : (
          <>
            {res.rank && <p class="dr-rank">You're <b>#{res.rank}</b> today</p>}
            <ol class="board">
              {res.top.slice(0, 5).map((e, i) => <li><span>{i + 1}. {e.name}</span><b>${e.cash}</b></li>)}
            </ol>
          </>
        )}
      <button class="btn wide" onClick={share}>{copied ? 'Copied! Paste it in a chat' : 'Share your result'}</button>
    </div>
  );
}
