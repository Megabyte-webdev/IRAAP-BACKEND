import express from "express";
import dotenv from "dotenv";
import projectRoutes from "./src/routes/project.routes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
// Use routes
app.use("/api/projects", projectRoutes);

app.get("/", (req, res) => {
  res.send("Institutional Research Repository Server Running");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
