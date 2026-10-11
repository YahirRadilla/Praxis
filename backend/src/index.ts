import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/auth.routes";
import { userRoutes } from "./routes/user.routes";
import { sdgRoutes } from "./routes/sdg.routes";
import { projectRoutes } from "./routes/project.routes";
import { teamRequestRoutes } from "./routes/team-request.routes";
import { feedRoutes } from "./routes/feed.routes";
import { errorHandler } from "./middleware/error.middleware";

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sdgs", sdgRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/team-requests", teamRequestRoutes);
app.use("/api/feed", feedRoutes);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Praxis API escuchando en el puerto ${port}`);
});
