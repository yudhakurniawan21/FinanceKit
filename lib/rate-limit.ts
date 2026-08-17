// Rate limiter token bucket sederhana (in-memory, per instance).
// Cukup untuk mencegah abuse dasar; untuk skala besar ganti dengan store
// bersama (mis. Redis/Upstash) karena memori tidak dibagi antar instance.
type Bucket = { tokens: number; last: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function prune(now: number, ttlMs: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, b] of buckets) {
    if (now - b.last > ttlMs) buckets.delete(key);
  }
}

export function rateLimit(
  key: string,
  options: { capacity: number; refillPerSecond: number }
): boolean {
  const now = Date.now();
  const ttlMs = (options.capacity / options.refillPerSecond) * 1000;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: options.capacity - 1, last: now };
    buckets.set(key, bucket);
    prune(now, ttlMs);
    return true;
  }

  const elapsed = (now - bucket.last) / 1000;
  bucket.tokens = Math.min(
    options.capacity,
    bucket.tokens + elapsed * options.refillPerSecond
  );
  bucket.last = now;

  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}