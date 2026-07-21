const buckets = new Map();
let nextSweepAt = 0;

function rateLimit({ windowMs = 60000, max = 60, key = (req) => req.ip, message = 'Rate limit exceeded' } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    if (now >= nextSweepAt) {
      for (const [storedKey, stored] of buckets) {
        if (stored.resetAt <= now) buckets.delete(storedKey);
      }
      nextSweepAt = now + 60000;
    }
    const bucketKey = String(key(req) || req.ip || 'unknown');
    const existing = buckets.get(bucketKey);
    const bucket = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + windowMs } : existing;
    bucket.count += 1;
    buckets.set(bucketKey, bucket);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) return res.status(429).json({ error: message });
    return next();
  };
}

function resetRateLimits() { buckets.clear(); nextSweepAt = 0; }

module.exports = { rateLimit, resetRateLimits };
