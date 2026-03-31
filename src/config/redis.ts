import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://iraap-redis:6379";

// Create a singleton connection
export const redisConnection = new Redis.default(redisUrl, {
  maxRetriesPerRequest: null, // REQUIRED for BullMQ
});

redisConnection.on("error", (err) =>
  console.error("Redis Connection Error:", err),
);
redisConnection.on("connect", () => console.log("✅ Connected to Redis"));
