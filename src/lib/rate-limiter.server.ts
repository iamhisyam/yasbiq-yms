interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
}

export function checkRateLimit(key: string, max: number, windowMs: number): { allowed: boolean; retryAfter: number | null } {
  cleanup()

  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: null }
  }

  if (bucket.count >= max) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  bucket.count++
  return { allowed: true, retryAfter: null }
}
