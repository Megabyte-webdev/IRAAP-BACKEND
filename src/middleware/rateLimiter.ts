import type { Express } from "express";
import { rateLimit } from "express-rate-limit";
import RedisStore from "rate-limit-redis"; // use .default for the constructor
import type { RedisReply } from "rate-limit-redis";
import helmet from "helmet";
import { redisConnection } from "../config/redis.js";

export const applyGlobalSecurity = (app: Express) => {
  // 1. Security Headers
  app.use((helmet as any)());
  const store = new (RedisStore as any)({
    sendCommand: (...args: [string, ...string[]]): Promise<RedisReply> => {
      return redisConnection.call(...args) as Promise<RedisReply>;
    },
    prefix: "rl:",
  });

  // 2. Redis-Backed Global Rate Limiter
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // max requests per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    store,
    message: {
      status: 429,
      success: false,
      message:
        "Security block: Unusual traffic detected. Please try again later.",
    },
  });

  app.use(globalLimiter);

  // 3. Auth-specific brute-force limiter
  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // max failed attempts
    skipSuccessfulRequests: true, // only block failures
    store,
    message: {
      status: 429,
      success: false,
      message: "Too many login attempts. Account locked for 1 hour.",
    },
  });

  app.use("/api/auth/login", authLimiter);
};
