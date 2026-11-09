import "dotenv/config";
import path from "path";
import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/auth.routes";
import { userRoutes } from "./routes/user.routes";
import { sdgRoutes } from "./routes/sdg.routes";
import { categoryRoutes } from "./routes/category.routes";
import { challengeRoutes } from "./routes/challenge.routes";
import { classGroupRoutes } from "./routes/class-group.routes";
import { projectRoutes } from "./routes/project.routes";
import { teamRequestRoutes } from "./routes/team-request.routes";
import { teamInviteRoutes } from "./routes/team-invite.routes";
import { feedRoutes } from "./routes/feed.routes";
import { conversationRoutes } from "./routes/conversation.routes";
import { uploadRoutes } from "./routes/upload.routes";
import { myActivitiesRoutes } from "./routes/my-activities.routes";
import { notificationRoutes } from "./routes/notification.routes";
import { impactRoutes } from "./routes/impact.routes";
import { errorHandler } from "./middleware/error.middleware";

export const app = express();

// Render (and most PaaS hosts) terminate TLS at a reverse proxy in front of
// this process, so req.protocol would otherwise always read "http" — which
// breaks the absolute upload URLs built in upload.controller.ts (mixed
// content: browsers block an http:// asset on an https:// page).
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sdgs", sdgRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/class-groups", classGroupRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/team-requests", teamRequestRoutes);
app.use("/api/team-invites", teamInviteRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/users/me/activities", myActivitiesRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/impact", impactRoutes);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use(errorHandler);
