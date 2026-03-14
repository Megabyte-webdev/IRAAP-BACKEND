import express from "express";
import dotenv from "dotenv";
import projectRoutes from "./src/routes/project.routes.js";
import authRoutes from "./src/routes/auth.routes.js";
import cors from "cors";
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: "http://localhost:3000", // Your Next.js URL
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.get("/", (req, res) => {
    res.send("Institutional Research Repository Server Running");
});
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
//# sourceMappingURL=server.js.map