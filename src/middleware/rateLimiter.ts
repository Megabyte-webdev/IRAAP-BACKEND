import type { Express } from "express";
import { rateLimit } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { redisConnection } from "../config/redis.js";
import helmet from "helmet";

/**
 * Create a fresh RedisStore for every rate limiter.
 *
 * express-rate-limit v8 intentionally rejects sharing one Store instance
 * across multiple limiters because each limiter owns its own window/reset
 * configuration. Every store also gets a unique Redis key prefix so limits
 * cannot bleed into one another.
 */
const createRateLimitStore = (prefix: string) =>
  new RedisStore({
    prefix,
    sendCommand: (command: string, ...args: string[]) =>
      redisConnection.call(command, ...args) as Promise<RedisReply>,
  });

export const applyGlobalSecurity = (app: Express) => {
  // 1. Security Headers
  app.use((helmet as any)());

  // 2. Redis-backed global rate limiter
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore("iraap:ratelimit:global:"),
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
    windowMs: 60 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true,
    skip: (req) => req.method === "OPTIONS",
    store: createRateLimitStore("iraap:ratelimit:auth:"),
    standardHeaders: true,
    legacyHeaders: false,
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
      store: createRateLimitStore("iraap:ratelimit:verify-otp:"),
      message: {
        status: 429,
        success: false,
        message:
          "Too many verification attempts. Request a new code.",
      },
    }),
  );

  app.use(
    "/api/auth/resend-otp",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      store: createRateLimitStore("iraap:ratelimit:resend-otp:"),
      message: {
        status: 429,
        success: false,
        message: "Too many code requests. Please try again later.",
      },
    }),
  );

  app.use(
    "/api/profile/me/image",
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      store: createRateLimitStore("iraap:ratelimit:profile-image:"),
      message: {
        status: 429,
        success: false,
        message:
          "Too many profile photo uploads. Please try again later.",
      },
    }),
  );
};
