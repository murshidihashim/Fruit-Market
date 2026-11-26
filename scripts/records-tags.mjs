// REP-140 A-11 (PLAN-130): a release still marked "candidate" whose tag v<version> already exists was most likely
// published, and its record not brought up to date. `records.mjs --check` warns about it without failing: the records
// are valid, only behind. Tags are looked up in this checkout only, so where there are none (CI's shallow checkout
// fetches none) nothing is said.
import { execFileSync } from 'node:child_process';

/** The warnings for these releases. `hasTag(name)` says whether the tag exists here. */
export function candidateTagWarnings(releases, hasTag) {
  return releases
    .filter((r) => r.status === 'candidate' && hasTag(`v${r.version}`))
    .map((r) => `Release ${r.version} is still "candidate", but tag v${r.version} exists. If it was published, mark it published (date, commit, tagged) in a new commit.`);
}

/** Whether tag `name` exists in the git checkout at `root`. */
export function localTagExists(root, name) {
  try {
    return execFileSync('git', ['tag', '--list', name], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() === name;
  } catch {
    return false; // not a git checkout, or no git: the warning is only a reminder, so say nothing
  }
}
