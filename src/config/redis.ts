import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://iraap-redis:6379";

// Define the options once
export const redisOptions = {
  maxRetriesPerRequest: null, 
  tls: redisUrl.startsWith("rediss://")
    ? { rejectUnauthorized: false }
    : undefined,
  lazyConnect: true,
  enableReadyCheck: false,
  connectTimeout: 15000,
  // Upstash is sensitive to idle connections, keepalive helps
  keepAlive: 30000, 
};

// Create the connection using the standard constructor (remove .default)
export const redisConnection = new Redis.default(redisUrl, redisOptions);

// Helpful for logging
redisConnection.on("error", (err) => console.error("Redis Error:", err));
