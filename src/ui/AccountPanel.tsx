// Settings section for the optional account: sign up or sign in with an ID and a password, sync, sign out, delete.
import { useState } from 'preact/hooks';
import { accountsAvailable, deleteAccount, signedInAs, signIn, signOut, signUp, syncNow } from './account';
import { fx } from './fx';

export function AccountPanel({ onChange }: { onChange: () => void }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [me, setMe] = useState(signedInAs());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [bad, setBad] = useState(false);
  const [confirming, setConfirming] = useState(false);
  if (!accountsAvailable()) return null;

  const run = async (job: () => Promise<string | null>, ok: string) => {
    setBusy(true);
    setMsg('');
    const err = await job();
    setBusy(false);
    setBad(!!err);
    setMsg(err ?? ok);
    setMe(signedInAs());
    if (!err) { fx.tap(); onChange(); }
    return !err;
  };

  const field = (value: string, set: (v: string) => void, label: string, type: string, auto: string) => (
    <label class="acct-field">
      <span class="small">{label}</span>
      <input class="input" type={type} value={value} autocomplete={auto} autocapitalize="none" spellcheck={false} maxLength={72}
        onInput={(e) => set((e.target as HTMLInputElement).value)} />
    </label>
  );

  if (me) {
    return (
      <section class="panel acct">
        <h3>Account</h3>
        <p>Signed in as <b>{me}</b>. Your trophies, looks and records follow you to any phone you sign in on.</p>
        <button class="btn wide" disabled={busy} onClick={() => run(syncNow, 'Saved to your account.')}>Save to my account now</button>
        <button class="btn wide" disabled={busy} onClick={async () => { if (await run(signOut, 'Signed out. This phone is ready for a new player.')) { setPw(''); } }}>Sign out</button>
        <p class="muted small">Signing out saves everything to your account and then clears it from this phone. Sign in again to bring it back.</p>
        {!confirming ? (
          <button class="btn ghost wide" disabled={busy} onClick={() => setConfirming(true)}>Delete my account…</button>
        ) : (
          <div class="acct-delete">
            <p class="warn-text small">This deletes your account from the server for good. What is on this phone stays. Enter your password to confirm.</p>
            {field(pw, setPw, 'Password', 'password', 'current-password')}
            <button class="btn wide" disabled={busy || !pw} onClick={async () => { if (await run(() => deleteAccount(pw), 'Your account was deleted.')) { setConfirming(false); setPw(''); } }}>Delete for good</button>
            <button class="btn ghost wide" onClick={() => { setConfirming(false); setPw(''); }}>Keep my account</button>
          </div>
        )}
        {msg && <p role="status" class={bad ? 'warn-text small' : 'muted small'}>{msg}</p>}
      </section>
    );
  }

  return (
    <section class="panel acct">
      <h3>Account</h3>
      <p class="small muted">Optional. An ID and a password keep your trophies, looks and records safe and let you use them on another phone. There is no email, so <b>there is no way to reset a forgotten password</b>. Don't use a password you use anywhere else.</p>
      {field(id, setId, 'ID (letters, numbers, underscores)', 'text', 'username')}
      {field(pw, setPw, 'Password (8 or more characters)', 'password', 'current-password')}
      <div class="row2">
        <button class="btn primary" disabled={busy || !id || !pw} onClick={() => run(() => signUp(id, pw), 'Account created. Your trophies are saved to it.')}>Create account</button>
        <button class="btn" disabled={busy || !id || !pw} onClick={() => run(() => signIn(id, pw), 'Signed in.')}>Sign in</button>
      </div>
      {msg && <p role="status" class={bad ? 'warn-text small' : 'muted small'}>{msg}</p>}
    </section>
  );
}
