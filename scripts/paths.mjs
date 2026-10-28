// Cross-platform helpers for the Node scripts (PLAN-037), so they run the same on Windows, macOS and Linux.
// Why: `new URL('..', import.meta.url).pathname` gives "/C:/Users/Name%20Here/..." on Windows (a leading
// slash before the drive letter and %20 for spaces), which no Windows file call accepts. And a Git for
// Windows checkout usually has CRLF line endings, so text compared with freshly generated LF text never matches.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const isWin = () => process.platform === 'win32';

/** The repository root (the folder above scripts/) for a script's import.meta.url, as a native path ending in a separator. */
export function repoRoot(metaUrl, { windows = isWin() } = {}) {
  const p = windows ? path.win32 : path.posix;
  const file = fileURLToPath(metaUrl, { windows });
  return p.join(p.dirname(p.dirname(file)), p.sep);
}

/** True when this module is the script Node was started with (`node scripts/x.mjs`), on any platform. */
export function isMain(metaUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  return pathToFileURL(path.resolve(argv1)).href === metaUrl;
}

/** Line endings as LF, so a CRLF checkout compares equal to generated text. */
export const lf = (text) => text.replace(/\r\n/g, '\n');
