import express from "express";
import dotenv from "dotenv";
import projectRoutes from "./src/routes/project.routes.js";
import authRoutes from "./src/routes/auth.routes.js";
import searchRoutes from "./src/routes/search.routes.js";
import reviewRoutes from "./src/routes/review.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import supervisorRoutes from "./src/routes/supervisor.routes.js";
import cors from "cors";
import { applyGlobalSecurity } from "./src/middleware/rateLimiter.js";
import "./src/listeners/email.listener.js";
import "./src/workers/email.worker.js";
import { verifyTransporter } from "./src/services/mail.js";
import { testDbConnection } from "./src/config/db.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.set("trust proxy", 1);

applyGlobalSecurity(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
});

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/supervisor", supervisorRoutes);

app.get("/", (req, res) => {
  res.send("Institutional Research Repository Server Running");
});

verifyTransporter();
testDbConnection();
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
