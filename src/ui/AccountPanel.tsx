// Settings section for the optional account: sign up or sign in with an ID and a password, sync, sign out, delete.
// REP-140 A-02: the guest's form and the signed-in section are their own parts; the panel holds what they share.
import { useState } from 'preact/hooks';
import { accountsAvailable, changePassword, deleteAccount, signedInAs, signIn, signOut, signUp, syncNow } from './account';
import { fx } from './fx';

/** One labelled field. */
function Field({ value, set, label, type, auto }: { value: string; set: (v: string) => void; label: string; type: string; auto: string }) {
  return (
    <label class="acct-field">
      <span class="small">{label}</span>
      <input class="input" type={type} value={value} autocomplete={auto} autocapitalize="none" spellcheck={false} maxLength={72}
        onInput={(e) => set((e.target as HTMLInputElement).value)} />
    </label>
  );
}

/** Runs an account job: busy while it runs, then its error, or `ok`. Resolves true when it worked. */
type Run = (job: () => Promise<string | null>, ok: string) => Promise<boolean>;

export function AccountPanel({ onChange }: { onChange: () => void }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [me, setMe] = useState(signedInAs());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [bad, setBad] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [changing, setChanging] = useState(false);
  const [pw2, setPw2] = useState('');
  if (!accountsAvailable()) return null;

  const run: Run = async (job, ok) => {
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
  const status = msg && <p role="status" class={bad ? 'warn-text small' : 'muted small'}>{msg}</p>;

  if (me) {
    return (
      <section class="panel acct">
        <p>Signed in as <b>{me}</b>. Your trophies, looks and records follow you to any phone you sign in on.</p>
        <button class="btn wide" disabled={busy} onClick={() => run(syncNow, 'Saved to your account.')}>Save to my account now</button>
        <button class="btn wide" disabled={busy} onClick={async () => { if (await run(signOut, 'Signed out. This phone is ready for a new player.')) { setPw(''); } }}>Sign out</button>
        <p class="muted small">Signing out saves everything to your account and then clears it from this phone. Sign in again to bring it back.</p>
        <NewPassword busy={busy} run={run} open={changing} setOpen={setChanging} pw={pw} setPw={setPw} pw2={pw2} setPw2={setPw2} />
        <DeleteAccount busy={busy} run={run} open={confirming} setOpen={setConfirming} pw={pw} setPw={setPw} />
        {status}
      </section>
    );
  }

  return (
    <section class="panel acct">
      <p class="small muted">Optional. An ID and a password keep your trophies, looks and records safe and let you use them on another phone. There is no email, so <b>there is no way to reset a forgotten password</b>. Don't use a password you use anywhere else.</p>
      <Field value={id} set={setId} label="ID (letters, numbers, underscores)" type="text" auto="username" />
      <Field value={pw} set={setPw} label="Password (8 or more characters)" type="password" auto="current-password" />
      <div class="row2">
        <button class="btn primary" disabled={busy || !id || !pw} onClick={() => run(() => signUp(id, pw), 'Account created. Your trophies are saved to it.')}>Create account</button>
        <button class="btn" disabled={busy || !id || !pw} onClick={() => run(() => signIn(id, pw), 'Signed in.')}>Sign in</button>
      </div>
      {status}
    </section>
  );
}

interface Part { busy: boolean; run: Run; open: boolean; setOpen: (v: boolean) => void; pw: string; setPw: (v: string) => void }

/** Change my password: the current one and a new one. */
function NewPassword({ busy, run, open, setOpen, pw, setPw, pw2, setPw2 }: Part & { pw2: string; setPw2: (v: string) => void }) {
  if (!open) return <button class="btn ghost wide" disabled={busy} onClick={() => setOpen(true)}>Change my password…</button>;
  const close = () => { setOpen(false); setPw(''); setPw2(''); };
  return (
    <div class="acct-delete">
      <Field value={pw} set={setPw} label="Current password" type="password" auto="current-password" />
      <Field value={pw2} set={setPw2} label="New password (8 or more characters)" type="password" auto="new-password" />
      <button class="btn wide" disabled={busy || !pw || !pw2} onClick={async () => { if (await run(() => changePassword(pw, pw2), 'Password changed. Other phones will ask you to sign in again.')) close(); }}>Save new password</button>
      <button class="btn ghost wide" onClick={close}>Cancel</button>
    </div>
  );
}

/** Delete my account: for good, with the password to confirm. What is on this phone stays. */
function DeleteAccount({ busy, run, open, setOpen, pw, setPw }: Part) {
  if (!open) return <button class="btn ghost wide" disabled={busy} onClick={() => setOpen(true)}>Delete my account…</button>;
  const close = () => { setOpen(false); setPw(''); };
  return (
    <div class="acct-delete">
      <p class="warn-text small">This deletes your account from the server for good. What is on this phone stays. Enter your password to confirm.</p>
      <Field value={pw} set={setPw} label="Password" type="password" auto="current-password" />
      <button class="btn wide" disabled={busy || !pw} onClick={async () => { if (await run(() => deleteAccount(pw), 'Your account was deleted.')) close(); }}>Delete for good</button>
      <button class="btn ghost wide" onClick={close}>Keep my account</button>
    </div>
  );
}
