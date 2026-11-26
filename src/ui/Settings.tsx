// Settings: the switches (sound, vibration, Fast play, Reduced motion, music, reactions, anonymous stats), full
// screen, Replay the tutorial, your stats and About. Moved out of App.tsx (REP-140 A-02); the screen is unchanged.
import { useState } from 'preact/hooks';
import { fx, setMusic } from './fx';
import { setStill } from './motion';
import { FAST_PLAY, REDUCED_MOTION, phoneStill } from './settingWords';
import { FullScreenButton } from './FullScreenButton';
import { resetTutorial } from './tutorial';
import { BackArrow } from './stampCard';
import { Toggle } from './Toggle';
import { loadSettings, loadStats, saveSettings, type Settings } from './store';

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [st, setSt] = useState<Settings>(loadSettings());
  // S19 (PLAN-110): "Replay the tutorial next game" says that it worked.
  const [replay, setReplay] = useState(false);
  const stats = loadStats();
  // The phone's own reduced-motion setting: then the game's switch shows on (the phone's setting wins).
  const phone = phoneStill();
  const upd = (p: Partial<Settings>) => {
    const n = { ...st, ...p };
    setSt(n);
    saveSettings(n);
  };
  // S17 (PLAN-110): in the square Market Ticket look, under the black bar Trophies has.
  return (
    <div class="page tk-page settings">
      <header class="topbar"><button class="icon-btn" aria-label="Back" onClick={onBack}><BackArrow /></button><div class="day"><b>Settings</b></div></header>
      <main class="scroll pad">
        <section class="panel">
          <Toggle on={st.sound} set={(v) => upd({ sound: v })} title="Sound" text="Coins, cards and cheers." />
          <Toggle on={st.haptics} set={(v) => upd({ haptics: v })} title="Vibration" text="A small buzz when you buy." />
          {/* PLAN-123: "Fast" speeds up every move on the table and the computers' turns (motion.ts setBaseSpeed), so it
              is named for what it does; Reduced motion is the game's own switch beside the phone's setting. */}
          {/* REP-140 B-15: the in-game menu has the same two switches, in the same words (settingWords.ts). */}
          <Toggle on={st.fast} set={(v) => upd({ fast: v })} title={FAST_PLAY.title} text={FAST_PLAY.text} />
          <Toggle on={st.still || phone} set={(v) => { upd({ still: v }); setStill(v); }} title={REDUCED_MOTION.title} text={REDUCED_MOTION.text(phone)} />
          <Toggle on={st.music} set={(v) => { upd({ music: v }); setMusic(v); }} title="Music" text="A gentle market tune." />
          <Toggle on={st.reactions} set={(v) => upd({ reactions: v })} title="Show reactions" text="Emoji and short lines other players send in online games." />
          <Toggle on={st.analytics} set={(v) => upd({ analytics: v })} title="Share anonymous stats" text="Helps fix crashes and balance the game. No names or IDs are sent." />
          <FullScreenButton />
          <button class="btn wide" disabled={replay} onClick={() => { resetTutorial(); fx.tap(); setReplay(true); }}>Replay the tutorial next game</button>
          {replay && <p class="tk-done" role="status">Done. The tips will show in your next game.</p>}
        </section>
        <section class="panel">
          <h3>Your stats</h3>
          <div class="stats">
            <div><b>{stats.played}</b><small>Games</small></div>
            <div><b>{stats.wins}</b><small>Wins</small></div>
            <div><b>${stats.bestCash}</b><small>Best</small></div>
            <div><b>{stats.totalSold}</b><small>Fruit sold</small></div>
          </div>
        </section>
        <section class="panel small">
          <h3>About</h3>
          <p>Fruit Market: a game designed by Murshidi bin Md Hashim.</p>
          <p class="muted">No ads. An account is optional and only keeps your trophies, looks and records. Your games stay on your phone. If you allow it, anonymous counts (like "a game was finished") are sent to help improve the game.</p>
          <p><a href="/privacy.html" target="_blank" rel="noopener">Privacy policy</a></p>
          <p class="muted">Version {__APP_VERSION__}</p>
        </section>
      </main>
    </div>
  );
}

declare const __APP_VERSION__: string;
