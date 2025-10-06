import { redis } from "../redis.js";
export function rateLimit(keyFn: (req: any) => string, limit = 60, windowSec = 60) {
  return async (req: any, _res: any, next: any) => {
    const key = keyFn(req);
    const bucket = `rl:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
    const count = (await redis.incr(bucket)) ?? 0;
    if (count === 1) await redis.expire(bucket, windowSec);
    if (count > limit) return next(Object.assign(new Error("rate_limited"), { status: 429 }));
    next();
  };
}
