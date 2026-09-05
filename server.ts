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
import cors from "cors";
import { applyGlobalSecurity } from "./src/middleware/rateLimiter.js";
import "./src/listeners/email.listener.js";
import "./src/workers/email.worker.js";
import "./src/workers/meetingReminder.worker.js";
import { testDbConnection } from "./src/config/db.js";
import http from "http";
import https from "https";
import { initWebSocket } from "./src/services/ws.js";
import { saveSubscription } from "./src/utils/pushStore.js";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { captureRawBody } from "./src/middleware/rawBody.js";
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.set("trust proxy", 1);

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

app.use(cors({ origin: allowedOrigins, credentials: true }));

applyGlobalSecurity(app);

app.use(
  express.json({
    verify: captureRawBody,
  }),
);
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use((err, _req, res, _next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
});

//Ping endpoint for Render health checks or external pinger
app.get("/ping", (_req, res) => {
  res.status(200).send("pong");
});

// Use routes
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
app.use("/api/manager", managerRoutes);
app.use("/api/billing", billingRoutes);

app.post("/push/subscribe", (req, res) => {
  const { userId, subscription } = req.body;
  console.log("SUBSCRIBE HIT", userId, subscription);

  if (!userId || !subscription) {
    return res.status(400).json({ error: "Missing data" });
  }

  saveSubscription(userId, subscription);

  console.log("Push subscribed:", userId);

  res.json({ success: true });
});

app.get("/", (req, res) => {
  res.send("Institutional Research Repository Server Running");
});

const server = http.createServer(app);
initWebSocket(server);

// Self-ping keeping Render alive every 12 minutes
const startSelfPing = () => {
  const SERVER_URL = process.env.SERVER_URL; // e.g. "https://your-app.onrender.com"
  if (!SERVER_URL) return;

  const FOURTEEN_MINUTES = 12 * 60 * 1000;
  const client = SERVER_URL.startsWith("https") ? https : http;

  setInterval(() => {
    client
      .get(`${SERVER_URL}/ping`, (res) => {
        console.log(`Self-ping status: ${res.statusCode}`);
      })
      .on("error", (err) => {
        console.error("Self-ping failed:", err.message);
      });
  }, FOURTEEN_MINUTES);
};

server.listen(Number(port), "0.0.0.0", () => {
  testDbConnection();
  startSelfPing();

  // Log the port specifically for Railway debugging
  console.log(
    `Server is strictly running on port ${port} and accessible to Railway`,
  );
});
