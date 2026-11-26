export function candidateTagWarnings(releases: { version: string; status: string }[], hasTag: (name: string) => boolean): string[];
export function localTagExists(root: string, name: string): boolean;
