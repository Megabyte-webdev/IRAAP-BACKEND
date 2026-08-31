import Redis from "ioredis";
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) throw new Error("REDIS_URL is not defined");

// Define the options once
export const redisOptions = {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableReadyCheck: false,
  connectTimeout: 15_000,
  retryStrategy(times) {
    return Math.min(times * 500, 5_000);
  },
  // Upstash is sensitive to idle connections, keepalive helps
  keepAlive: 30_000,
};

// Create the connection using the standard constructor (remove .default)
export const redisConnection = new Redis.default(redisUrl, redisOptions);

// Helpful for logging
redisConnection.on("connect", () => console.log("Connected to Redis"));
redisConnection.on("ready", () => console.log("Redis connection is ready"));
