// PLAN-102: after the host starts a private room, each person chooses a shopkeeper and confirms.
// Clicks "Choose …" (or moves on when the one shown is taken), then "Confirm …", until this phone is waiting or the
// match has begun. Usage: await pickShopkeeper(P) for each player (in parallel is fine: first come, first served).
async function pickShopkeeper(P, timeout = 20000) {
  const p = P.page;
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await p.locator('.market-stall, .pick-wait').count()) return;
    const confirm = p.locator('.pick-confirm');
    if (await confirm.count()) { await confirm.click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(150); continue; }
    const choose = p.locator('.pick-choose');
    if (await choose.count()) {
      if (await choose.isDisabled().catch(() => false)) await p.click('.sb-arrow[aria-label="Next shopkeeper"]', { timeout: 2000 }).catch(() => {});
      // Short timeouts: someone else may take the one shown between the check and the click.
      else await choose.click({ timeout: 2000 }).catch(() => {});
      await p.waitForTimeout(150);
      continue;
    }
    await p.waitForTimeout(100);
  }
  throw new Error(`${P.tag}: could not choose a shopkeeper within ${timeout} ms`);
}

module.exports = { pickShopkeeper };
