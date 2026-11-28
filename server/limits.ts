// Per-IP rate limits for the write endpoints, using Cloudflare's built-in rate-limiting bindings
// (configured in wrangler.jsonc, no extra library). If a binding is missing or fails, requests
// are allowed: limits protect the service, they must never break normal play.

export interface Limiter { limit(opts: { key: string }): Promise<{ success: boolean }> }

/** Which binding guards which route (limits per minute are set in wrangler.jsonc). */
/** PLAN-114: a Sprint submission shares the Daily market's binding and limit, on its own key. */
/** PLAN-112: the Public rooms list is read every few seconds while the online screen is open, so it shares the larger
 *  per-minute limit of the usage counters (each route counts on its own key). */
export const ROUTE_LIMITER = { rooms: 'RL_ROOMS', quick: 'RL_ROOMS', daily: 'RL_DAILY', sprint: 'RL_DAILY', t: 'RL_EVENTS', account: 'RL_ACCOUNT', public: 'RL_EVENTS', m: 'RL_EVENTS', s: 'RL_EVENTS', forget: 'RL_ACCOUNT' } as const;
export type LimitedRoute = keyof typeof ROUTE_LIMITER;

export async function allowed(limiter: Limiter | undefined, route: LimitedRoute, ip: string | null): Promise<boolean> {
  if (!limiter) return true;
  try {
    return (await limiter.limit({ key: `${route}:${ip ?? 'unknown'}` })).success;
  } catch {
    return true;
  }
}
