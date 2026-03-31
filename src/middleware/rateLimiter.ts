import type { Express } from "express";
import { rateLimit } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import helmet from "helmet";
import { redisConnection } from "../config/redis.js";

export const applyGlobalSecurity = (app: Express) => {
  // 1. Set Security Headers
  // Helmet helps prevent XSS, Content Sniffing, and Clickjacking
  app.use(helmet());

  // 2. Redis-Backed Rate Limiter
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per window
    standardHeaders: true,
    legacyHeaders: false,

    // REDIS STORE: This makes the limit "stick" even if the server restarts
    store: new RedisStore({
      // @ts-expect-error - RedisStore types can be finicky with ioredis versions
      sendCommand: (...args: string[]) => redisConnection.call(...args),
      prefix: "rl:", // Prefix for redis keys to avoid collision with BullMQ
    }),

    message: {
      status: 429,
      success: false,
      message:
        "Security block: Unusual traffic detected. Please try again later.",
    },
  });

  app.use(globalLimiter);

  // 3. Specific Brute-Force Protection for Auth (Optional but Recommended)
  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Only 10 failed attempts per hour
    store: new RedisStore({
      // @ts-expect-error
      sendCommand: (...args: string[]) => redisConnection.call(...args),
      prefix: "rl-auth:",
    }),
    skipSuccessfulRequests: true, // Only block if they are failing
    message: { message: "Too many login attempts. Account locked for 1 hour." },
  });

  app.use("/api/auth/login", authLimiter);
};
