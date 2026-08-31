import type { Express } from "express";
import { rateLimit } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { redisConnection } from "../config/redis.js";
import helmet from "helmet";
const globalStore = new RedisStore({
  sendCommand: (command: string, ...args: string[]) =>
    redisConnection.call(command, ...args) as Promise<RedisReply>,
});

const authStore = new RedisStore({
  sendCommand: (command: string, ...args: string[]) =>
    redisConnection.call(command, ...args) as Promise<RedisReply>,
});

export const applyGlobalSecurity = (app: Express) => {
  // 1. Security Headers
  app.use((helmet as any)());

  // 2. Redis-Backed Global Rate Limiter
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // max requests per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    store: globalStore,
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
    skip: (req) => req.method === "OPTIONS",
    store: authStore,
    message: {
      status: 429,
      success: false,
      message: "Too many login attempts. Account locked for 1 hour.",
    },
  });

  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use(
    "/api/auth/verify-otp",
    rateLimit({
      windowMs: 10 * 60 * 1000,
      max: 15,
      standardHeaders: true,
      legacyHeaders: false,
      store: authStore,
      message: { status: 429, success: false, message: "Too many verification attempts. Request a new code." },
    }),
  );
  app.use(
    "/api/auth/resend-otp",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      store: authStore,
      message: { status: 429, success: false, message: "Too many code requests. Please try again later." },
    }),
  );
};
