// An on/off switch with its name and a line under it, for Settings and the in-game menu.

export function Toggle({ on, set, title, text }: { on: boolean; set: (v: boolean) => void; title: string; text: string }) {
  return (
    <label class="toggle">
      <span><b>{title}</b><small>{text}</small></span>
      <input type="checkbox" checked={on} onChange={(e) => set((e.target as HTMLInputElement).checked)} />
      <i />
    </label>
  );
}
