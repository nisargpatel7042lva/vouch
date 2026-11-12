/** Simple in-memory per-IP rate limiter. */

interface Window {
  count: number
  resetAt: number
}

const store = new Map<string, Window>()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 10

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const existing = store.get(ip)

  if (!existing || existing.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_REQUESTS - 1 }
  }

  if (existing.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 }
  }

  existing.count++
  return { allowed: true, remaining: MAX_REQUESTS - existing.count }
}

export function resetRateLimit(ip: string): void {
  store.delete(ip)
}
