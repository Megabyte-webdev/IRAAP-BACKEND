import express from "express";
import dotenv from "dotenv";
import projectRoutes from "./src/routes/project.routes.js";
import authRoutes from "./src/routes/auth.routes.js";
import searchRoutes from "./src/routes/search.routes.js";
import reviewRoutes from "./src/routes/review.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import supervisorRoutes from "./src/routes/supervisor.routes.js";
import chatRoutes from "./src/routes/chat.routes.js";
import meetingRoutes from "./src/routes/meeting.routes.js";
import profileRoutes from "./src/routes/profile.routes.js";
import analyticsRoutes from "./src/routes/analytics.routes.js";
import organizationRoutes from "./src/routes/organization.routes.js";
import publicationRoutes from "./src/routes/publication.routes.js";
import supportRoutes from "./src/routes/support.routes.js";
import managerRoutes from "./src/routes/manager.routes.js";
import billingRoutes from "./src/routes/billing.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js";
import pushRoutes from "./src/routes/push.routes.js";
import cors from "cors";
import { applyGlobalSecurity } from "./src/middleware/rateLimiter.js";
import "./src/listeners/email.listener.js";
import "./src/workers/email.worker.js";
import "./src/workers/meetingReminder.worker.js";
import { testDbConnection } from "./src/config/db.js";
import http from "http";
import https from "https";
import { initWebSocket } from "./src/services/ws.js";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { captureRawBody } from "./src/middleware/rawBody.js";
import "./src/config/webpush.js";

dotenv.config();
const app = express();

const port = Number(process.env.PORT) || 3000;

app.set("trust proxy", 1);

const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean) || [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/$/, "");
      if (
        allowedOrigins.length > 0 &&
        allowedOrigins.includes(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      console.warn(`[CORS] Blocked origin: ${origin}`);

      return callback(new Error("Origin not allowed by CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cache-Control",
      "Pragma",
    ],
    maxAge: 86400,
  }),
);

applyGlobalSecurity(app);

app.use(
  express.json({
    verify: captureRawBody,
    limit: "10mb",
  }),
);

app.use(cookieParser());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.use(
  bodyParser.json({
    limit: "10mb",
  }),
);

const apiErrorHandler = (
  err: any,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction,
) => {
  console.error("Unhandled API error:", err);
  res.status(Number(err?.status) || 500).json({
    success: false,
    message: err?.message || "Internal Server Error",
  });
};

app.get("/ping", (_req, res) => {
  res.status(200).send("pong");
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "iraap-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_req, res) => {
  res.send("IRAAP Research Platform API Running");
});
app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);
app.use("/publications", publicationRoutes);
app.use("/search", searchRoutes);
app.use("/reviews", reviewRoutes);
app.use("/admin", adminRoutes);
app.use("/supervisor", supervisorRoutes);
app.use("/chat", chatRoutes);
app.use("/meetings", meetingRoutes);
app.use("/profile", profileRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/organizations", organizationRoutes);
app.use("/support", supportRoutes);
app.use("/manager", managerRoutes);
app.use("/billing", billingRoutes);
app.use("/notifications", notificationRoutes);
app.use("/push", pushRoutes);
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});
app.use(apiErrorHandler);

const server = http.createServer(app);

initWebSocket(server);
const startSelfPing = () => {
  const SERVER_URL = process.env.SERVER_URL;

  if (!SERVER_URL) {
    console.log("[Self-ping] SERVER_URL not configured. Skipping.");

    return;
  }

  const TWELVE_MINUTES = 12 * 60 * 1000;
  const client = SERVER_URL.startsWith("https") ? https : http;

  setInterval(() => {
    client
      .get(`${SERVER_URL}/ping`, (res) => {
        console.log(`Self-ping status: ${res.statusCode}`);
      })
      .on("error", (err) => {
        console.error("Self-ping failed:", err.message);
      });
  }, TWELVE_MINUTES);

  console.log(`[Self-ping] Enabled for ${SERVER_URL}`);
};

server.listen(Number(port), "0.0.0.0", async () => {
  try {
    await testDbConnection();
    startSelfPing();

    console.log(
      `Server is strictly running on port ${port} and accessible to Railway/Render`,
    );

    console.log(
      `[CORS] Allowed origins: ${
        allowedOrigins.length ? allowedOrigins.join(", ") : "none configured"
      }`,
    );
  } catch (error) {
    console.error("Database startup check failed:", error);
  }
});
