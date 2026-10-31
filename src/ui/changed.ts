// A tiny hook: storage code says "something an account keeps just changed", and the account code
// (src/ui/account.ts) listens. It lives apart so store.ts and progress.ts need not import the account code.
let listener: () => void = () => {};

export const onProfileChange = (fn: () => void): void => { listener = fn; };
export const profileChanged = (): void => listener();
