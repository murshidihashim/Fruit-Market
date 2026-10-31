// Per-IP rate limits for the write endpoints, using Cloudflare's built-in rate-limiting bindings
// (configured in wrangler.jsonc, no extra library). If a binding is missing or fails, requests
// are allowed: limits protect the service, they must never break normal play.

export interface Limiter { limit(opts: { key: string }): Promise<{ success: boolean }> }

/** Which binding guards which route (limits per minute are set in wrangler.jsonc). */
export const ROUTE_LIMITER = { rooms: 'RL_ROOMS', quick: 'RL_ROOMS', daily: 'RL_DAILY', t: 'RL_EVENTS', account: 'RL_ACCOUNT' } as const;
export type LimitedRoute = keyof typeof ROUTE_LIMITER;

export async function allowed(limiter: Limiter | undefined, route: LimitedRoute, ip: string | null): Promise<boolean> {
  if (!limiter) return true;
  try {
    return (await limiter.limit({ key: `${route}:${ip ?? 'unknown'}` })).success;
  } catch {
    return true;
  }
}
