import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://iraap-redis:6379";

export const redisConnection = new Redis.default(redisUrl, {
  maxRetriesPerRequest: null, // required for BullMQ

  //  REQUIRED for Upstash (rediss://)
  tls: redisUrl.startsWith("rediss://")
    ? { rejectUnauthorized: false }
    : undefined,

  lazyConnect: true,        // better for serverless
  enableReadyCheck: false,  // avoid startup delays
  connectTimeout: 10000,    // prevent fast timeouts
});
