type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const storeKey = "__squareRateLimitBuckets";

function buckets() {
  const g = globalThis as typeof globalThis & { [storeKey]?: Map<string, Bucket> };
  if (!g[storeKey]) g[storeKey] = new Map();
  return g[storeKey];
}

export function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function checkRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const map = buckets();
  const current = map.get(key);

  if (!current || current.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + options.windowMs });
    return { limited: false as const, remaining: options.max - 1, retryAfter: 0 };
  }

  current.count += 1;
  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));

  if (current.count > options.max) {
    return { limited: true as const, remaining: 0, retryAfter };
  }

  return {
    limited: false as const,
    remaining: Math.max(0, options.max - current.count),
    retryAfter,
  };
}
