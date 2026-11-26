// The Wardrobe (PLAN-086; PLAN-113): the fourth page of Trophies (WardrobeTab.tsx). `Wardrobe` opens Trophies on it,
// from Home, the online lobby and the pause menu. REP-140 A-08: Trophies is loaded on demand (lazyScreens.ts).
import { trophyScreen } from './lazyScreens';

/** Opens Trophies on the Wardrobe. `onChange` hears every change (online, it tells the room what you have on). */
export function Wardrobe({ onBack, onChange }: { onBack: () => void; onChange?: (look: Record<string, string>) => void }) {
  return <trophyScreen.Screen tab="wardrobe" onBack={onBack} onLook={onChange} />;
}
