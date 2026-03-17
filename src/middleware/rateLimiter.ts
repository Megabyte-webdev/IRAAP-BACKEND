import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import type { Express } from "express";

export const applyGlobalSecurity = (app: Express) => {
  // 1. Set Security Headers (Protects against XSS, Clickjacking, etc.)
  app.use(helmet());

  // 2. Global Rate Limiter (Protects against DOS/Brute Force)
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per 15 minutes per IP
    message: {
      status: 429,
      success: false,
      message: "Security block: Too many requests. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    // skipSuccessfulRequests: false, // Set to true if you only want to block attackers failing logins
  });

  app.use(globalLimiter);
};
