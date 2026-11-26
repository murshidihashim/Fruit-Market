// REP-140 B-17: a player's name is never cut without them seeing it. The name boxes hold the name as the room server
// keeps it (one limit, NAME_MAX, for the room, the account profile and every name box), and a name on a set-up card
// wraps instead of being cut.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { h } from 'preact';
import { NAME_MAX } from '../src/net/protocol';
import { cleanProfile } from '../src/net/profile';
import { tidy } from '../server/names';
import { toStaticHtml } from '../src/ui/cards';
import { LocalSetup, SeatCard } from '../src/ui/Setup';
import { fitName } from '../src/ui/store';

vi.mock('preact/hooks', () => ({
  useState: (v: unknown) => [typeof v === 'function' ? (v as () => unknown)() : v, () => undefined],
  useEffect: () => undefined, useLayoutEffect: () => undefined,
  useRef: (v: unknown) => ({ current: v }), useMemo: (f: () => unknown) => f(), useCallback: (f: unknown) => f,
}));

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => mem.set(k, v), removeItem: (k: string) => mem.delete(k),
  };
});

describe('B-17: one name limit, and the box shows what is kept', () => {
  it('the account profile keeps as many letters as the room (NAME_MAX)', () => {
    expect(cleanProfile({ name: 'Aisha binti Abdullah' }).name).toBe('Aisha binti Abdullah'.slice(0, NAME_MAX));
    expect(cleanProfile({ name: 'x'.repeat(40) }).name.length).toBe(NAME_MAX);
  });
  it('a name in the box is exactly what the room server keeps: nothing more is cut when it is sent', () => {
    for (const raw of ['Aisha binti Abdullah', '  Nurul   Aisyah  binti ', 'Ｆｕｌｌ ｗｉｄｔｈ ｎａｍｅ ｈｅｒｅ', 'ﬁﬁﬁﬁﬁﬁﬁﬁﬁﬁﬁﬁﬁﬁ', 'Ana']) {
      const shown = fitName(raw);
      expect(shown.length, raw).toBeLessThanOrEqual(NAME_MAX);
      expect(tidy(shown), raw).toBe(shown.trim());
    }
    expect(fitName('Ana')).toBe('Ana');
  });
  it('a name stored longer than the limit (an older phone) shows in the set-up\'s box as it will be kept', () => {
    mem.set('fm.name', 'Aisha binti Abdullah');
    const html = toStaticHtml(h(LocalSetup, { mode: 'computer', onBack: () => undefined, onStart: () => undefined }));
    expect(html).toContain(`value="${'Aisha binti Abdullah'.slice(0, NAME_MAX)}"`);
    expect(html).toContain(`maxLength="${NAME_MAX}"`);
  });
});

describe('B-17: a name on a small card wraps instead of being cut', () => {
  it('a long name is marked to be set a step smaller; a short one is not', () => {
    const card = (title: string) => toStaticHtml(h(SeatCard, { top: 'Stall 2', title, band: 'y', small: 'Level', big: 'Normal' }));
    expect(card('Uncle Benny')).toContain('class="sb-cttl long"');
    expect(card('Rosa')).toContain('class="sb-cttl"');
  });
});
