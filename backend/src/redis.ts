import { createClient } from "redis";
import { ENV } from "./env.js";

export const redis = createClient({ url: ENV.REDIS_URL });
redis.on("error", e => console.error("Redis error:", e));
await redis.connect();
