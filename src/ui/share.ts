// REP-140 B-18: copying a link or a result on a device with no share sheet (a computer), and the words that say how it
// went. Used by the results, the Daily market's result and the online room's invite.

/** Said once a link has been copied. */
export const LINK_COPIED = 'Link copied';
/** Said when nothing could be copied. */
export const NOT_COPIED = 'Could not copy';

/** Copies text to the clipboard. False when there is no clipboard or it refuses (no permission, or not a secure page). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false; // refused: the caller says it could not copy
  }
}
