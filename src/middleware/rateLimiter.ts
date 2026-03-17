import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { createClient } from "redis";
import helmet from "helmet";
import type { Express } from "express";

// Initialize Redis Client (Use environment variables for security!)
const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.connect().catch(console.error);

export const applyGlobalSecurity = (app: Express) => {
  // 1. Strict Headers
  app.use(helmet());

  // 2. Persistent Rate Limiter
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Stricter limit for production
    standardHeaders: true,
    legacyHeaders: false,
    // The "Magic" part:
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }),
    message: {
      status: 429,
      success: false,
      message: "Security block: Extreme request volume detected.",
    },
  });

  app.use(globalLimiter);
};
