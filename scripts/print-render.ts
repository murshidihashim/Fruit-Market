// Turns a document of the print kit into a PDF with Playwright's Chromium, and refuses to write one that would print
// wrong: a picture that did not load, a font that fell back, a card or page whose contents do not fit, or a page count
// that is not the number of pages laid out. Used by scripts/print-deck.ts and scripts/print-update.ts.
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Browser } from 'playwright';

/** The fonts every card is set in (print-fonts.css). A missing one would fall back without a word and change every fit. */
export const CARD_FONTS = ['400 10px "Ticket Display"', '400 10px Archivo', '500 10px Archivo', '600 10px Archivo', '800 10px Archivo'];

/** How many pages a PDF written by Chromium holds. */
export function pdfPages(file: string): number {
  return (readFileSync(file).toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length;
}

/**
 * Write `html` (pages are <section class="pg"> or "page") to `out/file`. `tmp` holds the HTML while the browser reads it.
 * `fonts`: the faces the document is set in (the cards' own unless given).
 * Returns the number of pages written.
 */
export async function renderPdf(browser: Browser, tmp: string, out: string, file: string, html: string, fonts: string[] = CARD_FONTS): Promise<number> {
  const htmlFile = join(tmp, file.replace(/\.pdf$/, '.html'));
  writeFileSync(htmlFile, html);
  const page = await browser.newPage();
  try {
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
    await page.evaluate(async (fonts) => {
      await Promise.all(fonts.map((f) => document.fonts.load(f)));
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => (i.complete ? Promise.resolve() : i.decode().catch(() => undefined))));
    }, fonts);
    const problems = await page.evaluate((fonts) => {
      const out: string[] = [];
      const name = (el: Element) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(el.textContent ?? '').trim().slice(0, 40)}"`;
      const card = (el: Element) => (el.closest('[data-card]')?.getAttribute('data-card') ?? (el.closest('.cd, .cd-bk')?.textContent ?? '').trim().slice(0, 30));
      for (const f of fonts) if (!document.fonts.check(f)) out.push(`font not loaded: ${f}`);
      for (const i of document.images) if (!i.naturalWidth) out.push(`picture did not load: ${i.src.slice(0, 120)}`);
      // A back's tile is a background picture: it must be there too.
      document.querySelectorAll<HTMLElement>('.cd-bk').forEach((el) => {
        if (!/url\(/.test(getComputedStyle(el).backgroundImage) && !el.querySelector('.pk-tiles')) out.push(`back without its tile: ${name(el)}`);
      });
      // Nothing may be taller or wider than its page or its card.
      document.querySelectorAll('.pg, .page, .cd, .cd-bk').forEach((el) => {
        if (el.scrollHeight > el.clientHeight + 1) out.push(`too tall by ${el.scrollHeight - el.clientHeight}px: ${name(el)}`);
        if (el.scrollWidth > el.clientWidth + 1) out.push(`too wide by ${el.scrollWidth - el.clientWidth}px: ${name(el)}`);
      });
      // Inside a card, no line of words may be wider than its box, and nothing may reach outside the card.
      document.querySelectorAll('.cd, .cd-bk').forEach((cd) => {
        const box = cd.getBoundingClientRect();
        cd.querySelectorAll('*').forEach((el) => {
          if (el.closest('.pk-tiles')) return; // a back's tiles run past its edge on purpose and are cut off there
          if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) out.push(`${card(el)}: words wider than their box by ${el.scrollWidth - el.clientWidth}px: ${name(el)}`);
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.left < box.left - 0.5 || r.right > box.right + 0.5 || r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5)) out.push(`${card(el)}: outside its card: ${name(el)}`);
        });
        // Two labels on one line (the label and its note, the two halves of a footer) may not run into each other.
        cd.querySelectorAll('.cd-top, .cd-kind, .cd-ft').forEach((row) => {
          const kids = [...row.children].map((k) => k.getBoundingClientRect()).filter((r) => r.width > 0);
          for (let i = 1; i < kids.length; i++) {
            const sameLine = Math.abs(kids[i].top - kids[i - 1].top) < kids[i].height / 2;
            if (sameLine && kids[i].left < kids[i - 1].right - 0.5) out.push(`${card(row)}: labels overlap: ${name(row)}`);
          }
        });
      });
      // A one-line label that is cut short with an ellipsis.
      document.querySelectorAll('.pg *').forEach((el) => {
        const s = getComputedStyle(el);
        if (s.whiteSpace === 'nowrap' && s.overflow === 'hidden' && el.textContent?.trim() && el.scrollWidth > el.clientWidth + 1) out.push(`cut short: ${name(el)}`);
      });
      return out;
    }, fonts);
    if (problems.length) throw new Error(`${file}: it would print wrong\n${[...new Set(problems)].join('\n')}`);
    // Not an error, but worth a word: a card so full that its picture is smaller than the app's smallest (76 units).
    const squeezed = await page.evaluate(() => [...document.querySelectorAll('.pk-slot .cd-pic, .pk-bleed .cd-pic')].flatMap((pic) => {
      const cd = pic.closest('.cd');
      if (!cd) return [];
      const u = cd.getBoundingClientRect().width / 252;
      const tall = pic.getBoundingClientRect().height / u;
      return tall < 75.5 ? [`${pic.closest('[data-card]')?.getAttribute('data-card') ?? '?'}: picture ${Math.round(tall)} units tall, the app's smallest is 76`] : [];
    }));
    for (const note of new Set(squeezed)) console.log(`  note, ${file}: ${note}`);
    const laidOut = await page.evaluate(() => document.querySelectorAll('.pg, .page').length);
    await page.pdf({ path: join(out, file), preferCSSPageSize: true, printBackground: true });
    const written = pdfPages(join(out, file));
    if (laidOut && written !== laidOut) throw new Error(`${file}: ${laidOut} pages were laid out but the PDF has ${written}`);
    console.log(`wrote ${join(out, file)} (${written} pages, ${(statSync(join(out, file)).size / 1e6).toFixed(1)} MB)`);
    return written;
  } finally {
    await page.close();
  }
}
