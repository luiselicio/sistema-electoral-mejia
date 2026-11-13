type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// Rate limiting simple en memoria (adecuado para instancia única; en producción distribuida usar almacén compartido como Redis).
export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (entry.count >= limit) {
    return { ok: false as const, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { ok: true as const, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export function getClientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  const xr = req.headers.get("x-real-ip");
  if (xr) return xr.trim();
  return "unknown";
}