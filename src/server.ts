import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { testDbConnection } from "./config/db.js";
import { captureRawBody } from "./middleware/rawBody.js";
import { initWebSocket } from "./services/ws.js";
import "./listeners/email.listener.js";
import "./workers/email.worker.js";
import "./workers/meetingReminder.worker.js";

import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import managerRoutes from "./routes/manager.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import projectRoutes from "./routes/project.routes.js";
import publicationRoutes from "./routes/publication.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import searchRoutes from "./routes/search.routes.js";
import supervisorRoutes from "./routes/supervisor.routes.js";
import supportRoutes from "./routes/support.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import pushRoutes from "./routes/push.routes.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const frontendUrl = process.env.FRONTEND_URL || "https://iraap.com.ng";

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: frontendUrl, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb", verify: captureRawBody }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => res.json({ success: true, service: "iraap-api", timestamp: new Date().toISOString() }));
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/billing", billingRoutes);
app.use("/chat", chatRoutes);
app.use("/manager", managerRoutes);
app.use("/meetings", meetingRoutes);
app.use("/organizations", organizationRoutes);
app.use("/profile", profileRoutes);
app.use("/projects", projectRoutes);
app.use("/publications", publicationRoutes);
app.use("/reviews", reviewRoutes);
app.use("/search", searchRoutes);
app.use("/supervisor", supervisorRoutes);
app.use("/support", supportRoutes);
app.use("/notifications", notificationRoutes);
app.use("/push", pushRoutes);

app.use((_req, res) => res.status(404).json({ success: false, message: "API route not found" }));
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled API error", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

await testDbConnection();
const server = http.createServer(app);
initWebSocket(server);
server.listen(port, () => console.log(`IRAAP API listening on :${port}`));
